-- Add calendar_sync column to tasks table
-- This field enables calendar integration for tasks with due dates

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS calendar_sync BOOLEAN DEFAULT false;

-- Add comment to the column for documentation
COMMENT ON COLUMN tasks.calendar_sync IS 'Whether this task should be synced with external calendars';

-- Add index for queries filtering by calendar sync status
CREATE INDEX IF NOT EXISTS idx_tasks_calendar_sync ON tasks(space_id, calendar_sync) WHERE calendar_sync = true;