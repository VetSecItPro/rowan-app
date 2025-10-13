-- =============================================
-- FEATURE #9: AVATAR STACKING (MULTI-ASSIGNMENT)
-- =============================================
-- This migration creates a junction table for assigning multiple users to a task.

CREATE TABLE IF NOT EXISTS task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'assignee' CHECK (role IN ('assignee', 'reviewer', 'observer')),
  is_primary BOOLEAN DEFAULT FALSE, -- One primary assignee per task

  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(task_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user ON task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_role ON task_assignments(role);
CREATE INDEX IF NOT EXISTS idx_task_assignments_primary ON task_assignments(task_id, is_primary) WHERE is_primary = TRUE;

-- Ensure only one primary assignee per task
CREATE UNIQUE INDEX idx_task_assignments_one_primary
  ON task_assignments(task_id)
  WHERE is_primary = TRUE;

-- Function to sync tasks.assigned_to with primary assignment
CREATE OR REPLACE FUNCTION sync_task_primary_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.is_primary = TRUE THEN
      -- Update task.assigned_to to match primary assignee
      UPDATE tasks
      SET assigned_to = NEW.user_id
      WHERE id = NEW.task_id;

      -- Remove primary flag from other assignments
      UPDATE task_assignments
      SET is_primary = FALSE
      WHERE task_id = NEW.task_id
        AND user_id != NEW.user_id
        AND is_primary = TRUE;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- If primary assignment deleted, clear task.assigned_to
    IF OLD.is_primary = TRUE THEN
      UPDATE tasks
      SET assigned_to = NULL
      WHERE id = OLD.task_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_assignments_sync_primary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON task_assignments
  FOR EACH ROW
  WHEN (NEW.is_primary = TRUE OR (OLD.is_primary = TRUE AND TG_OP = 'DELETE'))
  EXECUTE FUNCTION sync_task_primary_assignment();

-- Migrate existing assigned_to data to task_assignments
DO $$
DECLARE
  task_record RECORD;
BEGIN
  FOR task_record IN
    SELECT id, assigned_to
    FROM tasks
    WHERE assigned_to IS NOT NULL
  LOOP
    INSERT INTO task_assignments (task_id, user_id, is_primary, role)
    VALUES (task_record.id, task_record.assigned_to, TRUE, 'assignee')
    ON CONFLICT (task_id, user_id) DO UPDATE
      SET is_primary = TRUE;
  END LOOP;
END $$;

-- Add comments
COMMENT ON TABLE task_assignments IS 'Junction table for assigning multiple users to a task';
COMMENT ON COLUMN task_assignments.role IS 'assignee = responsible, reviewer = approver, observer = follower';
COMMENT ON COLUMN task_assignments.is_primary IS 'Primary assignee appears in tasks.assigned_to for backward compatibility';
