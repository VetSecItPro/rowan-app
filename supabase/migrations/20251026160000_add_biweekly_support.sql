-- Add biweekly support to chores frequency check constraint
-- This migration ensures both tasks and chores support 'biweekly' frequency

-- Update chores table frequency constraint to include 'biweekly'
ALTER TABLE chores DROP CONSTRAINT IF EXISTS chores_frequency_check;
ALTER TABLE chores ADD CONSTRAINT chores_frequency_check
  CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'once'));

-- Also update chores status constraint to match the current schema expectations
ALTER TABLE chores DROP CONSTRAINT IF EXISTS chores_status_check;
ALTER TABLE chores ADD CONSTRAINT chores_status_check
  CHECK (status IN ('pending', 'in-progress', 'blocked', 'on-hold', 'completed'));

-- Add missing columns that are expected by the application
ALTER TABLE chores ADD COLUMN IF NOT EXISTS notes TEXT;

-- Tasks table uses recurrence_pattern (TEXT) for flexibility instead of enum constraints
-- So no database constraint changes needed for tasks table

-- Add comment for documentation
COMMENT ON COLUMN chores.frequency IS 'Frequency of the chore: daily, weekly, biweekly, monthly, or once';
COMMENT ON COLUMN chores.notes IS 'Additional notes for the chore';