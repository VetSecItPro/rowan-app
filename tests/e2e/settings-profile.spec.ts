/**
 * E2E Durable Spec: Profile update — persistence + name XSS-strip
 *
 * Drives PUT /api/user/profile and asserts the change lands in `users` and that
 * HTML is stripped from the display name (the XSS defense for a value rendered
 * across the app). Email is left unchanged so the email-change verification flow
 * (Resend) is not triggered.
 *
 * The seeded test-pro user is deleted at teardown, but this spec also restores
 * the original name so a reused session in the same run sees a stable profile.
 */

import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { TEST_USERS, ensureAuthenticated } from './helpers/test-utils';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const ORIGINAL_NAME = 'Plus Test User'; // matches seed-test-users.ts

async function putProfile(page: Page, body: Record<string, unknown>) {
  const tokenResp = await page.request.get('/api/csrf/token', { timeout: 10000 });
  const { token } = (await tokenResp.json()) as { token?: string };
  return page.request.put('/api/user/profile', {
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': token! },
    data: body,
    timeout: 20000,
  });
}

test.use({ storageState: TEST_USERS.pro.storageState });

test.describe('Profile update', () => {
  test.skip(
    !SUPABASE_URL || !SERVICE_ROLE_KEY,
    'Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'
  );

  let admin: SupabaseClient;
  let userId: string;

  test.beforeAll(async () => {
    admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userRow } = await admin
      .from('users')
      .select('id')
      .eq('email', TEST_USERS.pro.email)
      .single();
    userId = userRow!.id;
  });

  test.afterAll(async () => {
    if (!admin || !userId) return;
    await admin.from('users').update({ name: ORIGINAL_NAME }).eq('id', userId);
  });

  test('updates the display name and strips HTML (XSS defense)', async ({ page }) => {
    await ensureAuthenticated(page, 'pro');

    const marker = `E2E-NAME-${Date.now()}`;
    const resp = await putProfile(page, {
      name: `${marker} <script>alert(1)</script>`,
      email: TEST_USERS.pro.email, // unchanged → no verification flow
    });

    const json = await resp.json();
    expect(resp.ok(), `profile update failed (${resp.status()}): ${JSON.stringify(json)}`).toBeTruthy();

    const { data: row } = await admin
      .from('users')
      .select('name')
      .eq('id', userId)
      .single();
    expect(row!.name).toContain(marker);              // the change persisted
    expect(row!.name.toLowerCase()).not.toContain('<script'); // HTML stripped
  });

  test('rejects an empty name', async ({ page }) => {
    await ensureAuthenticated(page, 'pro');

    const resp = await putProfile(page, {
      name: '   ',
      email: TEST_USERS.pro.email,
    });
    expect(resp.status()).toBe(400);
  });
});
