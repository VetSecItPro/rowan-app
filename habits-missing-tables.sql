-- =============================================
-- MINIMAL HABITS MIGRATION - MISSING TABLES ONLY
-- =============================================
-- Run this to add only the missing tables that caused the error
-- Date: 2025-11-09

-- =============================================
-- CHECK AND CREATE MISSING TABLES
-- =============================================

-- Create habit_streaks table (this was missing based on the error)
CREATE TABLE IF NOT EXISTS habit_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL,
  user_id UUID NOT NULL,

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

-- Create habit_entries table if missing
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

-- Create habit_analytics table if missing
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

-- Add indexes for performance (only if tables were just created)
CREATE INDEX IF NOT EXISTS idx_habit_streaks_template_id ON habit_streaks(template_id);
CREATE INDEX IF NOT EXISTS idx_habit_streaks_user_id ON habit_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_streaks_type ON habit_streaks(streak_type);
CREATE INDEX IF NOT EXISTS idx_habit_streaks_active ON habit_streaks(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_habit_entries_template_id ON habit_entries(template_id);
CREATE INDEX IF NOT EXISTS idx_habit_entries_user_id ON habit_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_entries_date ON habit_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_habit_entries_completed ON habit_entries(completed) WHERE completed = true;

CREATE INDEX IF NOT EXISTS idx_habit_analytics_template_id ON habit_analytics(template_id);
CREATE INDEX IF NOT EXISTS idx_habit_analytics_user_id ON habit_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_analytics_period ON habit_analytics(period_type, period_start);

-- Enable RLS on the new tables
ALTER TABLE habit_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_analytics ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policies
DROP POLICY IF EXISTS "Users can manage their own habit streaks" ON habit_streaks;
CREATE POLICY "Users can manage their own habit streaks"
  ON habit_streaks
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own habit entries" ON habit_entries;
CREATE POLICY "Users can manage their own habit entries"
  ON habit_entries
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own habit analytics" ON habit_analytics;
CREATE POLICY "Users can view their own habit analytics"
  ON habit_analytics
  FOR SELECT
  USING (user_id = auth.uid());

-- Verification
DO $$
BEGIN
    RAISE NOTICE '✅ MISSING TABLES MIGRATION COMPLETE!';
    RAISE NOTICE 'Tables created/verified: habit_streaks, habit_entries, habit_analytics';
    RAISE NOTICE 'Total habit tables now: %', (
        SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE '%habit%'
    );
END $$;