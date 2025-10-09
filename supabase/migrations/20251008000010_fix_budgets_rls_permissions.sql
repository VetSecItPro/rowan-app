-- =============================================
-- FIX BUDGETS 406 ERROR - Grant missing permissions
-- Date: October 8, 2025
-- Purpose: Grant EXECUTE on user_has_space_access to fix 406 errors
-- =============================================

-- The user_has_space_access function was created but never granted to authenticated users
-- This causes 406 (Not Acceptable) errors when budgets RLS policies try to use it
GRANT EXECUTE ON FUNCTION user_has_space_access(UUID) TO authenticated;

-- Also ensure check_space_membership is granted (should already be, but being explicit)
GRANT EXECUTE ON FUNCTION check_space_membership(UUID, UUID) TO authenticated;

-- Verify budgets table has RLS enabled
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Refresh the policies to ensure they use the correct function
-- First drop all existing budgets policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view space budgets" ON budgets;
DROP POLICY IF EXISTS "Users can create space budgets" ON budgets;
DROP POLICY IF EXISTS "Users can update space budgets" ON budgets;
DROP POLICY IF EXISTS "Users can delete space budgets" ON budgets;
DROP POLICY IF EXISTS budgets_select ON budgets;
DROP POLICY IF EXISTS budgets_insert ON budgets;
DROP POLICY IF EXISTS budgets_update ON budgets;
DROP POLICY IF EXISTS budgets_delete ON budgets;

-- Recreate RLS policies using the now-properly-granted function
CREATE POLICY budgets_select ON budgets FOR SELECT
  USING (user_has_space_access(space_id));

CREATE POLICY budgets_insert ON budgets FOR INSERT
  WITH CHECK (user_has_space_access(space_id));

CREATE POLICY budgets_update ON budgets FOR UPDATE
  USING (user_has_space_access(space_id));

CREATE POLICY budgets_delete ON budgets FOR DELETE
  USING (user_has_space_access(space_id));
