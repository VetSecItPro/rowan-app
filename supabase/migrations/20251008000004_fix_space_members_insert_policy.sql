-- =============================================
-- FIX SPACE_MEMBERS INSERT POLICY
-- Date: October 8, 2025
-- Purpose: Fix the first-member check in space_members INSERT policy
-- =============================================

-- Drop the problematic policy
DROP POLICY IF EXISTS space_members_insert ON space_members;

-- Create corrected INSERT policy
-- Users can insert themselves as first member OR if they're already an owner
CREATE POLICY space_members_insert ON space_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND (
      -- First member: no existing members for this space_id
      -- Use proper table alias in subquery to avoid ambiguity
      NOT EXISTS (
        SELECT 1 FROM space_members sm
        WHERE sm.space_id = space_members.space_id
      )
      OR
      -- OR: Current user is already a member with owner role
      -- (for inviting additional members later)
      EXISTS (
        SELECT 1 FROM space_members sm
        WHERE sm.space_id = space_members.space_id
        AND sm.user_id = auth.uid()
        AND sm.role = 'owner'
      )
    )
  );
