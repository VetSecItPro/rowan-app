-- Add progress_percentage column to projects table
ALTER TABLE projects
ADD COLUMN progress_percentage INTEGER CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

-- Add comment
COMMENT ON COLUMN projects.progress_percentage IS 'Custom progress percentage (0-100), overrides status-based calculation';
