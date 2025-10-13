-- =============================================
-- FEATURE #14: TASK REMINDERS
-- =============================================
-- This migration creates a system for task reminders with notifications.

CREATE TABLE IF NOT EXISTS task_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  remind_at TIMESTAMPTZ NOT NULL,
  reminder_type TEXT DEFAULT 'notification' CHECK (reminder_type IN ('notification', 'email', 'both')),

  -- Pre-defined reminder offsets from due_date
  offset_type TEXT CHECK (offset_type IN ('at_due_time', '15_min_before', '1_hour_before', '1_day_before', '1_week_before', 'custom')),
  custom_offset_minutes INTEGER, -- For custom reminders

  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,

  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_reminders_task ON task_reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_user ON task_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_pending ON task_reminders(remind_at, is_sent) WHERE is_sent = FALSE;
CREATE INDEX IF NOT EXISTS idx_task_reminders_sent ON task_reminders(sent_at DESC) WHERE is_sent = TRUE;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_task_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_reminders_updated_at_trigger
  BEFORE UPDATE ON task_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_task_reminders_updated_at();

-- Function to auto-calculate remind_at based on offset_type
CREATE OR REPLACE FUNCTION calculate_reminder_time()
RETURNS TRIGGER AS $$
DECLARE
  task_due_date TIMESTAMPTZ;
BEGIN
  -- Get task due date
  SELECT due_date::TIMESTAMPTZ INTO task_due_date
  FROM tasks
  WHERE id = NEW.task_id;

  IF task_due_date IS NULL THEN
    RAISE EXCEPTION 'Cannot create reminder for task without due date';
  END IF;

  -- Calculate remind_at based on offset_type
  CASE NEW.offset_type
    WHEN 'at_due_time' THEN
      NEW.remind_at = task_due_date;
    WHEN '15_min_before' THEN
      NEW.remind_at = task_due_date - INTERVAL '15 minutes';
    WHEN '1_hour_before' THEN
      NEW.remind_at = task_due_date - INTERVAL '1 hour';
    WHEN '1_day_before' THEN
      NEW.remind_at = task_due_date - INTERVAL '1 day';
    WHEN '1_week_before' THEN
      NEW.remind_at = task_due_date - INTERVAL '1 week';
    WHEN 'custom' THEN
      IF NEW.custom_offset_minutes IS NULL THEN
        RAISE EXCEPTION 'custom_offset_minutes required for custom reminder';
      END IF;
      NEW.remind_at = task_due_date - (NEW.custom_offset_minutes || ' minutes')::INTERVAL;
    ELSE
      RAISE EXCEPTION 'Invalid offset_type: %', NEW.offset_type;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_reminders_calculate_time_trigger
  BEFORE INSERT ON task_reminders
  FOR EACH ROW
  WHEN (NEW.remind_at IS NULL)
  EXECUTE FUNCTION calculate_reminder_time();

-- Function to mark reminder as sent
CREATE OR REPLACE FUNCTION mark_reminder_sent(reminder_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE task_reminders
  SET
    is_sent = TRUE,
    sent_at = NOW()
  WHERE id = reminder_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending reminders (called by cron job)
CREATE OR REPLACE FUNCTION get_pending_reminders()
RETURNS TABLE (
  reminder_id UUID,
  task_id UUID,
  user_id UUID,
  task_title TEXT,
  task_description TEXT,
  reminder_type TEXT,
  remind_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tr.id,
    tr.task_id,
    tr.user_id,
    t.title,
    t.description,
    tr.reminder_type,
    tr.remind_at
  FROM task_reminders tr
  JOIN tasks t ON t.id = tr.task_id
  WHERE tr.is_sent = FALSE
    AND tr.remind_at <= NOW()
    AND t.status != 'completed'
  ORDER BY tr.remind_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Add default reminder preference to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS default_reminder_offset TEXT DEFAULT '1_day_before' CHECK (default_reminder_offset IN ('at_due_time', '15_min_before', '1_hour_before', '1_day_before', '1_week_before', 'custom'));

-- Add comments
COMMENT ON TABLE task_reminders IS 'Reminder system for tasks with customizable timing';
COMMENT ON COLUMN task_reminders.offset_type IS 'Pre-defined offset from due date or custom';
COMMENT ON COLUMN task_reminders.reminder_type IS 'notification = in-app push, email = email, both = both channels';
COMMENT ON COLUMN users.default_reminder_offset IS 'Default reminder timing for new tasks';
