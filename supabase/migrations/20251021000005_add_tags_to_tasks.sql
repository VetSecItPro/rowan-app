-- Add tags column to tasks table
-- This field stores comma-separated tags for task organization and filtering

ALTER TABLE tasks
ADD COLUMN tags TEXT;

-- Add comment to the column for documentation
COMMENT ON COLUMN tasks.tags IS 'Comma-separated tags for task organization and filtering';

-- Add index for potential future searches on tags
CREATE INDEX idx_tasks_tags ON tasks USING gin(to_tsvector('english', tags)) WHERE tags IS NOT NULL AND tags != '';