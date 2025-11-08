-- Fix circular dependency in users table RLS policy
-- This migration addresses the authentication hanging issue caused by
-- the RLS policy checking space_members during auth, creating a circular dependency

-- Drop the current problematic policy
DROP POLICY IF EXISTS users_select_optimized ON users;

-- Create a function that ensures proper evaluation order
-- This function explicitly checks the user's own profile first
-- and only queries space_members if accessing other user profiles
CREATE OR REPLACE FUNCTION can_access_user_profile(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Fast path: always allow access to own profile
  -- This prevents circular dependency during authentication
  IF auth.uid() = target_user_id THEN
    RETURN TRUE;
  END IF;

  -- Secondary path: check if users share any spaces
  -- This only runs for cross-user profile access
  RETURN EXISTS (
    SELECT 1
    FROM space_members sm1
    JOIN space_members sm2 ON sm1.space_id = sm2.space_id
    WHERE sm1.user_id = auth.uid()
      AND sm2.user_id = target_user_id
  );
END;
$$;

-- Create the new RLS policy using the function
-- This ensures proper evaluation order and prevents circular dependency
CREATE POLICY users_select_no_circular_dependency ON users FOR SELECT
  USING (can_access_user_profile(id));

-- Grant necessary permissions for the function
GRANT EXECUTE ON FUNCTION can_access_user_profile(UUID) TO authenticated;

-- Add comment to document the fix
COMMENT ON POLICY users_select_no_circular_dependency ON users IS
'Fixed circular dependency by using function that prioritizes auth.uid() = id check. Prevents authentication hanging by ensuring own profile access never queries space_members table.';

COMMENT ON FUNCTION can_access_user_profile IS
'Function to check user profile access with guaranteed evaluation order. Fast path for own profile prevents circular dependency during authentication.';

-- Ensure the performance index exists for space member lookups
-- (when they do occur for cross-user access)
CREATE INDEX IF NOT EXISTS idx_space_members_rls_optimization
  ON space_members(space_id, user_id);