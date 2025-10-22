-- Add sort_order column to chores table for drag-and-drop functionality
ALTER TABLE chores ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create index for better performance on sort_order queries
CREATE INDEX IF NOT EXISTS idx_chores_sort_order ON chores(sort_order);

-- Update existing chores to have incrementing sort_order values
-- We'll use a simpler approach without window functions
WITH numbered_chores AS (
  SELECT id, row_number() OVER (PARTITION BY space_id ORDER BY created_at) - 1 as new_sort_order
  FROM chores
  WHERE sort_order IS NULL OR sort_order = 0
)
UPDATE chores
SET sort_order = numbered_chores.new_sort_order
FROM numbered_chores
WHERE chores.id = numbered_chores.id;