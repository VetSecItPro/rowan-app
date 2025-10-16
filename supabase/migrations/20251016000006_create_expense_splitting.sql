-- =============================================
-- CREATE EXPENSE SPLITTING SYSTEM
-- Date: October 16, 2025
-- Purpose: Track shared expenses, splits, and settlements between partners
-- =============================================

-- Add ownership and split fields to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS ownership TEXT DEFAULT 'shared' CHECK (ownership IN ('shared', 'yours', 'theirs'));
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS split_type TEXT DEFAULT 'equal' CHECK (split_type IN ('equal', 'percentage', 'fixed', 'income-based'));
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS split_percentage_user1 DECIMAL(5, 2); -- Percentage for first user (0-100)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS split_percentage_user2 DECIMAL(5, 2); -- Percentage for second user (0-100)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS split_amount_user1 DECIMAL(10, 2); -- Fixed amount for user 1
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS split_amount_user2 DECIMAL(10, 2); -- Fixed amount for user 2
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_split BOOLEAN DEFAULT false;

-- Create expense_splits table for detailed split tracking
CREATE TABLE IF NOT EXISTS expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Split details
  amount_owed DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  percentage DECIMAL(5, 2), -- Their percentage of the total
  is_payer BOOLEAN DEFAULT false, -- Whether this user paid the expense

  -- Settlement status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partially-paid', 'settled')),
  settled_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create settlements table (payments between partners to settle up)
CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

  -- Payment details
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Payment method
  payment_method TEXT, -- 'cash', 'venmo', 'bank_transfer', 'paypal', etc.
  reference_number TEXT, -- Transaction ID or reference
  notes TEXT,

  -- Linked expenses (optional - can settle multiple expenses at once)
  expense_ids UUID[], -- Array of expense IDs being settled

  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create partnership_balances table (running balance between partners)
CREATE TABLE IF NOT EXISTS partnership_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID NOT NULL REFERENCES partnerships(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

  -- Balance tracking (who owes whom)
  user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(10, 2) DEFAULT 0, -- Positive = user1 owes user2, Negative = user2 owes user1

  -- Income for fairness calculations
  user1_income DECIMAL(12, 2),
  user2_income DECIMAL(12, 2),

  -- Metadata
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique balance per partnership per space
  UNIQUE(partnership_id, space_id)
);

-- Create indexes for performance
CREATE INDEX idx_expense_splits_expense ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user ON expense_splits(user_id);
CREATE INDEX idx_expense_splits_status ON expense_splits(status);
CREATE INDEX idx_settlements_from_user ON settlements(from_user_id);
CREATE INDEX idx_settlements_to_user ON settlements(to_user_id);
CREATE INDEX idx_settlements_space ON settlements(space_id);
CREATE INDEX idx_settlements_date ON settlements(settlement_date);
CREATE INDEX idx_partnership_balances_partnership ON partnership_balances(partnership_id);
CREATE INDEX idx_partnership_balances_space ON partnership_balances(space_id);
CREATE INDEX idx_expenses_ownership ON expenses(ownership);
CREATE INDEX idx_expenses_split ON expenses(is_split) WHERE is_split = true;

-- Enable RLS
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnership_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Expense Splits
CREATE POLICY "Users can view expense splits for their expenses"
ON expense_splits FOR SELECT TO authenticated
USING (
  expense_id IN (
    SELECT e.id FROM expenses e
    INNER JOIN spaces ON e.space_id = spaces.id
    INNER JOIN partnership_members pm ON spaces.partnership_id = pm.partnership_id
    WHERE pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage expense splits for their expenses"
ON expense_splits FOR ALL TO authenticated
USING (
  expense_id IN (
    SELECT e.id FROM expenses e
    INNER JOIN spaces ON e.space_id = spaces.id
    INNER JOIN partnership_members pm ON spaces.partnership_id = pm.partnership_id
    WHERE pm.user_id = auth.uid()
  )
);

-- RLS Policies: Settlements
CREATE POLICY "Users can view settlements in their spaces"
ON settlements FOR SELECT TO authenticated
USING (
  space_id IN (
    SELECT space_id FROM space_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create settlements in their spaces"
ON settlements FOR INSERT TO authenticated
WITH CHECK (
  space_id IN (
    SELECT space_id FROM space_members WHERE user_id = auth.uid()
  )
  AND from_user_id = auth.uid() -- Can only create settlements from yourself
);

CREATE POLICY "Users can update their own settlements"
ON settlements FOR UPDATE TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own settlements"
ON settlements FOR DELETE TO authenticated
USING (created_by = auth.uid());

-- RLS Policies: Partnership Balances
CREATE POLICY "Users can view balances for their partnerships"
ON partnership_balances FOR SELECT TO authenticated
USING (
  partnership_id IN (
    SELECT partnership_id FROM partnership_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Partnership members can update balances"
ON partnership_balances FOR ALL TO authenticated
USING (
  partnership_id IN (
    SELECT partnership_id FROM partnership_members WHERE user_id = auth.uid()
  )
);

-- Function to calculate split amounts based on split type
CREATE OR REPLACE FUNCTION calculate_expense_splits(p_expense_id UUID)
RETURNS VOID AS $$
DECLARE
  v_expense RECORD;
  v_space_id UUID;
  v_users UUID[];
  v_user1_id UUID;
  v_user2_id UUID;
  v_amount DECIMAL(10, 2);
  v_split_type TEXT;
  v_user1_amount DECIMAL(10, 2);
  v_user2_amount DECIMAL(10, 2);
  v_user1_income DECIMAL(12, 2);
  v_user2_income DECIMAL(12, 2);
  v_total_income DECIMAL(12, 2);
BEGIN
  -- Get expense details
  SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id;

  IF NOT FOUND OR v_expense.is_split = false THEN
    RETURN;
  END IF;

  v_space_id := v_expense.space_id;
  v_amount := v_expense.amount;
  v_split_type := v_expense.split_type;

  -- Get the two users in the space
  SELECT ARRAY_AGG(user_id) INTO v_users
  FROM space_members
  WHERE space_id = v_space_id
  LIMIT 2;

  IF ARRAY_LENGTH(v_users, 1) < 2 THEN
    RETURN; -- Need at least 2 users to split
  END IF;

  v_user1_id := v_users[1];
  v_user2_id := v_users[2];

  -- Calculate split amounts based on type
  CASE v_split_type
    WHEN 'equal' THEN
      v_user1_amount := v_amount / 2;
      v_user2_amount := v_amount / 2;

    WHEN 'percentage' THEN
      v_user1_amount := (v_amount * COALESCE(v_expense.split_percentage_user1, 50)) / 100;
      v_user2_amount := (v_amount * COALESCE(v_expense.split_percentage_user2, 50)) / 100;

    WHEN 'fixed' THEN
      v_user1_amount := COALESCE(v_expense.split_amount_user1, v_amount / 2);
      v_user2_amount := COALESCE(v_expense.split_amount_user2, v_amount / 2);

    WHEN 'income-based' THEN
      -- Get incomes from partnership_balances
      SELECT user1_income, user2_income INTO v_user1_income, v_user2_income
      FROM partnership_balances pb
      INNER JOIN spaces s ON pb.space_id = s.id
      WHERE s.id = v_space_id
      LIMIT 1;

      IF v_user1_income IS NOT NULL AND v_user2_income IS NOT NULL THEN
        v_total_income := v_user1_income + v_user2_income;
        IF v_total_income > 0 THEN
          v_user1_amount := (v_amount * v_user1_income) / v_total_income;
          v_user2_amount := (v_amount * v_user2_income) / v_total_income;
        ELSE
          -- Fallback to equal split if no income data
          v_user1_amount := v_amount / 2;
          v_user2_amount := v_amount / 2;
        END IF;
      ELSE
        -- Fallback to equal split if no income data
        v_user1_amount := v_amount / 2;
        v_user2_amount := v_amount / 2;
      END IF;

    ELSE
      -- Default to equal split
      v_user1_amount := v_amount / 2;
      v_user2_amount := v_amount / 2;
  END CASE;

  -- Delete existing splits for this expense
  DELETE FROM expense_splits WHERE expense_id = p_expense_id;

  -- Create new splits
  INSERT INTO expense_splits (expense_id, user_id, amount_owed, percentage, is_payer)
  VALUES
    (p_expense_id, v_user1_id, v_user1_amount, (v_user1_amount / v_amount) * 100, v_expense.paid_by = v_user1_id),
    (p_expense_id, v_user2_id, v_user2_amount, (v_user2_amount / v_amount) * 100, v_expense.paid_by = v_user2_id);

  -- Update amount_paid for the payer
  IF v_expense.paid_by IS NOT NULL THEN
    UPDATE expense_splits
    SET amount_paid = amount_owed, status = 'settled'
    WHERE expense_id = p_expense_id AND user_id = v_expense.paid_by;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-calculate splits when expense is created/updated
CREATE OR REPLACE FUNCTION trigger_calculate_splits()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_split = true THEN
    PERFORM calculate_expense_splits(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS expense_splits_auto_calculate ON expenses;
CREATE TRIGGER expense_splits_auto_calculate
  AFTER INSERT OR UPDATE ON expenses
  FOR EACH ROW
  WHEN (NEW.is_split = true)
  EXECUTE FUNCTION trigger_calculate_splits();

-- Function to update partnership balance when settlements are created
CREATE OR REPLACE FUNCTION update_partnership_balance_on_settlement()
RETURNS TRIGGER AS $$
DECLARE
  v_partnership_id UUID;
BEGIN
  -- Get partnership_id from space
  SELECT s.partnership_id INTO v_partnership_id
  FROM spaces s
  WHERE s.id = NEW.space_id;

  -- Update or create partnership balance
  INSERT INTO partnership_balances (partnership_id, space_id, user1_id, user2_id, balance)
  VALUES (
    v_partnership_id,
    NEW.space_id,
    NEW.from_user_id,
    NEW.to_user_id,
    -NEW.amount -- Negative because from_user paid to_user
  )
  ON CONFLICT (partnership_id, space_id)
  DO UPDATE SET
    balance = partnership_balances.balance - NEW.amount,
    last_calculated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS settlement_updates_balance ON settlements;
CREATE TRIGGER settlement_updates_balance
  AFTER INSERT ON settlements
  FOR EACH ROW
  EXECUTE FUNCTION update_partnership_balance_on_settlement();

-- Add updated_at triggers
CREATE TRIGGER expense_splits_updated_at
BEFORE UPDATE ON expense_splits
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER settlements_updated_at
BEFORE UPDATE ON settlements
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER partnership_balances_updated_at
BEFORE UPDATE ON partnership_balances
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON COLUMN expenses.ownership IS 'Who owns this expense: shared, yours, or theirs';
COMMENT ON COLUMN expenses.split_type IS 'How to split: equal, percentage, fixed, or income-based';
COMMENT ON COLUMN expenses.is_split IS 'Whether this expense should be split between partners';
COMMENT ON TABLE expense_splits IS 'Detailed split breakdown for each user on a shared expense';
COMMENT ON TABLE settlements IS 'Payment records between partners to settle shared expenses';
COMMENT ON TABLE partnership_balances IS 'Running balance tracking who owes whom in the partnership';
COMMENT ON COLUMN partnership_balances.balance IS 'Positive = user1 owes user2, Negative = user2 owes user1';

-- Create view for settlement summary
CREATE OR REPLACE VIEW settlement_summary AS
SELECT
  s.space_id,
  s.from_user_id,
  s.to_user_id,
  COUNT(s.id) AS settlement_count,
  SUM(s.amount) AS total_settled,
  MIN(s.settlement_date) AS first_settlement,
  MAX(s.settlement_date) AS last_settlement
FROM settlements s
GROUP BY s.space_id, s.from_user_id, s.to_user_id;

-- Grant view permissions
GRANT SELECT ON settlement_summary TO authenticated;
GRANT SELECT ON settlement_summary TO service_role;
