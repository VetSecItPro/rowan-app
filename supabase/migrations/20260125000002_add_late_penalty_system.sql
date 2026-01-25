-- Late Penalty System for Chores
-- Adds support for deducting points when chores are completed late

-- ============================================================================
-- SCHEMA CHANGES
-- ============================================================================

-- Add penalty configuration to chores table
ALTER TABLE chores
ADD COLUMN IF NOT EXISTS late_penalty_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS late_penalty_points INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS grace_period_hours INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS penalty_applied_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS penalty_points_deducted INTEGER DEFAULT 0;

-- Add comment explaining the columns
COMMENT ON COLUMN chores.late_penalty_enabled IS 'Whether late penalties apply to this chore';
COMMENT ON COLUMN chores.late_penalty_points IS 'Points to deduct per day late (default 5)';
COMMENT ON COLUMN chores.grace_period_hours IS 'Hours after due_date before penalty applies (default 2)';
COMMENT ON COLUMN chores.penalty_applied_at IS 'When penalty was last applied';
COMMENT ON COLUMN chores.penalty_points_deducted IS 'Total penalty points deducted for this instance';

-- ============================================================================
-- LATE PENALTIES AUDIT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS late_penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  chore_id UUID NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  -- Penalty details
  points_deducted INTEGER NOT NULL,
  days_late INTEGER NOT NULL DEFAULT 1,
  due_date TIMESTAMPTZ NOT NULL,
  completion_date TIMESTAMPTZ,
  penalty_type TEXT NOT NULL CHECK (penalty_type IN ('daily_accrual', 'completion_late', 'manual')),

  -- Status tracking
  is_forgiven BOOLEAN DEFAULT FALSE,
  forgiven_by UUID,
  forgiven_at TIMESTAMPTZ,
  forgiven_reason TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_late_penalties_space ON late_penalties(space_id);
CREATE INDEX IF NOT EXISTS idx_late_penalties_user ON late_penalties(user_id);
CREATE INDEX IF NOT EXISTS idx_late_penalties_chore ON late_penalties(chore_id);
CREATE INDEX IF NOT EXISTS idx_late_penalties_created ON late_penalties(created_at DESC);

-- ============================================================================
-- SPACE PENALTY SETTINGS
-- ============================================================================

-- Add penalty settings to spaces table for space-wide configuration
ALTER TABLE spaces
ADD COLUMN IF NOT EXISTS late_penalty_settings JSONB DEFAULT '{
  "enabled": false,
  "default_penalty_points": 5,
  "default_grace_period_hours": 2,
  "max_penalty_per_chore": 50,
  "progressive_penalty": true,
  "penalty_multiplier_per_day": 1.5,
  "exclude_weekends": false,
  "forgiveness_allowed": true
}'::jsonb;

COMMENT ON COLUMN spaces.late_penalty_settings IS 'Space-wide configuration for late penalty system';

-- ============================================================================
-- UPDATE POINT TRANSACTIONS SOURCE TYPE
-- ============================================================================

-- The source_type check needs to include 'late_penalty'
-- First, let's check if the constraint exists and drop it
DO $$
BEGIN
  -- Try to drop existing constraint (may fail if doesn't exist, that's ok)
  BEGIN
    ALTER TABLE point_transactions DROP CONSTRAINT IF EXISTS point_transactions_source_type_check;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;

  -- Add updated constraint with late_penalty
  ALTER TABLE point_transactions
  ADD CONSTRAINT point_transactions_source_type_check
  CHECK (source_type IN (
    'chore', 'task', 'streak_bonus', 'weekly_goal', 'perfect_week',
    'redemption', 'adjustment', 'bonus', 'late_penalty', 'penalty_forgiven'
  ));
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE late_penalties ENABLE ROW LEVEL SECURITY;

-- Users can view penalties in their space
CREATE POLICY "Users can view penalties in their space"
  ON late_penalties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM space_members
      WHERE space_members.space_id = late_penalties.space_id
      AND space_members.user_id = auth.uid()
    )
  );

-- System/admin can insert penalties (via service role)
CREATE POLICY "Service role can insert penalties"
  ON late_penalties FOR INSERT
  WITH CHECK (true);

-- Admins can update penalties (forgive)
CREATE POLICY "Admins can update penalties"
  ON late_penalties FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM space_members
      WHERE space_members.space_id = late_penalties.space_id
      AND space_members.user_id = auth.uid()
      AND space_members.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate penalty points for a chore
CREATE OR REPLACE FUNCTION calculate_late_penalty(
  p_due_date TIMESTAMPTZ,
  p_completion_date TIMESTAMPTZ,
  p_grace_period_hours INTEGER,
  p_base_penalty INTEGER,
  p_progressive BOOLEAN DEFAULT TRUE,
  p_multiplier NUMERIC DEFAULT 1.5,
  p_max_penalty INTEGER DEFAULT 50
)
RETURNS INTEGER AS $$
DECLARE
  v_deadline TIMESTAMPTZ;
  v_days_late INTEGER;
  v_penalty INTEGER;
BEGIN
  -- Calculate deadline (due_date + grace period)
  v_deadline := p_due_date + (p_grace_period_hours || ' hours')::INTERVAL;

  -- If completed before deadline, no penalty
  IF p_completion_date <= v_deadline THEN
    RETURN 0;
  END IF;

  -- Calculate days late (rounded up)
  v_days_late := CEIL(EXTRACT(EPOCH FROM (p_completion_date - v_deadline)) / 86400);

  -- Calculate penalty
  IF p_progressive THEN
    -- Progressive: base * multiplier^(days-1), capped
    v_penalty := LEAST(
      CEIL(p_base_penalty * POWER(p_multiplier, v_days_late - 1)),
      p_max_penalty
    );
  ELSE
    -- Flat: base * days, capped
    v_penalty := LEAST(p_base_penalty * v_days_late, p_max_penalty);
  END IF;

  RETURN v_penalty;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a chore is overdue
CREATE OR REPLACE FUNCTION is_chore_overdue(
  p_due_date TIMESTAMPTZ,
  p_grace_period_hours INTEGER DEFAULT 2
)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_due_date IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN NOW() > (p_due_date + (p_grace_period_hours || ' hours')::INTERVAL);
END;
$$ LANGUAGE plpgsql;

-- Function to get days overdue
CREATE OR REPLACE FUNCTION days_overdue(
  p_due_date TIMESTAMPTZ,
  p_grace_period_hours INTEGER DEFAULT 2
)
RETURNS INTEGER AS $$
DECLARE
  v_deadline TIMESTAMPTZ;
BEGIN
  IF p_due_date IS NULL THEN
    RETURN 0;
  END IF;

  v_deadline := p_due_date + (p_grace_period_hours || ' hours')::INTERVAL;

  IF NOW() <= v_deadline THEN
    RETURN 0;
  END IF;

  RETURN CEIL(EXTRACT(EPOCH FROM (NOW() - v_deadline)) / 86400);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for finding overdue chores efficiently
CREATE INDEX IF NOT EXISTS idx_chores_overdue_check
  ON chores(due_date, status, late_penalty_enabled)
  WHERE status IN ('pending', 'in-progress') AND due_date IS NOT NULL;
