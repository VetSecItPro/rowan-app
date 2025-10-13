-- =============================================
-- FEATURE #19: MEAL PLAN → TASKS INTEGRATION
-- =============================================
-- This migration adds meal plan to tasks integration with filtering by date/meal type.

-- Create junction table for meal plan tasks
CREATE TABLE IF NOT EXISTS meal_plan_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  -- Filter to prevent redundant tasks
  meal_date DATE NOT NULL,
  meal_type TEXT NOT NULL,

  -- Task generation tracking
  is_auto_generated BOOLEAN DEFAULT FALSE,
  auto_complete_after_meal BOOLEAN DEFAULT TRUE, -- Auto-complete 2 hours after meal time

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(meal_plan_id, task_id),
  UNIQUE(meal_date, meal_type, task_id) -- Prevent duplicate tasks for same date/meal
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_meal_plan_tasks_meal_plan ON meal_plan_tasks(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_tasks_task ON meal_plan_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_tasks_date_type ON meal_plan_tasks(meal_date, meal_type);

-- Function to prevent duplicate task creation for same meal date/type
CREATE OR REPLACE FUNCTION check_meal_plan_task_uniqueness()
RETURNS TRIGGER AS $$
DECLARE
  existing_count INTEGER;
BEGIN
  -- Check if a task already exists for this meal_date and meal_type
  -- (regardless of which meal_plan_id generated it)
  SELECT COUNT(*) INTO existing_count
  FROM meal_plan_tasks
  WHERE meal_date = NEW.meal_date
    AND meal_type = NEW.meal_type
    AND task_id != NEW.task_id;

  IF existing_count > 0 THEN
    RAISE EXCEPTION 'A task already exists for % on %', NEW.meal_type, NEW.meal_date;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meal_plan_tasks_uniqueness_trigger
  BEFORE INSERT ON meal_plan_tasks
  FOR EACH ROW
  EXECUTE FUNCTION check_meal_plan_task_uniqueness();

-- Function to get meal time based on meal type
CREATE OR REPLACE FUNCTION get_meal_time(meal_type TEXT)
RETURNS TIME AS $$
BEGIN
  RETURN CASE meal_type
    WHEN 'breakfast' THEN '08:00:00'::TIME
    WHEN 'lunch' THEN '12:00:00'::TIME
    WHEN 'dinner' THEN '18:00:00'::TIME
    WHEN 'snack' THEN '15:00:00'::TIME
    ELSE '12:00:00'::TIME
  END;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-complete meal tasks after meal time + 2 hours (called by cron)
CREATE OR REPLACE FUNCTION auto_complete_meal_tasks()
RETURNS void AS $$
DECLARE
  meal_task_record RECORD;
  meal_time TIME;
  completion_time TIMESTAMPTZ;
BEGIN
  FOR meal_task_record IN
    SELECT mpt.*, t.id as task_id, u.timezone
    FROM meal_plan_tasks mpt
    JOIN tasks t ON t.id = mpt.task_id
    JOIN users u ON u.id = t.created_by
    WHERE mpt.auto_complete_after_meal = TRUE
      AND t.status != 'completed'
      AND mpt.meal_date <= CURRENT_DATE
  LOOP
    -- Get expected meal time
    meal_time := get_meal_time(meal_task_record.meal_type);

    -- Calculate completion time (meal time + 2 hours) in user's timezone
    completion_time := (meal_task_record.meal_date::TIMESTAMP + meal_time + INTERVAL '2 hours')
      AT TIME ZONE COALESCE(meal_task_record.timezone, 'America/New_York');

    -- If current time is past completion time, mark task as complete
    IF NOW() >= completion_time THEN
      UPDATE tasks
      SET
        status = 'completed',
        completed_at = NOW()
      WHERE id = meal_task_record.task_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create task from meal plan
CREATE OR REPLACE FUNCTION create_meal_prep_task(
  p_meal_plan_id UUID,
  p_space_id UUID,
  p_created_by UUID
) RETURNS UUID AS $$
DECLARE
  meal_plan_record RECORD;
  new_task_id UUID;
  recipe_name TEXT;
BEGIN
  -- Get meal plan details
  SELECT mp.*, r.name as recipe_name
  INTO meal_plan_record
  FROM meal_plans mp
  LEFT JOIN recipes r ON r.id = mp.recipe_id
  WHERE mp.id = p_meal_plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meal plan not found: %', p_meal_plan_id;
  END IF;

  recipe_name := COALESCE(meal_plan_record.recipe_name, 'Meal');

  -- Create task
  INSERT INTO tasks (
    space_id,
    title,
    description,
    category,
    priority,
    due_date,
    created_by
  ) VALUES (
    p_space_id,
    'Prepare ' || recipe_name || ' for ' || meal_plan_record.meal_type,
    COALESCE(meal_plan_record.notes, 'Meal prep task'),
    'Home',
    'medium',
    meal_plan_record.meal_date,
    p_created_by
  )
  RETURNING id INTO new_task_id;

  -- Link task to meal plan
  INSERT INTO meal_plan_tasks (
    meal_plan_id,
    task_id,
    meal_date,
    meal_type,
    is_auto_generated,
    auto_complete_after_meal
  ) VALUES (
    p_meal_plan_id,
    new_task_id,
    meal_plan_record.meal_date,
    meal_plan_record.meal_type,
    TRUE,
    TRUE
  );

  RETURN new_task_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE meal_plan_tasks IS 'Links meal plans to cooking/prep tasks with date/type filtering';
COMMENT ON COLUMN meal_plan_tasks.auto_complete_after_meal IS 'Automatically mark complete 2 hours after meal time';
COMMENT ON FUNCTION create_meal_prep_task IS 'Creates a meal prep task from a meal plan with uniqueness filtering';
