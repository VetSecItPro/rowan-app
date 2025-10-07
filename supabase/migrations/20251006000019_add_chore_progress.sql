-- Add completion tracking to chores table
ALTER TABLE chores
  ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  ADD COLUMN IF NOT EXISTS notes TEXT;
