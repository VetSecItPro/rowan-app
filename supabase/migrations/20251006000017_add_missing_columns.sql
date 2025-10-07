-- Add missing columns to chores table
ALTER TABLE chores
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'once' CHECK (frequency IN ('daily', 'weekly', 'monthly', 'once'));

-- Add missing columns to expenses table
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recurring BOOLEAN DEFAULT FALSE;

-- Create missing indexes
CREATE INDEX IF NOT EXISTS idx_chores_due_date ON chores(due_date);
CREATE INDEX IF NOT EXISTS idx_expenses_due_date ON expenses(due_date);

-- Disable RLS for development
ALTER TABLE chores DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE recipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE meals DISABLE ROW LEVEL SECURITY;
