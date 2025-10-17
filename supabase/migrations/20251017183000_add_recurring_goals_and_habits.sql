-- Recurring Goals and Habits System
-- This migration creates a comprehensive system for recurring goals and habit tracking

-- Create recurring_goal_templates table
CREATE TABLE IF NOT EXISTS recurring_goal_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Template details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) DEFAULT 'general',
  tags JSONB DEFAULT '[]'::jsonb,

  -- Goal settings
  target_type VARCHAR(50) DEFAULT 'completion', -- completion, number, duration, distance, etc.
  target_value DECIMAL(10,2) DEFAULT 1,
  target_unit VARCHAR(50) DEFAULT 'times',

  -- Recurrence pattern
  recurrence_type VARCHAR(50) NOT NULL, -- daily, weekly, monthly, custom
  recurrence_pattern JSONB NOT NULL, -- stores detailed recurrence rules
  start_date DATE NOT NULL,
  end_date DATE, -- optional end date

  -- Habit-specific settings
  is_habit BOOLEAN DEFAULT FALSE,
  habit_category VARCHAR(100),
  ideal_streak_length INTEGER DEFAULT 30,
  allow_partial_completion BOOLEAN DEFAULT FALSE,

  -- Template status
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recurring_goal_instances table (generated goals for each period)
CREATE TABLE IF NOT EXISTS recurring_goal_instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES recurring_goal_templates(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL, -- links to actual goal if created

  -- Instance details
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_value DECIMAL(10,2) NOT NULL,
  current_value DECIMAL(10,2) DEFAULT 0,

  -- Instance status
  status VARCHAR(50) DEFAULT 'pending', -- pending, active, completed, skipped, failed
  completion_percentage INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Auto-generation tracking
  auto_generated BOOLEAN DEFAULT TRUE,
  generation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one instance per template per period
  UNIQUE(template_id, period_start)
);

-- Create habit_entries table for daily habit tracking
CREATE TABLE IF NOT EXISTS habit_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES recurring_goal_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Entry details
  entry_date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completion_value DECIMAL(10,2) DEFAULT 0, -- for quantitative habits
  notes TEXT,
  mood VARCHAR(50), -- great, okay, struggling

  -- Entry metadata
  completed_at TIMESTAMP WITH TIME ZONE,
  reminder_sent BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One entry per habit per day
  UNIQUE(template_id, user_id, entry_date)
);

-- Create habit_streaks table for tracking streaks
CREATE TABLE IF NOT EXISTS habit_streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES recurring_goal_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Streak details
  streak_type VARCHAR(50) NOT NULL, -- current, longest, weekly, monthly
  streak_count INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,

  -- Streak status
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One streak per type per habit per user
  UNIQUE(template_id, user_id, streak_type)
);

-- Create habit_analytics table for performance tracking
CREATE TABLE IF NOT EXISTS habit_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES recurring_goal_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Analytics period
  period_type VARCHAR(50) NOT NULL, -- weekly, monthly, quarterly, yearly
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Performance metrics
  total_days INTEGER DEFAULT 0,
  completed_days INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0, -- percentage
  average_value DECIMAL(10,2) DEFAULT 0,
  total_value DECIMAL(10,2) DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,

  -- Trend analysis
  trend_direction VARCHAR(20), -- improving, declining, stable
  trend_percentage DECIMAL(5,2) DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One analytics record per period per habit per user
  UNIQUE(template_id, user_id, period_type, period_start)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recurring_goal_templates_space_id ON recurring_goal_templates(space_id);
CREATE INDEX IF NOT EXISTS idx_recurring_goal_templates_created_by ON recurring_goal_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_recurring_goal_templates_category ON recurring_goal_templates(category);
CREATE INDEX IF NOT EXISTS idx_recurring_goal_templates_is_habit ON recurring_goal_templates(is_habit);
CREATE INDEX IF NOT EXISTS idx_recurring_goal_templates_is_active ON recurring_goal_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_goal_templates_recurrence_type ON recurring_goal_templates(recurrence_type);

CREATE INDEX IF NOT EXISTS idx_recurring_goal_instances_template_id ON recurring_goal_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_recurring_goal_instances_goal_id ON recurring_goal_instances(goal_id);
CREATE INDEX IF NOT EXISTS idx_recurring_goal_instances_period_start ON recurring_goal_instances(period_start);
CREATE INDEX IF NOT EXISTS idx_recurring_goal_instances_status ON recurring_goal_instances(status);

CREATE INDEX IF NOT EXISTS idx_habit_entries_template_id ON habit_entries(template_id);
CREATE INDEX IF NOT EXISTS idx_habit_entries_user_id ON habit_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_entries_entry_date ON habit_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_habit_entries_completed ON habit_entries(completed);

CREATE INDEX IF NOT EXISTS idx_habit_streaks_template_id ON habit_streaks(template_id);
CREATE INDEX IF NOT EXISTS idx_habit_streaks_user_id ON habit_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_streaks_is_active ON habit_streaks(is_active);

CREATE INDEX IF NOT EXISTS idx_habit_analytics_template_id ON habit_analytics(template_id);
CREATE INDEX IF NOT EXISTS idx_habit_analytics_user_id ON habit_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_analytics_period_type ON habit_analytics(period_type);

-- Enable RLS
ALTER TABLE recurring_goal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_goal_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for recurring_goal_templates

-- Users can view templates in their spaces
CREATE POLICY "Users can view templates in their spaces"
  ON recurring_goal_templates
  FOR SELECT
  USING (
    space_id IN (
      SELECT sm.space_id FROM space_members sm
      WHERE sm.user_id = auth.uid()
    )
  );

-- Users can create templates in their spaces
CREATE POLICY "Users can create templates in their spaces"
  ON recurring_goal_templates
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND space_id IN (
      SELECT sm.space_id FROM space_members sm
      WHERE sm.user_id = auth.uid()
    )
  );

-- Users can update templates they created
CREATE POLICY "Users can update their templates"
  ON recurring_goal_templates
  FOR UPDATE
  USING (created_by = auth.uid());

-- Users can delete templates they created
CREATE POLICY "Users can delete their templates"
  ON recurring_goal_templates
  FOR DELETE
  USING (created_by = auth.uid());

-- RLS policies for recurring_goal_instances

-- Users can view instances for templates in their spaces
CREATE POLICY "Users can view instances in their spaces"
  ON recurring_goal_instances
  FOR SELECT
  USING (
    template_id IN (
      SELECT rgt.id FROM recurring_goal_templates rgt
      JOIN space_members sm ON rgt.space_id = sm.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- System can create instances
CREATE POLICY "System can create instances"
  ON recurring_goal_instances
  FOR INSERT
  WITH CHECK (
    template_id IN (
      SELECT rgt.id FROM recurring_goal_templates rgt
      JOIN space_members sm ON rgt.space_id = sm.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- Users can update instances for templates they have access to
CREATE POLICY "Users can update accessible instances"
  ON recurring_goal_instances
  FOR UPDATE
  USING (
    template_id IN (
      SELECT rgt.id FROM recurring_goal_templates rgt
      JOIN space_members sm ON rgt.space_id = sm.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- RLS policies for habit_entries

-- Users can view their own habit entries
CREATE POLICY "Users can view their habit entries"
  ON habit_entries
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own habit entries
CREATE POLICY "Users can create their habit entries"
  ON habit_entries
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND template_id IN (
      SELECT rgt.id FROM recurring_goal_templates rgt
      JOIN space_members sm ON rgt.space_id = sm.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- Users can update their own habit entries
CREATE POLICY "Users can update their habit entries"
  ON habit_entries
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own habit entries
CREATE POLICY "Users can delete their habit entries"
  ON habit_entries
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS policies for habit_streaks

-- Users can view their own streaks
CREATE POLICY "Users can view their streaks"
  ON habit_streaks
  FOR SELECT
  USING (user_id = auth.uid());

-- System can manage streaks for users
CREATE POLICY "System can manage user streaks"
  ON habit_streaks
  FOR ALL
  USING (user_id = auth.uid());

-- RLS policies for habit_analytics

-- Users can view their own analytics
CREATE POLICY "Users can view their analytics"
  ON habit_analytics
  FOR SELECT
  USING (user_id = auth.uid());

-- System can manage analytics for users
CREATE POLICY "System can manage user analytics"
  ON habit_analytics
  FOR ALL
  USING (user_id = auth.uid());

-- Function to calculate next occurrence date based on recurrence pattern
CREATE OR REPLACE FUNCTION calculate_next_occurrence(
  recurrence_type TEXT,
  recurrence_pattern JSONB,
  from_date DATE DEFAULT CURRENT_DATE
) RETURNS DATE AS $$
DECLARE
  next_date DATE;
  pattern JSONB;
BEGIN
  pattern := recurrence_pattern;

  CASE recurrence_type
    WHEN 'daily' THEN
      -- Daily recurrence: every N days
      next_date := from_date + INTERVAL '1 day' * COALESCE((pattern->>'interval')::INTEGER, 1);

    WHEN 'weekly' THEN
      -- Weekly recurrence: specific days of week
      DECLARE
        days_of_week INTEGER[];
        target_day INTEGER;
        days_ahead INTEGER;
        found BOOLEAN := FALSE;
      BEGIN
        -- Get array of days (0=Sunday, 6=Saturday)
        SELECT ARRAY(SELECT jsonb_array_elements_text(pattern->'days_of_week')::INTEGER) INTO days_of_week;

        -- Find next occurrence
        FOR i IN 0..13 LOOP -- Check up to 2 weeks ahead
          target_day := EXTRACT(DOW FROM from_date + i)::INTEGER;
          IF target_day = ANY(days_of_week) AND (from_date + i) > from_date THEN
            next_date := from_date + i;
            found := TRUE;
            EXIT;
          END IF;
        END LOOP;

        IF NOT found THEN
          next_date := from_date + 7; -- Fallback to next week
        END IF;
      END;

    WHEN 'monthly' THEN
      -- Monthly recurrence: specific day of month
      DECLARE
        target_day INTEGER;
      BEGIN
        target_day := COALESCE((pattern->>'day_of_month')::INTEGER, EXTRACT(DAY FROM from_date)::INTEGER);

        -- Try current month first
        next_date := DATE_TRUNC('month', from_date) + INTERVAL '1 month' - INTERVAL '1 day';
        next_date := DATE_TRUNC('month', next_date) + (target_day - 1) * INTERVAL '1 day';

        -- If that's in the past or today, move to next month
        IF next_date <= from_date THEN
          next_date := DATE_TRUNC('month', from_date) + INTERVAL '1 month';
          next_date := next_date + (target_day - 1) * INTERVAL '1 day';
        END IF;
      END;

    WHEN 'custom' THEN
      -- Custom recurrence pattern
      next_date := from_date + INTERVAL '1 day'; -- Fallback

    ELSE
      next_date := from_date + INTERVAL '1 day';
  END CASE;

  RETURN next_date;
END;
$$ LANGUAGE plpgsql;

-- Function to generate recurring goal instances
CREATE OR REPLACE FUNCTION generate_recurring_instances(
  template_id_param UUID,
  until_date DATE DEFAULT CURRENT_DATE + INTERVAL '30 days'
) RETURNS INTEGER AS $$
DECLARE
  template_record recurring_goal_templates%ROWTYPE;
  current_date DATE;
  next_date DATE;
  instances_created INTEGER := 0;
  instance_exists BOOLEAN;
BEGIN
  -- Get template details
  SELECT * INTO template_record FROM recurring_goal_templates WHERE id = template_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found: %', template_id_param;
  END IF;

  current_date := GREATEST(template_record.start_date, CURRENT_DATE);

  -- Generate instances until the target date
  WHILE current_date <= until_date AND (template_record.end_date IS NULL OR current_date <= template_record.end_date) LOOP
    -- Check if instance already exists
    SELECT EXISTS(
      SELECT 1 FROM recurring_goal_instances
      WHERE template_id = template_id_param AND period_start = current_date
    ) INTO instance_exists;

    IF NOT instance_exists THEN
      -- Create new instance
      INSERT INTO recurring_goal_instances (
        template_id,
        period_start,
        period_end,
        target_value,
        status
      ) VALUES (
        template_id_param,
        current_date,
        current_date, -- For habits, start and end are the same day
        template_record.target_value,
        'pending'
      );

      instances_created := instances_created + 1;
    END IF;

    -- Calculate next occurrence
    next_date := calculate_next_occurrence(
      template_record.recurrence_type,
      template_record.recurrence_pattern,
      current_date
    );

    -- Prevent infinite loops
    IF next_date <= current_date THEN
      next_date := current_date + INTERVAL '1 day';
    END IF;

    current_date := next_date;
  END LOOP;

  RETURN instances_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update habit streaks when entry is created/updated
CREATE OR REPLACE FUNCTION update_habit_streaks()
RETURNS TRIGGER AS $$
DECLARE
  current_streak INTEGER := 0;
  longest_streak INTEGER := 0;
  streak_start DATE;
  check_date DATE;
  streak_broken BOOLEAN := FALSE;
BEGIN
  -- Only process if this is a completion or the completion status changed
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.completed != NEW.completed) THEN

    -- Calculate current streak by going backwards from today
    check_date := CURRENT_DATE;
    WHILE true LOOP
      -- Check if habit was completed on this date
      IF EXISTS(
        SELECT 1 FROM habit_entries
        WHERE template_id = NEW.template_id
          AND user_id = NEW.user_id
          AND entry_date = check_date
          AND completed = true
      ) THEN
        IF current_streak = 0 THEN
          streak_start := check_date;
        END IF;
        current_streak := current_streak + 1;
        check_date := check_date - INTERVAL '1 day';
      ELSE
        EXIT; -- Streak broken
      END IF;

      -- Prevent infinite loops
      IF check_date < (CURRENT_DATE - INTERVAL '365 days') THEN
        EXIT;
      END IF;
    END LOOP;

    -- Get longest streak (this is a simplified calculation)
    SELECT COALESCE(MAX(streak_count), 0) INTO longest_streak
    FROM habit_streaks
    WHERE template_id = NEW.template_id
      AND user_id = NEW.user_id
      AND streak_type = 'longest';

    -- Update longest streak if current is longer
    IF current_streak > longest_streak THEN
      longest_streak := current_streak;
    END IF;

    -- Upsert current streak
    INSERT INTO habit_streaks (
      template_id, user_id, streak_type, streak_count, start_date, is_active
    ) VALUES (
      NEW.template_id, NEW.user_id, 'current', current_streak,
      CASE WHEN current_streak > 0 THEN streak_start ELSE NULL END,
      current_streak > 0
    )
    ON CONFLICT (template_id, user_id, streak_type)
    DO UPDATE SET
      streak_count = current_streak,
      start_date = CASE WHEN current_streak > 0 THEN streak_start ELSE NULL END,
      is_active = current_streak > 0,
      updated_at = NOW();

    -- Upsert longest streak
    INSERT INTO habit_streaks (
      template_id, user_id, streak_type, streak_count, start_date, is_active
    ) VALUES (
      NEW.template_id, NEW.user_id, 'longest', longest_streak, streak_start, false
    )
    ON CONFLICT (template_id, user_id, streak_type)
    DO UPDATE SET
      streak_count = GREATEST(habit_streaks.streak_count, longest_streak),
      updated_at = NOW();

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update streaks when habit entries change
DROP TRIGGER IF EXISTS trigger_update_habit_streaks ON habit_entries;
CREATE TRIGGER trigger_update_habit_streaks
  AFTER INSERT OR UPDATE ON habit_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_habit_streaks();

-- Function to auto-generate habit instances for active templates
CREATE OR REPLACE FUNCTION auto_generate_habit_instances()
RETURNS INTEGER AS $$
DECLARE
  template_record recurring_goal_templates%ROWTYPE;
  total_generated INTEGER := 0;
BEGIN
  -- Generate instances for all active habit templates
  FOR template_record IN
    SELECT * FROM recurring_goal_templates
    WHERE is_active = true AND is_habit = true
  LOOP
    total_generated := total_generated + generate_recurring_instances(template_record.id);
  END LOOP;

  RETURN total_generated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON recurring_goal_templates TO authenticated;
GRANT ALL ON recurring_goal_templates TO service_role;
GRANT ALL ON recurring_goal_instances TO authenticated;
GRANT ALL ON recurring_goal_instances TO service_role;
GRANT ALL ON habit_entries TO authenticated;
GRANT ALL ON habit_entries TO service_role;
GRANT ALL ON habit_streaks TO authenticated;
GRANT ALL ON habit_streaks TO service_role;
GRANT ALL ON habit_analytics TO authenticated;
GRANT ALL ON habit_analytics TO service_role;

-- Grant execution permissions for functions
GRANT EXECUTE ON FUNCTION calculate_next_occurrence(TEXT, JSONB, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_recurring_instances(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_generate_habit_instances() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_generate_habit_instances() TO service_role;