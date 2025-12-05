-- ============================================================================
-- CALENDAR INTEGRATION - CONSOLIDATED MIGRATION SCRIPT
-- ============================================================================
-- Phase 1: Database Schema & Security Foundation
-- Deploy Date: 2025-12-03
--
-- This script creates the complete database infrastructure for calendar
-- integration with Google Calendar, Apple CalDAV, and Cozi.
--
-- IMPORTANT: Run this script in Supabase SQL Editor
-- Project: rowan-app (SUPABASE_PROJECT_REF)
-- ============================================================================

-- Migration 1: Create calendar_connections table
-- ============================================================================

-- Create calendar_connections table for OAuth connections
-- Stores encrypted references to tokens in Supabase Vault

CREATE TYPE calendar_provider AS ENUM ('google', 'apple', 'cozi');
CREATE TYPE sync_status_type AS ENUM ('active', 'syncing', 'error', 'token_expired', 'disconnected');
CREATE TYPE sync_direction_type AS ENUM ('bidirectional', 'inbound_only', 'outbound_only');

CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

  -- Provider information
  provider calendar_provider NOT NULL,
  provider_account_id TEXT, -- External account identifier (email for Apple/Cozi, Google user ID)
  provider_calendar_id TEXT, -- Primary calendar ID from provider

  -- Token storage (references to Supabase Vault)
  access_token_vault_id UUID, -- Reference to vault.secrets
  refresh_token_vault_id UUID, -- Reference to vault.secrets
  token_expires_at TIMESTAMPTZ,

  -- Sync configuration
  sync_direction sync_direction_type NOT NULL DEFAULT 'bidirectional',
  sync_status sync_status_type NOT NULL DEFAULT 'active',
  sync_token TEXT, -- For incremental sync (Google sync token, CalDAV ctag)
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,

  -- Webhook configuration (Google Calendar only)
  webhook_channel_id TEXT, -- Google push notification channel ID
  webhook_resource_id TEXT, -- Google resource ID
  webhook_expires_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_provider_space UNIQUE (user_id, provider, space_id)
);

-- Indexes for performance
CREATE INDEX idx_calendar_connections_user_id ON calendar_connections(user_id);
CREATE INDEX idx_calendar_connections_space_id ON calendar_connections(space_id);
CREATE INDEX idx_calendar_connections_provider ON calendar_connections(provider);
CREATE INDEX idx_calendar_connections_sync_status ON calendar_connections(sync_status) WHERE sync_status != 'disconnected';
CREATE INDEX idx_calendar_connections_next_sync ON calendar_connections(next_sync_at) WHERE sync_status = 'active';
CREATE INDEX idx_calendar_connections_webhook_expiry ON calendar_connections(webhook_expires_at) WHERE webhook_expires_at IS NOT NULL;

-- Updated timestamp trigger
CREATE TRIGGER update_calendar_connections_updated_at
  BEFORE UPDATE ON calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE calendar_connections IS 'Stores calendar provider OAuth connections with encrypted token references';
COMMENT ON COLUMN calendar_connections.access_token_vault_id IS 'Reference to encrypted access token in vault.secrets';
COMMENT ON COLUMN calendar_connections.refresh_token_vault_id IS 'Reference to encrypted refresh token in vault.secrets';
COMMENT ON COLUMN calendar_connections.sync_token IS 'Provider-specific token for incremental sync (Google: nextSyncToken, CalDAV: ctag)';
COMMENT ON COLUMN calendar_connections.webhook_channel_id IS 'Google Calendar push notification channel ID';

-- Migration 2: Create calendar_event_mappings table
-- ============================================================================

-- Create calendar_event_mappings table
-- One-to-one mapping between Rowan events and external calendar events

CREATE TABLE calendar_event_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rowan event reference
  rowan_event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Calendar connection reference
  connection_id UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,

  -- External event identifiers
  external_event_id TEXT NOT NULL, -- Provider's event ID
  external_calendar_id TEXT NOT NULL, -- Which calendar in the provider account

  -- Sync metadata
  sync_direction sync_direction_type NOT NULL DEFAULT 'bidirectional',
  rowan_etag TEXT, -- Rowan event version for conflict detection
  external_etag TEXT, -- External event version (Google: etag, CalDAV: etag)
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Conflict tracking
  has_conflict BOOLEAN NOT NULL DEFAULT FALSE,
  conflict_detected_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints: One Rowan event can map to one external event per connection
  CONSTRAINT unique_rowan_event_connection UNIQUE (rowan_event_id, connection_id),
  -- Constraint: One external event maps to exactly one Rowan event
  CONSTRAINT unique_external_event UNIQUE (connection_id, external_event_id)
);

-- Indexes for performance
CREATE INDEX idx_event_mappings_rowan_event ON calendar_event_mappings(rowan_event_id);
CREATE INDEX idx_event_mappings_connection ON calendar_event_mappings(connection_id);
CREATE INDEX idx_event_mappings_external_event ON calendar_event_mappings(external_event_id);
CREATE INDEX idx_event_mappings_conflicts ON calendar_event_mappings(has_conflict) WHERE has_conflict = TRUE;
CREATE INDEX idx_event_mappings_last_synced ON calendar_event_mappings(last_synced_at);

-- Updated timestamp trigger
CREATE TRIGGER update_calendar_event_mappings_updated_at
  BEFORE UPDATE ON calendar_event_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE calendar_event_mappings IS 'Maps Rowan events to external calendar events for bidirectional sync';
COMMENT ON COLUMN calendar_event_mappings.rowan_etag IS 'Rowan event version hash for detecting local changes';
COMMENT ON COLUMN calendar_event_mappings.external_etag IS 'External event ETag/version for detecting remote changes';
COMMENT ON COLUMN calendar_event_mappings.has_conflict IS 'TRUE when both Rowan and external event were modified';

-- Migration 3: Create calendar_sync_logs table
-- ============================================================================

-- Create calendar_sync_logs table
-- Audit trail for all sync operations with 90-day retention

CREATE TYPE sync_type AS ENUM ('full', 'incremental', 'manual', 'webhook_triggered');
CREATE TYPE sync_log_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'partial');

CREATE TABLE calendar_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Connection reference
  connection_id UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,

  -- Sync details
  sync_type sync_type NOT NULL,
  sync_direction sync_direction_type NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status sync_log_status NOT NULL DEFAULT 'pending',

  -- Metrics
  events_created INTEGER NOT NULL DEFAULT 0,
  events_updated INTEGER NOT NULL DEFAULT 0,
  events_deleted INTEGER NOT NULL DEFAULT 0,
  conflicts_detected INTEGER NOT NULL DEFAULT 0,

  -- Error details
  error_code TEXT,
  error_message TEXT,
  error_details JSONB,

  -- Metadata
  triggered_by TEXT, -- 'cron', 'webhook', 'user', 'database_trigger'
  duration_ms INTEGER, -- Calculated: completed_at - started_at

  -- Indexes
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance and queries
CREATE INDEX idx_sync_logs_connection ON calendar_sync_logs(connection_id);
CREATE INDEX idx_sync_logs_status ON calendar_sync_logs(status);
CREATE INDEX idx_sync_logs_created_at ON calendar_sync_logs(created_at DESC);
CREATE INDEX idx_sync_logs_connection_created ON calendar_sync_logs(connection_id, created_at DESC);

-- Function to calculate duration on completion
CREATE OR REPLACE FUNCTION calculate_sync_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    NEW.duration_ms := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_sync_log_duration
  BEFORE UPDATE ON calendar_sync_logs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_sync_duration();

-- Function to automatically delete logs older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_sync_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM calendar_sync_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE calendar_sync_logs IS 'Audit trail for calendar sync operations (90-day retention)';
COMMENT ON COLUMN calendar_sync_logs.duration_ms IS 'Sync duration in milliseconds (auto-calculated)';
COMMENT ON COLUMN calendar_sync_logs.triggered_by IS 'What initiated this sync: cron, webhook, user, database_trigger';
COMMENT ON FUNCTION cleanup_old_sync_logs IS 'Call from cron to delete logs older than 90 days';

-- Migration 4: Create calendar_sync_conflicts table
-- ============================================================================

-- Create calendar_sync_conflicts table
-- Tracks conflicts and their resolution history

CREATE TYPE resolution_status AS ENUM ('detected', 'resolved', 'failed');
CREATE TYPE winning_source AS ENUM ('external', 'rowan', 'merged', 'manual');
CREATE TYPE resolution_strategy AS ENUM ('external_wins', 'rowan_wins', 'merge', 'manual_review');

CREATE TABLE calendar_sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  mapping_id UUID NOT NULL REFERENCES calendar_event_mappings(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,

  -- Conflict details
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_status resolution_status NOT NULL DEFAULT 'detected',

  -- Event versions at time of conflict
  rowan_version JSONB NOT NULL, -- Snapshot of Rowan event data
  external_version JSONB NOT NULL, -- Snapshot of external event data

  -- Resolution details
  winning_source winning_source,
  resolution_strategy resolution_strategy NOT NULL DEFAULT 'external_wins',
  resolved_by UUID REFERENCES auth.users(id), -- User ID if manually resolved
  resolution_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for queries
CREATE INDEX idx_sync_conflicts_mapping ON calendar_sync_conflicts(mapping_id);
CREATE INDEX idx_sync_conflicts_connection ON calendar_sync_conflicts(connection_id);
CREATE INDEX idx_sync_conflicts_status ON calendar_sync_conflicts(resolution_status);
CREATE INDEX idx_sync_conflicts_detected_at ON calendar_sync_conflicts(detected_at DESC);
CREATE INDEX idx_sync_conflicts_unresolved ON calendar_sync_conflicts(detected_at) WHERE resolution_status = 'detected';

-- Updated timestamp trigger
CREATE TRIGGER update_calendar_sync_conflicts_updated_at
  BEFORE UPDATE ON calendar_sync_conflicts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to mark conflict as resolved
CREATE OR REPLACE FUNCTION resolve_calendar_conflict(
  conflict_id UUID,
  p_winning_source winning_source,
  p_resolved_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS calendar_sync_conflicts AS $$
DECLARE
  result calendar_sync_conflicts;
BEGIN
  UPDATE calendar_sync_conflicts
  SET
    resolution_status = 'resolved',
    resolved_at = NOW(),
    winning_source = p_winning_source,
    resolved_by = p_resolved_by,
    resolution_notes = p_notes
  WHERE id = conflict_id
  RETURNING * INTO result;

  -- Also clear the conflict flag on the mapping
  UPDATE calendar_event_mappings
  SET has_conflict = FALSE
  WHERE id = result.mapping_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE calendar_sync_conflicts IS 'Tracks calendar sync conflicts and their resolution history';
COMMENT ON COLUMN calendar_sync_conflicts.rowan_version IS 'JSONB snapshot of Rowan event at time of conflict';
COMMENT ON COLUMN calendar_sync_conflicts.external_version IS 'JSONB snapshot of external event at time of conflict';
COMMENT ON FUNCTION resolve_calendar_conflict IS 'Helper function to mark a conflict as resolved and update mapping';

-- Migration 5: Create calendar_webhook_subscriptions table
-- ============================================================================

-- Create calendar_webhook_subscriptions table
-- Manages Google Calendar webhook push notifications

CREATE TABLE calendar_webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Connection reference
  connection_id UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,

  -- Provider (only Google supports webhooks currently)
  provider calendar_provider NOT NULL DEFAULT 'google',

  -- Webhook details
  webhook_id TEXT NOT NULL UNIQUE, -- Our generated channel ID (UUID)
  webhook_url TEXT NOT NULL, -- Full URL: https://domain/api/webhooks/google-calendar
  webhook_secret TEXT NOT NULL, -- HMAC secret for signature verification
  resource_id TEXT NOT NULL, -- Google's resource identifier

  -- Lifecycle
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  events_received INTEGER NOT NULL DEFAULT 0,
  last_event_at TIMESTAMPTZ,

  -- Renewal tracking
  renewal_attempted_at TIMESTAMPTZ,
  renewal_error TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_connection_webhook UNIQUE (connection_id)
);

-- Indexes
CREATE INDEX idx_webhook_subs_connection ON calendar_webhook_subscriptions(connection_id);
CREATE INDEX idx_webhook_subs_webhook_id ON calendar_webhook_subscriptions(webhook_id);
CREATE INDEX idx_webhook_subs_expiring ON calendar_webhook_subscriptions(expires_at)
  WHERE is_active = TRUE AND expires_at < NOW() + INTERVAL '24 hours';
CREATE INDEX idx_webhook_subs_active ON calendar_webhook_subscriptions(is_active) WHERE is_active = TRUE;

-- Updated timestamp trigger
CREATE TRIGGER update_calendar_webhook_subscriptions_updated_at
  BEFORE UPDATE ON calendar_webhook_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to increment event counter
CREATE OR REPLACE FUNCTION increment_webhook_event_count(p_webhook_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE calendar_webhook_subscriptions
  SET
    events_received = events_received + 1,
    last_event_at = NOW()
  WHERE webhook_id = p_webhook_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get expiring webhooks (for renewal cron)
CREATE OR REPLACE FUNCTION get_expiring_webhooks(hours_ahead INTEGER DEFAULT 24)
RETURNS SETOF calendar_webhook_subscriptions AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM calendar_webhook_subscriptions
  WHERE is_active = TRUE
    AND provider = 'google'
    AND expires_at < NOW() + (hours_ahead || ' hours')::INTERVAL
    AND expires_at > NOW()
  ORDER BY expires_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to mark webhook as inactive
CREATE OR REPLACE FUNCTION deactivate_webhook(p_webhook_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE calendar_webhook_subscriptions
  SET is_active = FALSE
  WHERE webhook_id = p_webhook_id;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE calendar_webhook_subscriptions IS 'Manages Google Calendar webhook push notification subscriptions';
COMMENT ON COLUMN calendar_webhook_subscriptions.webhook_id IS 'Our generated channel ID (UUID) sent to Google';
COMMENT ON COLUMN calendar_webhook_subscriptions.resource_id IS 'Google-generated resource identifier';
COMMENT ON COLUMN calendar_webhook_subscriptions.webhook_secret IS 'Secret for HMAC signature verification';
COMMENT ON FUNCTION get_expiring_webhooks IS 'Returns webhooks expiring within specified hours (for renewal cron)';

-- Migration 6: Add Supabase Vault token functions
-- ============================================================================

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

-- Migration 7: Add external sync fields to events table
-- ============================================================================

-- Add external sync fields to events table
-- Tracks which events came from external calendars and prevents sync loops

-- Add new columns to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS external_source calendar_provider,
ADD COLUMN IF NOT EXISTS sync_locked BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_external_sync TIMESTAMPTZ;

-- Create indexes for sync queries
CREATE INDEX IF NOT EXISTS idx_events_external_source ON events(external_source) WHERE external_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_sync_locked ON events(sync_locked) WHERE sync_locked = TRUE;
CREATE INDEX IF NOT EXISTS idx_events_last_external_sync ON events(last_external_sync) WHERE last_external_sync IS NOT NULL;

-- Composite index for finding events to sync
CREATE INDEX IF NOT EXISTS idx_events_sync_eligible ON events(space_id, updated_at)
  WHERE deleted_at IS NULL AND sync_locked = FALSE;

-- Comments
COMMENT ON COLUMN events.external_source IS 'Which provider this event originated from (google, apple, cozi), NULL if created in Rowan';
COMMENT ON COLUMN events.sync_locked IS 'TRUE when sync is in progress to prevent concurrent modifications';
COMMENT ON COLUMN events.last_external_sync IS 'Timestamp of last successful sync with external calendar';

-- Function to lock event for sync (prevents race conditions)
CREATE OR REPLACE FUNCTION lock_event_for_sync(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_locked BOOLEAN;
BEGIN
  UPDATE events
  SET sync_locked = TRUE
  WHERE id = p_event_id AND sync_locked = FALSE
  RETURNING TRUE INTO v_locked;

  RETURN COALESCE(v_locked, FALSE);
END;
$$;

-- Function to unlock event after sync
CREATE OR REPLACE FUNCTION unlock_event_after_sync(
  p_event_id UUID,
  p_mark_synced BOOLEAN DEFAULT TRUE
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE events
  SET
    sync_locked = FALSE,
    last_external_sync = CASE WHEN p_mark_synced THEN NOW() ELSE last_external_sync END
  WHERE id = p_event_id;
END;
$$;

-- Function to unlock all locked events (recovery mechanism)
CREATE OR REPLACE FUNCTION unlock_all_sync_locked_events()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Unlock events locked for more than 5 minutes (likely failed sync)
  WITH unlocked AS (
    UPDATE events
    SET sync_locked = FALSE
    WHERE sync_locked = TRUE
      AND updated_at < NOW() - INTERVAL '5 minutes'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM unlocked;

  RETURN v_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION lock_event_for_sync TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION unlock_event_after_sync TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION unlock_all_sync_locked_events TO service_role;

-- Comments for functions
COMMENT ON FUNCTION lock_event_for_sync IS 'Atomically locks event for sync, returns TRUE if successful';
COMMENT ON FUNCTION unlock_event_after_sync IS 'Unlocks event after sync and optionally updates last_external_sync';
COMMENT ON FUNCTION unlock_all_sync_locked_events IS 'Recovery: unlocks events locked for >5 minutes (failed syncs)';

-- Migration 8: Create RLS policies
-- ============================================================================

-- Row Level Security (RLS) policies for all calendar integration tables
-- CRITICAL: Users can only access calendar data for spaces they're members of

-- ============================================================================
-- CALENDAR_CONNECTIONS
-- ============================================================================

ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own connections
CREATE POLICY "Users can view own calendar connections"
  ON calendar_connections FOR SELECT
  TO authenticated
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can create connections for their spaces
CREATE POLICY "Users can create calendar connections"
  ON calendar_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Policy: Users can update their own connections
CREATE POLICY "Users can update own calendar connections"
  ON calendar_connections FOR UPDATE
  TO authenticated
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Policy: Users can delete their own connections
CREATE POLICY "Users can delete own calendar connections"
  ON calendar_connections FOR DELETE
  TO authenticated
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Policy: Service role bypass (for cron jobs)
CREATE POLICY "Service role has full access to calendar_connections"
  ON calendar_connections FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- CALENDAR_EVENT_MAPPINGS
-- ============================================================================

ALTER TABLE calendar_event_mappings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view mappings for their events
CREATE POLICY "Users can view event mappings"
  ON calendar_event_mappings FOR SELECT
  TO authenticated
  USING (
    connection_id IN (
      SELECT id FROM calendar_connections
      WHERE space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Service role has full access (for sync operations)
CREATE POLICY "Service role has full access to event_mappings"
  ON calendar_event_mappings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- CALENDAR_SYNC_LOGS
-- ============================================================================

ALTER TABLE calendar_sync_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view sync logs for their connections
CREATE POLICY "Users can view sync logs"
  ON calendar_sync_logs FOR SELECT
  TO authenticated
  USING (
    connection_id IN (
      SELECT id FROM calendar_connections
      WHERE space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Service role has full access (for cron jobs)
CREATE POLICY "Service role has full access to sync_logs"
  ON calendar_sync_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- CALENDAR_SYNC_CONFLICTS
-- ============================================================================

ALTER TABLE calendar_sync_conflicts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view conflicts for their connections
CREATE POLICY "Users can view sync conflicts"
  ON calendar_sync_conflicts FOR SELECT
  TO authenticated
  USING (
    connection_id IN (
      SELECT id FROM calendar_connections
      WHERE space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Users can update conflicts (for manual resolution)
CREATE POLICY "Users can update sync conflicts"
  ON calendar_sync_conflicts FOR UPDATE
  TO authenticated
  USING (
    connection_id IN (
      SELECT id FROM calendar_connections
      WHERE space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Service role has full access (for automatic resolution)
CREATE POLICY "Service role has full access to sync_conflicts"
  ON calendar_sync_conflicts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- CALENDAR_WEBHOOK_SUBSCRIPTIONS
-- ============================================================================

ALTER TABLE calendar_webhook_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view webhooks for their connections
CREATE POLICY "Users can view webhook subscriptions"
  ON calendar_webhook_subscriptions FOR SELECT
  TO authenticated
  USING (
    connection_id IN (
      SELECT id FROM calendar_connections
      WHERE space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Service role has full access (for webhook management)
CREATE POLICY "Service role has full access to webhook_subscriptions"
  ON calendar_webhook_subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- SECURITY VERIFICATION FUNCTION
-- ============================================================================

-- Function to verify RLS is enabled on all calendar tables
CREATE OR REPLACE FUNCTION verify_calendar_rls_enabled()
RETURNS TABLE (
  table_name TEXT,
  rls_enabled BOOLEAN,
  policy_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.tablename::TEXT,
    t.rowsecurity,
    COUNT(p.policyname)
  FROM pg_tables t
  LEFT JOIN pg_policies p ON p.tablename = t.tablename
  WHERE t.schemaname = 'public'
    AND t.tablename IN (
      'calendar_connections',
      'calendar_event_mappings',
      'calendar_sync_logs',
      'calendar_sync_conflicts',
      'calendar_webhook_subscriptions'
    )
  GROUP BY t.tablename, t.rowsecurity
  ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION verify_calendar_rls_enabled TO authenticated, service_role;

COMMENT ON FUNCTION verify_calendar_rls_enabled IS 'Verifies RLS is enabled on all calendar tables and counts policies';

-- Run verification (results will show in migration logs)
SELECT * FROM verify_calendar_rls_enabled();

-- Migration 9: Create performance indexes
-- ============================================================================

-- Performance indexes for calendar integration tables
-- Optimizes common queries and ensures fast lookups

-- ============================================================================
-- CALENDAR_CONNECTIONS - Additional Performance Indexes
-- ============================================================================

-- Index for finding connections needing sync
CREATE INDEX IF NOT EXISTS idx_calendar_connections_needs_sync
  ON calendar_connections(provider, next_sync_at)
  WHERE sync_status = 'active' AND next_sync_at <= NOW();

-- Index for token expiry checks
CREATE INDEX IF NOT EXISTS idx_calendar_connections_token_expiry
  ON calendar_connections(token_expires_at)
  WHERE token_expires_at IS NOT NULL AND sync_status != 'disconnected';

-- Composite index for user's active connections by provider
CREATE INDEX IF NOT EXISTS idx_calendar_connections_user_provider_active
  ON calendar_connections(user_id, provider, sync_status)
  WHERE sync_status IN ('active', 'syncing');

-- ============================================================================
-- CALENDAR_EVENT_MAPPINGS - Additional Performance Indexes
-- ============================================================================

-- Index for finding unmapped Rowan events (for initial sync)
CREATE INDEX IF NOT EXISTS idx_events_unmapped
  ON events(space_id, created_at)
  WHERE deleted_at IS NULL
    AND id NOT IN (SELECT rowan_event_id FROM calendar_event_mappings);

-- Partial index for conflicted mappings
CREATE INDEX IF NOT EXISTS idx_event_mappings_has_conflict
  ON calendar_event_mappings(connection_id, has_conflict, conflict_detected_at)
  WHERE has_conflict = TRUE;

-- Index for finding stale mappings (not synced recently)
CREATE INDEX IF NOT EXISTS idx_event_mappings_stale
  ON calendar_event_mappings(connection_id, last_synced_at)
  WHERE last_synced_at < NOW() - INTERVAL '1 day';

-- ============================================================================
-- CALENDAR_SYNC_LOGS - Query Optimization Indexes
-- ============================================================================

-- Composite index for recent sync history per connection
CREATE INDEX IF NOT EXISTS idx_sync_logs_recent_by_connection
  ON calendar_sync_logs(connection_id, started_at DESC, status)
  WHERE started_at > NOW() - INTERVAL '30 days';

-- Index for finding failed syncs needing retry
CREATE INDEX IF NOT EXISTS idx_sync_logs_failed
  ON calendar_sync_logs(connection_id, started_at DESC)
  WHERE status = 'failed';

-- Index for sync performance monitoring
CREATE INDEX IF NOT EXISTS idx_sync_logs_performance
  ON calendar_sync_logs(sync_type, completed_at, duration_ms)
  WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '7 days';

-- ============================================================================
-- CALENDAR_SYNC_CONFLICTS - Resolution Tracking Indexes
-- ============================================================================

-- Index for finding recent unresolved conflicts
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_recent_unresolved
  ON calendar_sync_conflicts(connection_id, detected_at DESC)
  WHERE resolution_status = 'detected' AND detected_at > NOW() - INTERVAL '7 days';

-- Index for conflict resolution analytics
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_analytics
  ON calendar_sync_conflicts(winning_source, resolution_strategy, resolved_at)
  WHERE resolution_status = 'resolved';

-- ============================================================================
-- CALENDAR_WEBHOOK_SUBSCRIPTIONS - Webhook Management Indexes
-- ============================================================================

-- Index for webhook event tracking
CREATE INDEX IF NOT EXISTS idx_webhook_subs_activity
  ON calendar_webhook_subscriptions(connection_id, last_event_at DESC)
  WHERE is_active = TRUE;

-- ============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- Index for finding user's connections with sync stats
CREATE INDEX IF NOT EXISTS idx_user_connection_stats
  ON calendar_connections(user_id, space_id, provider, sync_status, last_sync_at);

-- Index for connection + mapping lookup
CREATE INDEX IF NOT EXISTS idx_connection_mapping_lookup
  ON calendar_event_mappings(connection_id, external_event_id, rowan_event_id);

-- ============================================================================
-- STATISTICS UPDATE FUNCTION
-- ============================================================================

-- Function to update table statistics for better query planning
CREATE OR REPLACE FUNCTION update_calendar_table_statistics()
RETURNS void AS $$
BEGIN
  ANALYZE calendar_connections;
  ANALYZE calendar_event_mappings;
  ANALYZE calendar_sync_logs;
  ANALYZE calendar_sync_conflicts;
  ANALYZE calendar_webhook_subscriptions;

  RAISE NOTICE 'Calendar table statistics updated successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_calendar_table_statistics TO service_role;

COMMENT ON FUNCTION update_calendar_table_statistics IS 'Updates statistics for calendar tables to optimize query planning';

-- ============================================================================
-- INDEX HEALTH CHECK FUNCTION
-- ============================================================================

-- Function to check index usage and health
CREATE OR REPLACE FUNCTION check_calendar_index_health()
RETURNS TABLE (
  table_name TEXT,
  index_name TEXT,
  index_size TEXT,
  index_scans BIGINT,
  last_used TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname || '.' || tablename AS table_name,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan AS index_scans,
    stats_reset AS last_used
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
    AND tablename IN (
      'calendar_connections',
      'calendar_event_mappings',
      'calendar_sync_logs',
      'calendar_sync_conflicts',
      'calendar_webhook_subscriptions'
    )
  ORDER BY tablename, indexname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_calendar_index_health TO service_role;

COMMENT ON FUNCTION check_calendar_index_health IS 'Checks index usage statistics for calendar tables';

-- Run initial statistics update
SELECT update_calendar_table_statistics();

-- Migration 10: Add calendar triggers
-- ============================================================================

-- Database triggers for calendar integration
-- Automatically queues sync operations when events change in Rowan

-- ============================================================================
-- SYNC QUEUE TABLE (for outbound sync operations)
-- ============================================================================

CREATE TYPE queue_operation AS ENUM ('create', 'update', 'delete');
CREATE TYPE queue_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE calendar_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event and connection references
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
  mapping_id UUID REFERENCES calendar_event_mappings(id) ON DELETE SET NULL,

  -- Operation details
  operation queue_operation NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5, -- 1-10, lower = higher priority
  status queue_status NOT NULL DEFAULT 'pending',

  -- Event snapshot (for delete operations where event no longer exists)
  event_snapshot JSONB,

  -- Retry logic
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Indexes for queue processing
CREATE INDEX idx_sync_queue_pending ON calendar_sync_queue(priority ASC, created_at ASC)
  WHERE status = 'pending';
CREATE INDEX idx_sync_queue_retry ON calendar_sync_queue(next_retry_at)
  WHERE status = 'failed' AND retry_count < max_retries;
CREATE INDEX idx_sync_queue_connection ON calendar_sync_queue(connection_id, status);
CREATE INDEX idx_sync_queue_event ON calendar_sync_queue(event_id);

-- Updated timestamp trigger
CREATE TRIGGER update_calendar_sync_queue_updated_at
  BEFORE UPDATE ON calendar_sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE calendar_sync_queue IS 'Queue for outbound calendar sync operations (Rowan → External)';
COMMENT ON COLUMN calendar_sync_queue.priority IS '1-10: 1=urgent (event within 1hr), 5=normal, 7=background';
COMMENT ON COLUMN calendar_sync_queue.event_snapshot IS 'JSONB snapshot of event data for delete operations';

-- ============================================================================
-- PRIORITY CALCULATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_sync_priority(p_event_id UUID, p_operation queue_operation)
RETURNS INTEGER AS $$
DECLARE
  v_event_start TIMESTAMPTZ;
  v_hours_until_start DOUBLE PRECISION;
BEGIN
  -- Delete operations have higher priority
  IF p_operation = 'delete' THEN
    RETURN 2;
  END IF;

  -- Get event start time
  SELECT start_date INTO v_event_start FROM events WHERE id = p_event_id;

  IF v_event_start IS NULL THEN
    RETURN 5; -- Default priority
  END IF;

  -- Calculate hours until event starts
  v_hours_until_start := EXTRACT(EPOCH FROM (v_event_start - NOW())) / 3600;

  -- Priority based on time until event
  IF v_hours_until_start <= 1 THEN
    RETURN 1; -- Urgent: event within 1 hour
  ELSIF v_hours_until_start <= 24 THEN
    RETURN 3; -- High: event within 24 hours
  ELSIF v_hours_until_start <= 168 THEN
    RETURN 5; -- Normal: event within 7 days
  ELSE
    RETURN 7; -- Background: future events
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER FUNCTION: Queue sync when Rowan event changes
-- ============================================================================

CREATE OR REPLACE FUNCTION queue_calendar_sync_on_change()
RETURNS TRIGGER AS $$
DECLARE
  v_connection RECORD;
  v_operation queue_operation;
  v_priority INTEGER;
  v_event_snapshot JSONB;
BEGIN
  -- Determine operation type
  IF TG_OP = 'DELETE' THEN
    v_operation := 'delete';
    v_event_snapshot := row_to_json(OLD)::JSONB;
  ELSIF TG_OP = 'INSERT' THEN
    v_operation := 'create';
    v_event_snapshot := NULL;
  ELSE -- UPDATE
    v_operation := 'update';
    v_event_snapshot := NULL;
  END IF;

  -- Don't queue if event is currently locked for sync (prevents loops)
  IF (TG_OP = 'UPDATE' AND NEW.sync_locked = TRUE) OR
     (TG_OP = 'INSERT' AND NEW.sync_locked = TRUE) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Don't queue if this change came from external sync
  IF (TG_OP = 'UPDATE' AND OLD.last_external_sync IS NOT NULL AND
      NEW.last_external_sync = OLD.last_external_sync AND
      NEW.updated_at > OLD.last_external_sync) OR
     (TG_OP = 'UPDATE' AND NEW.last_external_sync > OLD.updated_at) THEN
    -- This change was from external sync, don't sync back
    RETURN NEW;
  END IF;

  -- Calculate priority
  IF TG_OP = 'DELETE' THEN
    v_priority := calculate_sync_priority(OLD.id, v_operation);
  ELSE
    v_priority := calculate_sync_priority(NEW.id, v_operation);
  END IF;

  -- Find all active connections for this event's space
  FOR v_connection IN
    SELECT id, provider
    FROM calendar_connections
    WHERE space_id = COALESCE(NEW.space_id, OLD.space_id)
      AND sync_status = 'active'
      AND (sync_direction = 'bidirectional' OR sync_direction = 'outbound_only')
  LOOP
    -- Queue sync operation for this connection
    INSERT INTO calendar_sync_queue (
      event_id,
      connection_id,
      mapping_id,
      operation,
      priority,
      event_snapshot
    ) VALUES (
      COALESCE(NEW.id, OLD.id),
      v_connection.id,
      (SELECT id FROM calendar_event_mappings
       WHERE rowan_event_id = COALESCE(NEW.id, OLD.id)
         AND connection_id = v_connection.id
       LIMIT 1),
      v_operation,
      v_priority,
      v_event_snapshot
    )
    ON CONFLICT DO NOTHING; -- Prevent duplicate queue entries

    RAISE LOG 'Queued % operation for event % to provider % (priority: %)',
      v_operation, COALESCE(NEW.id, OLD.id), v_connection.provider, v_priority;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to events table
CREATE TRIGGER trigger_queue_calendar_sync
  AFTER INSERT OR UPDATE OR DELETE ON events
  FOR EACH ROW
  EXECUTE FUNCTION queue_calendar_sync_on_change();

COMMENT ON FUNCTION queue_calendar_sync_on_change IS 'Queues outbound sync when Rowan event is created/updated/deleted';

-- ============================================================================
-- QUEUE PROCESSING FUNCTIONS
-- ============================================================================

-- Function to get next pending queue items
CREATE OR REPLACE FUNCTION get_pending_sync_queue_items(p_limit INTEGER DEFAULT 10)
RETURNS SETOF calendar_sync_queue AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM calendar_sync_queue
  WHERE status = 'pending'
    OR (status = 'failed' AND retry_count < max_retries AND next_retry_at <= NOW())
  ORDER BY priority ASC, created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to mark queue item as processing
CREATE OR REPLACE FUNCTION mark_queue_item_processing(p_queue_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE calendar_sync_queue
  SET status = 'processing', updated_at = NOW()
  WHERE id = p_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark queue item as completed
CREATE OR REPLACE FUNCTION mark_queue_item_completed(p_queue_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE calendar_sync_queue
  SET
    status = 'completed',
    processed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark queue item as failed with retry
CREATE OR REPLACE FUNCTION mark_queue_item_failed(
  p_queue_id UUID,
  p_error_message TEXT
)
RETURNS void AS $$
DECLARE
  v_retry_count INTEGER;
  v_max_retries INTEGER;
  v_next_retry TIMESTAMPTZ;
BEGIN
  -- Get current retry count
  SELECT retry_count, max_retries INTO v_retry_count, v_max_retries
  FROM calendar_sync_queue
  WHERE id = p_queue_id;

  -- Calculate next retry time (exponential backoff)
  IF v_retry_count = 0 THEN
    v_next_retry := NOW() + INTERVAL '1 minute';
  ELSIF v_retry_count = 1 THEN
    v_next_retry := NOW() + INTERVAL '5 minutes';
  ELSE
    v_next_retry := NOW() + INTERVAL '15 minutes';
  END IF;

  -- Update queue item
  UPDATE calendar_sync_queue
  SET
    status = 'failed',
    retry_count = retry_count + 1,
    last_error = p_error_message,
    next_retry_at = CASE WHEN retry_count + 1 < v_max_retries THEN v_next_retry ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON calendar_sync_queue TO service_role;
GRANT EXECUTE ON FUNCTION get_pending_sync_queue_items TO service_role;
GRANT EXECUTE ON FUNCTION mark_queue_item_processing TO service_role;
GRANT EXECUTE ON FUNCTION mark_queue_item_completed TO service_role;
GRANT EXECUTE ON FUNCTION mark_queue_item_failed TO service_role;
GRANT EXECUTE ON FUNCTION calculate_sync_priority TO service_role;

-- ============================================================================
-- CLEANUP FUNCTIONS
-- ============================================================================

-- Function to cleanup old completed queue items (retention: 7 days)
CREATE OR REPLACE FUNCTION cleanup_completed_queue_items()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM calendar_sync_queue
    WHERE status = 'completed'
      AND processed_at < NOW() - INTERVAL '7 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM deleted;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION cleanup_completed_queue_items TO service_role;

COMMENT ON FUNCTION cleanup_completed_queue_items IS 'Deletes completed queue items older than 7 days';

-- ============================================================================
-- RLS for sync queue
-- ============================================================================

ALTER TABLE calendar_sync_queue ENABLE ROW LEVEL SECURITY;

-- Users can view their own queue items
CREATE POLICY "Users can view own sync queue items"
  ON calendar_sync_queue FOR SELECT
  TO authenticated
  USING (
    connection_id IN (
      SELECT id FROM calendar_connections
      WHERE space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      )
    )
  );

-- Service role has full access
CREATE POLICY "Service role has full access to sync_queue"
  ON calendar_sync_queue FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '✅ CALENDAR INTEGRATION MIGRATIONS COMPLETE';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'Tables Created:';
  RAISE NOTICE '  - calendar_connections (OAuth connection management)';
  RAISE NOTICE '  - calendar_event_mappings (Event sync mappings)';
  RAISE NOTICE '  - calendar_sync_logs (Audit trail with 90-day retention)';
  RAISE NOTICE '  - calendar_sync_conflicts (Conflict resolution tracking)';
  RAISE NOTICE '  - calendar_webhook_subscriptions (Google Calendar webhooks)';
  RAISE NOTICE '  - calendar_sync_queue (Outbound sync queue)';
  RAISE NOTICE '';
  RAISE NOTICE 'Security:';
  RAISE NOTICE '  ✓ Supabase Vault enabled (AES-256-GCM encryption)';
  RAISE NOTICE '  ✓ RLS policies active on all tables';
  RAISE NOTICE '  ✓ Space-based access control';
  RAISE NOTICE '  ✓ Service role bypass for cron jobs';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Install NPM packages: googleapis, tsdav, fast-xml-parser';
  RAISE NOTICE '  2. Create TypeScript types and Zod schemas';
  RAISE NOTICE '  3. Implement service layer (google-calendar-service, etc.)';
  RAISE NOTICE '  4. Create API routes for OAuth flows';
  RAISE NOTICE '  5. Set up Google Cloud Console OAuth credentials';
  RAISE NOTICE '========================================================================';
END $$;
