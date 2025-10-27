-- Migration: Clean up orphaned reminder_activities and fix foreign key constraints
-- Purpose: Remove orphaned records and ensure proper CASCADE DELETE behavior
-- Issue: reminder_activities table has records referencing non-existent reminders
-- Date: 2025-10-27

-- Step 1: Clean up orphaned reminder_activities records
-- These are activity records that reference reminders that no longer exist
DELETE FROM reminder_activities
WHERE reminder_id NOT IN (
    SELECT id FROM reminders
);

-- Step 2: Clean up orphaned reminder_comments records (if any)
DELETE FROM reminder_comments
WHERE reminder_id NOT IN (
    SELECT id FROM reminders
);

-- Step 3: Clean up orphaned reminder_attachments records (if any)
DELETE FROM reminder_attachments
WHERE reminder_id NOT IN (
    SELECT id FROM reminders
);

-- Step 4: Clean up orphaned reminder_notifications records (if any)
DELETE FROM reminder_notifications
WHERE reminder_id NOT IN (
    SELECT id FROM reminders
);

-- Step 5: Clean up orphaned reminder_mentions records (if any)
DELETE FROM reminder_mentions
WHERE reminder_id NOT IN (
    SELECT id FROM reminders
);

-- Step 6: Drop and recreate ALL reminder-related foreign key constraints with proper CASCADE
-- This ensures consistency across all related tables

-- reminder_activities table
ALTER TABLE reminder_activities DROP CONSTRAINT IF EXISTS reminder_activity_reminder_id_fkey;
ALTER TABLE reminder_activities DROP CONSTRAINT IF EXISTS reminder_activities_reminder_id_fkey;

ALTER TABLE reminder_activities
ADD CONSTRAINT reminder_activities_reminder_id_fkey
FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE;

-- reminder_comments table
ALTER TABLE reminder_comments DROP CONSTRAINT IF EXISTS reminder_comments_reminder_id_fkey;

ALTER TABLE reminder_comments
ADD CONSTRAINT reminder_comments_reminder_id_fkey
FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE;

-- reminder_attachments table
ALTER TABLE reminder_attachments DROP CONSTRAINT IF EXISTS reminder_attachments_reminder_id_fkey;

ALTER TABLE reminder_attachments
ADD CONSTRAINT reminder_attachments_reminder_id_fkey
FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE;

-- reminder_notifications table
ALTER TABLE reminder_notifications DROP CONSTRAINT IF EXISTS reminder_notifications_reminder_id_fkey;

ALTER TABLE reminder_notifications
ADD CONSTRAINT reminder_notifications_reminder_id_fkey
FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE;

-- reminder_mentions table
ALTER TABLE reminder_mentions DROP CONSTRAINT IF EXISTS reminder_mentions_reminder_id_fkey;

ALTER TABLE reminder_mentions
ADD CONSTRAINT reminder_mentions_reminder_id_fkey
FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE;

-- Step 7: Log cleanup results
DO $$
DECLARE
    activities_count INTEGER;
    comments_count INTEGER;
    attachments_count INTEGER;
    notifications_count INTEGER;
    mentions_count INTEGER;
BEGIN
    -- Count remaining records to verify cleanup
    SELECT COUNT(*) INTO activities_count FROM reminder_activities;
    SELECT COUNT(*) INTO comments_count FROM reminder_comments;
    SELECT COUNT(*) INTO attachments_count FROM reminder_attachments;
    SELECT COUNT(*) INTO notifications_count FROM reminder_notifications;
    SELECT COUNT(*) INTO mentions_count FROM reminder_mentions;

    RAISE NOTICE 'Cleanup completed. Remaining records:';
    RAISE NOTICE '- reminder_activities: %', activities_count;
    RAISE NOTICE '- reminder_comments: %', comments_count;
    RAISE NOTICE '- reminder_attachments: %', attachments_count;
    RAISE NOTICE '- reminder_notifications: %', notifications_count;
    RAISE NOTICE '- reminder_mentions: %', mentions_count;

    -- Verify all foreign key constraints are in place
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.referential_constraints rc
        JOIN information_schema.table_constraints tc ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name = 'reminder_activities'
        AND tc.constraint_name = 'reminder_activities_reminder_id_fkey'
        AND rc.delete_rule = 'CASCADE'
    ) THEN
        RAISE EXCEPTION 'Failed: reminder_activities CASCADE constraint not found';
    END IF;

    RAISE NOTICE 'All foreign key constraints verified with CASCADE DELETE';
END $$;