-- Update chores table status constraint to match unified status values
-- This ensures tasks and chores use identical status values
-- Unified status values: pending, in-progress, blocked, completed, on-hold

-- First, drop the existing constraint
ALTER TABLE chores DROP CONSTRAINT IF EXISTS chores_status_check;

-- Add the new unified constraint (removes 'skipped', adds 'on-hold')
ALTER TABLE chores ADD CONSTRAINT chores_status_check
CHECK (status IN ('pending', 'in-progress', 'blocked', 'completed', 'on-hold'));

-- Update the column comment
COMMENT ON COLUMN chores.status IS 'Status of the chore: pending, in-progress, blocked, completed, or on-hold';