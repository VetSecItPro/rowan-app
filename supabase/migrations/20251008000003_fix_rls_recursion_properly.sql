-- =============================================
-- FIX RLS RECURSION PROPERLY - FINAL FIX
-- Date: October 8, 2025
-- Purpose: Completely eliminate recursion in space_members policies
-- =============================================

-- Drop problematic policies again
DROP POLICY IF EXISTS space_members_select ON space_members;
DROP POLICY IF EXISTS space_members_insert ON space_members;
DROP POLICY IF EXISTS space_members_delete ON space_members;

-- =============================================
-- APPROACH: Bypass RLS for space access checks
-- =============================================

-- Create security definer function that bypasses RLS
CREATE OR REPLACE FUNCTION check_space_membership(p_space_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM space_members
    WHERE space_id = p_space_id AND user_id = p_user_id
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION check_space_membership(UUID, UUID) TO authenticated;

-- =============================================
-- SPACE_MEMBERS: Fixed policies (NO RECURSION)
-- =============================================

-- Users can view their own memberships (simple, no recursion)
CREATE POLICY space_members_select_own ON space_members FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert themselves as first member OR if they're already an owner
CREATE POLICY space_members_insert ON space_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND (
      -- First member (no existing members for this space)
      NOT EXISTS (
        SELECT 1 FROM space_members WHERE space_id = space_members.space_id
      )
      OR
      -- Current user is already owner of this space (using security definer function)
      check_space_membership(space_members.space_id, auth.uid())
    )
  );

-- Only owners can remove members (using security definer function)
CREATE POLICY space_members_delete ON space_members FOR DELETE
  USING (
    check_space_membership(space_members.space_id, auth.uid())
    AND
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = space_members.space_id
      AND sm.user_id = auth.uid()
      AND sm.role = 'owner'
    )
  );

-- =============================================
-- UPDATE user_has_space_access function to use new approach
-- =============================================

CREATE OR REPLACE FUNCTION user_has_space_access(p_space_id UUID)
RETURNS BOOLEAN AS $$
  -- Use check_space_membership function which bypasses RLS
  SELECT check_space_membership(p_space_id, auth.uid());
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
