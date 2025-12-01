-- =============================================
-- HABITS & RECURRING GOALS MIGRATION - FIXED VERSION
-- =============================================
-- Run this in Supabase SQL Editor to create all required tables
-- This version handles existing objects gracefully
-- Date: 2025-11-09

-- =============================================
-- RECURRING GOAL TEMPLATES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS recurring_goal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Goal details
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',

  -- Target configuration
  target_type TEXT NOT NULL CHECK (target_type IN ('completion', 'number', 'duration', 'distance', 'custom')),
  target_value NUMERIC NOT NULL DEFAULT 1,
  target_unit TEXT NOT NULL DEFAULT 'times',

  -- Recurrence pattern
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'custom')),
  recurrence_pattern JSONB NOT NULL DEFAULT '{}',

  -- Date range
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,

  -- Habit-specific fields
  is_habit BOOLEAN NOT NULL DEFAULT false,
  habit_category TEXT,
  ideal_streak_length INTEGER DEFAULT 30,
  allow_partial_completion BOOLEAN DEFAULT true,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_recurring_goal_templates_space_id ON recurring_goal_templates(space_id);
CREATE INDEX IF NOT EXISTS idx_recurring_goal_templates_created_by ON recurring_goal_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_recurring_goal_templates_is_habit ON recurring_goal_templates(is_habit) WHERE is_habit = true;
CREATE INDEX IF NOT EXISTS idx_recurring_goal_templates_active ON recurring_goal_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_recurring_goal_templates_category ON recurring_goal_templates(category);

-- Enable RLS
ALTER TABLE recurring_goal_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Space members can view recurring goal templates" ON recurring_goal_templates;
DROP POLICY IF EXISTS "Space members can insert recurring goal templates" ON recurring_goal_templates;
DROP POLICY IF EXISTS "Template creators can update their recurring goal templates" ON recurring_goal_templates;
DROP POLICY IF EXISTS "Template creators can delete their recurring goal templates" ON recurring_goal_templates;

-- Create policies
CREATE POLICY "Space members can view recurring goal templates"
  ON recurring_goal_templates
  FOR SELECT
  USING (space_id IN (
    SELECT space_id FROM space_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Space members can insert recurring goal templates"
  ON recurring_goal_templates
  FOR INSERT
  WITH CHECK (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Template creators can update their recurring goal templates"
  ON recurring_goal_templates
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Template creators can delete their recurring goal templates"
  ON recurring_goal_templates
  FOR DELETE
  USING (created_by = auth.uid());

-- =============================================
-- RECURRING GOAL INSTANCES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS recurring_goal_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES recurring_goal_templates(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,

  -- Period definition
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Progress tracking
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'skipped', 'failed')),
  completion_percentage NUMERIC DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),

  -- Completion tracking
  completed_at TIMESTAMPTZ,

  -- Generation metadata
  auto_generated BOOLEAN DEFAULT true,
  generation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_recurring_goal_instances_template_id ON recurring_goal_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_recurring_goal_instances_goal_id ON recurring_goal_instances(goal_id);
CREATE INDEX IF NOT EXISTS idx_recurring_goal_instances_period ON recurring_goal_instances(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_recurring_goal_instances_status ON recurring_goal_instances(status);

-- Enable RLS
ALTER TABLE recurring_goal_instances ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can access instances for their templates" ON recurring_goal_instances;

-- Create policies
CREATE POLICY "Users can access instances for their templates"
  ON recurring_goal_instances
  FOR ALL
  USING (
    template_id IN (
      SELECT id FROM recurring_goal_templates
      WHERE space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================
-- HABIT ENTRIES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS habit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES recurring_goal_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Entry data
  entry_date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  completion_value NUMERIC DEFAULT 0,
  notes TEXT,
  mood TEXT CHECK (mood IN ('great', 'okay', 'struggling')),

  -- Completion metadata
  completed_at TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one entry per user per template per day
  CONSTRAINT unique_habit_entry_per_day UNIQUE (template_id, user_id, entry_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_habit_entries_template_id ON habit_entries(template_id);
CREATE INDEX IF NOT EXISTS idx_habit_entries_user_id ON habit_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_entries_date ON habit_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_habit_entries_completed ON habit_entries(completed) WHERE completed = true;

-- Enable RLS
ALTER TABLE habit_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can manage their own habit entries" ON habit_entries;

-- Create policies
CREATE POLICY "Users can manage their own habit entries"
  ON habit_entries
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- HABIT STREAKS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS habit_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES recurring_goal_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Streak data
  streak_type TEXT NOT NULL CHECK (streak_type IN ('current', 'longest', 'weekly', 'monthly')),
  streak_count INTEGER NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one streak per type per user per template
  CONSTRAINT unique_streak_per_type UNIQUE (template_id, user_id, streak_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_habit_streaks_template_id ON habit_streaks(template_id);
CREATE INDEX IF NOT EXISTS idx_habit_streaks_user_id ON habit_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_streaks_type ON habit_streaks(streak_type);
CREATE INDEX IF NOT EXISTS idx_habit_streaks_active ON habit_streaks(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE habit_streaks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can manage their own habit streaks" ON habit_streaks;

-- Create policies
CREATE POLICY "Users can manage their own habit streaks"
  ON habit_streaks
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- HABIT ANALYTICS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS habit_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES recurring_goal_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Period definition
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Analytics data
  total_days INTEGER NOT NULL DEFAULT 0,
  completed_days INTEGER NOT NULL DEFAULT 0,
  completion_rate NUMERIC DEFAULT 0 CHECK (completion_rate >= 0 AND completion_rate <= 100),
  average_value NUMERIC DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,

  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one analytics record per period per user per template
  CONSTRAINT unique_analytics_per_period UNIQUE (template_id, user_id, period_type, period_start)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_habit_analytics_template_id ON habit_analytics(template_id);
CREATE INDEX IF NOT EXISTS idx_habit_analytics_user_id ON habit_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_analytics_period ON habit_analytics(period_type, period_start);

-- Enable RLS
ALTER TABLE habit_analytics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own habit analytics" ON habit_analytics;
DROP POLICY IF EXISTS "System can manage habit analytics" ON habit_analytics;

-- Create policies
CREATE POLICY "Users can view their own habit analytics"
  ON habit_analytics
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can manage habit analytics"
  ON habit_analytics
  FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers first
DROP TRIGGER IF EXISTS recurring_goal_templates_updated_at ON recurring_goal_templates;
DROP TRIGGER IF EXISTS recurring_goal_instances_updated_at ON recurring_goal_instances;
DROP TRIGGER IF EXISTS habit_entries_updated_at ON habit_entries;
DROP TRIGGER IF EXISTS habit_streaks_updated_at ON habit_streaks;
DROP TRIGGER IF EXISTS habit_analytics_updated_at ON habit_analytics;

-- Create triggers for updated_at
CREATE TRIGGER recurring_goal_templates_updated_at
  BEFORE UPDATE ON recurring_goal_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER recurring_goal_instances_updated_at
  BEFORE UPDATE ON recurring_goal_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER habit_entries_updated_at
  BEFORE UPDATE ON habit_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER habit_streaks_updated_at
  BEFORE UPDATE ON habit_streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER habit_analytics_updated_at
  BEFORE UPDATE ON habit_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE recurring_goal_templates IS 'Templates for recurring goals and habits with configuration and targeting';
COMMENT ON TABLE recurring_goal_instances IS 'Generated instances of recurring goals for specific time periods';
COMMENT ON TABLE habit_entries IS 'Daily entries for habit completion tracking';
COMMENT ON TABLE habit_streaks IS 'Tracks different types of streaks for habits (current, longest, etc.)';
COMMENT ON TABLE habit_analytics IS 'Aggregated analytics data for habits over different time periods';

-- =============================================
-- VERIFICATION QUERY
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '🎉 HABITS & RECURRING GOALS MIGRATION COMPLETE!';
    RAISE NOTICE '✅ Tables created: recurring_goal_templates, recurring_goal_instances, habit_entries, habit_streaks, habit_analytics';
    RAISE NOTICE '🔒 Security: All tables have RLS enabled with proper space-based access control';
    RAISE NOTICE '⚡ Performance: Indexes created for efficient querying';
    RAISE NOTICE '🔄 Automation: Updated_at triggers installed';
    RAISE NOTICE '📊 Status: Habits functionality now fully supported in database';

    -- Quick verification
    RAISE NOTICE '';
    RAISE NOTICE '📋 VERIFICATION:';
    RAISE NOTICE 'Tables created: %', (
        SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('recurring_goal_templates', 'recurring_goal_instances', 'habit_entries', 'habit_streaks', 'habit_analytics')
    );
END $$;