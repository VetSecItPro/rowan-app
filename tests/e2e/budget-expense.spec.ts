/**
 * E2E Durable Spec: Expense create — money precision, validation, write path
 *
 * Budget is the highest-stakes module for correctness (money math), so this
 * spec drives the real authenticated /api/expenses endpoint and asserts:
 *
 *   1. Numeric precision round-trips exactly (no float drift) — `expenses.amount`
 *      is a Postgres `numeric` and must come back bit-for-bit.
 *   2. An insert exercises all 11 triggers on `expenses` (project-cost,
 *      line-item-cost, bill-event sync). If any targets a dropped table this
 *      500s — the #425/#426 orphan-trigger failure mode — so a clean 200 is
 *      itself meaningful coverage.
 *   3. The `date` default: `expenses.date` is NOT NULL with no DB default, but
 *      the Zod schema marks it optional. createExpense now defaults it to today;
 *      this guards that an omitted date returns 200 (was a latent 500).
 *   4. Validation guards: non-positive amounts are rejected (RT-304), and a
 *      string amount is coerced.
 *
 * State-changing calls need a fresh CSRF token each time (the token rotates
 * after every POST), mirroring lib/utils/csrf-fetch.ts.
 */

import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { TEST_USERS, ensureAuthenticated } from './helpers/test-utils';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const MARKER = `E2E-EXP-${Date.now()}`;

/** POST /api/expenses with a freshly-minted CSRF token. */
async function postExpense(page: Page, body: Record<string, unknown>) {
  const tokenResp = await page.request.get('/api/csrf/token', { timeout: 10000 });
  const { token } = (await tokenResp.json()) as { token?: string };
  return page.request.post('/api/expenses', {
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': token! },
    data: body,
    timeout: 20000,
  });
}

test.use({ storageState: TEST_USERS.pro.storageState });

test.describe('Expense creation — money correctness', () => {
  test.skip(
    !SUPABASE_URL || !SERVICE_ROLE_KEY,
    'Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'
  );

  let admin: SupabaseClient;
  let spaceId: string;

  test.beforeAll(async () => {
    admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userRow } = await admin
      .from('users')
      .select('id')
      .eq('email', TEST_USERS.pro.email)
      .single();
    const { data: memberRow } = await admin
      .from('space_members')
      .select('space_id')
      .eq('user_id', userRow!.id)
      .limit(1)
      .single();
    spaceId = memberRow!.space_id;
  });

  test.afterAll(async () => {
    if (!admin || !spaceId) return;
    await admin.from('expenses').delete().eq('space_id', spaceId).like('title', `${MARKER}%`);
  });

  test('persists an exact numeric amount and fires insert triggers cleanly', async ({
    page,
  }) => {
    await ensureAuthenticated(page, 'pro');

    const title = `${MARKER} Precision`;
    const resp = await postExpense(page, {
      space_id: spaceId,
      title,
      amount: 1234.56,
      category: 'groceries',
      date: new Date().toISOString().split('T')[0],
    });

    const json = await resp.json();
    expect(resp.ok(), `create expense failed (${resp.status()}): ${JSON.stringify(json)}`).toBeTruthy();
    expect(json.success).toBe(true);

    // DB proof: numeric round-trips with no float drift.
    const { data: row } = await admin
      .from('expenses')
      .select('amount, date, status')
      .eq('id', json.data.id)
      .single();
    expect(Number(row!.amount)).toBe(1234.56);
    expect(row!.status).toBe('pending'); // service default
  });

  test('omitting date returns 200 (defaults to today, not a 500)', async ({ page }) => {
    await ensureAuthenticated(page, 'pro');

    const title = `${MARKER} NoDate`;
    const resp = await postExpense(page, {
      space_id: spaceId,
      title,
      amount: 10,
      // date intentionally omitted — schema allows it, DB column is NOT NULL
    });

    const json = await resp.json();
    expect(resp.ok(), `omit-date should not 500 (${resp.status()}): ${JSON.stringify(json)}`).toBeTruthy();

    const today = new Date().toISOString().split('T')[0];
    const { data: row } = await admin
      .from('expenses')
      .select('date')
      .eq('id', json.data.id)
      .single();
    expect(row!.date).toBe(today);
  });

  test('rejects non-positive amounts (RT-304)', async ({ page }) => {
    await ensureAuthenticated(page, 'pro');

    const zero = await postExpense(page, {
      space_id: spaceId,
      title: `${MARKER} Zero`,
      amount: 0,
    });
    expect(zero.status()).toBe(400);

    const negative = await postExpense(page, {
      space_id: spaceId,
      title: `${MARKER} Negative`,
      amount: -5,
    });
    expect(negative.status()).toBe(400);
  });

  test('coerces a string amount to a number', async ({ page }) => {
    await ensureAuthenticated(page, 'pro');

    const title = `${MARKER} StringAmount`;
    const resp = await postExpense(page, {
      space_id: spaceId,
      title,
      amount: '19.99',
      date: new Date().toISOString().split('T')[0],
    });

    const json = await resp.json();
    expect(resp.ok(), `string amount should coerce (${resp.status()}): ${JSON.stringify(json)}`).toBeTruthy();

    const { data: row } = await admin
      .from('expenses')
      .select('amount')
      .eq('id', json.data.id)
      .single();
    expect(Number(row!.amount)).toBe(19.99);
  });
});
