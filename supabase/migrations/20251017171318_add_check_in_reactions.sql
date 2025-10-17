-- Create check-in reactions system for emoji reactions on goal check-ins

-- Create goal_check_in_reactions table
CREATE TABLE IF NOT EXISTS goal_check_in_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  check_in_id UUID NOT NULL REFERENCES goal_check_ins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one reaction per user per check-in per emoji
  UNIQUE(check_in_id, user_id, emoji)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_goal_check_in_reactions_check_in_id ON goal_check_in_reactions(check_in_id);
CREATE INDEX IF NOT EXISTS idx_goal_check_in_reactions_user_id ON goal_check_in_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_check_in_reactions_emoji ON goal_check_in_reactions(emoji);
CREATE INDEX IF NOT EXISTS idx_goal_check_in_reactions_created_at ON goal_check_in_reactions(created_at DESC);

-- Enable RLS
ALTER TABLE goal_check_in_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for goal_check_in_reactions

-- Users can view reactions on check-ins they have access to
CREATE POLICY "Users can view reactions on accessible check-ins"
  ON goal_check_in_reactions
  FOR SELECT
  USING (
    check_in_id IN (
      SELECT ci.id FROM goal_check_ins ci
      JOIN goals g ON ci.goal_id = g.id
      JOIN space_members sm ON g.space_id = sm.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- Users can add reactions to check-ins they have access to
CREATE POLICY "Users can add reactions to accessible check-ins"
  ON goal_check_in_reactions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND
    check_in_id IN (
      SELECT ci.id FROM goal_check_ins ci
      JOIN goals g ON ci.goal_id = g.id
      JOIN space_members sm ON g.space_id = sm.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own reactions"
  ON goal_check_in_reactions
  FOR DELETE
  USING (user_id = auth.uid());

-- Function to create activity when someone reacts to a check-in
CREATE OR REPLACE FUNCTION create_checkin_reaction_activity()
RETURNS TRIGGER AS $$
DECLARE
  checkin_record goal_check_ins%ROWTYPE;
  goal_record goals%ROWTYPE;
BEGIN
  -- Get the check-in and goal information
  SELECT * INTO checkin_record FROM goal_check_ins WHERE id = NEW.check_in_id;
  SELECT * INTO goal_record FROM goals WHERE id = checkin_record.goal_id;

  -- Create activity for reaction (but not for every single reaction to avoid spam)
  -- Only create activity for the first few reactions of each type
  IF TG_OP = 'INSERT' THEN
    -- Count existing reactions of this emoji for this check-in
    DECLARE
      reaction_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO reaction_count
      FROM goal_check_in_reactions
      WHERE check_in_id = NEW.check_in_id AND emoji = NEW.emoji;

      -- Only create activity for first reaction of each emoji type to avoid spam
      IF reaction_count <= 1 THEN
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
          checkin_record.goal_id,
          NEW.check_in_id,
          NEW.user_id,
          'check_in_updated',
          'Reacted to check-in',
          format('Added %s reaction to check-in for "%s"', NEW.emoji, goal_record.title),
          goal_record.title,
          'check_in_reaction',
          jsonb_build_object(
            'goal_title', goal_record.title,
            'emoji', NEW.emoji,
            'reaction_type', 'add'
          )
        );
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for check-in reaction activities
DROP TRIGGER IF EXISTS trigger_create_checkin_reaction_activity ON goal_check_in_reactions;
CREATE TRIGGER trigger_create_checkin_reaction_activity
  AFTER INSERT ON goal_check_in_reactions
  FOR EACH ROW
  EXECUTE FUNCTION create_checkin_reaction_activity();

-- Grant permissions
GRANT ALL ON goal_check_in_reactions TO authenticated;
GRANT ALL ON goal_check_in_reactions TO service_role;