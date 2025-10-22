-- Add quick_note column to tasks table
-- This field stores quick collaborative notes for family members

ALTER TABLE tasks
ADD COLUMN quick_note TEXT;

-- Add comment to the column for documentation
COMMENT ON COLUMN tasks.quick_note IS 'Quick collaborative note for family members about this task';

-- Add index for potential future searches on quick notes
CREATE INDEX idx_tasks_quick_note ON tasks(quick_note) WHERE quick_note IS NOT NULL AND quick_note != '';