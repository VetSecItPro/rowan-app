-- Add visibility column to goals table
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'shared'));

-- Add progress column to goals table if not exists
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);

-- Backfill created_by as the owner for existing goals (use existing column)
-- No need to add owner_id as created_by already serves this purpose

-- Create goal_collaborators table for role-based access
CREATE TABLE IF NOT EXISTS goal_collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'contributor', 'viewer')),
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique user per goal
  UNIQUE(goal_id, user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_goal_collaborators_goal_id ON goal_collaborators(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_collaborators_user_id ON goal_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_visibility ON goals(visibility);
CREATE INDEX IF NOT EXISTS idx_goals_created_by ON goals(created_by);

-- Enable RLS on goal_collaborators table
ALTER TABLE goal_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view collaborators for goals they have access to
CREATE POLICY "Users can view goal collaborators"
  ON goal_collaborators
  FOR SELECT
  USING (
    -- User is the goal creator
    goal_id IN (
      SELECT id FROM goals WHERE created_by = auth.uid()
    )
    OR
    -- User is a collaborator on this goal
    user_id = auth.uid()
    OR
    -- User is in the same space (for shared goals)
    goal_id IN (
      SELECT g.id
      FROM goals g
      JOIN space_members sm ON sm.space_id = g.space_id
      WHERE sm.user_id = auth.uid() AND g.visibility = 'shared'
    )
  );

-- RLS Policy: Goal creators can add/remove collaborators
CREATE POLICY "Goal creators can manage collaborators"
  ON goal_collaborators
  FOR ALL
  USING (
    goal_id IN (
      SELECT id FROM goals WHERE created_by = auth.uid()
    )
  );

-- RLS Policy: Contributors can remove themselves
CREATE POLICY "Collaborators can remove themselves"
  ON goal_collaborators
  FOR DELETE
  USING (user_id = auth.uid());

-- Update goals RLS policies to account for shared goals and collaborators
-- Note: Only create new policies if they don't already exist
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Partnership members access" ON goals;
  DROP POLICY IF EXISTS "Users can view partnership goals" ON goals;
  DROP POLICY IF EXISTS "Users can manage partnership goals" ON goals;
  DROP POLICY IF EXISTS "Space members access" ON goals;
  DROP POLICY IF EXISTS "Users can view space goals" ON goals;
  DROP POLICY IF EXISTS "Users can manage space goals" ON goals;
END $$;

-- New comprehensive RLS policy for viewing goals
CREATE POLICY "Users can view accessible goals"
  ON goals
  FOR SELECT
  USING (
    -- Private goals: only creator and space members can view
    (visibility = 'private' AND space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    ))
    OR
    -- Shared goals: creator, collaborators, and space members can view
    (visibility = 'shared' AND (
      created_by = auth.uid()
      OR
      id IN (SELECT goal_id FROM goal_collaborators WHERE user_id = auth.uid())
      OR
      space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      )
    ))
  );

-- RLS Policy: Goal creators and contributors can update goals
CREATE POLICY "Creators and contributors can update goals"
  ON goals
  FOR UPDATE
  USING (
    -- User is the creator
    created_by = auth.uid()
    OR
    -- User is a contributor (not just viewer)
    id IN (
      SELECT goal_id
      FROM goal_collaborators
      WHERE user_id = auth.uid()
      AND role IN ('contributor', 'owner')
    )
  );

-- RLS Policy: Space members can create goals
CREATE POLICY "Space members can create goals"
  ON goals
  FOR INSERT
  WITH CHECK (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- RLS Policy: Only goal creators can delete goals
CREATE POLICY "Only creators can delete goals"
  ON goals
  FOR DELETE
  USING (created_by = auth.uid());

-- Function to automatically add goal creator as owner collaborator
CREATE OR REPLACE FUNCTION add_goal_creator_as_collaborator()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add for shared goals
  IF NEW.visibility = 'shared' AND NEW.created_by IS NOT NULL THEN
    INSERT INTO goal_collaborators (goal_id, user_id, role, invited_by)
    VALUES (NEW.id, NEW.created_by, 'owner', NEW.created_by)
    ON CONFLICT (goal_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-add creator as collaborator
DROP TRIGGER IF EXISTS trigger_add_goal_creator ON goals;
CREATE TRIGGER trigger_add_goal_creator
  AFTER INSERT ON goals
  FOR EACH ROW
  EXECUTE FUNCTION add_goal_creator_as_collaborator();

-- Update goal_milestones RLS to respect goal collaboration
-- First check what table name is actually used
DO $$
BEGIN
  -- Check if milestones table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'milestones') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Partnership members access milestones" ON milestones;
    DROP POLICY IF EXISTS "Space members access milestones" ON milestones;
    DROP POLICY IF EXISTS "Users can view accessible milestones" ON milestones;
    DROP POLICY IF EXISTS "Owners and contributors can manage milestones" ON milestones;

    -- Create new policies
    EXECUTE 'CREATE POLICY "Users can view accessible milestones"
      ON milestones
      FOR SELECT
      USING (
        goal_id IN (
          SELECT id FROM goals
          WHERE
            (visibility = ''private'' AND space_id IN (
              SELECT space_id FROM space_members WHERE user_id = auth.uid()
            ))
            OR
            (visibility = ''shared'' AND (
              created_by = auth.uid()
              OR
              id IN (SELECT goal_id FROM goal_collaborators WHERE user_id = auth.uid())
              OR
              space_id IN (
                SELECT space_id FROM space_members WHERE user_id = auth.uid()
              )
            ))
        )
      )';

    EXECUTE 'CREATE POLICY "Creators and contributors can manage milestones"
      ON milestones
      FOR ALL
      USING (
        goal_id IN (
          SELECT g.id FROM goals g
          WHERE
            g.created_by = auth.uid()
            OR
            g.id IN (
              SELECT goal_id
              FROM goal_collaborators
              WHERE user_id = auth.uid()
              AND role IN (''contributor'', ''owner'')
            )
        )
      )';
  END IF;

  -- Check if goal_milestones table exists instead
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'goal_milestones') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Partnership members access milestones" ON goal_milestones;
    DROP POLICY IF EXISTS "Space members access milestones" ON goal_milestones;
    DROP POLICY IF EXISTS "Users can view accessible milestones" ON goal_milestones;
    DROP POLICY IF EXISTS "Creators and contributors can manage milestones" ON goal_milestones;

    -- Create new policies
    EXECUTE 'CREATE POLICY "Users can view accessible milestones"
      ON goal_milestones
      FOR SELECT
      USING (
        goal_id IN (
          SELECT id FROM goals
          WHERE
            (visibility = ''private'' AND space_id IN (
              SELECT space_id FROM space_members WHERE user_id = auth.uid()
            ))
            OR
            (visibility = ''shared'' AND (
              created_by = auth.uid()
              OR
              id IN (SELECT goal_id FROM goal_collaborators WHERE user_id = auth.uid())
              OR
              space_id IN (
                SELECT space_id FROM space_members WHERE user_id = auth.uid()
              )
            ))
        )
      )';

    EXECUTE 'CREATE POLICY "Creators and contributors can manage milestones"
      ON goal_milestones
      FOR ALL
      USING (
        goal_id IN (
          SELECT g.id FROM goals g
          WHERE
            g.created_by = auth.uid()
            OR
            g.id IN (
              SELECT goal_id
              FROM goal_collaborators
              WHERE user_id = auth.uid()
              AND role IN (''contributor'', ''owner'')
            )
        )
      )';
  END IF;
END $$;

-- Add updated_at trigger for goal_collaborators
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_goal_collaborators_updated_at ON goal_collaborators;
CREATE TRIGGER update_goal_collaborators_updated_at
  BEFORE UPDATE ON goal_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON goal_collaborators TO authenticated;
GRANT ALL ON goal_collaborators TO service_role;
