-- Migration: Add missing location column to reminders table
-- Purpose: Fix schema mismatch causing shopping trip scheduling errors
-- Issue: TypeScript interface expects location field but database table doesn't have it
-- Date: 2025-10-27

-- Add the missing location column
ALTER TABLE reminders
ADD COLUMN IF NOT EXISTS location TEXT;

-- Add index for location-based queries (useful for location-based reminders)
CREATE INDEX IF NOT EXISTS idx_reminders_location ON reminders(location) WHERE location IS NOT NULL;

-- Update table comment to reflect the new column
COMMENT ON TABLE reminders IS 'Reminder system supporting both time-based and location-based reminders';

-- Verify the column was added
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Check if location column exists
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'reminders'
        AND column_name = 'location'
    ) INTO column_exists;

    IF column_exists THEN
        RAISE NOTICE 'SUCCESS: location column added to reminders table';
        RAISE NOTICE 'Shopping trip scheduling should now work without errors';
    ELSE
        RAISE EXCEPTION 'FAILED: location column was not added to reminders table';
    END IF;
END $$;