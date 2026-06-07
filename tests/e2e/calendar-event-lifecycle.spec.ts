/**
 * E2E Durable Spec: Calendar event creation persists to the DB
 *
 * The existing calendar.spec.ts asserts the created event becomes *visible*,
 * but (a) visibility can pass on optimistic UI even if the write 500s, and
 * (b) the calendar renders each event across ~7 simultaneous views (Month /
 * Week / Agenda / List / Timeline / Today summary), most display:none, so
 * text/role visibility assertions are non-deterministic. This spec instead
 * proves the write actually lands in the `events` table via the service-role
 * admin client — the trustworthy signal, and the one that catches the June
 * orphan-trigger failure mode (#425/#426: client looks fine, DB write 500s).
 *
 * Calendar CRUD has no API route (client-side calendar-service calls), so the
 * create path is driven through the real UI; persistence is verified out of
 * band against the DB. The "create modal closed" assertion is the in-UI signal
 * that handleCreateEvent resolved without throwing.
 *
 * Edit/delete remain covered (soft) by calendar.spec.ts. They are not hardened
 * here because reaching a specific event for interaction depends on which of
 * the 7 views is active, which is inherently flaky to drive; the create write
 * path is the high-value regression target.
 */

import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  TEST_USERS,
  ensureAuthenticated,
  dismissCookieBanner,
  dismissAIWelcome,
} from './helpers/test-utils';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

test.use({ storageState: TEST_USERS.pro.storageState });

test.describe('Calendar event creation', () => {
  test.skip(
    !SUPABASE_URL || !SERVICE_ROLE_KEY,
    'Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'
  );

  let admin: SupabaseClient;
  let spaceId: string;
  const marker = `E2E-LC-${Date.now()}`;
  const createdTitle = `${marker} Standup`;

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
    await admin.from('events').delete().eq('space_id', spaceId).like('title', `${marker}%`);
  });

  test('creating an event via the UI persists a live row in events', async ({ page }) => {
    test.setTimeout(60000);

    await ensureAuthenticated(page, 'pro');
    await page.goto('/calendar', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await dismissCookieBanner(page);
    await dismissAIWelcome(page); // first-visit tour intercepts clicks otherwise

    // ── Create via the real UI ──────────────────────────────────────────────
    await page.getByTestId('add-event-button').click();
    await page.getByTestId('event-title-input').fill(createdTitle);
    await page.getByTestId('event-description-input').fill('Created by calendar lifecycle spec');
    await page.getByTestId('event-submit-button').click();

    // In-UI success signal: the create modal closes only after
    // handleCreateEvent resolves (a thrown write keeps it open + shows an error).
    await expect(page.getByTestId('event-title-input')).toBeHidden({ timeout: 10000 });

    // ── DB proof: exactly one live (non-deleted) row landed ─────────────────
    // Poll briefly — the insert + client refresh are async after modal close.
    await expect
      .poll(
        async () => {
          const { data } = await admin
            .from('events')
            .select('id, title, deleted_at')
            .eq('space_id', spaceId)
            .eq('title', createdTitle);
          return (data ?? []).filter((r) => r.deleted_at === null).length;
        },
        { timeout: 10000, message: 'event row should persist to events table' }
      )
      .toBe(1);
  });
});
