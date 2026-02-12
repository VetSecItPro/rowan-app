-- Fix sync_task_to_calendar function to bypass RLS
-- This prevents "FOR UPDATE is not allowed with aggregate functions" errors
-- when creating tasks in E2E tests.
--
-- Root cause: Function was missing SECURITY DEFINER, causing RLS policies
-- to be evaluated inside the function, leading to complex query plans that
-- PostgreSQL cannot optimize (FOR UPDATE + aggregates).
--
-- Solution: Add SECURITY DEFINER so function runs with definer's privileges,
-- bypassing RLS. This is safe because the trigger is only called after
-- the task INSERT has already passed RLS checks.

CREATE OR REPLACE FUNCTION sync_task_to_calendar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- <-- FIX: Bypass RLS inside function
SET search_path = public
AS $$
DECLARE
  user_wants_sync BOOLEAN;
  new_event_id UUID;
BEGIN
  -- Only sync if task has a due_date
  IF NEW.due_date IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if user wants tasks on calendar (default TRUE)
  SELECT COALESCE(show_tasks_on_calendar, TRUE)
  INTO user_wants_sync
  FROM users
  WHERE id = NEW.created_by;

  IF user_wants_sync THEN
    -- Create calendar event
    INSERT INTO events (
      space_id,
      title,
      description,
      event_type,
      start_time,
      end_time,
      assigned_to,
      created_by
    ) VALUES (
      NEW.space_id,
      '📋 ' || NEW.title, -- Prefix with task emoji
      COALESCE(NEW.description, 'Task from Tasks page'),
      'task',
      NEW.due_date::TIMESTAMPTZ,
      (NEW.due_date::TIMESTAMPTZ + INTERVAL '1 hour'), -- Default 1-hour duration
      NEW.assigned_to,
      NEW.created_by
    )
    RETURNING id INTO new_event_id;

    -- Create sync record
    INSERT INTO task_calendar_events (task_id, event_id, is_synced, sync_enabled)
    VALUES (NEW.id, new_event_id, TRUE, TRUE);
  END IF;

  RETURN NEW;
END;
$$;

-- Comment explaining the fix
COMMENT ON FUNCTION sync_task_to_calendar() IS
  'Trigger function to create calendar events for tasks with due dates. ' ||
  'SECURITY DEFINER bypasses RLS to prevent query optimization issues.';
