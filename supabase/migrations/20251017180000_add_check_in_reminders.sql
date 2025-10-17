-- Create goal check-in reminders system for scheduling notifications

-- Create goal_check_in_reminders table to store scheduled reminder times
CREATE TABLE IF NOT EXISTS goal_check_in_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- When the check-in is scheduled for
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Has the reminder been sent?
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMP WITH TIME ZONE,

  -- Has the user completed this check-in?
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_goal_check_in_reminders_goal_id ON goal_check_in_reminders(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_check_in_reminders_user_id ON goal_check_in_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_check_in_reminders_scheduled_for ON goal_check_in_reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_goal_check_in_reminders_notification_sent ON goal_check_in_reminders(notification_sent);
CREATE INDEX IF NOT EXISTS idx_goal_check_in_reminders_completed ON goal_check_in_reminders(completed);

-- Enable RLS
ALTER TABLE goal_check_in_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies for goal_check_in_reminders

-- Users can view reminders for goals they have access to
CREATE POLICY "Users can view reminders for accessible goals"
  ON goal_check_in_reminders
  FOR SELECT
  USING (
    goal_id IN (
      SELECT g.id FROM goals g
      JOIN space_members sm ON g.space_id = sm.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- Users can create reminders for goals they have access to
CREATE POLICY "Users can create reminders for accessible goals"
  ON goal_check_in_reminders
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND
    goal_id IN (
      SELECT g.id FROM goals g
      JOIN space_members sm ON g.space_id = sm.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- Users can update their own reminders
CREATE POLICY "Users can update their own reminders"
  ON goal_check_in_reminders
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own reminders
CREATE POLICY "Users can delete their own reminders"
  ON goal_check_in_reminders
  FOR DELETE
  USING (user_id = auth.uid());

-- Function to calculate next check-in date based on frequency settings
CREATE OR REPLACE FUNCTION calculate_next_checkin_date(
  frequency TEXT,
  day_of_week INTEGER DEFAULT NULL,
  day_of_month INTEGER DEFAULT NULL,
  reminder_time TEXT DEFAULT '09:00',
  from_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  next_date TIMESTAMP WITH TIME ZONE;
  current_time TIME;
  target_time TIME;
BEGIN
  -- Parse reminder time
  target_time := reminder_time::TIME;

  CASE frequency
    WHEN 'daily' THEN
      -- For daily: next occurrence at the specified time
      next_date := DATE_TRUNC('day', from_date) + target_time;

      -- If we've already passed today's time, move to tomorrow
      IF next_date <= from_date THEN
        next_date := next_date + INTERVAL '1 day';
      END IF;

    WHEN 'weekly' THEN
      -- For weekly: next occurrence on the specified day of week
      IF day_of_week IS NULL THEN
        RAISE EXCEPTION 'day_of_week is required for weekly frequency';
      END IF;

      -- Calculate days until target day of week (0=Sunday, 6=Saturday)
      next_date := DATE_TRUNC('day', from_date) + target_time;
      next_date := next_date + (
        (day_of_week - EXTRACT(DOW FROM next_date)::INTEGER + 7) % 7
      ) * INTERVAL '1 day';

      -- If we've already passed this week's time, move to next week
      IF next_date <= from_date THEN
        next_date := next_date + INTERVAL '7 days';
      END IF;

    WHEN 'biweekly' THEN
      -- For bi-weekly: same as weekly but add 14 days instead of 7
      IF day_of_week IS NULL THEN
        RAISE EXCEPTION 'day_of_week is required for biweekly frequency';
      END IF;

      next_date := DATE_TRUNC('day', from_date) + target_time;
      next_date := next_date + (
        (day_of_week - EXTRACT(DOW FROM next_date)::INTEGER + 7) % 7
      ) * INTERVAL '1 day';

      -- If we've already passed this period's time, move to next period
      IF next_date <= from_date THEN
        next_date := next_date + INTERVAL '14 days';
      END IF;

    WHEN 'monthly' THEN
      -- For monthly: next occurrence on the specified day of month
      IF day_of_month IS NULL THEN
        RAISE EXCEPTION 'day_of_month is required for monthly frequency';
      END IF;

      -- Start with current month
      next_date := DATE_TRUNC('month', from_date) +
                  (LEAST(day_of_month, EXTRACT(DAY FROM DATE_TRUNC('month', from_date) + INTERVAL '1 month' - INTERVAL '1 day')) - 1) * INTERVAL '1 day' +
                  target_time;

      -- If we've already passed this month's time, move to next month
      IF next_date <= from_date THEN
        next_date := DATE_TRUNC('month', from_date) + INTERVAL '1 month' +
                    (LEAST(day_of_month, EXTRACT(DAY FROM DATE_TRUNC('month', from_date) + INTERVAL '2 months' - INTERVAL '1 day')) - 1) * INTERVAL '1 day' +
                    target_time;
      END IF;

    ELSE
      RAISE EXCEPTION 'Invalid frequency: %. Must be daily, weekly, biweekly, or monthly', frequency;
  END CASE;

  RETURN next_date;
END;
$$ LANGUAGE plpgsql;

-- Function to schedule next check-in reminder for a goal
CREATE OR REPLACE FUNCTION schedule_next_checkin_reminder(
  p_goal_id UUID,
  p_user_id UUID
) RETURNS VOID AS $$
DECLARE
  settings_record goal_check_in_settings%ROWTYPE;
  next_checkin_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get the user's check-in settings for this goal
  SELECT * INTO settings_record
  FROM goal_check_in_settings
  WHERE goal_id = p_goal_id AND user_id = p_user_id;

  -- If no settings found, skip scheduling
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calculate next check-in date
  next_checkin_date := calculate_next_checkin_date(
    settings_record.frequency,
    settings_record.day_of_week,
    settings_record.day_of_month,
    settings_record.reminder_time
  );

  -- Insert the reminder
  INSERT INTO goal_check_in_reminders (
    goal_id,
    user_id,
    scheduled_for
  ) VALUES (
    p_goal_id,
    p_user_id,
    next_checkin_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically schedule reminders when settings are created/updated
CREATE OR REPLACE FUNCTION trigger_schedule_checkin_reminders()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove any existing pending reminders for this goal/user
  DELETE FROM goal_check_in_reminders
  WHERE goal_id = NEW.goal_id
    AND user_id = NEW.user_id
    AND completed = FALSE
    AND notification_sent = FALSE;

  -- Schedule next reminder if auto_schedule is enabled
  IF NEW.auto_schedule = TRUE THEN
    PERFORM schedule_next_checkin_reminder(NEW.goal_id, NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-schedule reminders when settings are created/updated
DROP TRIGGER IF EXISTS trigger_schedule_checkin_reminders ON goal_check_in_settings;
CREATE TRIGGER trigger_schedule_checkin_reminders
  AFTER INSERT OR UPDATE ON goal_check_in_settings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_schedule_checkin_reminders();

-- Function to mark reminder as completed when check-in is created
CREATE OR REPLACE FUNCTION mark_checkin_reminder_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark any pending reminders as completed for this goal/user
  UPDATE goal_check_in_reminders
  SET
    completed = TRUE,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE goal_id = NEW.goal_id
    AND user_id = NEW.user_id
    AND completed = FALSE
    AND scheduled_for <= NOW() + INTERVAL '1 day'; -- Within 1 day of scheduled time

  -- Schedule the next reminder if auto_schedule is enabled
  DECLARE
    auto_schedule_enabled BOOLEAN;
  BEGIN
    SELECT auto_schedule INTO auto_schedule_enabled
    FROM goal_check_in_settings
    WHERE goal_id = NEW.goal_id AND user_id = NEW.user_id;

    IF auto_schedule_enabled = TRUE THEN
      PERFORM schedule_next_checkin_reminder(NEW.goal_id, NEW.user_id);
    END IF;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to mark reminders as completed when check-ins are created
DROP TRIGGER IF EXISTS trigger_mark_checkin_reminder_completed ON goal_check_ins;
CREATE TRIGGER trigger_mark_checkin_reminder_completed
  AFTER INSERT ON goal_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION mark_checkin_reminder_completed();

-- Grant permissions
GRANT ALL ON goal_check_in_reminders TO authenticated;
GRANT ALL ON goal_check_in_reminders TO service_role;