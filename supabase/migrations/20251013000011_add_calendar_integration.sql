-- =============================================
-- FEATURE #12: CALENDAR INTEGRATION
-- =============================================
-- This migration adds calendar integration with opt-in preferences.

-- Add calendar display preference to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS show_tasks_on_calendar BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS calendar_task_filter JSONB DEFAULT '{"categories": [], "priorities": []}'::jsonb;

-- Create task_calendar_events table for syncing tasks to calendar
CREATE TABLE IF NOT EXISTS task_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE, -- Link to calendar event if synced
  is_synced BOOLEAN DEFAULT FALSE,
  sync_enabled BOOLEAN DEFAULT TRUE, -- Per-task override

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(task_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_calendar_events_task ON task_calendar_events(task_id);
CREATE INDEX IF NOT EXISTS idx_task_calendar_events_event ON task_calendar_events(event_id);
CREATE INDEX IF NOT EXISTS idx_task_calendar_events_synced ON task_calendar_events(is_synced) WHERE is_synced = TRUE;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_task_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_calendar_events_updated_at_trigger
  BEFORE UPDATE ON task_calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_task_calendar_events_updated_at();

-- Function to auto-create calendar event when task with due_date is created
CREATE OR REPLACE FUNCTION sync_task_to_calendar()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger only for new tasks (not updates)
CREATE TRIGGER tasks_sync_to_calendar_trigger
  AFTER INSERT ON tasks
  FOR EACH ROW
  WHEN (NEW.due_date IS NOT NULL)
  EXECUTE FUNCTION sync_task_to_calendar();

-- Function to update calendar event when task due_date changes
CREATE OR REPLACE FUNCTION update_calendar_event_from_task()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.due_date != OLD.due_date OR NEW.title != OLD.title THEN
    UPDATE events
    SET
      title = '📋 ' || NEW.title,
      start_time = NEW.due_date::TIMESTAMPTZ,
      end_time = (NEW.due_date::TIMESTAMPTZ + INTERVAL '1 hour'),
      updated_at = NOW()
    WHERE id = (
      SELECT event_id FROM task_calendar_events WHERE task_id = NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_update_calendar_event_trigger
  AFTER UPDATE ON tasks
  FOR EACH ROW
  WHEN (NEW.due_date IS NOT NULL AND (NEW.due_date != OLD.due_date OR NEW.title != OLD.title))
  EXECUTE FUNCTION update_calendar_event_from_task();

-- Add comments
COMMENT ON COLUMN users.show_tasks_on_calendar IS 'User preference: Display tasks with due dates on calendar';
COMMENT ON COLUMN users.calendar_task_filter IS 'JSON filter for which task categories/priorities to show on calendar';
COMMENT ON TABLE task_calendar_events IS 'Sync records between tasks and calendar events';
