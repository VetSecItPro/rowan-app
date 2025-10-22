-- Fix overly permissive RLS policy on users table
-- The current policy allows ANY authenticated user to see ALL users' data
-- This is a critical security vulnerability

-- Drop the dangerous policy
DROP POLICY IF EXISTS users_select_own ON users;

-- Create a secure policy that only allows:
-- 1. Users to see their own profile
-- 2. Users to see profiles of people in their shared spaces (for collaboration)
CREATE POLICY users_select_secure ON users FOR SELECT
  USING (
    -- Users can always see their own profile
    auth.uid() = id OR
    -- Users can see profiles of people in their shared spaces
    EXISTS (
      SELECT 1 FROM space_members sm1
      JOIN space_members sm2 ON sm1.space_id = sm2.space_id
      WHERE sm1.user_id = auth.uid()
        AND sm2.user_id = users.id
        AND sm1.user_id != sm2.user_id  -- Don't double-count own records
    )
  );

-- Ensure the policy is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Log the security fix
DO $$
BEGIN
  RAISE NOTICE '🔒 SECURITY FIX: Fixed overly permissive users RLS policy';
  RAISE NOTICE '   ❌ Old policy: auth.uid() IS NOT NULL (allowed access to ALL users)';
  RAISE NOTICE '   ✅ New policy: Own profile + shared space members only';
  RAISE NOTICE '   🛡️  This prevents unauthorized access to user data';
END $$;