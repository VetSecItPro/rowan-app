-- =============================================
-- REMINDERS COLLABORATION: MULTI-CHANNEL NOTIFICATIONS
-- =============================================
-- This migration creates notification system for reminders including
-- in-app notifications, email notifications, and user preferences.

-- Create reminder_notifications table
CREATE TABLE IF NOT EXISTS reminder_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  channel TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add CHECK constraints for valid types and channels
ALTER TABLE reminder_notifications
  ADD CONSTRAINT valid_notification_type CHECK (
    type IN (
      'due',
      'overdue',
      'assigned',
      'unassigned',
      'mentioned',
      'commented',
      'completed',
      'snoozed'
    )
  );

ALTER TABLE reminder_notifications
  ADD CONSTRAINT valid_notification_channel CHECK (
    channel IN ('in_app', 'email', 'push')
  );

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_reminder_notifications_user_id ON reminder_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_notifications_reminder_id ON reminder_notifications(reminder_id);
CREATE INDEX IF NOT EXISTS idx_reminder_notifications_is_read ON reminder_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_reminder_notifications_created_at ON reminder_notifications(created_at DESC);

-- Composite index for common query pattern (get unread notifications for user)
CREATE INDEX IF NOT EXISTS idx_reminder_notifications_user_unread
  ON reminder_notifications(user_id, is_read, created_at DESC);

-- Enable RLS
ALTER TABLE reminder_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON reminder_notifications FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policy: System can insert notifications for any user
CREATE POLICY "System can insert notifications"
  ON reminder_notifications FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON reminder_notifications FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policy: No deletes allowed (keep notification history)
CREATE POLICY "No deletes allowed"
  ON reminder_notifications FOR DELETE
  USING (false);

-- Create user_notification_preferences table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,

  -- Email preferences
  email_enabled BOOLEAN DEFAULT TRUE,
  email_due_reminders BOOLEAN DEFAULT TRUE,
  email_assignments BOOLEAN DEFAULT TRUE,
  email_mentions BOOLEAN DEFAULT TRUE,
  email_comments BOOLEAN DEFAULT FALSE,

  -- In-app preferences
  in_app_enabled BOOLEAN DEFAULT TRUE,
  in_app_due_reminders BOOLEAN DEFAULT TRUE,
  in_app_assignments BOOLEAN DEFAULT TRUE,
  in_app_mentions BOOLEAN DEFAULT TRUE,
  in_app_comments BOOLEAN DEFAULT TRUE,

  -- Notification frequency
  notification_frequency TEXT DEFAULT 'instant',

  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, space_id)
);

-- Add CHECK constraint for notification frequency
ALTER TABLE user_notification_preferences
  ADD CONSTRAINT valid_notification_frequency CHECK (
    notification_frequency IN ('instant', 'hourly', 'daily', 'never')
  );

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id
  ON user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_space_id
  ON user_notification_preferences(space_id);

-- Enable RLS
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own preferences
CREATE POLICY "Users can view their own preferences"
  ON user_notification_preferences FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policy: Users can insert their own preferences
CREATE POLICY "Users can insert their own preferences"
  ON user_notification_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policy: Users can update their own preferences
CREATE POLICY "Users can update their own preferences"
  ON user_notification_preferences FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policy: Users can delete their own preferences
CREATE POLICY "Users can delete their own preferences"
  ON user_notification_preferences FOR DELETE
  USING (user_id = auth.uid());

-- Function to create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default preferences for the new space member
  INSERT INTO user_notification_preferences (user_id, space_id)
  VALUES (NEW.user_id, NEW.space_id)
  ON CONFLICT (user_id, space_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default preferences when user joins a space
DROP TRIGGER IF EXISTS create_default_notification_preferences_trigger ON space_members;
CREATE TRIGGER create_default_notification_preferences_trigger
  AFTER INSERT ON space_members
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- Function to check if user should receive notification (respects quiet hours)
CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id UUID,
  p_space_id UUID,
  p_notification_type TEXT,
  p_channel TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_prefs user_notification_preferences;
  v_current_time TIME;
BEGIN
  -- Get user preferences
  SELECT * INTO v_prefs
  FROM user_notification_preferences
  WHERE user_id = p_user_id AND space_id = p_space_id;

  -- If no preferences found, use defaults (allow)
  IF v_prefs IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if channel is enabled
  IF p_channel = 'email' AND NOT v_prefs.email_enabled THEN
    RETURN FALSE;
  END IF;

  IF p_channel = 'in_app' AND NOT v_prefs.in_app_enabled THEN
    RETURN FALSE;
  END IF;

  -- Check quiet hours
  IF v_prefs.quiet_hours_enabled AND v_prefs.quiet_hours_start IS NOT NULL AND v_prefs.quiet_hours_end IS NOT NULL THEN
    v_current_time := CURRENT_TIME;

    -- Handle quiet hours that span midnight
    IF v_prefs.quiet_hours_start > v_prefs.quiet_hours_end THEN
      IF v_current_time >= v_prefs.quiet_hours_start OR v_current_time < v_prefs.quiet_hours_end THEN
        RETURN FALSE;
      END IF;
    ELSE
      IF v_current_time >= v_prefs.quiet_hours_start AND v_current_time < v_prefs.quiet_hours_end THEN
        RETURN FALSE;
      END IF;
    END IF;
  END IF;

  -- Check type-specific preferences
  IF p_channel = 'email' THEN
    IF p_notification_type IN ('due', 'overdue') AND NOT v_prefs.email_due_reminders THEN
      RETURN FALSE;
    END IF;
    IF p_notification_type IN ('assigned', 'unassigned') AND NOT v_prefs.email_assignments THEN
      RETURN FALSE;
    END IF;
    IF p_notification_type = 'mentioned' AND NOT v_prefs.email_mentions THEN
      RETURN FALSE;
    END IF;
    IF p_notification_type = 'commented' AND NOT v_prefs.email_comments THEN
      RETURN FALSE;
    END IF;
  END IF;

  IF p_channel = 'in_app' THEN
    IF p_notification_type IN ('due', 'overdue') AND NOT v_prefs.in_app_due_reminders THEN
      RETURN FALSE;
    END IF;
    IF p_notification_type IN ('assigned', 'unassigned') AND NOT v_prefs.in_app_assignments THEN
      RETURN FALSE;
    END IF;
    IF p_notification_type = 'mentioned' AND NOT v_prefs.in_app_mentions THEN
      RETURN FALSE;
    END IF;
    IF p_notification_type = 'commented' AND NOT v_prefs.in_app_comments THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE reminder_notifications IS 'Notifications sent to users about reminder changes and due dates';
COMMENT ON TABLE user_notification_preferences IS 'User preferences for how and when to receive notifications';
COMMENT ON FUNCTION should_send_notification IS 'Checks user preferences and quiet hours to determine if notification should be sent';

-- Grant usage
GRANT SELECT, INSERT, UPDATE ON reminder_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_notification_preferences TO authenticated;
