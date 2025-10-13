-- =============================================
-- FEATURE #7: DRAG & DROP REORDERING
-- =============================================
-- This migration adds sort_order field for custom task ordering within categories/views.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create index for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON tasks(space_id, category, sort_order);
CREATE INDEX IF NOT EXISTS idx_tasks_status_sort_order ON tasks(space_id, status, sort_order);

-- Function to auto-assign sort_order for new tasks (append to end)
CREATE OR REPLACE FUNCTION assign_task_sort_order()
RETURNS TRIGGER AS $$
DECLARE
  max_order INTEGER;
BEGIN
  IF NEW.sort_order = 0 OR NEW.sort_order IS NULL THEN
    -- Get the maximum sort_order for this space
    SELECT COALESCE(MAX(sort_order), 0) + 1
    INTO max_order
    FROM tasks
    WHERE space_id = NEW.space_id;

    NEW.sort_order = max_order;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_sort_order_trigger
  BEFORE INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION assign_task_sort_order();

-- Add comments
COMMENT ON COLUMN tasks.sort_order IS 'Custom ordering for drag-and-drop reordering (0-based index)';
