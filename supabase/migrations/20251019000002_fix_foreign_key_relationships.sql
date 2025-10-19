-- Fix PostgREST foreign key relationship recognition
-- This migration ensures PostgREST properly recognizes the foreign key relationships

-- Force PostgREST to reload schema by refreshing the schema cache
NOTIFY pgrst, 'reload schema';

-- Ensure foreign key constraints exist and are properly named
-- Drop and recreate the foreign key constraints with explicit names
ALTER TABLE space_members DROP CONSTRAINT IF EXISTS space_members_user_id_fkey;
ALTER TABLE space_members DROP CONSTRAINT IF EXISTS space_members_space_id_fkey;

-- Add foreign key constraints with explicit names
ALTER TABLE space_members
ADD CONSTRAINT space_members_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE space_members
ADD CONSTRAINT space_members_space_id_fkey
FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE;

-- Refresh PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');

-- Verify the constraints exist
DO $$
BEGIN
    -- Check if the foreign key constraints exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'space_members_user_id_fkey'
    ) THEN
        RAISE EXCEPTION 'Foreign key constraint space_members_user_id_fkey was not created';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'space_members_space_id_fkey'
    ) THEN
        RAISE EXCEPTION 'Foreign key constraint space_members_space_id_fkey was not created';
    END IF;

    RAISE NOTICE 'Foreign key constraints verified successfully';
END
$$;