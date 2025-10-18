-- Migration: Create in-app notifications table
-- Date: October 18, 2025
-- Purpose: Add comprehensive in-app notifications system for all notification types

-- ==========================================
-- ENABLE UUID EXTENSION
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- IN-APP NOTIFICATIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partnership_id UUID, -- Will be added when partnerships table exists

  -- Notification details
  type TEXT NOT NULL CHECK (type IN (
    'task', 'event', 'message', 'shopping', 'meal', 'reminder',
    'milestone', 'goal_update', 'expense', 'bill_due', 'space_invite', 'system'
  )),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Status tracking
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Context and navigation
  space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
  space_name TEXT,
  related_item_id UUID,
  related_item_type TEXT,
  action_url TEXT,

  -- Display customization
  emoji TEXT,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_name TEXT,

  -- Metadata for extensibility
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================
-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_in_app_notifs_user_id ON in_app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_in_app_notifs_user_created ON in_app_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_in_app_notifs_unread ON in_app_notifications(user_id, is_read) WHERE is_read = FALSE;

-- Filter indexes
CREATE INDEX IF NOT EXISTS idx_in_app_notifs_type ON in_app_notifications(user_id, type);
CREATE INDEX IF NOT EXISTS idx_in_app_notifs_priority ON in_app_notifications(user_id, priority);
CREATE INDEX IF NOT EXISTS idx_in_app_notifs_space ON in_app_notifications(space_id);

-- Partnership filtering
CREATE INDEX IF NOT EXISTS idx_in_app_notifs_partnership ON in_app_notifications(partnership_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_in_app_notifs_user_type_unread ON in_app_notifications(user_id, type, is_read);

-- ==========================================
-- ROW LEVEL SECURITY POLICIES
-- ==========================================
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON in_app_notifications;
CREATE POLICY "Users can view own notifications"
  ON in_app_notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read, etc.)
DROP POLICY IF EXISTS "Users can update own notifications" ON in_app_notifications;
CREATE POLICY "Users can update own notifications"
  ON in_app_notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON in_app_notifications;
CREATE POLICY "Users can delete own notifications"
  ON in_app_notifications FOR DELETE
  USING (user_id = auth.uid());

-- System/service role can insert notifications for any user
DROP POLICY IF EXISTS "System can insert notifications" ON in_app_notifications;
CREATE POLICY "System can insert notifications"
  ON in_app_notifications FOR INSERT
  WITH CHECK (true); -- Service role can insert for any user

-- ==========================================
-- TRIGGERS
-- ==========================================
-- Update updated_at timestamp on changes
CREATE OR REPLACE FUNCTION update_in_app_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_in_app_notifications_updated_at ON in_app_notifications;
CREATE TRIGGER set_in_app_notifications_updated_at
  BEFORE UPDATE ON in_app_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_in_app_notifications_updated_at();

-- Automatically set read_at timestamp when is_read changes to true
CREATE OR REPLACE FUNCTION set_notification_read_at()
RETURNS TRIGGER AS $$
BEGIN
  -- If marking as read and read_at is not set
  IF NEW.is_read = TRUE AND OLD.is_read = FALSE AND NEW.read_at IS NULL THEN
    NEW.read_at = NOW();
  END IF;

  -- If marking as unread, clear read_at
  IF NEW.is_read = FALSE AND OLD.is_read = TRUE THEN
    NEW.read_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_notification_read_at_trigger ON in_app_notifications;
CREATE TRIGGER set_notification_read_at_trigger
  BEFORE UPDATE ON in_app_notifications
  FOR EACH ROW
  EXECUTE FUNCTION set_notification_read_at();

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================
-- Function to create a notification (can be called by services)
CREATE OR REPLACE FUNCTION create_in_app_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_content TEXT,
  p_partnership_id UUID DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal',
  p_space_id UUID DEFAULT NULL,
  p_space_name TEXT DEFAULT NULL,
  p_related_item_id UUID DEFAULT NULL,
  p_related_item_type TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_emoji TEXT DEFAULT NULL,
  p_sender_id UUID DEFAULT NULL,
  p_sender_name TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO in_app_notifications (
    user_id, type, title, content, partnership_id, priority,
    space_id, space_name, related_item_id, related_item_type,
    action_url, emoji, sender_id, sender_name, metadata
  ) VALUES (
    p_user_id, p_type, p_title, p_content, p_partnership_id, p_priority,
    p_space_id, p_space_name, p_related_item_id, p_related_item_type,
    p_action_url, p_emoji, p_sender_id, p_sender_name, p_metadata
  )
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  count_result INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO count_result
  FROM in_app_notifications
  WHERE user_id = p_user_id AND is_read = FALSE;

  RETURN COALESCE(count_result, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE in_app_notifications
  SET is_read = TRUE, read_at = NOW(), updated_at = NOW()
  WHERE user_id = p_user_id AND is_read = FALSE;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old read notifications (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM in_app_notifications
  WHERE is_read = TRUE
    AND read_at < NOW() - INTERVAL '1 day' * days_to_keep;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- COMMENTS FOR DOCUMENTATION
-- ==========================================
COMMENT ON TABLE in_app_notifications IS 'Comprehensive in-app notifications for all notification types across the platform';
COMMENT ON COLUMN in_app_notifications.type IS 'Type of notification: task, event, message, shopping, meal, reminder, milestone, goal_update, expense, bill_due, space_invite, system';
COMMENT ON COLUMN in_app_notifications.priority IS 'Priority level: low, normal, high, urgent';
COMMENT ON COLUMN in_app_notifications.metadata IS 'Additional context data as JSON';
COMMENT ON COLUMN in_app_notifications.action_url IS 'URL to navigate when notification is clicked';
COMMENT ON COLUMN in_app_notifications.related_item_id IS 'ID of the related item (task_id, event_id, etc.)';
COMMENT ON COLUMN in_app_notifications.related_item_type IS 'Type of the related item (task, event, etc.)';

-- ==========================================
-- GRANT PERMISSIONS
-- ==========================================
-- Grant access to authenticated users for the functions
GRANT EXECUTE ON FUNCTION create_in_app_notification TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;