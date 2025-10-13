-- =============================================
-- FEATURE #20: TASK HISTORY & ACTIVITY LOG
-- =============================================
-- This migration creates a comprehensive activity log for all task changes.

CREATE TABLE IF NOT EXISTS task_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  action_type TEXT NOT NULL CHECK (action_type IN (
    'created', 'updated', 'deleted', 'completed', 'uncompleted',
    'assigned', 'unassigned', 'status_changed', 'priority_changed',
    'due_date_changed', 'commented', 'attached_file', 'removed_file'
  )),

  -- Change details
  field_name TEXT, -- Which field changed (e.g., 'status', 'priority', 'due_date')
  old_value TEXT, -- Previous value (JSON stringified if complex)
  new_value TEXT, -- New value (JSON stringified if complex)
  change_summary TEXT, -- Human-readable summary of change

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb, -- Extra context (IP address, user agent, etc.)

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_activity_log_task ON task_activity_log(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_activity_log_user ON task_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_activity_log_action ON task_activity_log(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_activity_log_created_at ON task_activity_log(created_at DESC);

-- Function to log task changes
CREATE OR REPLACE FUNCTION log_task_changes()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
  change_summary_text TEXT;
BEGIN
  -- Get current user (from session context)
  current_user_id := current_setting('app.current_user_id', TRUE)::UUID;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO task_activity_log (task_id, user_id, action_type, change_summary)
    VALUES (NEW.id, current_user_id, 'created', 'Task created: ' || NEW.title);

  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'completed' THEN
        INSERT INTO task_activity_log (task_id, user_id, action_type, field_name, old_value, new_value, change_summary)
        VALUES (NEW.id, current_user_id, 'completed', 'status', OLD.status, NEW.status, 'Task marked as completed');
      ELSIF OLD.status = 'completed' THEN
        INSERT INTO task_activity_log (task_id, user_id, action_type, field_name, old_value, new_value, change_summary)
        VALUES (NEW.id, current_user_id, 'uncompleted', 'status', OLD.status, NEW.status, 'Task marked as incomplete');
      ELSE
        INSERT INTO task_activity_log (task_id, user_id, action_type, field_name, old_value, new_value, change_summary)
        VALUES (NEW.id, current_user_id, 'status_changed', 'status', OLD.status, NEW.status, 'Status changed from ' || OLD.status || ' to ' || NEW.status);
      END IF;
    END IF;

    -- Log priority changes
    IF NEW.priority IS DISTINCT FROM OLD.priority THEN
      INSERT INTO task_activity_log (task_id, user_id, action_type, field_name, old_value, new_value, change_summary)
      VALUES (NEW.id, current_user_id, 'priority_changed', 'priority', OLD.priority, NEW.priority, 'Priority changed from ' || OLD.priority || ' to ' || NEW.priority);
    END IF;

    -- Log due date changes
    IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
      INSERT INTO task_activity_log (task_id, user_id, action_type, field_name, old_value, new_value, change_summary)
      VALUES (NEW.id, current_user_id, 'due_date_changed', 'due_date', OLD.due_date::TEXT, NEW.due_date::TEXT, 'Due date changed');
    END IF;

    -- Log assignment changes
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      IF NEW.assigned_to IS NULL THEN
        INSERT INTO task_activity_log (task_id, user_id, action_type, field_name, change_summary)
        VALUES (NEW.id, current_user_id, 'unassigned', 'assigned_to', 'Task unassigned');
      ELSE
        INSERT INTO task_activity_log (task_id, user_id, action_type, field_name, change_summary)
        VALUES (NEW.id, current_user_id, 'assigned', 'assigned_to', 'Task assigned');
      END IF;
    END IF;

    -- Log general updates (title, description changes)
    IF NEW.title IS DISTINCT FROM OLD.title OR NEW.description IS DISTINCT FROM OLD.description THEN
      INSERT INTO task_activity_log (task_id, user_id, action_type, change_summary)
      VALUES (NEW.id, current_user_id, 'updated', 'Task details updated');
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO task_activity_log (task_id, user_id, action_type, change_summary)
    VALUES (OLD.id, current_user_id, 'deleted', 'Task deleted: ' || OLD.title);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_activity_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_changes();

-- Function to get task history timeline
CREATE OR REPLACE FUNCTION get_task_history(p_task_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_name TEXT,
  action_type TEXT,
  change_summary TEXT,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tal.id,
    tal.user_id,
    u.name as user_name,
    tal.action_type,
    tal.change_summary,
    tal.field_name,
    tal.old_value,
    tal.new_value,
    tal.created_at
  FROM task_activity_log tal
  LEFT JOIN users u ON u.id = tal.user_id
  WHERE tal.task_id = p_task_id
  ORDER BY tal.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Add retention policy: Keep activity logs for 1 year
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM task_activity_log
  WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE task_activity_log IS 'Comprehensive activity log for all task changes';
COMMENT ON COLUMN task_activity_log.action_type IS 'Type of action performed on the task';
COMMENT ON COLUMN task_activity_log.change_summary IS 'Human-readable description of the change';
COMMENT ON COLUMN task_activity_log.metadata IS 'Additional context (IP, user agent, etc.)';
