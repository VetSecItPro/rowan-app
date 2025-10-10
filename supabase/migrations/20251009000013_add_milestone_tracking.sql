-- =============================================
-- MILESTONE TRACKING ENHANCEMENTS
-- =============================================
-- Adds advanced tracking capabilities to goals and milestones

-- Add progress field to goals table
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);

-- Add milestone tracking fields to goal_milestones table
ALTER TABLE goal_milestones
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'date' CHECK (type IN ('percentage', 'money', 'count', 'date')),
ADD COLUMN IF NOT EXISTS target_value NUMERIC,
ADD COLUMN IF NOT EXISTS current_value NUMERIC DEFAULT 0;

-- Update RLS policies for goals table (if not exists)
DO $$
BEGIN
    -- Enable RLS
    ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
    ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view goals in their space" ON goals;
    DROP POLICY IF EXISTS "Users can create goals in their space" ON goals;
    DROP POLICY IF EXISTS "Users can update goals in their space" ON goals;
    DROP POLICY IF EXISTS "Users can delete goals in their space" ON goals;

    DROP POLICY IF EXISTS "Users can view milestones in their space" ON goal_milestones;
    DROP POLICY IF EXISTS "Users can create milestones in their space" ON goal_milestones;
    DROP POLICY IF EXISTS "Users can update milestones in their space" ON goal_milestones;
    DROP POLICY IF EXISTS "Users can delete milestones in their space" ON goal_milestones;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some policies may not exist yet, continuing...';
END $$;

-- Goals RLS Policies
CREATE POLICY "Users can view goals in their space"
ON goals FOR SELECT
USING (
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create goals in their space"
ON goals FOR INSERT
WITH CHECK (
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update goals in their space"
ON goals FOR UPDATE
USING (
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete goals in their space"
ON goals FOR DELETE
USING (
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  )
);

-- Milestones RLS Policies
CREATE POLICY "Users can view milestones in their space"
ON goal_milestones FOR SELECT
USING (
  goal_id IN (
    SELECT id FROM goals
    WHERE space_id IN (
      SELECT space_id FROM space_members
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create milestones in their space"
ON goal_milestones FOR INSERT
WITH CHECK (
  goal_id IN (
    SELECT id FROM goals
    WHERE space_id IN (
      SELECT space_id FROM space_members
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update milestones in their space"
ON goal_milestones FOR UPDATE
USING (
  goal_id IN (
    SELECT id FROM goals
    WHERE space_id IN (
      SELECT space_id FROM space_members
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete milestones in their space"
ON goal_milestones FOR DELETE
USING (
  goal_id IN (
    SELECT id FROM goals
    WHERE space_id IN (
      SELECT space_id FROM space_members
      WHERE user_id = auth.uid()
    )
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_goals_space_id ON goals(space_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_created_at ON goals(created_at);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id ON goal_milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_completed ON goal_milestones(completed);

-- Add update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_goals_updated_at ON goals;
CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_goal_milestones_updated_at ON goal_milestones;
CREATE TRIGGER update_goal_milestones_updated_at
    BEFORE UPDATE ON goal_milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
