-- Create task_stats table for historical analytics
-- This table stores pre-aggregated monthly statistics for tasks and chores
-- to improve performance when querying historical data

CREATE TABLE IF NOT EXISTS task_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL, -- First day of the month (e.g., '2025-10-01')

  -- Task statistics
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  pending_tasks INTEGER DEFAULT 0,
  in_progress_tasks INTEGER DEFAULT 0,

  -- Chore statistics
  total_chores INTEGER DEFAULT 0,
  completed_chores INTEGER DEFAULT 0,
  pending_chores INTEGER DEFAULT 0,

  -- Combined statistics
  total_items INTEGER DEFAULT 0,
  completed_items INTEGER DEFAULT 0,
  completion_rate NUMERIC(5,2) DEFAULT 0.00, -- Percentage (0.00 to 100.00)

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one record per space per month
  UNIQUE(space_id, month)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_task_stats_space_id ON task_stats(space_id);
CREATE INDEX IF NOT EXISTS idx_task_stats_month ON task_stats(month);
CREATE INDEX IF NOT EXISTS idx_task_stats_space_month ON task_stats(space_id, month);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_task_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_task_stats_updated_at_trigger
BEFORE UPDATE ON task_stats
FOR EACH ROW
EXECUTE FUNCTION update_task_stats_updated_at();

-- Disable RLS for development (will be enabled in production)
ALTER TABLE task_stats DISABLE ROW LEVEL SECURITY;

-- Comments for documentation
COMMENT ON TABLE task_stats IS 'Pre-aggregated monthly statistics for tasks and chores to support historical analytics';
COMMENT ON COLUMN task_stats.month IS 'First day of the month for these statistics (e.g., 2025-10-01 for October 2025)';
COMMENT ON COLUMN task_stats.completion_rate IS 'Percentage of completed items out of total items (0.00 to 100.00)';
