-- Add missing status column to chores table
-- The table was created before migration 20251006000015, so IF NOT EXISTS skipped the column

ALTER TABLE chores
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped'));

-- Add table comment to document structure
COMMENT ON TABLE chores IS 'Household chores and tasks tracking';
COMMENT ON COLUMN chores.status IS 'Chore completion status: pending, completed, or skipped';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
