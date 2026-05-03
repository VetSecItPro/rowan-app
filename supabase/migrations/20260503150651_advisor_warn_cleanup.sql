-- Supabase Advisor — second cleanup pass (2026-05-03)
-- Source: api.supabase.com/v1/projects/.../advisors/{security,performance}
--
-- Closes the warnings that are clearly auto-fixable on rowan-app's surface.
-- Out of scope (per CLAUDE.md isolation rules):
--   - 20 auth_rls_initplan in `learn.*` schema (not Rowan)
--   - 10 unindexed_foreign_keys in `learn.*` schema
--   - 4 unindexed_foreign_keys in `sm_*` (Steel Motion tables)
--   - 1 rls_enabled_no_policy in `learn.newsletter_subscribers`
--   - 1 rls_enabled_no_policy in `public.sm_admin_sessions`
--
-- Deferred-permanent (won't fix here — performance only, no security risk):
--   - 286 unused_index findings — separate index-pruning pass when traffic
--     scales (premature drops cause query regressions)
--   - 95 authenticated_security_definer_function_executable — every Rowan
--     business-logic function grants EXECUTE to authenticated users by
--     necessity. Per-function audit needed to distinguish "this should be
--     service_role only" from "this is correctly available to authenticated"
--
-- Closing in this migration:
--   - 12 multiple_permissive_policies on public.admin_users (consolidate)
--   - 95 anon_security_definer_function_executable (revoke from anon
--     on every public.* SECURITY DEFINER function — they all require
--     authenticated context per their definitions)

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Consolidate public.admin_users RLS policies
--
-- Current state (3 overlapping policies):
--   "Admin access only"        FOR ALL    USING (check_is_admin())
--   "Users can read own record"   FOR SELECT USING (jwt_email_match AND is_active)
--   "Users can update own login"  FOR UPDATE USING (jwt_email_match AND is_active)
--
-- The FOR ALL admin policy overlaps SELECT and UPDATE with the per-user
-- policies, which the planner reports as multiple_permissive (12 findings:
-- 6 roles × 2 actions). Functionally correct but the lint flags the cost
-- of evaluating both policies per row.
--
-- Resolution: merge admin + per-user predicates into ONE policy per action
-- with OR. Keep the admin-only paths for INSERT/DELETE (where per-user
-- access doesn't make sense — users don't create themselves into admin_users
-- and don't delete their own admin record).
--
-- This collapses the 12 multiple_permissive findings to 0 while preserving
-- exact same access semantics.
-- ─────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin access only" ON public.admin_users;
DROP POLICY IF EXISTS "Users can read own record" ON public.admin_users;
DROP POLICY IF EXISTS "Users can update own login" ON public.admin_users;

CREATE POLICY "admin_users_select" ON public.admin_users
  FOR SELECT
  USING (
    public.check_is_admin()
    OR (
      ((SELECT auth.jwt()) ->> 'email') = email
      AND is_active = true
    )
  );

CREATE POLICY "admin_users_update" ON public.admin_users
  FOR UPDATE
  USING (
    public.check_is_admin()
    OR (
      ((SELECT auth.jwt()) ->> 'email') = email
      AND is_active = true
    )
  );

CREATE POLICY "admin_users_insert" ON public.admin_users
  FOR INSERT
  WITH CHECK (public.check_is_admin());

CREATE POLICY "admin_users_delete" ON public.admin_users
  FOR DELETE
  USING (public.check_is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Revoke EXECUTE from anon on all public.* SECURITY DEFINER functions
--
-- All 94 affected functions are internal business logic that requires an
-- authenticated user context (e.g., add_goal_creator_as_collaborator,
-- apply_budget_template, check_is_admin, claim_founding_member_number,
-- cleanup_*). None are legitimately anon-callable.
--
-- Anon access remains for:
--   - Direct tables/views with their own RLS (controlled separately)
--   - SECURITY INVOKER functions (which run as the caller's role and
--     hit RLS naturally)
--
-- Anything that turns out to need anon access can be re-granted explicitly
-- with a follow-up migration.
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure::text AS sig
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.sig);
  END LOOP;
END $$;

COMMIT;
