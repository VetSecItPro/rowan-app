-- Add unified status constraint to tasks table
-- This standardizes status values across tasks and chores tables
-- Unified status values: pending, in-progress, blocked, completed, on-hold

-- Add the new constraint to tasks table (first time adding constraint)
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
CHECK (status IN ('pending', 'in-progress', 'blocked', 'completed', 'on-hold'));

-- Update the column comment
COMMENT ON COLUMN tasks.status IS 'Status of the task: pending, in-progress, blocked, completed, or on-hold';