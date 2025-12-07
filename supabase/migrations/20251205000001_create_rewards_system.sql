-- Phase 14: Chore Rewards & Gamification System
-- Creates tables for points, rewards catalog, and redemptions

-- =============================================================================
-- REWARD POINTS TABLE
-- Tracks each user's total points and level per space
-- =============================================================================
CREATE TABLE IF NOT EXISTS reward_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, space_id)
);

-- =============================================================================
-- POINT TRANSACTIONS TABLE
-- Immutable ledger of all point changes (credits and debits)
-- =============================================================================
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('chore', 'task', 'streak_bonus', 'weekly_goal', 'perfect_week', 'redemption', 'adjustment', 'bonus')),
  source_id UUID, -- Reference to chore_id, task_id, redemption_id, etc.
  points INTEGER NOT NULL, -- Can be negative for redemptions
  reason TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- REWARDS CATALOG TABLE
-- Configurable rewards that users can redeem
-- =============================================================================
CREATE TABLE IF NOT EXISTS rewards_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cost_points INTEGER NOT NULL CHECK (cost_points > 0),
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('screen_time', 'treats', 'activities', 'money', 'privileges', 'other')),
  image_url TEXT,
  emoji TEXT DEFAULT '🎁',
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_redemptions_per_week INTEGER, -- NULL = unlimited
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- REWARD REDEMPTIONS TABLE
-- Tracks when users redeem rewards
-- =============================================================================
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES rewards_catalog(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL CHECK (points_spent > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'fulfilled', 'denied', 'cancelled')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- ADD POINT_VALUE TO CHORES TABLE
-- =============================================================================
ALTER TABLE chores
ADD COLUMN IF NOT EXISTS point_value INTEGER NOT NULL DEFAULT 10 CHECK (point_value >= 0);

ALTER TABLE chores
ADD COLUMN IF NOT EXISTS bonus_multiplier NUMERIC(3,2) DEFAULT 1.0 CHECK (bonus_multiplier >= 0 AND bonus_multiplier <= 5);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_reward_points_user_space ON reward_points(user_id, space_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_space ON point_transactions(user_id, space_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON point_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_transactions_source ON point_transactions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_rewards_catalog_space ON rewards_catalog(space_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user ON reward_redemptions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_status ON reward_redemptions(status) WHERE status = 'pending';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE reward_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

-- Reward Points Policies
CREATE POLICY "Users can view their own points" ON reward_points
  FOR SELECT USING (
    user_id = auth.uid() OR
    space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
  );

CREATE POLICY "System can insert/update points" ON reward_points
  FOR ALL USING (
    space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
  );

-- Point Transactions Policies
CREATE POLICY "Users can view transactions in their spaces" ON point_transactions
  FOR SELECT USING (
    space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
  );

CREATE POLICY "System can insert transactions" ON point_transactions
  FOR INSERT WITH CHECK (
    space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
  );

-- Rewards Catalog Policies
CREATE POLICY "Users can view rewards in their spaces" ON rewards_catalog
  FOR SELECT USING (
    space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Space members can manage rewards" ON rewards_catalog
  FOR ALL USING (
    space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
  );

-- Reward Redemptions Policies
CREATE POLICY "Users can view redemptions in their spaces" ON reward_redemptions
  FOR SELECT USING (
    space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create their own redemptions" ON reward_redemptions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Space members can update redemptions" ON reward_redemptions
  FOR UPDATE USING (
    space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
  );

-- =============================================================================
-- TRIGGER: Update updated_at timestamp
-- =============================================================================
CREATE OR REPLACE FUNCTION update_rewards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reward_points_updated_at
  BEFORE UPDATE ON reward_points
  FOR EACH ROW EXECUTE FUNCTION update_rewards_updated_at();

CREATE TRIGGER trigger_rewards_catalog_updated_at
  BEFORE UPDATE ON rewards_catalog
  FOR EACH ROW EXECUTE FUNCTION update_rewards_updated_at();

CREATE TRIGGER trigger_reward_redemptions_updated_at
  BEFORE UPDATE ON reward_redemptions
  FOR EACH ROW EXECUTE FUNCTION update_rewards_updated_at();

-- =============================================================================
-- DEFAULT REWARDS SEED (will be inserted per-space when rewards are enabled)
-- This is just documentation - actual seeding happens in the service
-- =============================================================================
COMMENT ON TABLE reward_points IS 'Tracks user point balances and streaks per space';
COMMENT ON TABLE point_transactions IS 'Immutable ledger of all point credits and debits';
COMMENT ON TABLE rewards_catalog IS 'Configurable rewards that family members can redeem';
COMMENT ON TABLE reward_redemptions IS 'History of reward redemptions with approval workflow';
COMMENT ON COLUMN chores.point_value IS 'Points awarded when this chore is completed';
COMMENT ON COLUMN chores.bonus_multiplier IS 'Multiplier for streak bonuses (default 1.0)';
