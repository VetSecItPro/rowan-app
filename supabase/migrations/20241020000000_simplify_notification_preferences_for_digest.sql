-- Simplify notification preferences table for daily digest system
-- This migration removes complex notification fields and keeps only digest preferences

-- First, let's add the digest-specific columns if they don't exist
ALTER TABLE user_notification_preferences
ADD COLUMN IF NOT EXISTS digest_enabled BOOLEAN DEFAULT true;

-- Update the digest_frequency field to be more specific for our use case
-- Keep it compatible with existing data
UPDATE user_notification_preferences
SET digest_enabled = true
WHERE digest_enabled IS NULL;

-- Drop all the complex notification fields that we're replacing with the digest system
-- We'll do this carefully to avoid breaking anything

-- Email notification fields (no longer needed - replaced by single digest)
ALTER TABLE user_notification_preferences
DROP COLUMN IF EXISTS email_task_assignments,
DROP COLUMN IF EXISTS email_event_reminders,
DROP COLUMN IF EXISTS email_new_messages,
DROP COLUMN IF EXISTS email_shopping_lists,
DROP COLUMN IF EXISTS email_meal_reminders,
DROP COLUMN IF EXISTS email_general_reminders;

-- Push notification fields (removing push notifications entirely)
ALTER TABLE user_notification_preferences
DROP COLUMN IF EXISTS push_enabled,
DROP COLUMN IF EXISTS push_task_updates,
DROP COLUMN IF EXISTS push_reminders,
DROP COLUMN IF EXISTS push_messages,
DROP COLUMN IF EXISTS push_shopping_updates,
DROP COLUMN IF EXISTS push_event_alerts;

-- Simplify the schema to just the digest fields we need
-- Keep: digest_enabled, digest_time, digest_frequency, timezone, quiet_hours for future use

-- Update the digest_frequency to have better default
ALTER TABLE user_notification_preferences
ALTER COLUMN digest_frequency SET DEFAULT 'daily';

-- Ensure timezone has a sensible default
ALTER TABLE user_notification_preferences
ALTER COLUMN timezone SET DEFAULT 'America/New_York';

-- Update any existing records with null timezones
UPDATE user_notification_preferences
SET timezone = 'America/New_York'
WHERE timezone IS NULL OR timezone = 'UTC';

-- Add an index for performance on digest queries
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_digest
ON user_notification_preferences(digest_enabled, digest_time)
WHERE digest_enabled = true;

-- Update the trigger function comment to reflect new purpose
COMMENT ON TABLE user_notification_preferences IS
'Simplified notification preferences focused on daily digest delivery. Contains digest scheduling and timezone preferences for each user.';

-- Update existing users to have digest enabled by default
UPDATE user_notification_preferences
SET digest_enabled = true
WHERE digest_enabled IS NULL;

-- Create a view for easy digest user queries (optional, for performance)
CREATE OR REPLACE VIEW digest_enabled_users AS
SELECT
  unp.user_id,
  unp.digest_enabled,
  unp.digest_time,
  unp.timezone,
  u.email,
  u.raw_user_meta_data->>'name' as user_name,
  u.raw_user_meta_data->>'full_name' as full_name
FROM user_notification_preferences unp
JOIN auth.users u ON u.id = unp.user_id
WHERE unp.digest_enabled = true;

-- Grant appropriate permissions on the view
GRANT SELECT ON digest_enabled_users TO authenticated;