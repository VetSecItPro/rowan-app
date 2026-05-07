-- ============================================================================
-- Migration: Fix generate_secure_share_token search_path
-- Date: 2026-05-07
--
-- WHY:
-- The previous migration (20260507185945) ensured pgcrypto exists. CI logs
-- confirm the extension is enabled. But the function still fails with
-- "function gen_random_bytes(integer) does not exist (42883)".
--
-- Root cause: pgcrypto is installed in the `extensions` schema (Supabase
-- default), not `public`. plpgsql functions resolve unqualified function
-- calls via search_path. SECURITY DEFINER functions in this codebase
-- don't SET search_path explicitly, so they get only `public, $user` —
-- pgcrypto's `extensions` schema isn't in there.
--
-- REAL FIX: recreate the function with explicit
-- `SET search_path = public, extensions, pg_temp` so gen_random_bytes
-- resolves regardless of which schema pgcrypto landed in. Also adds
-- `extensions.` qualifier as belt-and-suspenders.
--
-- IDEMPOTENT: CREATE OR REPLACE — same identity, no caller breakage.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_secure_share_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  random_bytes bytea;
  base64_string text;
BEGIN
  -- Explicit `extensions.` qualifier in case search_path resolution
  -- fails for any reason. Both should be safe — pgcrypto is universally
  -- in `extensions` on Supabase, but we add the SET search_path above
  -- as belt-and-suspenders.
  random_bytes := extensions.gen_random_bytes(32);

  base64_string := encode(random_bytes, 'base64');
  base64_string := REPLACE(REPLACE(TRIM(TRAILING '=' FROM base64_string), '+', '-'), '/', '_');

  RETURN base64_string;
END;
$$;

COMMENT ON FUNCTION public.generate_secure_share_token() IS
  'Generates cryptographically secure 256-bit URL-safe tokens for shopping list sharing. '
  'Uses extensions.gen_random_bytes (pgcrypto) — schema-qualified for cross-environment portability.';

DO $$
BEGIN
  RAISE NOTICE '✅ generate_secure_share_token search_path fixed (now qualifies extensions.gen_random_bytes)';
END
$$;
