-- Add priority and ordering columns to goals table
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS priority_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'none' CHECK (priority IN ('none', 'p1', 'p2', 'p3', 'p4')),
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Create index for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_goals_priority_order ON goals(space_id, is_pinned DESC, priority_order ASC);
CREATE INDEX IF NOT EXISTS idx_goals_priority ON goals(priority);
CREATE INDEX IF NOT EXISTS idx_goals_pinned ON goals(is_pinned);

-- Function to auto-assign priority_order to new goals
CREATE OR REPLACE FUNCTION assign_goal_priority_order()
RETURNS TRIGGER AS $$
BEGIN
  -- If priority_order is not set, assign it as max + 1
  IF NEW.priority_order IS NULL OR NEW.priority_order = 0 THEN
    SELECT COALESCE(MAX(priority_order), 0) + 1
    INTO NEW.priority_order
    FROM goals
    WHERE space_id = NEW.space_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-assign priority_order
DROP TRIGGER IF EXISTS trigger_assign_goal_priority_order ON goals;
CREATE TRIGGER trigger_assign_goal_priority_order
  BEFORE INSERT ON goals
  FOR EACH ROW
  EXECUTE FUNCTION assign_goal_priority_order();

-- Backfill priority_order for existing goals
DO $$
DECLARE
  space_record RECORD;
  goal_record RECORD;
  current_order INTEGER;
BEGIN
  -- For each space
  FOR space_record IN SELECT DISTINCT space_id FROM goals WHERE priority_order = 0 OR priority_order IS NULL
  LOOP
    current_order := 1;

    -- Order goals by created_at and assign sequential priority_order
    FOR goal_record IN
      SELECT id
      FROM goals
      WHERE space_id = space_record.space_id
        AND (priority_order = 0 OR priority_order IS NULL)
      ORDER BY created_at ASC
    LOOP
      UPDATE goals
      SET priority_order = current_order
      WHERE id = goal_record.id;

      current_order := current_order + 1;
    END LOOP;
  END LOOP;
END $$;

-- Grant permissions
GRANT ALL ON goals TO authenticated;
GRANT ALL ON goals TO service_role;
