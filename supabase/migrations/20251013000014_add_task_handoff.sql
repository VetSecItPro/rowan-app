-- =============================================
-- FEATURE #15: TASK HANDOFF/REASSIGNMENT
-- =============================================
-- This migration adds task handoff/reassignment tracking with notes.

CREATE TABLE IF NOT EXISTS task_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL if unassigned
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  handoff_note TEXT, -- Optional note explaining the handoff
  reason TEXT, -- Optional reason category (e.g., 'overloaded', 'expertise', 'unavailable')

  performed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Who initiated the handoff
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_handoffs_task ON task_handoffs(task_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_handoffs_from_user ON task_handoffs(from_user_id);
CREATE INDEX IF NOT EXISTS idx_task_handoffs_to_user ON task_handoffs(to_user_id);
CREATE INDEX IF NOT EXISTS idx_task_handoffs_performed_at ON task_handoffs(performed_at DESC);

-- Function to automatically record handoff when assigned_to changes
CREATE OR REPLACE FUNCTION record_task_handoff()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Only record if assigned_to actually changed
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    -- Get current user (from session context or use created_by as fallback)
    current_user_id := current_setting('app.current_user_id', TRUE)::UUID;
    IF current_user_id IS NULL THEN
      current_user_id := NEW.created_by;
    END IF;

    -- Record the handoff
    INSERT INTO task_handoffs (
      task_id,
      from_user_id,
      to_user_id,
      performed_by,
      performed_at
    ) VALUES (
      NEW.id,
      OLD.assigned_to,
      NEW.assigned_to,
      current_user_id,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_handoff_tracking_trigger
  AFTER UPDATE OF assigned_to ON tasks
  FOR EACH ROW
  WHEN (NEW.assigned_to IS DISTINCT FROM OLD.assigned_to)
  EXECUTE FUNCTION record_task_handoff();

-- Add handoff_count to tasks for quick stats
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS handoff_count INTEGER DEFAULT 0;

-- Function to update handoff_count
CREATE OR REPLACE FUNCTION update_task_handoff_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tasks
  SET handoff_count = handoff_count + 1
  WHERE id = NEW.task_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_handoffs_count_trigger
  AFTER INSERT ON task_handoffs
  FOR EACH ROW
  EXECUTE FUNCTION update_task_handoff_count();

-- Add comments
COMMENT ON TABLE task_handoffs IS 'Tracks task reassignments with optional notes and reasons';
COMMENT ON COLUMN task_handoffs.handoff_note IS 'Optional note from assignee to new assignee';
COMMENT ON COLUMN task_handoffs.reason IS 'Category reason for handoff (overloaded, expertise, unavailable)';
COMMENT ON COLUMN task_handoffs.performed_by IS 'User who initiated the reassignment';
COMMENT ON COLUMN tasks.handoff_count IS 'Total number of times task has been reassigned';
