-- =============================================
-- REBUILD BUDGETS TABLE - Complete Schema Fix
-- Date: October 8, 2025
-- Purpose: Drop and recreate budgets table with correct schema
-- =============================================

-- Step 1: Drop existing budgets table completely (including all dependencies)
DROP TABLE IF EXISTS budgets CASCADE;

-- Step 2: Create budgets table with CORRECT schema
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  monthly_budget DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(space_id)  -- One budget per space
);

-- Step 3: Create index for performance
CREATE INDEX idx_budgets_space_id ON budgets(space_id);

-- Step 4: Enable Row Level Security
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Step 5: Grant necessary permissions on RLS helper functions
GRANT EXECUTE ON FUNCTION user_has_space_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_space_membership(UUID, UUID) TO authenticated;

-- Step 6: Create RLS policies for budgets table
CREATE POLICY budgets_select ON budgets FOR SELECT
  USING (user_has_space_access(space_id));

CREATE POLICY budgets_insert ON budgets FOR INSERT
  WITH CHECK (user_has_space_access(space_id));

CREATE POLICY budgets_update ON budgets FOR UPDATE
  USING (user_has_space_access(space_id));

CREATE POLICY budgets_delete ON budgets FOR DELETE
  USING (user_has_space_access(space_id));

-- Step 7: Add comment to table for documentation
COMMENT ON TABLE budgets IS 'Stores monthly budgets for each space. One budget per space.';
COMMENT ON COLUMN budgets.monthly_budget IS 'Monthly budget amount in dollars';
COMMENT ON COLUMN budgets.space_id IS 'Foreign key to spaces table (one budget per space)';
