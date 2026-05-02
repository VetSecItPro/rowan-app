-- Supabase Security & Performance Advisor remediation
-- Run on 2026-05-01. Source: api.supabase.com/v1/projects/.../advisors
--
-- Scope: high-leverage advisor findings that have a clean, low-risk fix.
-- Out of scope (logged for separate work):
--   - 192 *_security_definer_function_executable warnings — needs per-function
--     audit before revoking grants from anon/authenticated; some are legit.
--   - 273 unused_index findings — separate index-pruning pass; we already
--     ran one in commit 2edc461c, this is the next round.
--   - sm_* table FKs — those tables are not part of rowan (per CLAUDE.md
--     db-isolation rules), leave them alone.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Drop orphan functions from family-location-tracking removal
--    Caught by `supabase db lint --linked` — both functions reference
--    user_locations which was dropped on 2026-04-26.
-- ─────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_last_location(uuid, uuid);
DROP FUNCTION IF EXISTS public.cleanup_old_locations();

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Pin function search_path on 8 functions (security: function_search_path_mutable)
--    A mutable search_path lets an attacker who can create same-named objects
--    in a schema searched first (e.g. via temporary table) hijack the function.
--    Pinning to (public, pg_temp) freezes resolution while keeping pg_temp
--    available for any internal temp-table usage.
-- ─────────────────────────────────────────────────────────────────────────
ALTER FUNCTION public.update_meal_calendar_events_updated_at()             SET search_path = public, pg_temp;
ALTER FUNCTION public.meal_type_default_time(text)                         SET search_path = public, pg_temp;
ALTER FUNCTION public.meal_type_duration(text)                             SET search_path = public, pg_temp;
ALTER FUNCTION public.meal_type_emoji(text)                                SET search_path = public, pg_temp;
ALTER FUNCTION public.meal_event_title(text, text, text)                   SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_meal_to_calendar()                              SET search_path = public, pg_temp;
ALTER FUNCTION public.update_calendar_event_from_meal()                    SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_calendar_event_for_meal()                     SET search_path = public, pg_temp;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Wrap auth.* calls in scalar subqueries (perf: auth_rls_initplan)
--    Postgres re-evaluates auth.uid() / auth.jwt() once per row scanned
--    when used directly. Wrapping in (SELECT auth.uid()) makes the planner
--    treat it as a scalar subquery — evaluated once per query. This is the
--    Supabase-recommended pattern for RLS at scale.
-- ─────────────────────────────────────────────────────────────────────────

-- admin_users — 3 policies use bare auth.* calls
DROP POLICY IF EXISTS "Service role full access" ON public.admin_users;
-- Service role bypasses RLS automatically in Supabase; this policy was
-- dead weight and contributed 4 multiple_permissive_policies warnings.

DROP POLICY IF EXISTS "Users can read own record" ON public.admin_users;
CREATE POLICY "Users can read own record" ON public.admin_users
  FOR SELECT
  USING ((((SELECT auth.jwt()) ->> 'email') = email) AND is_active = true);

DROP POLICY IF EXISTS "Users can update own login" ON public.admin_users;
CREATE POLICY "Users can update own login" ON public.admin_users
  FOR UPDATE
  USING ((((SELECT auth.jwt()) ->> 'email') = email) AND is_active = true);

-- meal_calendar_events — 1 policy uses bare auth.uid()
DROP POLICY IF EXISTS "meal_calendar_events_access" ON public.meal_calendar_events;
CREATE POLICY "meal_calendar_events_access" ON public.meal_calendar_events
  FOR ALL
  USING (
    meal_id IN (
      SELECT m.id
      FROM public.meals m
      JOIN public.space_members sm ON m.space_id = sm.space_id
      WHERE sm.user_id = (SELECT auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Add missing FK index on reminders.assigned_to (perf: unindexed_foreign_keys)
--    FK without covering index forces sequential scan when validating
--    deletes/updates against the parent table. Skipping the 4 sm_* findings
--    — those tables are out-of-scope per CLAUDE.md isolation rules.
-- ─────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reminders_assigned_to
  ON public.reminders(assigned_to)
  WHERE assigned_to IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Tighten public-bucket SELECT policies (security: public_bucket_allows_listing)
--    Public buckets serve files via direct URL regardless of RLS. The broad
--    SELECT-everywhere policies enabled API listing of all objects, which
--    is unnecessary for URL access and exposed file inventory to clients.
--    Dropping them keeps URL fetches working but blocks directory-style
--    enumeration via the storage list API.
-- ─────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view recipe images" ON storage.objects;

COMMIT;
