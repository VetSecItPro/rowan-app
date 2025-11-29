-- =============================================
-- FIX SPACE INSERT POLICIES
-- Date: November 29, 2025
-- Purpose: Ensure space creation works properly
-- =============================================

-- Drop and recreate INSERT policies with proper auth.uid() wrapper

-- SPACES INSERT: Allow authenticated users to create spaces
DROP POLICY IF EXISTS spaces_insert ON spaces;
CREATE POLICY spaces_insert ON spaces FOR INSERT
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- SPACE_MEMBERS INSERT: Allow users to add themselves to spaces they just created
DROP POLICY IF EXISTS space_members_insert ON space_members;
CREATE POLICY space_members_insert ON space_members FOR INSERT
  WITH CHECK (
    user_id = (select auth.uid())
    AND (
      -- First member of a new space (no existing members)
      NOT EXISTS (SELECT 1 FROM space_members sm WHERE sm.space_id = space_members.space_id)
      OR
      -- User is owner/admin of the space
      EXISTS (
        SELECT 1 FROM space_members sm
        WHERE sm.space_id = space_members.space_id
        AND sm.user_id = (select auth.uid())
        AND sm.role IN ('owner', 'admin')
      )
    )
  );
