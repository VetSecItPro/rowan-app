-- =============================================
-- FEATURE #6: TASK DEPENDENCIES
-- =============================================
-- This migration creates a junction table for task dependencies (blocking relationships).

CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, -- The dependent task
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, -- The blocking task
  dependency_type TEXT DEFAULT 'blocks' CHECK (dependency_type IN ('blocks', 'relates_to')),

  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(task_id, depends_on_task_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_type ON task_dependencies(dependency_type);

-- Prevent self-dependencies
ALTER TABLE task_dependencies
  ADD CONSTRAINT check_no_self_dependency CHECK (task_id != depends_on_task_id);

-- Function to detect circular dependencies using recursive CTE
CREATE OR REPLACE FUNCTION check_circular_dependency()
RETURNS TRIGGER AS $$
DECLARE
  has_cycle BOOLEAN;
BEGIN
  -- Check if adding this dependency would create a cycle
  WITH RECURSIVE dependency_chain AS (
    -- Start with the new dependency
    SELECT NEW.task_id AS current_task, NEW.depends_on_task_id AS blocking_task, 1 AS depth
    UNION ALL
    -- Recursively follow the chain
    SELECT dc.current_task, td.depends_on_task_id, dc.depth + 1
    FROM dependency_chain dc
    JOIN task_dependencies td ON td.task_id = dc.blocking_task
    WHERE dc.depth < 20 -- Prevent infinite recursion
  )
  SELECT EXISTS(
    SELECT 1 FROM dependency_chain
    WHERE current_task = blocking_task
  ) INTO has_cycle;

  IF has_cycle THEN
    RAISE EXCEPTION 'Circular dependency detected: Task % cannot depend on Task % (would create a cycle)', NEW.task_id, NEW.depends_on_task_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_dependencies_circular_check_trigger
  BEFORE INSERT OR UPDATE ON task_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION check_circular_dependency();

-- Add dependency status tracking to tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS blocking_count INTEGER DEFAULT 0;

-- Function to update blocked status when dependencies change
CREATE OR REPLACE FUNCTION update_task_blocked_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the dependent task's blocked status
  UPDATE tasks
  SET is_blocked = EXISTS(
    SELECT 1 FROM task_dependencies td
    JOIN tasks t ON t.id = td.depends_on_task_id
    WHERE td.task_id = tasks.id
      AND t.status != 'completed'
      AND td.dependency_type = 'blocks'
  )
  WHERE id = COALESCE(NEW.task_id, OLD.task_id);

  -- Update the blocking task's blocking_count
  IF TG_OP = 'INSERT' THEN
    UPDATE tasks
    SET blocking_count = blocking_count + 1
    WHERE id = NEW.depends_on_task_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tasks
    SET blocking_count = GREATEST(blocking_count - 1, 0)
    WHERE id = OLD.depends_on_task_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_dependencies_update_status_trigger
  AFTER INSERT OR DELETE ON task_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION update_task_blocked_status();

-- Function to update blocked tasks when a task is completed
CREATE OR REPLACE FUNCTION update_blocked_tasks_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Update all tasks that were blocked by this task
    UPDATE tasks
    SET is_blocked = EXISTS(
      SELECT 1 FROM task_dependencies td
      JOIN tasks t ON t.id = td.depends_on_task_id
      WHERE td.task_id = tasks.id
        AND t.status != 'completed'
        AND td.dependency_type = 'blocks'
    )
    WHERE id IN (
      SELECT task_id FROM task_dependencies
      WHERE depends_on_task_id = NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_completion_update_blocked_trigger
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_blocked_tasks_on_completion();

-- Add comments
COMMENT ON TABLE task_dependencies IS 'Defines blocking relationships between tasks';
COMMENT ON COLUMN task_dependencies.dependency_type IS 'blocks = must complete first, relates_to = soft connection';
COMMENT ON COLUMN tasks.is_blocked IS 'True if task has incomplete dependencies';
COMMENT ON COLUMN tasks.blocking_count IS 'Number of tasks this task is blocking';
