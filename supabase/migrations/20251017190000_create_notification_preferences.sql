-- Create notification preferences table for comprehensive notification system
-- Part of Phase 1: Database Schema & Preferences Backend

-- User notification preferences table.
-- Note: this table is also created in 20251014000020_create_reminder_notifications.sql
-- with a slightly different shape. IF NOT EXISTS makes the migration replay
-- cleanly; later migrations ALTER the table to land at the same final shape.
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Email Notifications
  email_task_assignments BOOLEAN DEFAULT true,
  email_event_reminders BOOLEAN DEFAULT true,
  email_new_messages BOOLEAN DEFAULT true,
  email_shopping_lists BOOLEAN DEFAULT true,
  email_meal_reminders BOOLEAN DEFAULT true,
  email_general_reminders BOOLEAN DEFAULT true,

  -- Push Notifications
  push_enabled BOOLEAN DEFAULT false,
  push_task_updates BOOLEAN DEFAULT true,
  push_reminders BOOLEAN DEFAULT true,
  push_messages BOOLEAN DEFAULT true,
  push_shopping_updates BOOLEAN DEFAULT true,
  push_event_alerts BOOLEAN DEFAULT true,

  -- Digest Settings
  digest_frequency TEXT DEFAULT 'daily', -- 'realtime', 'daily', 'weekly'
  digest_time TIME DEFAULT '08:00:00',

  -- Quiet Hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '07:00:00',
  timezone TEXT DEFAULT 'UTC',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one row per user
  UNIQUE(user_id)
);

-- Enable RLS for security
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification preferences
CREATE POLICY "Users can view their own notification preferences"
ON user_notification_preferences FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notification preferences"
ON user_notification_preferences FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notification preferences"
ON user_notification_preferences FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notification preferences"
ON user_notification_preferences FOR DELETE
USING (user_id = auth.uid());

-- Index for performance
CREATE INDEX idx_notification_preferences_user ON user_notification_preferences(user_id);

-- The earlier 20251014000020 creates this table without a unique constraint
-- on user_id. The ON CONFLICT (user_id) below requires one — add it
-- conditionally so prod (which already has it via 20251022000005) and a
-- fresh-DB replay both end up with the constraint.
DO $$
DECLARE
  has_unique BOOLEAN;
  has_dups   BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.conrelid = 'public.user_notification_preferences'::regclass
      AND c.contype = 'u'
      AND a.attname = 'user_id'
      AND array_length(c.conkey, 1) = 1
  ) INTO has_unique;

  IF NOT has_unique THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_notification_preferences
      GROUP BY user_id HAVING COUNT(*) > 1
    ) INTO has_dups;
    IF NOT has_dups THEN
      ALTER TABLE public.user_notification_preferences
        ADD CONSTRAINT user_notification_preferences_user_id_key UNIQUE (user_id);
    END IF;
  END IF;
END $$;

-- Create trigger for updated_at using existing function (drop-then-create
-- because the trigger may have been created by an earlier migration with
-- the same name).
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON user_notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to initialize default preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default preferences when user signs up
CREATE TRIGGER on_auth_user_created_notification_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_notification_preferences();

-- Backfill existing users with default preferences
INSERT INTO user_notification_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;