-- Ensure budgets table exists with proper structure
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  monthly_budget DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(space_id)
);

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_budgets_space_id ON budgets(space_id);

-- Enable RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view space budgets" ON budgets;
DROP POLICY IF EXISTS "Users can create space budgets" ON budgets;
DROP POLICY IF EXISTS "Users can update space budgets" ON budgets;
DROP POLICY IF EXISTS "Users can delete space budgets" ON budgets;
DROP POLICY IF EXISTS budgets_select ON budgets;
DROP POLICY IF EXISTS budgets_insert ON budgets;
DROP POLICY IF EXISTS budgets_update ON budgets;
DROP POLICY IF EXISTS budgets_delete ON budgets;

-- Create RLS policies using the user_has_space_access function
CREATE POLICY budgets_select ON budgets FOR SELECT
  USING (user_has_space_access(space_id));

CREATE POLICY budgets_insert ON budgets FOR INSERT
  WITH CHECK (user_has_space_access(space_id));

CREATE POLICY budgets_update ON budgets FOR UPDATE
  USING (user_has_space_access(space_id));

CREATE POLICY budgets_delete ON budgets FOR DELETE
  USING (user_has_space_access(space_id));
