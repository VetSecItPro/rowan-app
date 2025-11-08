-- Fix performance issue with users table RLS policy
-- Replace complex nested subquery with optimized policy for auth performance

-- Drop the problematic policy that causes authentication hangs
DROP POLICY IF EXISTS users_select_secure ON users;

-- Create an optimized RLS policy for users table
-- This policy allows:
-- 1. Users to see their own profile (fast: direct id comparison)
-- 2. Users to see basic profile info of space members (optimized: single join)
CREATE POLICY users_select_optimized ON users FOR SELECT
  USING (
    -- Allow users to see their own profile (primary auth case)
    auth.uid() = id OR
    -- Allow users to see profiles of people in their shared spaces
    -- Use single join with proper indexing instead of self-join
    id IN (
      SELECT DISTINCT sm2.user_id
      FROM space_members sm1
      JOIN space_members sm2 ON sm1.space_id = sm2.space_id
      WHERE sm1.user_id = auth.uid()
        AND sm2.user_id != sm1.user_id
    )
  );

-- Create index to optimize the RLS policy performance
-- This index specifically supports the space member lookup pattern
CREATE INDEX IF NOT EXISTS idx_space_members_rls_optimization
  ON space_members(space_id, user_id);

-- Add comment to document the policy purpose and performance considerations
COMMENT ON POLICY users_select_optimized ON users IS
'Optimized RLS policy for users table. Allows users to see their own profile (auth.uid() = id) and profiles of users in shared spaces. Uses optimized single join instead of nested subquery to prevent authentication timeouts.';

-- Ensure proper permissions for authenticated users
-- This allows the auth.uid() function to work properly in the policy
GRANT SELECT ON users TO authenticated;