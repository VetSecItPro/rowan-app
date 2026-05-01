/**
 * Active User Service - Canonical "active user" definition for the admin domain.
 *
 * Why this exists:
 * Three admin endpoints (dashboard/stats, users panel, retention) had drifted
 * to three different definitions of "active user":
 *   - dashboard/stats:  profiles.updated_at >= now - 30d
 *   - users panel:      profiles.updated_at >= now - 30d (same, but inlined)
 *   - retention:        distinct feature_events.user_id in window
 *
 * This service is the single source of truth.
 *
 * Canonical definition (industry-standard MAU):
 *   "A user is ACTIVE in the last N days if their `profiles.updated_at` is
 *    within that window."
 *
 * Why profiles.updated_at, not feature_events:
 *   - profiles.updated_at is touched on real interactions (login, profile
 *     edits, settings changes) and is reliably stamped on signup.
 *   - feature_events depends on instrumentation that can lag or be incomplete;
 *     today the table is stale beyond ~3 months which would silently zero out
 *     all dashboards.
 *   - The retention panel still uses feature_events for DAU/WAU/MAU because
 *     those are activity-event metrics by definition. This helper is for the
 *     "active vs. inactive user" header stat / list status badge.
 *
 * If we ever switch the canonical signal to feature_events, change ONLY this
 * file and every panel updates in lockstep.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_ACTIVE_WINDOW_DAYS = 30;

export interface ActiveUserCandidate {
  updated_at?: string | null;
}

/**
 * Predicate: is a single user/profile row "active" within the window?
 */
export function isActiveUser(
  user: ActiveUserCandidate,
  windowDays: number = DEFAULT_ACTIVE_WINDOW_DAYS
): boolean {
  if (!user.updated_at) return false;
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const updatedAt = new Date(user.updated_at).getTime();
  return Number.isFinite(updatedAt) && updatedAt >= cutoff;
}

/**
 * Returns the cutoff ISO string used for "active in last N days" queries.
 * Use this when building Supabase `.gte('updated_at', ...)` filters so every
 * caller agrees on the threshold.
 */
export function getActiveUserCutoffIso(
  windowDays: number = DEFAULT_ACTIVE_WINDOW_DAYS
): string {
  return new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Single-source-of-truth active user count.
 * Counts rows in `profiles` whose `updated_at` falls within the window.
 *
 * NOTE: This queries the global `profiles` table without a space_id filter
 * because admin-domain metrics span all spaces by design. Semgrep is silenced
 * accordingly.
 */
export async function countActiveUsers(
  supabase: SupabaseClient,
  windowDays: number = DEFAULT_ACTIVE_WINDOW_DAYS
): Promise<number> {
  const cutoff = getActiveUserCutoffIso(windowDays);
  // nosemgrep: supabase-missing-space-id-filter — admin global metric, profiles is a global table with no space_id
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gte('updated_at', cutoff);

  if (error) return 0;
  return count ?? 0;
}
