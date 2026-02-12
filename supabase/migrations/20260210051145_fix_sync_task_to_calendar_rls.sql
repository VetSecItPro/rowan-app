-- Migration: fix_sync_task_to_calendar_rls (second pass)
-- Applied via MCP on 2026-02-10
-- Additional RLS fix for the sync_task_to_calendar trigger function
-- Ensures the function uses SECURITY DEFINER to bypass RLS when creating
-- calendar events on behalf of users

CREATE OR REPLACE FUNCTION sync_task_to_calendar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
  FROM public.users
  WHERE id = NEW.created_by;

  IF user_wants_sync THEN
    -- Create calendar event
    INSERT INTO public.events (
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
      '📋 ' || NEW.title,
      COALESCE(NEW.description, 'Task from Tasks page'),
      'task',
      NEW.due_date::TIMESTAMPTZ,
      (NEW.due_date::TIMESTAMPTZ + INTERVAL '1 hour'),
      NEW.assigned_to,
      NEW.created_by
    )
    RETURNING id INTO new_event_id;

    -- Create sync record
    INSERT INTO public.task_calendar_events (task_id, event_id, is_synced, sync_enabled)
    VALUES (NEW.id, new_event_id, TRUE, TRUE);
  END IF;

  RETURN NEW;
END;
$$;
