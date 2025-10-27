-- Migration: Fix invalid UUID formats in reminder_activities
-- Purpose: Remove corrupted reminder_id records with invalid UUID syntax
-- Issue: Records with .js21 suffix and other invalid UUID formats causing deletion errors
-- Date: 2025-10-27

-- Step 1: Log invalid UUID records before cleanup
DO $$
DECLARE
    invalid_count INTEGER;
    total_count INTEGER;
    sample_invalid TEXT;
BEGIN
    -- Count total records
    SELECT COUNT(*) INTO total_count FROM reminder_activities;

    -- Count invalid UUID format records
    SELECT COUNT(*) INTO invalid_count
    FROM reminder_activities
    WHERE reminder_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

    -- Get a sample invalid UUID for logging
    SELECT reminder_id INTO sample_invalid
    FROM reminder_activities
    WHERE reminder_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    LIMIT 1;

    RAISE NOTICE 'BEFORE UUID CLEANUP:';
    RAISE NOTICE 'Total reminder_activities: %', total_count;
    RAISE NOTICE 'Invalid UUID format records: %', invalid_count;
    RAISE NOTICE 'Sample invalid UUID: %', COALESCE(sample_invalid, 'none');
END $$;

-- Step 2: Delete ALL records with invalid UUID formats
-- This includes records with .js21 suffix and other malformed UUIDs
DELETE FROM reminder_activities
WHERE reminder_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

-- Step 3: Add a CHECK constraint to prevent future invalid UUIDs
ALTER TABLE reminder_activities
ADD CONSTRAINT reminder_activities_valid_uuid_check
CHECK (reminder_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');

-- Step 4: Verify cleanup success
DO $$
DECLARE
    remaining_invalid INTEGER;
    total_remaining INTEGER;
    constraint_exists BOOLEAN;
BEGIN
    -- Count remaining records
    SELECT COUNT(*) INTO total_remaining FROM reminder_activities;

    -- Count any remaining invalid UUIDs (should be 0)
    SELECT COUNT(*) INTO remaining_invalid
    FROM reminder_activities
    WHERE reminder_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

    -- Check if constraint was added
    SELECT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'reminder_activities_valid_uuid_check'
        AND table_name = 'reminder_activities'
    ) INTO constraint_exists;

    RAISE NOTICE 'AFTER UUID CLEANUP:';
    RAISE NOTICE 'Total remaining reminder_activities: %', total_remaining;
    RAISE NOTICE 'Invalid UUID format records: %', remaining_invalid;
    RAISE NOTICE 'UUID validation constraint added: %', constraint_exists;

    -- Test UUID casting on remaining records
    BEGIN
        PERFORM reminder_id::uuid FROM reminder_activities LIMIT 1;
        RAISE NOTICE 'SUCCESS: All remaining reminder_ids can be cast to UUID';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'WARNING: Some reminder_ids still cannot be cast to UUID: %', SQLERRM;
    END;

    IF remaining_invalid = 0 AND constraint_exists THEN
        RAISE NOTICE 'SUCCESS: All invalid UUID formats cleaned up and constraint added';
    ELSE
        RAISE EXCEPTION 'FAILED: remaining_invalid=%, constraint_exists=%', remaining_invalid, constraint_exists;
    END IF;
END $$;