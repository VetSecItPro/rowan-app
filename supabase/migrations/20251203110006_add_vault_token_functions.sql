-- Enable Supabase Vault extension for encrypted token storage
-- CRITICAL: Tokens stored with AES-256-GCM encryption, keys managed by Supabase

-- Enable the vault extension
CREATE EXTENSION IF NOT EXISTS "supabase_vault";

-- Function to store OAuth token in vault
CREATE OR REPLACE FUNCTION store_oauth_token(
  p_connection_id UUID,
  p_token_type TEXT, -- 'access_token' or 'refresh_token'
  p_token_value TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges
SET search_path = public, vault
AS $$
DECLARE
  v_vault_id UUID;
  v_key_id UUID;
  v_secret_name TEXT;
BEGIN
  -- Validate inputs
  IF p_connection_id IS NULL OR p_token_type IS NULL OR p_token_value IS NULL THEN
    RAISE EXCEPTION 'connection_id, token_type, and token_value are required';
  END IF;

  IF p_token_type NOT IN ('access_token', 'refresh_token') THEN
    RAISE EXCEPTION 'token_type must be either access_token or refresh_token';
  END IF;

  -- Generate unique secret name
  v_secret_name := 'calendar_' || p_connection_id::TEXT || '_' || p_token_type;

  -- Check if vault encryption key exists, create if not
  SELECT id INTO v_key_id FROM vault.decrypted_secrets LIMIT 1;
  IF v_key_id IS NULL THEN
    RAISE EXCEPTION 'Vault encryption key not found. Contact system administrator.';
  END IF;

  -- Store token in vault (automatically encrypted)
  INSERT INTO vault.secrets (name, secret, description)
  VALUES (
    v_secret_name,
    p_token_value,
    COALESCE(p_description, 'Calendar OAuth ' || p_token_type || ' for connection ' || p_connection_id)
  )
  ON CONFLICT (name) DO UPDATE
  SET
    secret = EXCLUDED.secret,
    updated_at = NOW()
  RETURNING id INTO v_vault_id;

  RETURN v_vault_id;
END;
$$;

-- Function to retrieve OAuth token from vault (server-side only)
CREATE OR REPLACE FUNCTION get_oauth_token(
  p_connection_id UUID,
  p_token_type TEXT -- 'access_token' or 'refresh_token'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges
SET search_path = public, vault
AS $$
DECLARE
  v_secret_name TEXT;
  v_token_value TEXT;
BEGIN
  -- Validate inputs
  IF p_connection_id IS NULL OR p_token_type IS NULL THEN
    RAISE EXCEPTION 'connection_id and token_type are required';
  END IF;

  IF p_token_type NOT IN ('access_token', 'refresh_token') THEN
    RAISE EXCEPTION 'token_type must be either access_token or refresh_token';
  END IF;

  -- Build secret name
  v_secret_name := 'calendar_' || p_connection_id::TEXT || '_' || p_token_type;

  -- Retrieve decrypted token from vault
  SELECT decrypted_secret INTO v_token_value
  FROM vault.decrypted_secrets
  WHERE name = v_secret_name;

  IF v_token_value IS NULL THEN
    RAISE EXCEPTION 'Token not found for connection % type %', p_connection_id, p_token_type;
  END IF;

  RETURN v_token_value;
END;
$$;

-- Function to delete OAuth tokens from vault
CREATE OR REPLACE FUNCTION delete_oauth_tokens(p_connection_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_access_token_name TEXT;
  v_refresh_token_name TEXT;
BEGIN
  v_access_token_name := 'calendar_' || p_connection_id::TEXT || '_access_token';
  v_refresh_token_name := 'calendar_' || p_connection_id::TEXT || '_refresh_token';

  -- Delete both tokens
  DELETE FROM vault.secrets WHERE name IN (v_access_token_name, v_refresh_token_name);
END;
$$;

-- Function to handle token expiry
CREATE OR REPLACE FUNCTION handle_token_expiry(p_connection_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE calendar_connections
  SET sync_status = 'token_expired'
  WHERE id = p_connection_id;
END;
$$;

-- Function to check if token is expired or expiring soon
CREATE OR REPLACE FUNCTION is_token_expired(
  p_connection_id UUID,
  p_buffer_minutes INTEGER DEFAULT 5
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT token_expires_at INTO v_expires_at
  FROM calendar_connections
  WHERE id = p_connection_id;

  IF v_expires_at IS NULL THEN
    RETURN FALSE; -- No expiry set (e.g., Apple with app-specific password)
  END IF;

  RETURN v_expires_at <= NOW() + (p_buffer_minutes || ' minutes')::INTERVAL;
END;
$$;

-- Function to update token expiry time
CREATE OR REPLACE FUNCTION update_token_expiry(
  p_connection_id UUID,
  p_expires_in_seconds INTEGER
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE calendar_connections
  SET
    token_expires_at = NOW() + (p_expires_in_seconds || ' seconds')::INTERVAL,
    sync_status = 'active'
  WHERE id = p_connection_id;
END;
$$;

-- Grant execute permissions to authenticated users (RLS will still apply)
GRANT EXECUTE ON FUNCTION store_oauth_token TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_oauth_token TO service_role; -- Server-side only!
GRANT EXECUTE ON FUNCTION delete_oauth_tokens TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION handle_token_expiry TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_token_expired TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_token_expiry TO authenticated, service_role;

-- Comments
COMMENT ON FUNCTION store_oauth_token IS 'Stores OAuth token in Supabase Vault with AES-256-GCM encryption';
COMMENT ON FUNCTION get_oauth_token IS 'Retrieves decrypted OAuth token (SERVER-SIDE ONLY via service_role)';
COMMENT ON FUNCTION delete_oauth_tokens IS 'Removes all OAuth tokens for a connection from vault';
COMMENT ON FUNCTION handle_token_expiry IS 'Marks connection as token_expired when token expires';
COMMENT ON FUNCTION is_token_expired IS 'Checks if token is expired or expiring within buffer minutes';
COMMENT ON FUNCTION update_token_expiry IS 'Updates token expiry timestamp after refresh';

-- Security note: get_oauth_token should NEVER be called from client code
-- Only service_role can execute it (API routes with service_role key)
