-- =============================================
-- FEATURE #18: RECIPE → SHOPPING → TASK CHAIN
-- =============================================
-- This migration enhances the recipe-shopping-task integration with auto-delete and auto-complete.

-- Add auto-cleanup fields to shopping_tasks junction table
ALTER TABLE shopping_tasks
  ADD COLUMN IF NOT EXISTS auto_delete_at TIMESTAMPTZ, -- Midnight local time
  ADD COLUMN IF NOT EXISTS auto_complete_at TIMESTAMPTZ, -- Midnight local time
  ADD COLUMN IF NOT EXISTS is_auto_created BOOLEAN DEFAULT FALSE, -- Track if created from recipe
  ADD COLUMN IF NOT EXISTS source_recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL;

-- Create index for auto-cleanup queries
CREATE INDEX IF NOT EXISTS idx_shopping_tasks_auto_delete ON shopping_tasks(auto_delete_at) WHERE auto_delete_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shopping_tasks_auto_complete ON shopping_tasks(auto_complete_at) WHERE auto_complete_at IS NOT NULL;

-- Function to set auto-delete/complete times (midnight local time)
CREATE OR REPLACE FUNCTION set_shopping_task_auto_times()
RETURNS TRIGGER AS $$
DECLARE
  user_timezone TEXT;
  midnight_time TIMESTAMPTZ;
BEGIN
  IF NEW.is_auto_created = TRUE THEN
    -- Get user's timezone
    SELECT timezone INTO user_timezone
    FROM users
    WHERE id = (
      SELECT created_by FROM tasks WHERE id = NEW.task_id LIMIT 1
    );

    IF user_timezone IS NULL THEN
      user_timezone := 'America/New_York'; -- Default fallback
    END IF;

    -- Calculate midnight in user's local timezone
    midnight_time := (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMP AT TIME ZONE user_timezone;

    NEW.auto_delete_at := midnight_time;
    NEW.auto_complete_at := midnight_time;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shopping_tasks_auto_times_trigger
  BEFORE INSERT ON shopping_tasks
  FOR EACH ROW
  WHEN (NEW.is_auto_created = TRUE)
  EXECUTE FUNCTION set_shopping_task_auto_times();

-- Function to auto-delete expired shopping tasks (called by cron job at midnight)
CREATE OR REPLACE FUNCTION cleanup_expired_shopping_tasks()
RETURNS void AS $$
BEGIN
  -- Delete tasks that have passed their auto_delete_at time
  DELETE FROM tasks
  WHERE id IN (
    SELECT task_id FROM shopping_tasks
    WHERE auto_delete_at IS NOT NULL
      AND auto_delete_at <= NOW()
      AND is_auto_created = TRUE
  );

  -- The shopping_tasks records will be deleted via CASCADE
END;
$$ LANGUAGE plpgsql;

-- Function to auto-complete shopping tasks at midnight (called by cron job)
CREATE OR REPLACE FUNCTION auto_complete_shopping_tasks()
RETURNS void AS $$
BEGIN
  -- Mark tasks as completed if they passed their auto_complete_at time
  UPDATE tasks
  SET
    status = 'completed',
    completed_at = NOW()
  WHERE id IN (
    SELECT task_id FROM shopping_tasks
    WHERE auto_complete_at IS NOT NULL
      AND auto_complete_at <= NOW()
      AND is_auto_created = TRUE
  )
  AND status != 'completed';
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON COLUMN shopping_tasks.auto_delete_at IS 'Automatically delete task at this time (midnight local time)';
COMMENT ON COLUMN shopping_tasks.auto_complete_at IS 'Automatically mark task as complete at this time (midnight local time)';
COMMENT ON COLUMN shopping_tasks.is_auto_created IS 'True if task was auto-created from recipe';
COMMENT ON COLUMN shopping_tasks.source_recipe_id IS 'Recipe that generated this shopping task';
