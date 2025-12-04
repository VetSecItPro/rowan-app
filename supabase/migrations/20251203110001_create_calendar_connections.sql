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
