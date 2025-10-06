-- Add milestone tracking fields to goal_milestones table
ALTER TABLE goal_milestones
  ADD COLUMN type TEXT DEFAULT 'percentage' CHECK (type IN ('percentage', 'money', 'count', 'date')),
  ADD COLUMN target_value DECIMAL(10, 2),
  ADD COLUMN current_value DECIMAL(10, 2) DEFAULT 0;

-- Add progress field to goals table
ALTER TABLE goals
  ADD COLUMN progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);

-- Update existing goals to have 0 progress if not set
UPDATE goals SET progress = 0 WHERE progress IS NULL;
