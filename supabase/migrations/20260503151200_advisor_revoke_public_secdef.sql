-- Companion to 20260503150651 — fix the anon SECURITY DEFINER revoke
--
-- The previous migration revoked EXECUTE FROM anon on every public.*
-- SECURITY DEFINER function, but that only strips the direct anon grant.
-- The functions still had EXECUTE granted to PUBLIC (the parent role
-- group), which gives anon access transitively.
--
-- Fix: REVOKE FROM PUBLIC, then GRANT explicitly to authenticated and
-- service_role. This breaks the transitive-via-PUBLIC path while keeping
-- the legitimate authenticated + service_role access.

BEGIN;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure::text AS sig
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END $$;

COMMIT;
