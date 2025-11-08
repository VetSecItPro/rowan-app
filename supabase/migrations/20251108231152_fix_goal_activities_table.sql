-- Fix goal_activities table if missing
-- This ensures the table exists even if the previous migration failed to apply properly

CREATE TABLE IF NOT EXISTS goal_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES goal_milestones(id) ON DELETE CASCADE,
  check_in_id UUID REFERENCES goal_check_ins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Activity details
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'goal_created', 'goal_updated', 'goal_completed', 'goal_deleted',
    'milestone_created', 'milestone_completed', 'milestone_updated', 'milestone_deleted',
    'check_in_created', 'check_in_updated',
    'goal_shared', 'goal_collaborated', 'goal_commented'
  )),

  -- Flexible activity data
  activity_data JSONB DEFAULT '{}',

  -- Activity metadata
  title TEXT NOT NULL,
  description TEXT,

  -- Related entity info (for when entities are deleted)
  entity_title TEXT,
  entity_type TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_goal_activities_space_id ON goal_activities(space_id);
CREATE INDEX IF NOT EXISTS idx_goal_activities_goal_id ON goal_activities(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_activities_user_id ON goal_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_activities_created_at ON goal_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goal_activities_type ON goal_activities(activity_type);

-- Enable RLS
ALTER TABLE goal_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$
BEGIN
    -- Check if the policy exists before creating it
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'goal_activities'
        AND policyname = 'Users can view activities in their spaces'
    ) THEN
        CREATE POLICY "Users can view activities in their spaces"
          ON goal_activities
          FOR SELECT
          USING (
            space_id IN (
              SELECT space_id FROM space_members WHERE user_id = auth.uid()
            )
          );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'goal_activities'
        AND policyname = 'Users can create activities for their actions'
    ) THEN
        CREATE POLICY "Users can create activities for their actions"
          ON goal_activities
          FOR INSERT
          WITH CHECK (
            user_id = auth.uid()
            AND
            space_id IN (
              SELECT space_id FROM space_members WHERE user_id = auth.uid()
            )
          );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'goal_activities'
        AND policyname = 'Users can update their own activities'
    ) THEN
        CREATE POLICY "Users can update their own activities"
          ON goal_activities
          FOR UPDATE
          USING (user_id = auth.uid());
    END IF;
END $$;

-- Grant necessary permissions
GRANT ALL ON goal_activities TO authenticated;
GRANT ALL ON goal_activities TO service_role;