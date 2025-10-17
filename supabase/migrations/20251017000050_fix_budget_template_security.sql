-- Fix critical security vulnerability in apply_budget_template function
-- The function was using SECURITY DEFINER without validating space membership
-- This allowed any authenticated user to modify any space's budget categories

-- Drop the insecure function
DROP FUNCTION IF EXISTS apply_budget_template(UUID, UUID, DECIMAL);

-- Recreate with proper security checks
CREATE OR REPLACE FUNCTION apply_budget_template(
  p_space_id UUID,
  p_template_id UUID,
  p_monthly_income DECIMAL(10, 2)
)
RETURNS void AS $$
BEGIN
  -- SECURITY CHECK: Verify the calling user is a member of the space
  IF NOT EXISTS (
    SELECT 1 FROM space_members
    WHERE space_id = p_space_id
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: User is not a member of this space';
  END IF;

  -- Validate template exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM budget_templates
    WHERE id = p_template_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid template: Template does not exist or is not active';
  END IF;

  -- Validate monthly income is positive and reasonable
  IF p_monthly_income <= 0 OR p_monthly_income > 10000000 THEN
    RAISE EXCEPTION 'Invalid income: Must be between 0 and 10,000,000';
  END IF;

  -- Delete existing budget categories for this space
  -- RLS is bypassed by SECURITY DEFINER, but we've already validated membership above
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

  -- Update the main budget amount if exists
  UPDATE budgets
  SET monthly_budget = p_monthly_income,
      updated_at = NOW()
  WHERE space_id = p_space_id;

  -- Insert budget if it doesn't exist
  -- Only insert if user is a member (already verified above)
  INSERT INTO budgets (space_id, monthly_budget, created_by)
  SELECT p_space_id, p_monthly_income, auth.uid()
  WHERE NOT EXISTS (
    SELECT 1 FROM budgets WHERE space_id = p_space_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION apply_budget_template(UUID, UUID, DECIMAL) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION apply_budget_template IS
'Applies a budget template to a space based on monthly income.
Validates user is a space member before making changes.
Security: DEFINER mode with explicit space membership validation.';
