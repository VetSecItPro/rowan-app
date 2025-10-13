-- =============================================
-- FEATURE #3: SUBTASKS
-- =============================================
-- This migration creates a subtasks table for breaking down tasks into smaller steps.

CREATE TABLE IF NOT EXISTS subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  sort_order INTEGER DEFAULT 0, -- For custom ordering
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date DATE,
  estimated_duration INTEGER, -- in minutes
  actual_duration INTEGER, -- in minutes

  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subtasks_parent_task ON subtasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_assigned_to ON subtasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_subtasks_status ON subtasks(status);
CREATE INDEX IF NOT EXISTS idx_subtasks_sort_order ON subtasks(parent_task_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_subtasks_due_date ON subtasks(due_date) WHERE due_date IS NOT NULL;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_subtasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subtasks_updated_at_trigger
  BEFORE UPDATE ON subtasks
  FOR EACH ROW
  EXECUTE FUNCTION update_subtasks_updated_at();

-- Function to auto-update parent task completion when all subtasks are completed
CREATE OR REPLACE FUNCTION check_parent_task_completion()
RETURNS TRIGGER AS $$
DECLARE
  total_subtasks INTEGER;
  completed_subtasks INTEGER;
BEGIN
  -- Count total and completed subtasks for parent task
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
  INTO total_subtasks, completed_subtasks
  FROM subtasks
  WHERE parent_task_id = NEW.parent_task_id;

  -- If all subtasks are completed, mark parent as completed
  IF total_subtasks > 0 AND total_subtasks = completed_subtasks THEN
    UPDATE tasks
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = NEW.parent_task_id
      AND status != 'completed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subtasks_completion_check_trigger
  AFTER INSERT OR UPDATE OF status ON subtasks
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION check_parent_task_completion();

-- Add comments
COMMENT ON TABLE subtasks IS 'Break down tasks into smaller actionable steps';
COMMENT ON COLUMN subtasks.sort_order IS 'Custom ordering within parent task';
COMMENT ON COLUMN subtasks.estimated_duration IS 'Estimated time in minutes';
COMMENT ON COLUMN subtasks.actual_duration IS 'Actual time spent in minutes';
