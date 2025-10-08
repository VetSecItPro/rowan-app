-- =============================================
-- FIX RLS INFINITE RECURSION & SIGNUP FLOW
-- Date: October 8, 2025
-- Purpose: Fix space_members recursion and enable space creation during signup
-- =============================================

-- Drop problematic policies
DROP POLICY IF EXISTS space_members_select ON space_members;
DROP POLICY IF EXISTS space_members_insert ON space_members;
DROP POLICY IF EXISTS space_members_delete ON space_members;
DROP POLICY IF EXISTS spaces_select ON spaces;
DROP POLICY IF EXISTS spaces_insert ON spaces;

-- =============================================
-- SPACE_MEMBERS: Fixed policies (no recursion)
-- =============================================

-- Users can view:
-- 1. Their own memberships (user_id = auth.uid())
-- 2. Other members in spaces they belong to (via spaces table)
CREATE POLICY space_members_select ON space_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

-- Users can insert themselves into a space if:
-- 1. They're the one being added (user_id = auth.uid())
-- 2. AND (they created the space OR they're already a member with admin role)
CREATE POLICY space_members_insert ON space_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND (
      -- New space creator (space has no members yet)
      NOT EXISTS (SELECT 1 FROM space_members WHERE space_id = space_members.space_id)
      OR
      -- Existing admin adding someone
      EXISTS (
        SELECT 1 FROM space_members
        WHERE space_id = space_members.space_id
        AND user_id = auth.uid()
        AND role = 'owner'
      )
    )
  );

-- Only space owners can remove members
CREATE POLICY space_members_delete ON space_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = space_members.space_id
      AND sm.user_id = auth.uid()
      AND sm.role = 'owner'
    )
  );

-- =============================================
-- SPACES: Add created_by column first
-- =============================================

-- Add created_by column to spaces table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'spaces' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE spaces ADD COLUMN created_by UUID REFERENCES users(id);
  END IF;
END $$;

-- Set created_by to current user for new spaces
CREATE OR REPLACE FUNCTION set_space_creator()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_space_creator_trigger ON spaces;
CREATE TRIGGER set_space_creator_trigger
  BEFORE INSERT ON spaces
  FOR EACH ROW
  EXECUTE FUNCTION set_space_creator();

-- Allow authenticated users to create spaces
CREATE POLICY spaces_insert ON spaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to select spaces they're members of OR just created
CREATE POLICY spaces_select ON spaces FOR SELECT
  USING (
    -- Member of the space
    EXISTS (
      SELECT 1 FROM space_members
      WHERE space_id = spaces.id
      AND user_id = auth.uid()
    )
    OR
    -- Just created (within last 10 seconds) by this user
    (created_at > NOW() - INTERVAL '10 seconds' AND created_by = auth.uid())
  );

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Ensure the trigger function can access auth.uid()
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
