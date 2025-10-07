-- Fix budgets table RLS policies
-- Enable RLS on budgets table
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view space budgets" ON budgets;
DROP POLICY IF EXISTS "Users can create space budgets" ON budgets;
DROP POLICY IF EXISTS "Users can update space budgets" ON budgets;

-- SELECT: Users can view budgets for spaces they're members of
CREATE POLICY "Users can view space budgets"
ON budgets FOR SELECT
USING (
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can create budgets for spaces they're members of
CREATE POLICY "Users can create space budgets"
ON budgets FOR INSERT
WITH CHECK (
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  )
);

-- UPDATE: Users can update budgets for spaces they're members of
CREATE POLICY "Users can update space budgets"
ON budgets FOR UPDATE
USING (
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  )
);

-- DELETE: Users can delete budgets for spaces they're members of
CREATE POLICY "Users can delete space budgets"
ON budgets FOR DELETE
USING (
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  )
);
