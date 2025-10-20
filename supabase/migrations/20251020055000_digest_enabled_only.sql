-- Add digest_enabled column to user_notification_preferences if it doesn't exist
-- This is a focused migration just for the digest functionality

DO $$
BEGIN
    -- Check if digest_enabled column exists in user_notification_preferences table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_notification_preferences'
        AND column_name = 'digest_enabled'
    ) THEN
        -- Add the column with default value
        ALTER TABLE user_notification_preferences
        ADD COLUMN digest_enabled BOOLEAN DEFAULT true;

        -- Update existing records to have digest enabled by default
        UPDATE user_notification_preferences
        SET digest_enabled = true
        WHERE digest_enabled IS NULL;

        RAISE NOTICE 'Added digest_enabled column to user_notification_preferences';
    ELSE
        RAISE NOTICE 'digest_enabled column already exists in user_notification_preferences';
    END IF;
END $$;

-- Ensure timezone and digest_time have proper defaults if the columns exist
DO $$
BEGIN
    -- Check if timezone column exists and update defaults
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_notification_preferences'
        AND column_name = 'timezone'
    ) THEN
        -- Update any null timezones to default
        UPDATE user_notification_preferences
        SET timezone = 'America/New_York'
        WHERE timezone IS NULL OR timezone = '';

        RAISE NOTICE 'Updated timezone defaults in user_notification_preferences';
    END IF;

    -- Check if digest_time column exists and update defaults
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_notification_preferences'
        AND column_name = 'digest_time'
    ) THEN
        -- Update any null digest times to default
        UPDATE user_notification_preferences
        SET digest_time = '07:00:00'
        WHERE digest_time IS NULL;

        RAISE NOTICE 'Updated digest_time defaults in user_notification_preferences';
    END IF;
END $$;