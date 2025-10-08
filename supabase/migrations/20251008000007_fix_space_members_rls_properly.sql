-- =============================================
-- FIX SPACE_MEMBERS RLS POLICY - FINAL FIX
-- Date: October 8, 2025
-- Purpose: Fix the circular reference in space_members INSERT policy
-- =============================================

-- Drop the problematic policy
DROP POLICY IF EXISTS space_members_insert ON space_members;

-- Create corrected INSERT policy
-- Allow users to insert themselves as a member when:
-- 1. They are inserting themselves (user_id = auth.uid())
-- 2. AND either:
--    a. This is the first member for the space (creating new space)
--    b. They are already an owner/admin of this space (inviting others)
CREATE POLICY space_members_insert ON space_members FOR INSERT
  WITH CHECK (
    -- User can only insert themselves
    user_id = auth.uid()
    AND (
      -- First member check: No existing members for this space
      NOT EXISTS (
        SELECT 1 FROM space_members existing
        WHERE existing.space_id = space_members.space_id
      )
      OR
      -- OR: User is already an owner/admin in this space
      EXISTS (
        SELECT 1 FROM space_members existing
        WHERE existing.space_id = space_members.space_id
          AND existing.user_id = auth.uid()
          AND existing.role IN ('owner', 'admin')
      )
    )
  );

-- Grant necessary permissions
GRANT INSERT ON space_members TO authenticated;
