-- Fix circular dependency in users table RLS policy
-- This addresses the authentication hanging issue

-- Drop the current problematic policy
DROP POLICY IF EXISTS users_select_optimized ON users;

-- Create a function that ensures proper evaluation order
CREATE OR REPLACE FUNCTION can_access_user_profile(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Fast path: always allow access to own profile
  IF auth.uid() = target_user_id THEN
    RETURN TRUE;
  END IF;

  -- Secondary path: check if users share any spaces
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
CREATE POLICY users_select_no_circular_dependency ON users FOR SELECT
  USING (can_access_user_profile(id));

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION can_access_user_profile(UUID) TO authenticated;

-- Ensure the performance index exists
CREATE INDEX IF NOT EXISTS idx_space_members_rls_optimization
  ON space_members(space_id, user_id);