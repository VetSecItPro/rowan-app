-- =============================================
-- REMAINING HABITS TABLES MIGRATION
-- =============================================
-- Creates the remaining 4 tables needed for habits functionality
-- Date: 2025-11-09

-- =============================================
-- 1. RECURRING GOAL TEMPLATES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS recurring_goal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL,
  created_by UUID NOT NULL,

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recurring_goal_templates_space_id ON recurring_goal_templates(space_id);
CREATE INDEX IF NOT EXISTS idx_recurring_goal_templates_created_by ON recurring_goal_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_recurring_goal_templates_is_habit ON recurring_goal_templates(is_habit) WHERE is_habit = true;

-- RLS
ALTER TABLE recurring_goal_templates ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can manage recurring goal templates in their spaces" ON recurring_goal_templates;
CREATE POLICY "Users can manage recurring goal templates in their spaces"
  ON recurring_goal_templates
  FOR ALL
  USING (space_id IN (
    SELECT space_id FROM space_members WHERE user_id = auth.uid()
  ));

-- =============================================
-- 2. RECURRING GOAL INSTANCES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS recurring_goal_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL,
  goal_id UUID,

  -- Period definition
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Progress tracking
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'skipped', 'failed')),
  completion_percentage NUMERIC DEFAULT 0,

  -- Completion tracking
  completed_at TIMESTAMPTZ,

  -- Generation metadata
  auto_generated BOOLEAN DEFAULT true,
  generation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recurring_goal_instances_template_id ON recurring_goal_instances(template_id);

-- RLS
ALTER TABLE recurring_goal_instances ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can manage instances for their templates" ON recurring_goal_instances;
CREATE POLICY "Users can manage instances for their templates"
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
-- 3. HABIT ENTRIES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS habit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL,
  user_id UUID NOT NULL,

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_habit_entries_template_id ON habit_entries(template_id);
CREATE INDEX IF NOT EXISTS idx_habit_entries_user_id ON habit_entries(user_id);

-- RLS
ALTER TABLE habit_entries ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can manage their own habit entries" ON habit_entries;
CREATE POLICY "Users can manage their own habit entries"
  ON habit_entries
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- 4. HABIT ANALYTICS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS habit_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL,
  user_id UUID NOT NULL,

  -- Period definition
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Analytics data
  total_days INTEGER NOT NULL DEFAULT 0,
  completed_days INTEGER NOT NULL DEFAULT 0,
  completion_rate NUMERIC DEFAULT 0,
  average_value NUMERIC DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,

  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_habit_analytics_template_id ON habit_analytics(template_id);
CREATE INDEX IF NOT EXISTS idx_habit_analytics_user_id ON habit_analytics(user_id);

-- RLS
ALTER TABLE habit_analytics ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own habit analytics" ON habit_analytics;
CREATE POLICY "Users can view their own habit analytics"
  ON habit_analytics
  FOR SELECT
  USING (user_id = auth.uid());

-- =============================================
-- VERIFICATION
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '✅ REMAINING HABITS TABLES MIGRATION COMPLETE!';
    RAISE NOTICE 'Tables created: recurring_goal_templates, recurring_goal_instances, habit_entries, habit_analytics';

    -- Count total habit-related tables
    RAISE NOTICE 'Total habit tables: %', (
        SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema = 'public'
        AND (table_name LIKE '%habit%' OR table_name LIKE '%recurring_goal%')
    );

    RAISE NOTICE '🎉 Habits functionality should now be fully operational!';
END $$;