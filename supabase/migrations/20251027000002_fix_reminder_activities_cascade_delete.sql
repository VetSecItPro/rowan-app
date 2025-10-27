-- Migration: Fix foreign key constraint for reminder_activities to cascade delete
-- Purpose: Allow reminders to be deleted without constraint violations from activity logs
-- Issue: When reminders are deleted, reminder_activities records prevent deletion
-- Date: 2025-10-27

-- First, check and drop the existing foreign key constraint if it exists
DO $$
BEGIN
    -- Drop the old foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'reminder_activity_reminder_id_fkey'
        AND table_name = 'reminder_activities'
    ) THEN
        ALTER TABLE reminder_activities DROP CONSTRAINT reminder_activity_reminder_id_fkey;
    END IF;

    -- Also check for the new naming convention
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'reminder_activities_reminder_id_fkey'
        AND table_name = 'reminder_activities'
    ) THEN
        ALTER TABLE reminder_activities DROP CONSTRAINT reminder_activities_reminder_id_fkey;
    END IF;
END $$;

-- Add the new foreign key constraint with CASCADE DELETE
ALTER TABLE reminder_activities
ADD CONSTRAINT reminder_activities_reminder_id_fkey
FOREIGN KEY (reminder_id)
REFERENCES reminders(id)
ON DELETE CASCADE;

-- Ensure the user_id foreign key also exists and has proper behavior
DO $$
BEGIN
    -- Drop existing user_id constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'reminder_activities_user_id_fkey'
        AND table_name = 'reminder_activities'
    ) THEN
        ALTER TABLE reminder_activities DROP CONSTRAINT reminder_activities_user_id_fkey;
    END IF;
END $$;

-- Add user_id foreign key constraint (SET NULL on delete to preserve activity history)
ALTER TABLE reminder_activities
ADD CONSTRAINT reminder_activities_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE SET NULL;

-- Update table comment to reflect the cascade behavior
COMMENT ON TABLE reminder_activities IS 'Immutable audit log of all reminder changes. Activity records are automatically deleted when the parent reminder is deleted.';

-- Verify the constraints are in place
DO $$
BEGIN
    -- Verify reminder_id constraint exists with CASCADE
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.referential_constraints rc
        JOIN information_schema.table_constraints tc ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name = 'reminder_activities'
        AND tc.constraint_name = 'reminder_activities_reminder_id_fkey'
        AND rc.delete_rule = 'CASCADE'
    ) THEN
        RAISE EXCEPTION 'Failed to create CASCADE DELETE constraint for reminder_activities.reminder_id';
    END IF;

    RAISE NOTICE 'Successfully updated reminder_activities foreign key constraints';
END $$;