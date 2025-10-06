-- Add missing fields to shopping_lists table

-- Rename 'name' to 'title' for consistency
ALTER TABLE shopping_lists
  RENAME COLUMN name TO title;

-- Add store field
ALTER TABLE shopping_lists
  ADD COLUMN IF NOT EXISTS store TEXT;

-- Add status field
ALTER TABLE shopping_lists
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived'));

-- Add completed_at field
ALTER TABLE shopping_lists
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
