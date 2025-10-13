-- =============================================
-- FEATURE #5: TIME TRACKING
-- =============================================
-- This migration creates tables for tracking time spent on tasks.

CREATE TABLE IF NOT EXISTS task_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration INTEGER, -- in minutes, auto-calculated

  notes TEXT,
  is_manual BOOLEAN DEFAULT FALSE, -- True if manually entered, false if tracked

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_task ON task_time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON task_time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON task_time_entries(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_duration ON task_time_entries(duration DESC);

-- Add constraint: end_time must be after start_time
ALTER TABLE task_time_entries
  ADD CONSTRAINT check_time_entry_order CHECK (end_time IS NULL OR end_time > start_time);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_time_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER time_entries_updated_at_trigger
  BEFORE UPDATE ON task_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_time_entries_updated_at();

-- Function to auto-calculate duration when end_time is set
CREATE OR REPLACE FUNCTION calculate_time_entry_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_time IS NOT NULL THEN
    NEW.duration = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER time_entries_duration_trigger
  BEFORE INSERT OR UPDATE ON task_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_time_entry_duration();

-- Add estimated_duration to tasks table if not exists
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS estimated_duration INTEGER, -- in minutes
  ADD COLUMN IF NOT EXISTS actual_duration INTEGER; -- in minutes, sum of time entries

-- Function to update actual_duration on tasks when time entries change
CREATE OR REPLACE FUNCTION update_task_actual_duration()
RETURNS TRIGGER AS $$
DECLARE
  total_duration INTEGER;
BEGIN
  -- Calculate total duration for the task
  SELECT COALESCE(SUM(duration), 0)
  INTO total_duration
  FROM task_time_entries
  WHERE task_id = COALESCE(NEW.task_id, OLD.task_id)
    AND duration IS NOT NULL;

  -- Update task's actual_duration
  UPDATE tasks
  SET actual_duration = total_duration
  WHERE id = COALESCE(NEW.task_id, OLD.task_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER time_entries_update_task_duration_trigger
  AFTER INSERT OR UPDATE OR DELETE ON task_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_task_actual_duration();

-- Add comments
COMMENT ON TABLE task_time_entries IS 'Track time spent on tasks with start/stop timer or manual entry';
COMMENT ON COLUMN task_time_entries.duration IS 'Duration in minutes, auto-calculated from start/end times';
COMMENT ON COLUMN task_time_entries.is_manual IS 'True if manually entered, false if tracked with timer';
COMMENT ON COLUMN tasks.estimated_duration IS 'Estimated time to complete in minutes';
COMMENT ON COLUMN tasks.actual_duration IS 'Total time tracked in minutes (sum of all time entries)';
