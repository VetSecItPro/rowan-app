-- Add calendar_sync column to tasks table
-- This column controls per-task calendar synchronization preference

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS calendar_sync BOOLEAN DEFAULT FALSE;

-- Add index for performance on calendar sync queries
CREATE INDEX IF NOT EXISTS idx_tasks_calendar_sync ON tasks(calendar_sync) WHERE calendar_sync = TRUE;

-- Update existing tasks to have calendar_sync = TRUE if they already have due dates
-- (assumes they would want calendar sync if they set a due date)
UPDATE tasks
SET calendar_sync = TRUE
WHERE due_date IS NOT NULL AND calendar_sync IS NULL;

-- Comment
COMMENT ON COLUMN tasks.calendar_sync IS 'Per-task calendar synchronization preference';