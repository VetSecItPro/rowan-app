-- =============================================
-- FIX STREAK_TYPE COLUMN ERROR
-- =============================================
-- Simple fix for the missing streak_type column
-- Date: 2025-11-09

-- First, let's safely drop and recreate the habit_streaks table
DROP TABLE IF EXISTS habit_streaks CASCADE;

-- Create habit_streaks table with proper structure
CREATE TABLE habit_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL,
  user_id UUID NOT NULL,

  -- Streak data (this is where streak_type should be)
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

-- Add indexes
CREATE INDEX idx_habit_streaks_template_id ON habit_streaks(template_id);
CREATE INDEX idx_habit_streaks_user_id ON habit_streaks(user_id);
CREATE INDEX idx_habit_streaks_type ON habit_streaks(streak_type);
CREATE INDEX idx_habit_streaks_active ON habit_streaks(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE habit_streaks ENABLE ROW LEVEL SECURITY;

-- Add policy
CREATE POLICY "Users can manage their own habit streaks"
  ON habit_streaks
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Verification
DO $$
DECLARE
  col_exists BOOLEAN;
BEGIN
  -- Check if streak_type column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'habit_streaks'
    AND column_name = 'streak_type'
  ) INTO col_exists;

  IF col_exists THEN
    RAISE NOTICE '✅ SUCCESS: streak_type column exists in habit_streaks table';
  ELSE
    RAISE NOTICE '❌ ERROR: streak_type column still missing';
  END IF;

  RAISE NOTICE 'habit_streaks table structure verified';
END $$;