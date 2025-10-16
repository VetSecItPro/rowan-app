-- Create budget templates system for quick budget setup
-- Part of Phase 1: Budget Templates feature

-- =====================================================
-- BUDGET CATEGORIES TABLE
-- Stores actual budget allocations by category for each space
-- =====================================================
CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  allocated_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  spent_amount DECIMAL(10, 2) DEFAULT 0,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(space_id, category_name)
);

CREATE INDEX idx_budget_categories_space_id ON budget_categories(space_id);

-- =====================================================
-- BUDGET TEMPLATES TABLE
-- Pre-built budget templates for different household types
-- =====================================================
CREATE TABLE IF NOT EXISTS budget_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  household_type TEXT NOT NULL, -- 'single', 'couple', 'family_small', 'family_large', 'retired', 'student'
  icon TEXT DEFAULT '📊',
  recommended_income_min INTEGER, -- Minimum recommended monthly income
  recommended_income_max INTEGER, -- Maximum recommended monthly income
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- BUDGET TEMPLATE CATEGORIES TABLE
-- Category breakdowns for each template (as percentages)
-- =====================================================
CREATE TABLE IF NOT EXISTS budget_template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES budget_templates(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  percentage DECIMAL(5, 2) NOT NULL, -- Percentage of total budget (0-100)
  icon TEXT,
  color TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_budget_template_categories_template_id ON budget_template_categories(template_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_template_categories ENABLE ROW LEVEL SECURITY;

-- Budget categories: Space members can access
CREATE POLICY "Space members can view budget categories"
  ON budget_categories FOR SELECT
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Space members can create budget categories"
  ON budget_categories FOR INSERT
  WITH CHECK (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Space members can update budget categories"
  ON budget_categories FOR UPDATE
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Space members can delete budget categories"
  ON budget_categories FOR DELETE
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

-- Budget templates: Public read access (anyone can view templates)
CREATE POLICY "Anyone can view budget templates"
  ON budget_templates FOR SELECT
  USING (is_active = true);

-- Template categories: Public read access
CREATE POLICY "Anyone can view template categories"
  ON budget_template_categories FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM budget_templates WHERE is_active = true
    )
  );

-- =====================================================
-- SEED DATA: Budget Templates
-- =====================================================

-- Template 1: Single Person Living Alone
INSERT INTO budget_templates (id, name, description, household_type, icon, recommended_income_min, recommended_income_max, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Single Living Alone',
  'Balanced budget for a single person managing their own household',
  'single',
  '🏠',
  2000,
  5000,
  1
);

-- Template 2: Couple Without Kids
INSERT INTO budget_templates (id, name, description, household_type, icon, recommended_income_min, recommended_income_max, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Couple Without Kids',
  'Budget for couples focusing on savings and lifestyle',
  'couple',
  '💑',
  4000,
  10000,
  2
);

-- Template 3: Family with Young Kids
INSERT INTO budget_templates (id, name, description, household_type, icon, recommended_income_min, recommended_income_max, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'Family with Young Kids',
  'Family budget prioritizing childcare and education',
  'family_small',
  '👨‍👩‍👧',
  5000,
  12000,
  3
);

-- Template 4: Large Family (3+ Kids)
INSERT INTO budget_templates (id, name, description, household_type, icon, recommended_income_min, recommended_income_max, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  'Large Family',
  'Budget optimized for families with multiple children',
  'family_large',
  '👨‍👩‍👧‍👦',
  7000,
  15000,
  4
);

-- Template 5: College Student
INSERT INTO budget_templates (id, name, description, household_type, icon, recommended_income_min, recommended_income_max, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000005',
  'College Student',
  'Frugal budget for students managing limited income',
  'student',
  '🎓',
  1000,
  3000,
  5
);

-- Template 6: Retired Couple
INSERT INTO budget_templates (id, name, description, household_type, icon, recommended_income_min, recommended_income_max, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000006',
  'Retired Couple',
  'Budget for retirees focusing on healthcare and leisure',
  'retired',
  '🌴',
  3000,
  8000,
  6
);

-- =====================================================
-- SEED DATA: Template 1 - Single Living Alone
-- =====================================================
INSERT INTO budget_template_categories (template_id, category_name, percentage, icon, color, description, sort_order) VALUES
('00000000-0000-0000-0000-000000000001', 'Housing', 30.00, '🏠', '#10b981', 'Rent/mortgage, utilities, insurance', 1),
('00000000-0000-0000-0000-000000000001', 'Food & Groceries', 15.00, '🍽️', '#f59e0b', 'Groceries, dining out', 2),
('00000000-0000-0000-0000-000000000001', 'Transportation', 15.00, '🚗', '#3b82f6', 'Car payment, gas, insurance, public transit', 3),
('00000000-0000-0000-0000-000000000001', 'Savings', 20.00, '💰', '#8b5cf6', 'Emergency fund, retirement, investments', 4),
('00000000-0000-0000-0000-000000000001', 'Personal Care', 5.00, '💅', '#ec4899', 'Gym, grooming, clothing', 5),
('00000000-0000-0000-0000-000000000001', 'Entertainment', 8.00, '🎬', '#06b6d4', 'Streaming, hobbies, social activities', 6),
('00000000-0000-0000-0000-000000000001', 'Healthcare', 5.00, '⚕️', '#ef4444', 'Insurance premiums, copays, medications', 7),
('00000000-0000-0000-0000-000000000001', 'Miscellaneous', 2.00, '📦', '#64748b', 'Other expenses', 8);

-- =====================================================
-- SEED DATA: Template 2 - Couple Without Kids
-- =====================================================
INSERT INTO budget_template_categories (template_id, category_name, percentage, icon, color, description, sort_order) VALUES
('00000000-0000-0000-0000-000000000002', 'Housing', 28.00, '🏠', '#10b981', 'Rent/mortgage, utilities, insurance', 1),
('00000000-0000-0000-0000-000000000002', 'Food & Groceries', 12.00, '🍽️', '#f59e0b', 'Groceries, dining out', 2),
('00000000-0000-0000-0000-000000000002', 'Transportation', 12.00, '🚗', '#3b82f6', 'Vehicles, gas, insurance', 3),
('00000000-0000-0000-0000-000000000002', 'Savings', 25.00, '💰', '#8b5cf6', 'Emergency fund, retirement, investments', 4),
('00000000-0000-0000-0000-000000000002', 'Personal Care', 6.00, '💅', '#ec4899', 'Gym, grooming, clothing', 5),
('00000000-0000-0000-0000-000000000002', 'Entertainment', 10.00, '🎬', '#06b6d4', 'Travel, dining, activities', 6),
('00000000-0000-0000-0000-000000000002', 'Healthcare', 5.00, '⚕️', '#ef4444', 'Insurance, copays, medications', 7),
('00000000-0000-0000-0000-000000000002', 'Miscellaneous', 2.00, '📦', '#64748b', 'Other expenses', 8);

-- =====================================================
-- SEED DATA: Template 3 - Family with Young Kids
-- =====================================================
INSERT INTO budget_template_categories (template_id, category_name, percentage, icon, color, description, sort_order) VALUES
('00000000-0000-0000-0000-000000000003', 'Housing', 30.00, '🏠', '#10b981', 'Rent/mortgage, utilities, insurance', 1),
('00000000-0000-0000-0000-000000000003', 'Food & Groceries', 15.00, '🍽️', '#f59e0b', 'Groceries, dining out', 2),
('00000000-0000-0000-0000-000000000003', 'Transportation', 12.00, '🚗', '#3b82f6', 'Vehicles, gas, insurance', 3),
('00000000-0000-0000-0000-000000000003', 'Childcare & Education', 18.00, '👶', '#f97316', 'Daycare, school fees, activities', 4),
('00000000-0000-0000-0000-000000000003', 'Savings', 12.00, '💰', '#8b5cf6', 'Emergency fund, college fund', 5),
('00000000-0000-0000-0000-000000000003', 'Personal Care', 4.00, '💅', '#ec4899', 'Grooming, clothing for family', 6),
('00000000-0000-0000-0000-000000000003', 'Entertainment', 5.00, '🎬', '#06b6d4', 'Family activities, outings', 7),
('00000000-0000-0000-0000-000000000003', 'Healthcare', 3.00, '⚕️', '#ef4444', 'Insurance, copays, medications', 8),
('00000000-0000-0000-0000-000000000003', 'Miscellaneous', 1.00, '📦', '#64748b', 'Other expenses', 9);

-- =====================================================
-- SEED DATA: Template 4 - Large Family
-- =====================================================
INSERT INTO budget_template_categories (template_id, category_name, percentage, icon, color, description, sort_order) VALUES
('00000000-0000-0000-0000-000000000004', 'Housing', 28.00, '🏠', '#10b981', 'Rent/mortgage, utilities, insurance', 1),
('00000000-0000-0000-0000-000000000004', 'Food & Groceries', 18.00, '🍽️', '#f59e0b', 'Groceries for large family', 2),
('00000000-0000-0000-0000-000000000004', 'Transportation', 10.00, '🚗', '#3b82f6', 'Vehicles, gas, insurance', 3),
('00000000-0000-0000-0000-000000000004', 'Childcare & Education', 20.00, '👶', '#f97316', 'Multiple kids'' expenses', 4),
('00000000-0000-0000-0000-000000000004', 'Savings', 10.00, '💰', '#8b5cf6', 'Emergency fund, college funds', 5),
('00000000-0000-0000-0000-000000000004', 'Personal Care', 5.00, '💅', '#ec4899', 'Clothing, grooming for family', 6),
('00000000-0000-0000-0000-000000000004', 'Entertainment', 4.00, '🎬', '#06b6d4', 'Family activities', 7),
('00000000-0000-0000-0000-000000000004', 'Healthcare', 4.00, '⚕️', '#ef4444', 'Insurance, medical for family', 8),
('00000000-0000-0000-0000-000000000004', 'Miscellaneous', 1.00, '📦', '#64748b', 'Other expenses', 9);

-- =====================================================
-- SEED DATA: Template 5 - College Student
-- =====================================================
INSERT INTO budget_template_categories (template_id, category_name, percentage, icon, color, description, sort_order) VALUES
('00000000-0000-0000-0000-000000000005', 'Housing', 35.00, '🏠', '#10b981', 'Rent, utilities', 1),
('00000000-0000-0000-0000-000000000005', 'Food & Groceries', 20.00, '🍽️', '#f59e0b', 'Groceries, meal plan', 2),
('00000000-0000-0000-0000-000000000005', 'Transportation', 10.00, '🚗', '#3b82f6', 'Public transit, gas', 3),
('00000000-0000-0000-0000-000000000005', 'Education', 15.00, '📚', '#f97316', 'Books, supplies, fees', 4),
('00000000-0000-0000-0000-000000000005', 'Savings', 5.00, '💰', '#8b5cf6', 'Emergency fund', 5),
('00000000-0000-0000-0000-000000000005', 'Personal Care', 5.00, '💅', '#ec4899', 'Basic necessities', 6),
('00000000-0000-0000-0000-000000000005', 'Entertainment', 8.00, '🎬', '#06b6d4', 'Social, streaming', 7),
('00000000-0000-0000-0000-000000000005', 'Miscellaneous', 2.00, '📦', '#64748b', 'Other expenses', 8);

-- =====================================================
-- SEED DATA: Template 6 - Retired Couple
-- =====================================================
INSERT INTO budget_template_categories (template_id, category_name, percentage, icon, color, description, sort_order) VALUES
('00000000-0000-0000-0000-000000000006', 'Housing', 25.00, '🏠', '#10b981', 'Mortgage/rent, utilities, maintenance', 1),
('00000000-0000-0000-0000-000000000006', 'Food & Groceries', 12.00, '🍽️', '#f59e0b', 'Groceries, dining out', 2),
('00000000-0000-0000-0000-000000000006', 'Transportation', 8.00, '🚗', '#3b82f6', 'Vehicle, gas, insurance', 3),
('00000000-0000-0000-0000-000000000006', 'Healthcare', 20.00, '⚕️', '#ef4444', 'Medicare, prescriptions, care', 4),
('00000000-0000-0000-0000-000000000006', 'Savings', 15.00, '💰', '#8b5cf6', 'Emergency fund, legacy', 5),
('00000000-0000-0000-0000-000000000006', 'Personal Care', 5.00, '💅', '#ec4899', 'Grooming, clothing', 6),
('00000000-0000-0000-0000-000000000006', 'Entertainment', 12.00, '🎬', '#06b6d4', 'Travel, hobbies, leisure', 7),
('00000000-0000-0000-0000-000000000006', 'Miscellaneous', 3.00, '📦', '#64748b', 'Gifts, donations', 8);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to apply template to a space
CREATE OR REPLACE FUNCTION apply_budget_template(
  p_space_id UUID,
  p_template_id UUID,
  p_monthly_income DECIMAL(10, 2)
)
RETURNS void AS $$
BEGIN
  -- Delete existing budget categories for this space
  DELETE FROM budget_categories WHERE space_id = p_space_id;

  -- Create new budget categories based on template
  INSERT INTO budget_categories (space_id, category_name, allocated_amount, icon, color)
  SELECT
    p_space_id,
    category_name,
    ROUND((p_monthly_income * percentage / 100), 2),
    icon,
    color
  FROM budget_template_categories
  WHERE template_id = p_template_id
  ORDER BY sort_order;

  -- Update the main budget amount
  UPDATE budgets
  SET monthly_budget = p_monthly_income,
      updated_at = NOW()
  WHERE space_id = p_space_id;

  -- Insert budget if it doesn't exist
  INSERT INTO budgets (space_id, monthly_budget, created_by)
  SELECT p_space_id, p_monthly_income, auth.uid()
  WHERE NOT EXISTS (
    SELECT 1 FROM budgets WHERE space_id = p_space_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION apply_budget_template(UUID, UUID, DECIMAL) TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE budget_categories IS 'Stores budget allocations by category for each space';
COMMENT ON TABLE budget_templates IS 'Pre-built budget templates for different household types';
COMMENT ON TABLE budget_template_categories IS 'Category breakdowns for budget templates (percentages)';
COMMENT ON FUNCTION apply_budget_template IS 'Applies a budget template to a space based on monthly income';
