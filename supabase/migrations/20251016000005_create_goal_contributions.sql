-- =============================================
-- CREATE GOAL CONTRIBUTIONS LEDGER
-- Date: October 16, 2025
-- Purpose: Track financial contributions toward shared savings goals
-- =============================================

-- Create goal_contributions table (ledger of deposits)
CREATE TABLE IF NOT EXISTS goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

  -- Contribution details
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  payment_method TEXT, -- 'cash', 'bank_transfer', 'credit_card', 'paycheck', 'bonus', etc.

  -- Source expense tracking (if contribution came from an expense categorization)
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Audit trail
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Add financial goal fields to goals table
ALTER TABLE goals ADD COLUMN IF NOT EXISTS target_amount DECIMAL(12, 2);
ALTER TABLE goals ADD COLUMN IF NOT EXISTS current_amount DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS target_date DATE;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS is_financial BOOLEAN DEFAULT false;

-- Create indexes for performance
CREATE INDEX idx_goal_contributions_goal ON goal_contributions(goal_id);
CREATE INDEX idx_goal_contributions_user ON goal_contributions(user_id);
CREATE INDEX idx_goal_contributions_date ON goal_contributions(contribution_date);
CREATE INDEX idx_goals_financial ON goals(is_financial) WHERE is_financial = true;
CREATE INDEX idx_goals_target_date ON goals(target_date) WHERE target_date IS NOT NULL;

-- Enable RLS
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view contributions for goals they have access to
CREATE POLICY "Users can view goal contributions"
ON goal_contributions FOR SELECT TO authenticated
USING (
  goal_id IN (
    SELECT g.id FROM goals g
    WHERE
      -- Private goals: space members can view
      (g.visibility = 'private' AND g.space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      ))
      OR
      -- Shared goals: creator, collaborators, and space members can view
      (g.visibility = 'shared' AND (
        g.created_by = auth.uid()
        OR
        g.id IN (SELECT goal_id FROM goal_collaborators WHERE user_id = auth.uid())
        OR
        g.space_id IN (
          SELECT space_id FROM space_members WHERE user_id = auth.uid()
        )
      ))
  )
);

-- RLS Policies: Users can add contributions to goals they have access to
CREATE POLICY "Users can add goal contributions"
ON goal_contributions FOR INSERT TO authenticated
WITH CHECK (
  -- User must have access to the goal
  goal_id IN (
    SELECT g.id FROM goals g
    WHERE
      g.space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      )
      AND (
        g.visibility = 'private'
        OR
        (g.visibility = 'shared' AND (
          g.created_by = auth.uid()
          OR
          g.id IN (
            SELECT goal_id FROM goal_collaborators
            WHERE user_id = auth.uid()
            AND role IN ('contributor', 'owner')
          )
        ))
      )
  )
  AND user_id = auth.uid() -- Can only add contributions for themselves
);

-- RLS Policies: Users can update their own contributions
CREATE POLICY "Users can update own contributions"
ON goal_contributions FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- RLS Policies: Users can delete their own contributions
CREATE POLICY "Users can delete own contributions"
ON goal_contributions FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Function to update goal current_amount when contributions are added/removed
CREATE OR REPLACE FUNCTION update_goal_current_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate the current amount for the goal
  UPDATE goals
  SET
    current_amount = COALESCE((
      SELECT SUM(amount)
      FROM goal_contributions
      WHERE goal_id = COALESCE(NEW.goal_id, OLD.goal_id)
    ), 0),
    progress = CASE
      WHEN target_amount > 0 THEN
        LEAST(100, ROUND((COALESCE((
          SELECT SUM(amount)
          FROM goal_contributions
          WHERE goal_id = COALESCE(NEW.goal_id, OLD.goal_id)
        ), 0) / target_amount) * 100))
      ELSE progress
    END
  WHERE id = COALESCE(NEW.goal_id, OLD.goal_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to keep goal amounts in sync
DROP TRIGGER IF EXISTS trigger_update_goal_amount_on_insert ON goal_contributions;
CREATE TRIGGER trigger_update_goal_amount_on_insert
  AFTER INSERT ON goal_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_current_amount();

DROP TRIGGER IF EXISTS trigger_update_goal_amount_on_update ON goal_contributions;
CREATE TRIGGER trigger_update_goal_amount_on_update
  AFTER UPDATE ON goal_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_current_amount();

DROP TRIGGER IF EXISTS trigger_update_goal_amount_on_delete ON goal_contributions;
CREATE TRIGGER trigger_update_goal_amount_on_delete
  AFTER DELETE ON goal_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_current_amount();

-- Function to calculate projected completion date
CREATE OR REPLACE FUNCTION calculate_goal_completion_date(p_goal_id UUID)
RETURNS DATE AS $$
DECLARE
  v_target_amount DECIMAL(12, 2);
  v_current_amount DECIMAL(12, 2);
  v_remaining_amount DECIMAL(12, 2);
  v_avg_monthly_contribution DECIMAL(12, 2);
  v_months_remaining INTEGER;
  v_first_contribution_date DATE;
  v_last_contribution_date DATE;
  v_months_elapsed INTEGER;
  v_projected_date DATE;
BEGIN
  -- Get goal details
  SELECT target_amount, current_amount
  INTO v_target_amount, v_current_amount
  FROM goals
  WHERE id = p_goal_id;

  -- If no target or already reached, return NULL
  IF v_target_amount IS NULL OR v_current_amount >= v_target_amount THEN
    RETURN NULL;
  END IF;

  v_remaining_amount := v_target_amount - v_current_amount;

  -- Get contribution date range
  SELECT MIN(contribution_date), MAX(contribution_date)
  INTO v_first_contribution_date, v_last_contribution_date
  FROM goal_contributions
  WHERE goal_id = p_goal_id;

  -- If no contributions yet, return NULL
  IF v_first_contribution_date IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calculate months elapsed (minimum 1 month)
  v_months_elapsed := GREATEST(1,
    EXTRACT(YEAR FROM AGE(v_last_contribution_date, v_first_contribution_date)) * 12 +
    EXTRACT(MONTH FROM AGE(v_last_contribution_date, v_first_contribution_date))
  );

  -- Calculate average monthly contribution
  v_avg_monthly_contribution := v_current_amount / v_months_elapsed;

  -- Avoid division by zero
  IF v_avg_monthly_contribution <= 0 THEN
    RETURN NULL;
  END IF;

  -- Calculate months remaining
  v_months_remaining := CEIL(v_remaining_amount / v_avg_monthly_contribution);

  -- Calculate projected date
  v_projected_date := CURRENT_DATE + (v_months_remaining || ' months')::INTERVAL;

  RETURN v_projected_date;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger
CREATE TRIGGER goal_contributions_updated_at
BEFORE UPDATE ON goal_contributions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE goal_contributions IS 'Financial contribution ledger for tracking deposits toward savings goals';
COMMENT ON COLUMN goal_contributions.amount IS 'Contribution amount in dollars';
COMMENT ON COLUMN goal_contributions.payment_method IS 'How the contribution was made';
COMMENT ON COLUMN goal_contributions.expense_id IS 'Link to expense if contribution came from expense categorization';
COMMENT ON COLUMN goals.target_amount IS 'Financial goal target amount';
COMMENT ON COLUMN goals.current_amount IS 'Current amount contributed (auto-calculated from contributions)';
COMMENT ON COLUMN goals.target_date IS 'Target date to reach the goal';
COMMENT ON COLUMN goals.is_financial IS 'Whether this is a financial savings goal';

-- Create view for goal contribution statistics
CREATE OR REPLACE VIEW goal_contribution_stats AS
SELECT
  gc.goal_id,
  COUNT(gc.id) AS contribution_count,
  COUNT(DISTINCT gc.user_id) AS contributor_count,
  SUM(gc.amount) AS total_contributed,
  AVG(gc.amount) AS avg_contribution,
  MIN(gc.contribution_date) AS first_contribution_date,
  MAX(gc.contribution_date) AS last_contribution_date,
  g.target_amount,
  g.current_amount,
  g.target_date,
  CASE
    WHEN g.target_amount > 0 THEN
      ROUND(((g.current_amount / g.target_amount) * 100)::NUMERIC, 2)
    ELSE NULL
  END AS completion_percentage,
  CASE
    WHEN g.target_amount > g.current_amount THEN
      g.target_amount - g.current_amount
    ELSE 0
  END AS amount_remaining
FROM goal_contributions gc
INNER JOIN goals g ON gc.goal_id = g.id
GROUP BY gc.goal_id, g.target_amount, g.current_amount, g.target_date;

-- Grant view permissions
GRANT SELECT ON goal_contribution_stats TO authenticated;
GRANT SELECT ON goal_contribution_stats TO service_role;
