-- Add notification queue table for batching (hourly/daily digests)
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,

  -- Notification details
  notification_type TEXT NOT NULL,
  notification_data JSONB NOT NULL,

  -- Batching info
  delivery_method TEXT NOT NULL, -- 'instant', 'hourly', 'daily'
  scheduled_for TIMESTAMPTZ NOT NULL,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Quiet hours handling
  suppressed_by_quiet_hours BOOLEAN DEFAULT false,
  original_scheduled_for TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_delivery_method CHECK (delivery_method IN ('instant', 'hourly', 'daily')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'failed', 'cancelled'))
);

-- Add indexes for efficient querying
CREATE INDEX idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX idx_notification_queue_space_id ON notification_queue(space_id);
CREATE INDEX idx_notification_queue_status ON notification_queue(status) WHERE status = 'pending';
CREATE INDEX idx_notification_queue_scheduled ON notification_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_notification_queue_delivery ON notification_queue(delivery_method, scheduled_for) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only allow service role to manage queue
CREATE POLICY "Service role can manage notification queue"
  ON notification_queue
  FOR ALL
  USING (auth.role() = 'service_role');

-- Users can view their own queued notifications (for debugging)
CREATE POLICY "Users can view their own queued notifications"
  ON notification_queue
  FOR SELECT
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_notification_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_queue_updated_at
  BEFORE UPDATE ON notification_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_queue_updated_at();

-- Add comment
COMMENT ON TABLE notification_queue IS 'Queue for batched notifications (hourly/daily digests) and quiet hours management';
