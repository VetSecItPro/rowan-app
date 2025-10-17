-- Helper function to check if current time is within quiet hours
CREATE OR REPLACE FUNCTION is_in_quiet_hours(
  p_user_id UUID,
  p_space_id UUID DEFAULT NULL,
  p_check_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN AS $$
DECLARE
  v_prefs RECORD;
  v_current_time TIME;
  v_start_time TIME;
  v_end_time TIME;
  v_is_in_quiet_hours BOOLEAN;
BEGIN
  -- Get user preferences
  SELECT
    quiet_hours_enabled,
    quiet_hours_start,
    quiet_hours_end
  INTO v_prefs
  FROM user_notification_preferences
  WHERE user_id = p_user_id
    AND (space_id = p_space_id OR (space_id IS NULL AND p_space_id IS NULL))
  LIMIT 1;

  -- If no preferences found or quiet hours disabled, return false
  IF NOT FOUND OR NOT v_prefs.quiet_hours_enabled THEN
    RETURN FALSE;
  END IF;

  -- If start/end times not set, return false
  IF v_prefs.quiet_hours_start IS NULL OR v_prefs.quiet_hours_end IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Extract time component from check_time
  v_current_time := p_check_time::TIME;
  v_start_time := v_prefs.quiet_hours_start::TIME;
  v_end_time := v_prefs.quiet_hours_end::TIME;

  -- Check if current time is in quiet hours
  -- Handle cases where quiet hours span midnight
  IF v_start_time < v_end_time THEN
    -- Normal case: e.g., 22:00 to 08:00 next day
    v_is_in_quiet_hours := v_current_time >= v_start_time AND v_current_time < v_end_time;
  ELSE
    -- Spans midnight: e.g., 22:00 to 08:00
    v_is_in_quiet_hours := v_current_time >= v_start_time OR v_current_time < v_end_time;
  END IF;

  RETURN v_is_in_quiet_hours;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate next delivery time based on frequency
CREATE OR REPLACE FUNCTION calculate_next_delivery_time(
  p_frequency TEXT,
  p_base_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_next_time TIMESTAMPTZ;
BEGIN
  CASE p_frequency
    WHEN 'instant' THEN
      v_next_time := p_base_time;

    WHEN 'hourly' THEN
      -- Round up to next hour
      v_next_time := date_trunc('hour', p_base_time) + interval '1 hour';

    WHEN 'daily' THEN
      -- Schedule for next day at 9 AM
      v_next_time := (date_trunc('day', p_base_time) + interval '1 day' + interval '9 hours');

      -- If we're before 9 AM today, schedule for today at 9 AM
      IF p_base_time < (date_trunc('day', p_base_time) + interval '9 hours') THEN
        v_next_time := date_trunc('day', p_base_time) + interval '9 hours';
      END IF;

    WHEN 'never' THEN
      -- Far future, effectively never
      v_next_time := p_base_time + interval '100 years';

    ELSE
      v_next_time := p_base_time;
  END CASE;

  RETURN v_next_time;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to adjust delivery time for quiet hours
CREATE OR REPLACE FUNCTION adjust_for_quiet_hours(
  p_user_id UUID,
  p_space_id UUID,
  p_scheduled_time TIMESTAMPTZ
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_prefs RECORD;
  v_adjusted_time TIMESTAMPTZ;
  v_end_time TIME;
  v_scheduled_date DATE;
BEGIN
  -- Get user preferences
  SELECT
    quiet_hours_enabled,
    quiet_hours_start,
    quiet_hours_end
  INTO v_prefs
  FROM user_notification_preferences
  WHERE user_id = p_user_id
    AND (space_id = p_space_id OR (space_id IS NULL AND p_space_id IS NULL))
  LIMIT 1;

  -- If quiet hours not enabled, return original time
  IF NOT FOUND OR NOT v_prefs.quiet_hours_enabled THEN
    RETURN p_scheduled_time;
  END IF;

  -- If scheduled time is in quiet hours, adjust to end of quiet hours
  IF is_in_quiet_hours(p_user_id, p_space_id, p_scheduled_time) THEN
    v_scheduled_date := p_scheduled_time::DATE;
    v_end_time := v_prefs.quiet_hours_end::TIME;

    -- Create timestamp for end of quiet hours
    v_adjusted_time := (v_scheduled_date + v_end_time::TIME)::TIMESTAMPTZ;

    -- If end time is before scheduled time (spans midnight), add a day
    IF v_adjusted_time < p_scheduled_time THEN
      v_adjusted_time := v_adjusted_time + interval '1 day';
    END IF;

    RETURN v_adjusted_time;
  END IF;

  RETURN p_scheduled_time;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comments
COMMENT ON FUNCTION is_in_quiet_hours IS 'Checks if a given time falls within user quiet hours';
COMMENT ON FUNCTION calculate_next_delivery_time IS 'Calculates next delivery time based on notification frequency (instant/hourly/daily)';
COMMENT ON FUNCTION adjust_for_quiet_hours IS 'Adjusts scheduled delivery time if it falls within quiet hours';
