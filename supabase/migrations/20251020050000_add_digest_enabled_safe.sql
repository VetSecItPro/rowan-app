-- Add digest_enabled column if it doesn't exist
-- This migration ensures the digest_enabled column exists for the API

DO $$
BEGIN
    -- Check if digest_enabled column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_notification_preferences'
        AND column_name = 'digest_enabled'
    ) THEN
        -- Add the column
        ALTER TABLE user_notification_preferences
        ADD COLUMN digest_enabled BOOLEAN DEFAULT true;

        -- Update existing records to have digest enabled
        UPDATE user_notification_preferences
        SET digest_enabled = true
        WHERE digest_enabled IS NULL;
    END IF;
END $$;

-- Ensure timezone column has the right default
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_notification_preferences'
        AND column_name = 'timezone'
    ) THEN
        -- Update default timezone
        ALTER TABLE user_notification_preferences
        ALTER COLUMN timezone SET DEFAULT 'America/New_York';

        -- Update any null timezones
        UPDATE user_notification_preferences
        SET timezone = 'America/New_York'
        WHERE timezone IS NULL OR timezone = 'UTC';
    END IF;
END $$;

-- Ensure digest_time column has the right default
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_notification_preferences'
        AND column_name = 'digest_time'
    ) THEN
        -- Update default digest time to 7:00 AM Eastern
        ALTER TABLE user_notification_preferences
        ALTER COLUMN digest_time SET DEFAULT '07:00:00';

        -- Update any null digest times
        UPDATE user_notification_preferences
        SET digest_time = '07:00:00'
        WHERE digest_time IS NULL;
    END IF;
END $$;