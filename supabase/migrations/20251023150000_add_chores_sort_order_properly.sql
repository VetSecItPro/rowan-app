-- Add sort_order column to chores table for drag-and-drop functionality
-- This migration ensures the column is added properly

-- Add the column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'chores' AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE chores ADD COLUMN sort_order INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create index for better performance on sort_order queries
CREATE INDEX IF NOT EXISTS idx_chores_sort_order ON chores(space_id, sort_order);

-- Update existing chores to have incrementing sort_order values
UPDATE chores
SET sort_order = subquery.row_num - 1
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY space_id ORDER BY created_at) as row_num
    FROM chores
    WHERE sort_order IS NULL OR sort_order = 0
) AS subquery
WHERE chores.id = subquery.id;

-- Add comment for documentation
COMMENT ON COLUMN chores.sort_order IS 'Custom ordering for drag-and-drop reordering (0-based index)';