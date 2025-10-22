-- Add sort_order column to chores table for drag-and-drop functionality
ALTER TABLE chores ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create index for better performance on sort_order queries
CREATE INDEX IF NOT EXISTS idx_chores_sort_order ON chores(sort_order);