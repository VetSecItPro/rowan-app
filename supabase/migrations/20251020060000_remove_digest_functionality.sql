-- Remove all Daily Digest functionality from database
-- This migration removes digest-related columns, functions, and cleans up the schema

-- Drop digest-related views and indexes first
DROP VIEW IF EXISTS digest_enabled_users;
DROP INDEX IF EXISTS idx_user_notification_preferences_digest;

-- Drop digest-related functions
DROP FUNCTION IF EXISTS get_digest_notifications(UUID, TEXT);
DROP FUNCTION IF EXISTS mark_notifications_batched(UUID[]);

-- Remove digest-related columns from user_notification_preferences
DO $$
BEGIN
    -- Remove digest_enabled column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_notification_preferences'
        AND column_name = 'digest_enabled'
    ) THEN
        ALTER TABLE user_notification_preferences DROP COLUMN digest_enabled;
        RAISE NOTICE 'Removed digest_enabled column from user_notification_preferences';
    END IF;

    -- Remove digest_frequency column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_notification_preferences'
        AND column_name = 'digest_frequency'
    ) THEN
        ALTER TABLE user_notification_preferences DROP COLUMN digest_frequency;
        RAISE NOTICE 'Removed digest_frequency column from user_notification_preferences';
    END IF;

    -- Remove digest_time column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_notification_preferences'
        AND column_name = 'digest_time'
    ) THEN
        ALTER TABLE user_notification_preferences DROP COLUMN digest_time;
        RAISE NOTICE 'Removed digest_time column from user_notification_preferences';
    END IF;

    -- Remove timezone column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_notification_preferences'
        AND column_name = 'timezone'
    ) THEN
        ALTER TABLE user_notification_preferences DROP COLUMN timezone;
        RAISE NOTICE 'Removed timezone column from user_notification_preferences';
    END IF;
END $$;

-- Remove digest-related columns from notification_queue (if table exists)
DO $$
BEGIN
    -- Check if notification_queue table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'notification_queue'
    ) THEN
        -- Remove digest_eligible column if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'notification_queue'
            AND column_name = 'digest_eligible'
        ) THEN
            ALTER TABLE notification_queue DROP COLUMN digest_eligible;
            RAISE NOTICE 'Removed digest_eligible column from notification_queue';
        END IF;

        -- Clean up any existing digest-related data
        -- Remove any notifications that were marked as 'batched' status since this was digest-specific
        UPDATE notification_queue
        SET status = 'pending'
        WHERE status = 'batched';

        RAISE NOTICE 'Cleaned up digest-related data from notification_queue';
    ELSE
        RAISE NOTICE 'notification_queue table does not exist, skipping cleanup';
    END IF;
END $$;

-- Drop digest-related indexes if they exist
DROP INDEX IF EXISTS idx_notification_queue_digest_eligible;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'Successfully removed all Daily Digest functionality from database';
END $$;