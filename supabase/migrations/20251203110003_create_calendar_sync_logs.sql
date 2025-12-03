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
