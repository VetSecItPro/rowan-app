-- Fix event_proposals foreign key constraint names for service compatibility

-- First, check if the named constraint already exists
DO $$
BEGIN
  -- Drop and recreate the proposed_by foreign key with explicit name
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'event_proposals_proposed_by_fkey'
    AND table_name = 'event_proposals'
  ) THEN
    ALTER TABLE event_proposals DROP CONSTRAINT event_proposals_proposed_by_fkey;
  END IF;

  -- Check if there's an existing unnamed constraint and drop it
  -- PostgreSQL generates names like event_proposals_proposed_by_fkey automatically
  -- but we need to ensure consistency
  IF EXISTS (
    SELECT 1 FROM information_schema.referential_constraints
    WHERE constraint_name LIKE '%proposed_by%'
    AND table_name = 'event_proposals'
  ) THEN
    -- Find and drop any existing proposed_by foreign key constraint
    EXECUTE (
      SELECT 'ALTER TABLE event_proposals DROP CONSTRAINT ' || constraint_name || ';'
      FROM information_schema.table_constraints
      WHERE table_name = 'event_proposals'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%proposed_by%'
      LIMIT 1
    );
  END IF;

  -- Add the correctly named foreign key constraint
  ALTER TABLE event_proposals
  ADD CONSTRAINT event_proposals_proposed_by_fkey
  FOREIGN KEY (proposed_by) REFERENCES auth.users(id) ON DELETE CASCADE;

EXCEPTION
  WHEN OTHERS THEN
    -- If there's any error, just add the constraint (it might not exist yet)
    BEGIN
      ALTER TABLE event_proposals
      ADD CONSTRAINT event_proposals_proposed_by_fkey
      FOREIGN KEY (proposed_by) REFERENCES auth.users(id) ON DELETE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN
        -- Constraint already exists, do nothing
        NULL;
    END;
END $$;