-- =============================================================================
-- Migration: Create get_admin_details RPC (formalize PROD_ONLY drift)
-- Date: 2026-05-08
--
-- WHY:
-- `get_admin_details` exists in prod but was never defined in any migration
-- file — pure PROD_ONLY drift. The proxy.ts middleware calls it via
-- supabase.rpc('get_admin_details') on every admin path, which works in
-- prod but fails in local Supabase + CI E2E replay (the function isn't
-- there). The smoke test's admin login segment hits the failure as a 500
-- "Admin verification failed" from lib/middleware/admin-session.ts:104.
--
-- This migration brings the function into the source-of-truth, body-equal
-- to what's already in prod (verified via pg_get_functiondef on
-- 2026-05-08). After this migration applies, prod stays unchanged
-- (CREATE OR REPLACE no-ops on identical body), local replay gets the
-- function, and Phase 9.1.5 inventory drops one PROD_ONLY entry.
--
-- IDEMPOTENT: CREATE OR REPLACE FUNCTION is safe to re-run.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_admin_details()
 RETURNS TABLE(admin_id uuid, email text, role text, permissions jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    au.id,
    au.email,
    au.role,
    au.permissions
  FROM admin_users au
  WHERE au.user_id = auth.uid()
    AND au.is_active = true
  LIMIT 1;
END;
$function$;

-- Lock down: SECURITY DEFINER + REVOKE from anon/PUBLIC (May-3 advisor pattern)
REVOKE ALL ON FUNCTION public.get_admin_details() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_details() TO authenticated, service_role;

DO $$
BEGIN
  RAISE NOTICE '✅ get_admin_details() defined (matches prod body; closes PROD_ONLY drift)';
END
$$;
