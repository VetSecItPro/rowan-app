-- Create goal_check_ins table for periodic goal reviews
CREATE TABLE IF NOT EXISTS goal_check_ins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Check-in data
  progress_percentage INTEGER NOT NULL CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  mood TEXT NOT NULL CHECK (mood IN ('great', 'okay', 'struggling')),
  notes TEXT,
  blockers TEXT,
  need_help_from_partner BOOLEAN DEFAULT FALSE,

  -- Voice notes (optional)
  voice_note_url TEXT,
  voice_note_duration INTEGER, -- in seconds

  -- Check-in metadata
  check_in_type TEXT DEFAULT 'manual' CHECK (check_in_type IN ('manual', 'scheduled', 'reminder')),
  scheduled_date DATE, -- When this check-in was originally scheduled

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create goal_check_in_photos table for progress photos
CREATE TABLE IF NOT EXISTS goal_check_in_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  check_in_id UUID NOT NULL REFERENCES goal_check_ins(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create goal_check_in_settings table for check-in frequency preferences
CREATE TABLE IF NOT EXISTS goal_check_in_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Frequency settings
  frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  reminder_time TIME DEFAULT '09:00:00',

  -- Preferences
  enable_reminders BOOLEAN DEFAULT TRUE,
  enable_voice_notes BOOLEAN DEFAULT TRUE,
  enable_photos BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique settings per user per goal
  UNIQUE(goal_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_goal_check_ins_goal_id ON goal_check_ins(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_check_ins_user_id ON goal_check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_check_ins_created_at ON goal_check_ins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goal_check_in_photos_check_in_id ON goal_check_in_photos(check_in_id);
CREATE INDEX IF NOT EXISTS idx_goal_check_in_settings_goal_id ON goal_check_in_settings(goal_id);

-- Enable RLS on all tables
ALTER TABLE goal_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_check_in_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_check_in_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view check-ins for goals they have access to
CREATE POLICY "Users can view accessible check-ins"
  ON goal_check_ins
  FOR SELECT
  USING (
    -- User created the check-in
    user_id = auth.uid()
    OR
    -- User has access to the goal (same logic as goals table)
    goal_id IN (
      SELECT id FROM goals
      WHERE
        (visibility = 'private' AND space_id IN (
          SELECT space_id FROM space_members WHERE user_id = auth.uid()
        ))
        OR
        (visibility = 'shared' AND (
          created_by = auth.uid()
          OR
          id IN (SELECT goal_id FROM goal_collaborators WHERE user_id = auth.uid())
          OR
          space_id IN (
            SELECT space_id FROM space_members WHERE user_id = auth.uid()
          )
        ))
    )
  );

-- RLS Policy: Users can create check-ins for goals they can contribute to
CREATE POLICY "Users can create check-ins for accessible goals"
  ON goal_check_ins
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND
    goal_id IN (
      SELECT g.id FROM goals g
      WHERE
        g.created_by = auth.uid()
        OR
        g.id IN (
          SELECT goal_id
          FROM goal_collaborators
          WHERE user_id = auth.uid()
          AND role IN ('contributor', 'owner')
        )
        OR
        (g.visibility = 'private' AND g.space_id IN (
          SELECT space_id FROM space_members WHERE user_id = auth.uid()
        ))
    )
  );

-- RLS Policy: Users can update their own check-ins
CREATE POLICY "Users can update their own check-ins"
  ON goal_check_ins
  FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policy: Users can delete their own check-ins
CREATE POLICY "Users can delete their own check-ins"
  ON goal_check_ins
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policy: Users can view photos for check-ins they can access
CREATE POLICY "Users can view accessible check-in photos"
  ON goal_check_in_photos
  FOR SELECT
  USING (
    check_in_id IN (
      SELECT id FROM goal_check_ins
      WHERE
        user_id = auth.uid()
        OR
        goal_id IN (
          SELECT id FROM goals
          WHERE
            (visibility = 'private' AND space_id IN (
              SELECT space_id FROM space_members WHERE user_id = auth.uid()
            ))
            OR
            (visibility = 'shared' AND (
              created_by = auth.uid()
              OR
              id IN (SELECT goal_id FROM goal_collaborators WHERE user_id = auth.uid())
              OR
              space_id IN (
                SELECT space_id FROM space_members WHERE user_id = auth.uid()
              )
            ))
        )
    )
  );

-- RLS Policy: Users can manage photos for their own check-ins
CREATE POLICY "Users can manage their own check-in photos"
  ON goal_check_in_photos
  FOR ALL
  USING (
    check_in_id IN (
      SELECT id FROM goal_check_ins WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can view settings for goals they have access to
CREATE POLICY "Users can view check-in settings for accessible goals"
  ON goal_check_in_settings
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    goal_id IN (
      SELECT id FROM goals
      WHERE
        (visibility = 'private' AND space_id IN (
          SELECT space_id FROM space_members WHERE user_id = auth.uid()
        ))
        OR
        (visibility = 'shared' AND (
          created_by = auth.uid()
          OR
          id IN (SELECT goal_id FROM goal_collaborators WHERE user_id = auth.uid())
          OR
          space_id IN (
            SELECT space_id FROM space_members WHERE user_id = auth.uid()
          )
        ))
    )
  );

-- RLS Policy: Users can manage their own check-in settings
CREATE POLICY "Users can manage their own check-in settings"
  ON goal_check_in_settings
  FOR ALL
  USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_goal_check_ins_updated_at ON goal_check_ins;
CREATE TRIGGER update_goal_check_ins_updated_at
  BEFORE UPDATE ON goal_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_goal_check_in_settings_updated_at ON goal_check_in_settings;
CREATE TRIGGER update_goal_check_in_settings_updated_at
  BEFORE UPDATE ON goal_check_in_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update goal progress when check-in is created
CREATE OR REPLACE FUNCTION update_goal_progress_from_checkin()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the goal's progress to match the latest check-in
  UPDATE goals
  SET
    progress = NEW.progress_percentage,
    updated_at = NOW()
  WHERE id = NEW.goal_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update goal progress
DROP TRIGGER IF EXISTS trigger_update_goal_progress ON goal_check_ins;
CREATE TRIGGER trigger_update_goal_progress
  AFTER INSERT ON goal_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_progress_from_checkin();

-- Grant necessary permissions
GRANT ALL ON goal_check_ins TO authenticated;
GRANT ALL ON goal_check_ins TO service_role;
GRANT ALL ON goal_check_in_photos TO authenticated;
GRANT ALL ON goal_check_in_photos TO service_role;
GRANT ALL ON goal_check_in_settings TO authenticated;
GRANT ALL ON goal_check_in_settings TO service_role;

-- Create default check-in settings for existing goals
-- This will run once when the migration is applied
INSERT INTO goal_check_in_settings (goal_id, user_id, frequency, day_of_week, reminder_time)
SELECT
  g.id as goal_id,
  g.created_by as user_id,
  'weekly' as frequency,
  1 as day_of_week, -- Monday
  '09:00:00' as reminder_time
FROM goals g
WHERE g.created_by IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM goal_check_in_settings gcs
  WHERE gcs.goal_id = g.id AND gcs.user_id = g.created_by
)
ON CONFLICT (goal_id, user_id) DO NOTHING;