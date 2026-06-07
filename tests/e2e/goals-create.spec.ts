/**
 * E2E Durable Spec: Goal creation — persistence, numeric precision, defaults
 *
 * Drives the authenticated /api/goals endpoint and asserts the row lands in the
 * `goals` table with the right server defaults and bit-exact numeric amounts.
 * A goal insert fires 8 triggers (milestones, activity, collaborator,
 * template-usage, priority-order, dependencies) — so a clean 200 also proves
 * none of those triggers reference a dropped table (#425/#426 failure mode).
 *
 * goal_schemas uses the correct z.preprocess(''|null → undefined) pattern for
 * optional dates, so unlike expenses there's no omitted-optional 400 trap here;
 * the progress-bounds case below guards the one validation rule that matters.
 */

import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { TEST_USERS, ensureAuthenticated } from './helpers/test-utils';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const MARKER = `E2E-GOAL-${Date.now()}`;

async function postGoal(page: Page, body: Record<string, unknown>) {
  const tokenResp = await page.request.get('/api/csrf/token', { timeout: 10000 });
  const { token } = (await tokenResp.json()) as { token?: string };
  return page.request.post('/api/goals', {
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': token! },
    data: body,
    timeout: 20000,
  });
}

test.use({ storageState: TEST_USERS.pro.storageState });

test.describe('Goal creation', () => {
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
    await admin.from('goals').delete().eq('space_id', spaceId).like('title', `${MARKER}%`);
  });

  test('persists a goal with server defaults and exact numeric amounts', async ({
    page,
  }) => {
    await ensureAuthenticated(page, 'pro');

    const title = `${MARKER} Save for vacation`;
    const resp = await postGoal(page, {
      space_id: spaceId,
      title,
      category: 'financial',
      target_amount: 5000,
      current_amount: 1250.5,
    });

    const json = await resp.json();
    expect(resp.ok(), `create goal failed (${resp.status()}): ${JSON.stringify(json)}`).toBeTruthy();
    expect(json.success).toBe(true);

    // DB proof: defaults applied, numeric amounts round-trip exactly, triggers OK.
    const { data: row } = await admin
      .from('goals')
      .select('status, progress, target_amount, current_amount')
      .eq('id', json.data.id)
      .single();
    expect(row!.status).toBe('active');   // schema/DB default
    expect(row!.progress).toBe(0);        // DB default
    expect(Number(row!.target_amount)).toBe(5000);
    expect(Number(row!.current_amount)).toBe(1250.5);
  });

  test('rejects progress outside 0..100', async ({ page }) => {
    await ensureAuthenticated(page, 'pro');

    const resp = await postGoal(page, {
      space_id: spaceId,
      title: `${MARKER} Bad progress`,
      progress: 150,
    });
    expect(resp.status()).toBe(400);
  });
});
