-- Add created_by column to chores and expenses if it doesn't exist
ALTER TABLE chores ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by UUID;

-- Enable Row Level Security on chores and expenses tables
ALTER TABLE chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running)
DROP POLICY IF EXISTS "Users can view space chores" ON chores;
DROP POLICY IF EXISTS "Users can create space chores" ON chores;
DROP POLICY IF EXISTS "Users can update space chores" ON chores;
DROP POLICY IF EXISTS "Users can delete space chores" ON chores;
DROP POLICY IF EXISTS "Users can view space expenses" ON expenses;
DROP POLICY IF EXISTS "Users can create space expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update space expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete space expenses" ON expenses;

-- ============================================================================
-- CHORES RLS POLICIES
-- ============================================================================

-- SELECT Policy: Users can view chores for spaces they're members of
CREATE POLICY "Users can view space chores"
ON chores FOR SELECT
USING (
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  )
);

-- INSERT Policy: Users can create chores for spaces they're members of
CREATE POLICY "Users can create space chores"
ON chores FOR INSERT
WITH CHECK (
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  )
);

-- UPDATE Policy: Users can update chores for spaces they're members of
CREATE POLICY "Users can update space chores"
ON chores FOR UPDATE
USING (
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  )
);

-- DELETE Policy: Users can delete chores for spaces they're members of
CREATE POLICY "Users can delete space chores"
ON chores FOR DELETE
USING (
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- EXPENSES RLS POLICIES
-- ============================================================================

-- SELECT Policy: Users can view expenses for spaces they're members of
CREATE POLICY "Users can view space expenses"
ON expenses FOR SELECT
USING (
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  )
);

-- INSERT Policy: Users can create expenses for spaces they're members of
CREATE POLICY "Users can create space expenses"
ON expenses FOR INSERT
WITH CHECK (
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  )
);

-- UPDATE Policy: Users can update expenses for spaces they're members of
CREATE POLICY "Users can update space expenses"
ON expenses FOR UPDATE
USING (
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  )
);

-- DELETE Policy: Users can delete expenses for spaces they're members of
CREATE POLICY "Users can delete space expenses"
ON expenses FOR DELETE
USING (
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  )
);
