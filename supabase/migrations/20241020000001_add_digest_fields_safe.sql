-- Safe migration to add digest fields to existing notification preferences table
-- This migration checks if columns exist before adding them

-- Add digest_enabled column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user_notification_preferences'
                   AND column_name = 'digest_enabled') THEN
        ALTER TABLE user_notification_preferences ADD COLUMN digest_enabled BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Update digest_frequency default if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'user_notification_preferences'
               AND column_name = 'digest_frequency') THEN
        ALTER TABLE user_notification_preferences ALTER COLUMN digest_frequency SET DEFAULT 'daily';
    END IF;
END $$;

-- Add digest_time column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user_notification_preferences'
                   AND column_name = 'digest_time') THEN
        ALTER TABLE user_notification_preferences ADD COLUMN digest_time TIME DEFAULT '07:00:00';
    END IF;
END $$;

-- Ensure timezone column exists with proper default
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user_notification_preferences'
                   AND column_name = 'timezone') THEN
        ALTER TABLE user_notification_preferences ADD COLUMN timezone TEXT DEFAULT 'America/New_York';
    ELSE
        -- Update existing timezone column default
        ALTER TABLE user_notification_preferences ALTER COLUMN timezone SET DEFAULT 'America/New_York';
    END IF;
END $$;

-- Update any existing records to have digest enabled by default
UPDATE user_notification_preferences
SET digest_enabled = true
WHERE digest_enabled IS NULL;

-- Update any null timezones to Eastern
UPDATE user_notification_preferences
SET timezone = 'America/New_York'
WHERE timezone IS NULL OR timezone = 'UTC';

-- Create index for performance on digest queries (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_digest
ON user_notification_preferences(digest_enabled, digest_time)
WHERE digest_enabled = true;

-- Create the digest enabled users view (replace if exists)
DROP VIEW IF EXISTS digest_enabled_users;

CREATE VIEW digest_enabled_users AS
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

-- Update table comment
COMMENT ON TABLE user_notification_preferences IS
'User notification preferences focused on daily digest delivery. Contains digest scheduling and timezone preferences for each user.';