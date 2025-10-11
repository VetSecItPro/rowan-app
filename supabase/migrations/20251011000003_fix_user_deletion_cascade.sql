-- Fix user deletion constraint issue
-- This migration adds ON DELETE CASCADE to foreign key constraints that reference auth.users
-- First cleans up orphaned data, then adds CASCADE constraints

-- ============================================================================
-- 1. Fix user_progress table
-- ============================================================================

-- Drop the existing foreign key constraint for user_progress
ALTER TABLE user_progress
DROP CONSTRAINT IF EXISTS user_progress_user_id_fkey;

-- Clean up orphaned records in user_progress (users that don't exist)
DELETE FROM user_progress
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Add constraint back with CASCADE
ALTER TABLE user_progress
ADD CONSTRAINT user_progress_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Also fix space_id constraint in user_progress
ALTER TABLE user_progress
DROP CONSTRAINT IF EXISTS user_progress_space_id_fkey;

-- Clean up orphaned space references
DELETE FROM user_progress
WHERE space_id IS NOT NULL AND space_id NOT IN (SELECT id FROM spaces);

ALTER TABLE user_progress
ADD CONSTRAINT user_progress_space_id_fkey
FOREIGN KEY (space_id)
REFERENCES spaces(id)
ON DELETE CASCADE;

-- ============================================================================
-- 2. Fix space_members table (if it exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'space_members') THEN
    -- Drop existing constraints
    ALTER TABLE space_members
    DROP CONSTRAINT IF EXISTS space_members_user_id_fkey;

    -- Clean up orphaned user references
    DELETE FROM space_members
    WHERE user_id NOT IN (SELECT id FROM auth.users);

    -- Add constraint back with CASCADE
    ALTER TABLE space_members
    ADD CONSTRAINT space_members_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

    -- Fix space_id constraint
    ALTER TABLE space_members
    DROP CONSTRAINT IF EXISTS space_members_space_id_fkey;

    -- Clean up orphaned space references
    DELETE FROM space_members
    WHERE space_id NOT IN (SELECT id FROM spaces);

    ALTER TABLE space_members
    ADD CONSTRAINT space_members_space_id_fkey
    FOREIGN KEY (space_id)
    REFERENCES spaces(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- 3. Fix daily_checkins table (if it exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'daily_checkins') THEN
    ALTER TABLE daily_checkins
    DROP CONSTRAINT IF EXISTS daily_checkins_user_id_fkey;

    -- Clean up orphaned records
    DELETE FROM daily_checkins
    WHERE user_id NOT IN (SELECT id FROM auth.users);

    ALTER TABLE daily_checkins
    ADD CONSTRAINT daily_checkins_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- 4. Fix partnership_members table (critical for data integrity)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'partnership_members') THEN
    ALTER TABLE partnership_members
    DROP CONSTRAINT IF EXISTS partnership_members_user_id_fkey;

    -- Clean up orphaned records
    DELETE FROM partnership_members
    WHERE user_id NOT IN (SELECT id FROM auth.users);

    ALTER TABLE partnership_members
    ADD CONSTRAINT partnership_members_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- Verification: Log the changes
-- ============================================================================

-- This will help verify that the constraints were successfully updated
COMMENT ON CONSTRAINT user_progress_user_id_fkey ON user_progress
IS 'Foreign key with CASCADE delete - updated 2025-10-11';
