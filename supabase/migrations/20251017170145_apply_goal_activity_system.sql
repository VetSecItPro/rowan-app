-- Combined migration for goal check-ins and activity feed system

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
  reminder_days_before INTEGER DEFAULT 0, -- Days before due date to send reminder
  auto_schedule BOOLEAN DEFAULT FALSE, -- Automatically schedule next check-in

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one setting per user per goal
  UNIQUE(goal_id, user_id)
);

-- Create indexes for check-ins
CREATE INDEX IF NOT EXISTS idx_goal_check_ins_goal_id ON goal_check_ins(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_check_ins_user_id ON goal_check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_check_ins_created_at ON goal_check_ins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goal_check_ins_mood ON goal_check_ins(mood);

CREATE INDEX IF NOT EXISTS idx_goal_check_in_photos_check_in_id ON goal_check_in_photos(check_in_id);
CREATE INDEX IF NOT EXISTS idx_goal_check_in_photos_order ON goal_check_in_photos(check_in_id, order_index);

CREATE INDEX IF NOT EXISTS idx_goal_check_in_settings_goal_id ON goal_check_in_settings(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_check_in_settings_user_id ON goal_check_in_settings(user_id);

-- Enable RLS on check-in tables
ALTER TABLE goal_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_check_in_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_check_in_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for goal_check_ins
CREATE POLICY "Users can view check-ins for goals they have access to"
  ON goal_check_ins
  FOR SELECT
  USING (
    goal_id IN (
      SELECT g.id FROM goals g
      JOIN space_members sm ON g.space_id = sm.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create check-ins for accessible goals"
  ON goal_check_ins
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND
    goal_id IN (
      SELECT g.id FROM goals g
      JOIN space_members sm ON g.space_id = sm.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own check-ins"
  ON goal_check_ins
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own check-ins"
  ON goal_check_ins
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS policies for goal_check_in_photos
CREATE POLICY "Users can view photos for accessible check-ins"
  ON goal_check_in_photos
  FOR SELECT
  USING (
    check_in_id IN (
      SELECT ci.id FROM goal_check_ins ci
      JOIN goals g ON ci.goal_id = g.id
      JOIN space_members sm ON g.space_id = sm.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage photos for their check-ins"
  ON goal_check_in_photos
  FOR ALL
  USING (
    check_in_id IN (
      SELECT id FROM goal_check_ins WHERE user_id = auth.uid()
    )
  );

-- RLS policies for goal_check_in_settings
CREATE POLICY "Users can view settings for accessible goals"
  ON goal_check_in_settings
  FOR SELECT
  USING (
    goal_id IN (
      SELECT g.id FROM goals g
      JOIN space_members sm ON g.space_id = sm.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own check-in settings"
  ON goal_check_in_settings
  FOR ALL
  USING (user_id = auth.uid());

-- Create activity feed system for goals
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

-- Create goal comments table for commenting system
CREATE TABLE IF NOT EXISTS goal_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES goal_comments(id) ON DELETE CASCADE,

  -- Comment content
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'markdown')),

  -- Reactions and interactions
  reaction_counts JSONB DEFAULT '{}', -- {"=M": 5, "d": 2, etc.}

  -- Metadata
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comment reactions table
CREATE TABLE IF NOT EXISTS goal_comment_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES goal_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one reaction per user per comment per emoji
  UNIQUE(comment_id, user_id, emoji)
);

-- Create goal mentions table for @mentions in comments
CREATE TABLE IF NOT EXISTS goal_mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES goal_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentioning_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Read status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique mentions per comment per user
  UNIQUE(comment_id, mentioned_user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_goal_activities_space_id ON goal_activities(space_id);
CREATE INDEX IF NOT EXISTS idx_goal_activities_goal_id ON goal_activities(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_activities_user_id ON goal_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_activities_created_at ON goal_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goal_activities_type ON goal_activities(activity_type);

CREATE INDEX IF NOT EXISTS idx_goal_comments_goal_id ON goal_comments(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_comments_user_id ON goal_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_comments_parent ON goal_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_goal_comments_created_at ON goal_comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_goal_comment_reactions_comment_id ON goal_comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_goal_comment_reactions_user_id ON goal_comment_reactions(user_id);

CREATE INDEX IF NOT EXISTS idx_goal_mentions_mentioned_user ON goal_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_goal_mentions_unread ON goal_mentions(mentioned_user_id, is_read) WHERE NOT is_read;

-- Enable RLS on all activity tables
ALTER TABLE goal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for goal_activities

-- Users can view activities in spaces they're part of
CREATE POLICY "Users can view activities in their spaces"
  ON goal_activities
  FOR SELECT
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

-- Users can create activities for actions they perform
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

-- Users can update their own activities
CREATE POLICY "Users can update their own activities"
  ON goal_activities
  FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for goal_comments

-- Users can view comments on goals they have access to
CREATE POLICY "Users can view comments on accessible goals"
  ON goal_comments
  FOR SELECT
  USING (
    goal_id IN (
      SELECT g.id FROM goals g
      JOIN space_members sm ON g.space_id = sm.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- Users can create comments on goals they have access to
CREATE POLICY "Users can create comments on accessible goals"
  ON goal_comments
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND
    goal_id IN (
      SELECT g.id FROM goals g
      JOIN space_members sm ON g.space_id = sm.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON goal_comments
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON goal_comments
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for goal_comment_reactions

-- Users can view reactions on comments they can access
CREATE POLICY "Users can view reactions on accessible comments"
  ON goal_comment_reactions
  FOR SELECT
  USING (
    comment_id IN (
      SELECT c.id FROM goal_comments c
      JOIN goals g ON c.goal_id = g.id
      JOIN space_members sm ON g.space_id = sm.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- Users can manage their own reactions
CREATE POLICY "Users can manage their own reactions"
  ON goal_comment_reactions
  FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for goal_mentions

-- Users can view mentions directed at them or mentions they created
CREATE POLICY "Users can view relevant mentions"
  ON goal_mentions
  FOR SELECT
  USING (
    mentioned_user_id = auth.uid()
    OR
    mentioning_user_id = auth.uid()
  );

-- Users can create mentions in comments they can access
CREATE POLICY "Users can create mentions in accessible comments"
  ON goal_mentions
  FOR INSERT
  WITH CHECK (
    mentioning_user_id = auth.uid()
    AND
    comment_id IN (
      SELECT c.id FROM goal_comments c
      JOIN goals g ON c.goal_id = g.id
      JOIN space_members sm ON g.space_id = sm.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- Users can update mentions directed at them (mark as read)
CREATE POLICY "Users can update their own mentions"
  ON goal_mentions
  FOR UPDATE
  USING (mentioned_user_id = auth.uid());

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

DROP TRIGGER IF EXISTS update_goal_activities_updated_at ON goal_activities;
CREATE TRIGGER update_goal_activities_updated_at
  BEFORE UPDATE ON goal_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_goal_comments_updated_at ON goal_comments;
CREATE TRIGGER update_goal_comments_updated_at
  BEFORE UPDATE ON goal_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create activity when goals are created/updated
CREATE OR REPLACE FUNCTION create_goal_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle goal creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO goal_activities (
      space_id,
      goal_id,
      user_id,
      activity_type,
      title,
      description,
      entity_title,
      entity_type,
      activity_data
    ) VALUES (
      NEW.space_id,
      NEW.id,
      NEW.created_by,
      'goal_created',
      'Created goal',
      'A new goal was created',
      NEW.title,
      'goal',
      jsonb_build_object(
        'goal_title', NEW.title,
        'goal_category', NEW.category,
        'target_date', NEW.target_date
      )
    );
    RETURN NEW;
  END IF;

  -- Handle goal completion
  IF TG_OP = 'UPDATE' THEN
    -- Check if goal was just completed
    IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
      INSERT INTO goal_activities (
        space_id,
        goal_id,
        user_id,
        activity_type,
        title,
        description,
        entity_title,
        entity_type,
        activity_data
      ) VALUES (
        NEW.space_id,
        NEW.id,
        auth.uid(), -- User who completed it
        'goal_completed',
        'Completed goal',
        'Goal was marked as completed',
        NEW.title,
        'goal',
        jsonb_build_object(
          'goal_title', NEW.title,
          'completion_date', NEW.completed_at,
          'progress', NEW.progress
        )
      );
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create activity when milestones are completed
CREATE OR REPLACE FUNCTION create_milestone_activity()
RETURNS TRIGGER AS $$
DECLARE
  goal_record goals%ROWTYPE;
BEGIN
  -- Get the associated goal
  SELECT * INTO goal_record FROM goals WHERE id = NEW.goal_id;

  -- Handle milestone completion
  IF TG_OP = 'UPDATE' AND OLD.completed = FALSE AND NEW.completed = TRUE THEN
    INSERT INTO goal_activities (
      space_id,
      goal_id,
      milestone_id,
      user_id,
      activity_type,
      title,
      description,
      entity_title,
      entity_type,
      activity_data
    ) VALUES (
      goal_record.space_id,
      NEW.goal_id,
      NEW.id,
      auth.uid(),
      'milestone_completed',
      'Completed milestone',
      format('Milestone "%s" was completed', NEW.title),
      NEW.title,
      'milestone',
      jsonb_build_object(
        'milestone_title', NEW.title,
        'goal_title', goal_record.title,
        'completion_date', NEW.completed_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create activity when check-ins are created
CREATE OR REPLACE FUNCTION create_checkin_activity()
RETURNS TRIGGER AS $$
DECLARE
  goal_record goals%ROWTYPE;
BEGIN
  -- Get the associated goal
  SELECT * INTO goal_record FROM goals WHERE id = NEW.goal_id;

  -- Create activity for new check-in
  IF TG_OP = 'INSERT' THEN
    INSERT INTO goal_activities (
      space_id,
      goal_id,
      check_in_id,
      user_id,
      activity_type,
      title,
      description,
      entity_title,
      entity_type,
      activity_data
    ) VALUES (
      goal_record.space_id,
      NEW.goal_id,
      NEW.id,
      NEW.user_id,
      'check_in_created',
      'Added check-in',
      format('Check-in added for "%s"', goal_record.title),
      goal_record.title,
      'check_in',
      jsonb_build_object(
        'goal_title', goal_record.title,
        'progress_percentage', NEW.progress_percentage,
        'mood', NEW.mood,
        'need_help', NEW.need_help_from_partner,
        'has_notes', CASE WHEN NEW.notes IS NOT NULL AND NEW.notes != '' THEN true ELSE false END,
        'has_voice_note', CASE WHEN NEW.voice_note_url IS NOT NULL THEN true ELSE false END
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update comment reaction counts
CREATE OR REPLACE FUNCTION update_comment_reaction_counts()
RETURNS TRIGGER AS $$
DECLARE
  reaction_counts JSONB;
BEGIN
  -- Calculate new reaction counts for the comment
  SELECT jsonb_object_agg(emoji, count)
  INTO reaction_counts
  FROM (
    SELECT emoji, COUNT(*) as count
    FROM goal_comment_reactions
    WHERE comment_id = COALESCE(NEW.comment_id, OLD.comment_id)
    GROUP BY emoji
  ) sub;

  -- Update the comment with new reaction counts
  UPDATE goal_comments
  SET reaction_counts = COALESCE(reaction_counts, '{}'::jsonb)
  WHERE id = COALESCE(NEW.comment_id, OLD.comment_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically update goal progress based on check-ins
CREATE OR REPLACE FUNCTION update_goal_progress_from_checkin()
RETURNS TRIGGER AS $$
BEGIN
  -- Update goal progress when new check-in is created
  IF TG_OP = 'INSERT' THEN
    UPDATE goals
    SET
      progress = NEW.progress_percentage,
      updated_at = NOW()
    WHERE id = NEW.goal_id;

    RETURN NEW;
  END IF;

  -- Update goal progress when check-in is updated
  IF TG_OP = 'UPDATE' THEN
    UPDATE goals
    SET
      progress = NEW.progress_percentage,
      updated_at = NOW()
    WHERE id = NEW.goal_id;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for automatic activity creation
DROP TRIGGER IF EXISTS trigger_create_goal_activity ON goals;
CREATE TRIGGER trigger_create_goal_activity
  AFTER INSERT OR UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION create_goal_activity();

DROP TRIGGER IF EXISTS trigger_create_milestone_activity ON goal_milestones;
CREATE TRIGGER trigger_create_milestone_activity
  AFTER UPDATE ON goal_milestones
  FOR EACH ROW
  EXECUTE FUNCTION create_milestone_activity();

DROP TRIGGER IF EXISTS trigger_create_checkin_activity ON goal_check_ins;
CREATE TRIGGER trigger_create_checkin_activity
  AFTER INSERT ON goal_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION create_checkin_activity();

-- Create trigger for updating comment reaction counts
DROP TRIGGER IF EXISTS trigger_update_comment_reactions ON goal_comment_reactions;
CREATE TRIGGER trigger_update_comment_reactions
  AFTER INSERT OR DELETE ON goal_comment_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_reaction_counts();

-- Create trigger for updating goal progress from check-ins
DROP TRIGGER IF EXISTS trigger_update_goal_progress_from_checkin ON goal_check_ins;
CREATE TRIGGER trigger_update_goal_progress_from_checkin
  AFTER INSERT OR UPDATE ON goal_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_progress_from_checkin();

-- Grant necessary permissions
GRANT ALL ON goal_check_ins TO authenticated;
GRANT ALL ON goal_check_ins TO service_role;
GRANT ALL ON goal_check_in_photos TO authenticated;
GRANT ALL ON goal_check_in_photos TO service_role;
GRANT ALL ON goal_check_in_settings TO authenticated;
GRANT ALL ON goal_check_in_settings TO service_role;

GRANT ALL ON goal_activities TO authenticated;
GRANT ALL ON goal_activities TO service_role;
GRANT ALL ON goal_comments TO authenticated;
GRANT ALL ON goal_comments TO service_role;
GRANT ALL ON goal_comment_reactions TO authenticated;
GRANT ALL ON goal_comment_reactions TO service_role;
GRANT ALL ON goal_mentions TO authenticated;
GRANT ALL ON goal_mentions TO service_role;