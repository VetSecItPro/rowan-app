/**
 * Regression test for DB-DRIFT-201 (investigated 2026-06-07).
 *
 * `shouldSendGoalCheckinEmail` used to read the dropped `notification_preferences`
 * table (with a non-existent `email_reminders` column), so the query always
 * errored and the function defaulted to "allow" — opted-out users still got
 * check-in emails. It now reads the canonical `user_notification_preferences`
 * (toggle column `email_due_reminders`) + `users.timezone`.
 *
 * These tests fail on the old code: with a mock keyed by the NEW table names, the
 * old `.from('notification_preferences')` read resolves to null → the function
 * returns `true` everywhere, so the "off → false" cases would fail.
 */

import { describe, it, expect, vi } from 'vitest';
import { shouldSendGoalCheckinEmail } from '@/lib/jobs/goal-checkin-notifications-job';
import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

/** Supabase mock whose .from(table).…​.maybeSingle() resolves the configured result. */
function mockSupabase(
  byTable: Record<string, { data: unknown; error: unknown }>
): SupabaseClient {
  return {
    from(table: string) {
      const result = byTable[table] ?? { data: null, error: null };
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: () => Promise.resolve(result),
      };
      return chain;
    },
  } as unknown as SupabaseClient;
}

const ALLOW = {
  email_enabled: true,
  email_due_reminders: true,
  quiet_hours_enabled: false,
  quiet_hours_start: null,
  quiet_hours_end: null,
};

describe('shouldSendGoalCheckinEmail — DB-DRIFT-201 regression', () => {
  it('reads user_notification_preferences; false when email_due_reminders is off', async () => {
    const supabase = mockSupabase({
      user_notification_preferences: { data: { ...ALLOW, email_due_reminders: false }, error: null },
      users: { data: { timezone: 'America/Chicago' }, error: null },
    });
    expect(await shouldSendGoalCheckinEmail(supabase, 'u1')).toBe(false);
  });

  it('respects the master email opt-out (email_enabled off → false)', async () => {
    const supabase = mockSupabase({
      user_notification_preferences: { data: { ...ALLOW, email_enabled: false }, error: null },
      users: { data: { timezone: null }, error: null },
    });
    expect(await shouldSendGoalCheckinEmail(supabase, 'u1')).toBe(false);
  });

  it('returns true when enabled + reminders on + not in quiet hours', async () => {
    const supabase = mockSupabase({
      user_notification_preferences: { data: ALLOW, error: null },
      users: { data: { timezone: 'UTC' }, error: null },
    });
    expect(await shouldSendGoalCheckinEmail(supabase, 'u1')).toBe(true);
  });

  it('defaults to allow when no prefs row exists (opt-in by default)', async () => {
    const supabase = mockSupabase({
      user_notification_preferences: { data: null, error: null },
      users: { data: { timezone: null }, error: null },
    });
    expect(await shouldSendGoalCheckinEmail(supabase, 'u1')).toBe(true);
  });

  it('defaults to allow on a prefs read error (fail-open)', async () => {
    const supabase = mockSupabase({
      user_notification_preferences: { data: null, error: { message: 'boom' } },
      users: { data: { timezone: null }, error: null },
    });
    expect(await shouldSendGoalCheckinEmail(supabase, 'u1')).toBe(true);
  });
});
