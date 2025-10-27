-- Migration: Aggressive cleanup for persistent reminder deletion errors
-- Purpose: Force cleanup of orphaned records and ensure proper CASCADE DELETE
-- Issue: Specific reminder_id 8698-ae2d2bf283a52e46.js21 causing persistent errors
-- Date: 2025-10-27

-- Step 1: Debug - See what orphaned records exist
DO $$
DECLARE
    orphaned_count INTEGER;
    total_activities INTEGER;
    problem_reminder_id TEXT := '8698-ae2d2bf283a52e46.js21';
BEGIN
    -- Count total activities
    SELECT COUNT(*) INTO total_activities FROM reminder_activities;

    -- Count orphaned activities
    SELECT COUNT(*) INTO orphaned_count
    FROM reminder_activities ra
    WHERE NOT EXISTS (
        SELECT 1 FROM reminders r WHERE r.id = ra.reminder_id
    );

    RAISE NOTICE 'BEFORE CLEANUP:';
    RAISE NOTICE 'Total reminder_activities: %', total_activities;
    RAISE NOTICE 'Orphaned reminder_activities: %', orphaned_count;

    -- Check if the specific problematic reminder exists
    IF EXISTS (SELECT 1 FROM reminder_activities WHERE reminder_id = problem_reminder_id) THEN
        RAISE NOTICE 'Found problematic reminder_id: %', problem_reminder_id;

        -- Check if this reminder actually exists
        IF NOT EXISTS (SELECT 1 FROM reminders WHERE id = problem_reminder_id) THEN
            RAISE NOTICE 'Reminder % does NOT exist in reminders table - will be deleted', problem_reminder_id;
        ELSE
            RAISE NOTICE 'Reminder % DOES exist in reminders table', problem_reminder_id;
        END IF;
    END IF;
END $$;

-- Step 2: FORCE drop ALL foreign key constraints on reminder_activities
ALTER TABLE reminder_activities DROP CONSTRAINT IF EXISTS reminder_activity_reminder_id_fkey CASCADE;
ALTER TABLE reminder_activities DROP CONSTRAINT IF EXISTS reminder_activities_reminder_id_fkey CASCADE;
ALTER TABLE reminder_activities DROP CONSTRAINT IF EXISTS reminder_activities_user_id_fkey CASCADE;

-- Step 3: AGGRESSIVE cleanup - Delete ALL orphaned records
DELETE FROM reminder_activities
WHERE reminder_id NOT IN (
    SELECT id FROM reminders
);

-- Step 4: Delete the specific problematic record if it's orphaned
DELETE FROM reminder_activities
WHERE reminder_id = '8698-ae2d2bf283a52e46.js21'
AND NOT EXISTS (
    SELECT 1 FROM reminders WHERE id = '8698-ae2d2bf283a52e46.js21'
);

-- Step 5: Clean up other related tables aggressively
DELETE FROM reminder_comments
WHERE reminder_id NOT IN (SELECT id FROM reminders);

DELETE FROM reminder_attachments
WHERE reminder_id NOT IN (SELECT id FROM reminders);

DELETE FROM reminder_notifications
WHERE reminder_id NOT IN (SELECT id FROM reminders);

DELETE FROM reminder_mentions
WHERE reminder_id NOT IN (SELECT id FROM reminders);

-- Step 6: Recreate foreign key constraints with CASCADE DELETE
ALTER TABLE reminder_activities
ADD CONSTRAINT reminder_activities_reminder_id_fkey
FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE reminder_activities
ADD CONSTRAINT reminder_activities_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL DEFERRABLE INITIALLY IMMEDIATE;

-- Step 7: Verify the cleanup worked
DO $$
DECLARE
    orphaned_count INTEGER;
    total_activities INTEGER;
    constraint_exists BOOLEAN;
BEGIN
    -- Count remaining records
    SELECT COUNT(*) INTO total_activities FROM reminder_activities;

    SELECT COUNT(*) INTO orphaned_count
    FROM reminder_activities ra
    WHERE NOT EXISTS (
        SELECT 1 FROM reminders r WHERE r.id = ra.reminder_id
    );

    -- Check if constraint exists with CASCADE
    SELECT EXISTS (
        SELECT 1 FROM information_schema.referential_constraints rc
        JOIN information_schema.table_constraints tc ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name = 'reminder_activities'
        AND tc.constraint_name = 'reminder_activities_reminder_id_fkey'
        AND rc.delete_rule = 'CASCADE'
    ) INTO constraint_exists;

    RAISE NOTICE 'AFTER CLEANUP:';
    RAISE NOTICE 'Total reminder_activities: %', total_activities;
    RAISE NOTICE 'Orphaned reminder_activities: %', orphaned_count;
    RAISE NOTICE 'CASCADE constraint exists: %', constraint_exists;

    -- Check if problematic record is gone
    IF NOT EXISTS (SELECT 1 FROM reminder_activities WHERE reminder_id = '8698-ae2d2bf283a52e46.js21') THEN
        RAISE NOTICE 'SUCCESS: Problematic reminder_id 8698-ae2d2bf283a52e46.js21 has been removed';
    ELSE
        RAISE NOTICE 'WARNING: Problematic reminder_id 8698-ae2d2bf283a52e46.js21 still exists';
    END IF;

    IF orphaned_count = 0 AND constraint_exists THEN
        RAISE NOTICE 'SUCCESS: All orphaned records cleaned up and CASCADE constraint created';
    ELSE
        RAISE EXCEPTION 'FAILED: orphaned_count=%, constraint_exists=%', orphaned_count, constraint_exists;
    END IF;
END $$;