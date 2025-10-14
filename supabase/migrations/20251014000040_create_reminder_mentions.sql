-- =============================================
-- REMINDERS COLLABORATION: @MENTIONS
-- =============================================
-- This migration creates the mention system for reminders,
-- allowing users to @mention partners in comments and descriptions.

-- Create reminder_mentions table
CREATE TABLE IF NOT EXISTS reminder_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES reminder_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentioning_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mention_context TEXT, -- 'description' or 'comment'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reminder_id, comment_id, mentioned_user_id)
);

-- Add CHECK constraint for mention context
ALTER TABLE reminder_mentions
  ADD CONSTRAINT valid_mention_context CHECK (
    mention_context IN ('description', 'comment')
  );

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_reminder_mentions_reminder_id
  ON reminder_mentions(reminder_id);

CREATE INDEX IF NOT EXISTS idx_reminder_mentions_comment_id
  ON reminder_mentions(comment_id);

CREATE INDEX IF NOT EXISTS idx_reminder_mentions_mentioned_user
  ON reminder_mentions(mentioned_user_id);

CREATE INDEX IF NOT EXISTS idx_reminder_mentions_mentioning_user
  ON reminder_mentions(mentioning_user_id);

CREATE INDEX IF NOT EXISTS idx_reminder_mentions_created_at
  ON reminder_mentions(created_at DESC);

-- Composite index for getting mentions for a user
CREATE INDEX IF NOT EXISTS idx_reminder_mentions_user_reminder
  ON reminder_mentions(mentioned_user_id, reminder_id, created_at DESC);

-- Enable RLS
ALTER TABLE reminder_mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view mentions in their spaces
CREATE POLICY "Users can view mentions in their spaces"
  ON reminder_mentions FOR SELECT
  USING (
    reminder_id IN (
      SELECT r.id FROM reminders r
      INNER JOIN space_members sm ON sm.space_id = r.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can create mentions in their spaces
CREATE POLICY "Users can create mentions in their spaces"
  ON reminder_mentions FOR INSERT
  WITH CHECK (
    mentioning_user_id = auth.uid() AND
    reminder_id IN (
      SELECT r.id FROM reminders r
      INNER JOIN space_members sm ON sm.space_id = r.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- RLS Policy: No updates allowed (mentions are immutable)
CREATE POLICY "No updates allowed"
  ON reminder_mentions FOR UPDATE
  USING (false);

-- RLS Policy: Only the mentioning user can delete their mentions
CREATE POLICY "Mentioning user can delete mentions"
  ON reminder_mentions FOR DELETE
  USING (mentioning_user_id = auth.uid());

-- Function to extract mentions from text and create mention records
CREATE OR REPLACE FUNCTION process_reminder_mentions(
  p_reminder_id UUID,
  p_content TEXT,
  p_mentioning_user_id UUID,
  p_context TEXT,
  p_comment_id UUID DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_mention_pattern TEXT := '@\[([^\]]+)\]\(([a-f0-9-]+)\)';
  v_match RECORD;
  v_space_id UUID;
BEGIN
  -- Get reminder's space_id
  SELECT space_id INTO v_space_id
  FROM reminders
  WHERE id = p_reminder_id;

  -- Extract all mentions using regex
  FOR v_match IN
    SELECT (regexp_matches(p_content, v_mention_pattern, 'g'))[2] AS user_id
  LOOP
    -- Verify mentioned user is in the space
    IF EXISTS (
      SELECT 1 FROM space_members
      WHERE space_id = v_space_id AND user_id = v_match.user_id::UUID
    ) THEN
      -- Create mention record (ON CONFLICT DO NOTHING to avoid duplicates)
      INSERT INTO reminder_mentions (
        reminder_id,
        comment_id,
        mentioned_user_id,
        mentioning_user_id,
        mention_context
      )
      VALUES (
        p_reminder_id,
        p_comment_id,
        v_match.user_id::UUID,
        p_mentioning_user_id,
        p_context
      )
      ON CONFLICT (reminder_id, comment_id, mentioned_user_id) DO NOTHING;

      -- Create notification for mentioned user
      INSERT INTO reminder_notifications (
        reminder_id,
        user_id,
        type,
        channel
      )
      VALUES (
        p_reminder_id,
        v_match.user_id::UUID,
        'mentioned',
        'in_app'
      );

      -- Log activity
      INSERT INTO reminder_activity (
        reminder_id,
        user_id,
        action,
        metadata
      )
      VALUES (
        p_reminder_id,
        p_mentioning_user_id,
        'mentioned',
        jsonb_build_object(
          'mentioned_user_id', v_match.user_id,
          'context', p_context,
          'comment_id', p_comment_id
        )
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread mentions for a user
CREATE OR REPLACE FUNCTION get_unread_mentions(p_user_id UUID)
RETURNS TABLE (
  mention_id UUID,
  reminder_id UUID,
  reminder_title TEXT,
  mentioning_user_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
  SELECT
    rm.id AS mention_id,
    r.id AS reminder_id,
    r.title AS reminder_title,
    u.name AS mentioning_user_name,
    rm.created_at
  FROM reminder_mentions rm
  INNER JOIN reminders r ON r.id = rm.reminder_id
  INNER JOIN users u ON u.id = rm.mentioning_user_id
  WHERE rm.mentioned_user_id = p_user_id
  ORDER BY rm.created_at DESC
  LIMIT 50;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE reminder_mentions IS '@mentions in reminder descriptions and comments';
COMMENT ON FUNCTION process_reminder_mentions IS 'Extracts mentions from text and creates mention records with notifications';
COMMENT ON FUNCTION get_unread_mentions IS 'Returns recent mentions for a user';

-- Grant usage
GRANT SELECT, INSERT, DELETE ON reminder_mentions TO authenticated;
