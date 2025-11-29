-- =============================================
-- FIX SPACE_MEMBERS INFINITE RECURSION
-- Date: November 29, 2025
-- Purpose: Remove recursive policy that causes infinite loop
-- =============================================

-- The previous policy had infinite recursion because it queried space_members
-- while inserting into space_members. We simplify it to just check auth.

-- SPACE_MEMBERS INSERT: Allow authenticated users to add themselves
DROP POLICY IF EXISTS space_members_insert ON space_members;
CREATE POLICY space_members_insert ON space_members FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

-- Note: We rely on the application layer (API routes using admin client)
-- to enforce business logic for who can add members to which spaces.
-- This keeps RLS simple and prevents recursion.
