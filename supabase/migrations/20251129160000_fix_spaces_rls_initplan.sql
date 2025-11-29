-- =============================================
-- FIX SPACES AND SPACE_MEMBERS RLS INITPLAN (v2)
-- Date: November 29, 2025
-- Purpose: Fix auth.uid() to use (select auth.uid()) wrapper
--          AND prevent infinite recursion in space_members policy
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS space_members_select ON space_members;
DROP POLICY IF EXISTS space_members_select_own ON space_members;
DROP POLICY IF EXISTS spaces_select ON spaces;

-- =============================================
-- SPACE_MEMBERS: Simple non-recursive SELECT policy
-- =============================================

-- Users can only view their own memberships directly
-- This avoids recursion - the app joins with spaces to get other members
CREATE POLICY space_members_select ON space_members FOR SELECT
  USING (user_id = (select auth.uid()));

-- =============================================
-- SPACES: Fixed SELECT policy (uses space_members without recursion)
-- =============================================

-- Allow users to select spaces they're members of OR just created
CREATE POLICY spaces_select ON spaces FOR SELECT
  USING (
    -- Member of the space (safe: space_members policy only checks user_id)
    EXISTS (
      SELECT 1 FROM space_members
      WHERE space_members.space_id = spaces.id
      AND space_members.user_id = (select auth.uid())
    )
    OR
    -- Just created (within last 10 seconds) by this user
    (created_at > NOW() - INTERVAL '10 seconds' AND created_by = (select auth.uid()))
  );
