-- Add 'blocked' status to chores table constraint
-- This allows the 4-step status cycling: pending -> in_progress -> blocked -> completed

-- First, drop the existing constraint
ALTER TABLE chores DROP CONSTRAINT IF EXISTS chores_status_check;

-- Add the new constraint with 'blocked' included
ALTER TABLE chores ADD CONSTRAINT chores_status_check
CHECK (status IN ('pending', 'in_progress', 'blocked', 'completed', 'skipped'));

-- Update the column comment
COMMENT ON COLUMN chores.status IS 'Status of the chore: pending, in_progress, blocked, completed, or skipped';