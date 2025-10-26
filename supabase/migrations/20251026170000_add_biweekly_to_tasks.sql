-- Add biweekly support to tasks recurrence pattern constraints
-- This migration fixes the missing 'biweekly' option in task recurrence constraints

-- First, update the tasks table recurrence_pattern constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_recurrence_pattern_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_recurrence_pattern_check
  CHECK (recurrence_pattern IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly'));

-- Update the task_templates table default_recurrence_pattern constraint
ALTER TABLE task_templates DROP CONSTRAINT IF EXISTS task_templates_default_recurrence_pattern_check;
ALTER TABLE task_templates ADD CONSTRAINT task_templates_default_recurrence_pattern_check
  CHECK (default_recurrence_pattern IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly'));

-- Update column comments to reflect the new option
COMMENT ON COLUMN tasks.recurrence_pattern IS 'Pattern type: daily, weekly, biweekly, monthly, yearly';
COMMENT ON COLUMN task_templates.default_recurrence_pattern IS 'Default recurrence pattern: daily, weekly, biweekly, monthly, yearly';