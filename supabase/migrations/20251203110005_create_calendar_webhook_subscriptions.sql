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
