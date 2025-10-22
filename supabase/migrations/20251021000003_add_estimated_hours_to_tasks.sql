-- Add estimated_hours column to tasks table
-- This field will store the estimated time to complete a task in hours

ALTER TABLE tasks
ADD COLUMN estimated_hours NUMERIC(5,2) CHECK (estimated_hours >= 0);

-- Add comment to the column for documentation
COMMENT ON COLUMN tasks.estimated_hours IS 'Estimated time to complete the task in hours (decimal, e.g., 1.5 for 1 hour 30 minutes)';

-- Update the trigger function to include the new column in updates
-- (The existing update_updated_at_column trigger will automatically handle this)

-- Add index for potential future queries on estimated hours
CREATE INDEX idx_tasks_estimated_hours ON tasks(estimated_hours) WHERE estimated_hours IS NOT NULL;