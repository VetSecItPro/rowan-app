-- Create notification queue table for comprehensive notification system
-- Part of Phase 1: Database Schema & Preferences Backend

-- Notification queue table for batching and reliable delivery
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  notification_type TEXT NOT NULL, -- 'email', 'push'
  category TEXT NOT NULL, -- 'task', 'reminder', 'message', 'shopping', 'meal', 'event', 'general'
  priority TEXT DEFAULT 'normal', -- 'urgent', 'normal', 'low'

  subject TEXT,
  content JSONB NOT NULL,

  -- Delivery settings
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  digest_eligible BOOLEAN DEFAULT true,

  -- Status tracking
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'batched'
  attempts INTEGER DEFAULT 0,
  last_attempt TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_notification_type CHECK (notification_type IN ('email', 'push')),
  CONSTRAINT valid_category CHECK (category IN ('task', 'reminder', 'message', 'shopping', 'meal', 'event', 'general')),
  CONSTRAINT valid_priority CHECK (priority IN ('urgent', 'normal', 'low')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'failed', 'batched'))
);

-- Enable RLS for security
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification queue
CREATE POLICY "Users can view their own notifications in queue"
ON notification_queue FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications for users"
ON notification_queue FOR INSERT
WITH CHECK (true); -- Allow system to insert notifications

CREATE POLICY "System can update notification status"
ON notification_queue FOR UPDATE
USING (true); -- Allow system to update status/attempts

CREATE POLICY "System can delete processed notifications"
ON notification_queue FOR DELETE
USING (true); -- Allow cleanup of old notifications

-- Indexes for performance
CREATE INDEX idx_notification_queue_user_status ON notification_queue(user_id, status);
CREATE INDEX idx_notification_queue_scheduled ON notification_queue(scheduled_for);
CREATE INDEX idx_notification_queue_category ON notification_queue(category);
CREATE INDEX idx_notification_queue_type_priority ON notification_queue(notification_type, priority);
CREATE INDEX idx_notification_queue_digest_eligible ON notification_queue(digest_eligible, scheduled_for);

-- Function to clean up old processed notifications (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notification_queue
  WHERE status IN ('sent', 'failed')
  AND created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending notifications for digest
CREATE OR REPLACE FUNCTION get_digest_notifications(
  target_user_id UUID,
  digest_type TEXT DEFAULT 'daily'
)
RETURNS TABLE (
  notification_id UUID,
  notification_type TEXT,
  category TEXT,
  priority TEXT,
  subject TEXT,
  content JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    nq.id,
    nq.notification_type,
    nq.category,
    nq.priority,
    nq.subject,
    nq.content,
    nq.created_at
  FROM notification_queue nq
  WHERE nq.user_id = target_user_id
    AND nq.status = 'pending'
    AND nq.digest_eligible = true
    AND nq.scheduled_for <= NOW()
  ORDER BY
    CASE nq.priority
      WHEN 'urgent' THEN 1
      WHEN 'normal' THEN 2
      WHEN 'low' THEN 3
    END,
    nq.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notifications as batched
CREATE OR REPLACE FUNCTION mark_notifications_batched(notification_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notification_queue
  SET status = 'batched', last_attempt = NOW()
  WHERE id = ANY(notification_ids);

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;