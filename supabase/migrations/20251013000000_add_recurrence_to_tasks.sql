-- =============================================
-- FEATURE #1: RECURRING TASKS
-- =============================================
-- This migration adds comprehensive recurrence functionality to tasks.
-- Supports daily, weekly, monthly, yearly patterns with flexible scheduling.

-- Add recurrence fields to tasks table
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
  ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1 CHECK (recurrence_interval >= 1 AND recurrence_interval <= 365),
  ADD COLUMN IF NOT EXISTS recurrence_days_of_week JSONB DEFAULT '[]'::jsonb, -- For weekly: [0,1,2,3,4,5,6] where 0=Sunday
  ADD COLUMN IF NOT EXISTS recurrence_day_of_month INTEGER CHECK (recurrence_day_of_month >= 1 AND recurrence_day_of_month <= 31), -- For monthly
  ADD COLUMN IF NOT EXISTS recurrence_month INTEGER CHECK (recurrence_month >= 1 AND recurrence_month <= 12), -- For yearly
  ADD COLUMN IF NOT EXISTS recurrence_end_date DATE, -- Optional end date
  ADD COLUMN IF NOT EXISTS recurrence_end_count INTEGER CHECK (recurrence_end_count >= 1), -- Optional occurrence count
  ADD COLUMN IF NOT EXISTS parent_recurrence_id UUID REFERENCES tasks(id) ON DELETE CASCADE, -- Links to parent template
  ADD COLUMN IF NOT EXISTS is_recurrence_template BOOLEAN DEFAULT FALSE, -- True for parent recurring task
  ADD COLUMN IF NOT EXISTS recurrence_exceptions JSONB DEFAULT '[]'::jsonb, -- Array of dates to skip
  ADD COLUMN IF NOT EXISTS recurrence_metadata JSONB DEFAULT '{}'::jsonb; -- Additional recurrence data

-- Create index for recurring task queries
CREATE INDEX IF NOT EXISTS idx_tasks_recurring ON tasks(is_recurring, parent_recurrence_id) WHERE is_recurring = TRUE;
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_template ON tasks(is_recurrence_template) WHERE is_recurrence_template = TRUE;
CREATE INDEX IF NOT EXISTS idx_tasks_parent_recurrence ON tasks(parent_recurrence_id) WHERE parent_recurrence_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date_recurring ON tasks(due_date, is_recurring);

-- Add comment explaining the recurrence system
COMMENT ON COLUMN tasks.is_recurring IS 'Indicates if this task is part of a recurring series';
COMMENT ON COLUMN tasks.recurrence_pattern IS 'Pattern type: daily, weekly, monthly, yearly';
COMMENT ON COLUMN tasks.recurrence_interval IS 'Interval between occurrences (e.g., 2 for every 2 weeks)';
COMMENT ON COLUMN tasks.recurrence_days_of_week IS 'Array of days [0-6] for weekly recurrence (0=Sunday)';
COMMENT ON COLUMN tasks.recurrence_day_of_month IS 'Day of month (1-31) for monthly recurrence';
COMMENT ON COLUMN tasks.recurrence_month IS 'Month (1-12) for yearly recurrence';
COMMENT ON COLUMN tasks.recurrence_end_date IS 'Optional date when recurrence should stop';
COMMENT ON COLUMN tasks.recurrence_end_count IS 'Optional number of occurrences before stopping';
COMMENT ON COLUMN tasks.parent_recurrence_id IS 'Links to the template task that generated this occurrence';
COMMENT ON COLUMN tasks.is_recurrence_template IS 'True for the parent recurring task template';
COMMENT ON COLUMN tasks.recurrence_exceptions IS 'Array of ISO date strings to skip';
COMMENT ON COLUMN tasks.recurrence_metadata IS 'Additional metadata for recurrence system';
