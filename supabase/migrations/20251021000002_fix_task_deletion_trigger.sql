-- Fix task deletion foreign key constraint violation
-- Remove the DELETE logging from the trigger to prevent race condition
-- with CASCADE deletion of activity logs

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

  -- REMOVED DELETE HANDLING TO PREVENT FOREIGN KEY CONSTRAINT VIOLATION
  -- The CASCADE deletion will handle cleaning up activity logs
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Update the trigger to only handle INSERT and UPDATE events
DROP TRIGGER IF EXISTS tasks_activity_log_trigger ON tasks;

CREATE TRIGGER tasks_activity_log_trigger
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_changes();

-- Add comment explaining the change
COMMENT ON FUNCTION log_task_changes() IS 'Logs task changes. DELETE events are not logged to prevent foreign key constraint violations with CASCADE deletion.';