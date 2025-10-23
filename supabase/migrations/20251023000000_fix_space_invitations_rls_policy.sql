-- =============================================
-- FIX SPACE INVITATIONS RLS POLICY
-- Date: October 23, 2025
-- Purpose: Remove auth.users access that causes permission errors
-- =============================================

-- Drop the existing problematic policy
DROP POLICY IF EXISTS space_invitations_select ON space_invitations;

-- Create new policy without auth.users access
-- This allows users to view invitations only from spaces they have access to
-- Email-based invitation access is handled at the application level
CREATE POLICY space_invitations_select ON space_invitations FOR SELECT
  USING (user_has_space_access(space_id));

-- Verify the policy was created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'space_invitations'
AND policyname = 'space_invitations_select';