-- Rebuild the calendar OAuth token storage that was removed in the 2026-03-18
-- cleanup, restoring Apple/Outlook external-calendar sync at root cause.
--
-- BACKGROUND: tokens are stored in Supabase Vault (AES-256, key-managed), keyed
-- `calendar_<connection_id>_<token_type>`. The original migration
-- (20251203110006) defined store_oauth_token + get_oauth_token + delete_oauth_tokens
-- + expiry helpers. The 2026-03-18 cleanup dropped store_oauth_token and
-- get_oauth_token (the helpers + delete_oauth_tokens + calendar_connections table
-- survived), so apple-caldav-service / outlook-calendar-service threw on every
-- credential flow ("function does not exist"). This recreates the two missing
-- functions and hardens delete.
--
-- THREE ROOT-CAUSE FIXES over the original (not a like-for-like restore):
--  1. Allow 'app_specific_password' (Apple). The original validated token_type
--     IN ('access_token','refresh_token') ONLY — so Apple sync would have failed
--     validation even before the functions were dropped. Now all three types pass.
--  2. Internal OWNERSHIP CHECK. The original had none and granted get_oauth_token
--     to service_role only — but the services call it with a USER-context client,
--     so that grant could never have worked, and granting to `authenticated`
--     without a check would let any user read any connection's decrypted tokens.
--     These functions now verify the caller (auth.uid()) belongs to the
--     connection's space; service_role / server context (auth.uid() IS NULL) is
--     trusted and bypasses the check. Safe to grant to authenticated AND works.
--  3. Use vault.create_secret / vault.update_secret (not direct INSERT INTO
--     vault.secrets). In current Supabase Vault a raw INSERT stores PLAINTEXT;
--     the API functions guarantee AES encryption (verified: raw column is
--     ciphertext, decrypt round-trips).
--
-- delete_oauth_tokens is also updated to remove ALL token types for a connection
-- (prefix match) so Apple's app_specific_password isn't orphaned on disconnect.

-- ── store_oauth_token ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.store_oauth_token(
  p_connection_id uuid,
  p_token_type    text,   -- 'access_token' | 'refresh_token' | 'app_specific_password'
  p_token_value   text,
  p_description   text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_name     text;
  v_existing uuid;
  v_id       uuid;
BEGIN
  IF p_connection_id IS NULL OR p_token_type IS NULL OR p_token_value IS NULL THEN
    RAISE EXCEPTION 'connection_id, token_type, and token_value are required';
  END IF;
  IF p_token_type NOT IN ('access_token', 'refresh_token', 'app_specific_password') THEN
    RAISE EXCEPTION 'token_type must be access_token, refresh_token, or app_specific_password';
  END IF;

  -- Ownership: a logged-in caller must belong to the connection's space.
  -- service_role / server context (auth.uid() IS NULL) is trusted and skips this.
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.calendar_connections cc
    JOIN public.space_members sm ON sm.space_id = cc.space_id
    WHERE cc.id = p_connection_id AND sm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'access denied to connection %', p_connection_id;
  END IF;

  v_name := 'calendar_' || p_connection_id::text || '_' || p_token_type;

  SELECT id INTO v_existing FROM vault.secrets WHERE name = v_name;
  IF v_existing IS NULL THEN
    v_id := vault.create_secret(p_token_value, v_name,
              COALESCE(p_description, 'Calendar OAuth ' || p_token_type || ' for connection ' || p_connection_id));
  ELSE
    PERFORM vault.update_secret(v_existing, p_token_value, v_name,
              COALESCE(p_description, 'Calendar OAuth ' || p_token_type || ' for connection ' || p_connection_id));
    v_id := v_existing;
  END IF;

  RETURN v_id;
END;
$$;

-- ── get_oauth_token (returns DECRYPTED token — server/owner only) ─────────────
CREATE OR REPLACE FUNCTION public.get_oauth_token(
  p_connection_id uuid,
  p_token_type    text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_name  text;
  v_value text;
BEGIN
  IF p_connection_id IS NULL OR p_token_type IS NULL THEN
    RAISE EXCEPTION 'connection_id and token_type are required';
  END IF;
  IF p_token_type NOT IN ('access_token', 'refresh_token', 'app_specific_password') THEN
    RAISE EXCEPTION 'token_type must be access_token, refresh_token, or app_specific_password';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.calendar_connections cc
    JOIN public.space_members sm ON sm.space_id = cc.space_id
    WHERE cc.id = p_connection_id AND sm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'access denied to connection %', p_connection_id;
  END IF;

  v_name := 'calendar_' || p_connection_id::text || '_' || p_token_type;

  SELECT decrypted_secret INTO v_value
  FROM vault.decrypted_secrets
  WHERE name = v_name;

  IF v_value IS NULL THEN
    RAISE EXCEPTION 'token not found for connection % type %', p_connection_id, p_token_type;
  END IF;

  RETURN v_value;
END;
$$;

-- ── delete_oauth_tokens (now removes ALL token types incl. app_specific_password) ─
CREATE OR REPLACE FUNCTION public.delete_oauth_tokens(p_connection_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
BEGIN
  -- Enforce ownership only while the connection still exists; if it's already
  -- gone (deleted during disconnect), allow cleanup of orphaned vault secrets.
  IF auth.uid() IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.calendar_connections WHERE id = p_connection_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.calendar_connections cc
       JOIN public.space_members sm ON sm.space_id = cc.space_id
       WHERE cc.id = p_connection_id AND sm.user_id = auth.uid()
     ) THEN
    RAISE EXCEPTION 'access denied to connection %', p_connection_id;
  END IF;

  DELETE FROM vault.secrets WHERE name LIKE 'calendar_' || p_connection_id::text || '_%';
END;
$$;

-- Grants. get_oauth_token is safe for authenticated now because of the internal
-- ownership check (it was service_role-only before, which the user-context
-- service calls could never satisfy).
GRANT EXECUTE ON FUNCTION public.store_oauth_token(uuid, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_oauth_token(uuid, text)              TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_oauth_tokens(uuid)                TO authenticated, service_role;

COMMENT ON FUNCTION public.store_oauth_token  IS 'Stores a calendar OAuth/app-password token in Supabase Vault (AES). Ownership-checked; supports access_token/refresh_token/app_specific_password.';
COMMENT ON FUNCTION public.get_oauth_token    IS 'Returns a DECRYPTED calendar token from Vault. Ownership-checked (auth.uid() must be a space member; service_role bypasses). Never expose to client code.';
COMMENT ON FUNCTION public.delete_oauth_tokens IS 'Removes ALL Vault token secrets for a calendar connection. Ownership-checked while the connection exists.';
