-- =====================================================
-- MESSAGE MENTIONS TABLE
-- Stores @mentions in messages for notifications
-- =====================================================

CREATE TABLE IF NOT EXISTS message_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  mentioned_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mentioned_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  UNIQUE(message_id, mentioned_user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_mentions_message_id ON message_mentions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_mentions_mentioned_user ON message_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_message_mentions_space_id ON message_mentions(space_id);
CREATE INDEX IF NOT EXISTS idx_message_mentions_unread ON message_mentions(mentioned_user_id, read) WHERE read = FALSE;

-- Row Level Security
ALTER TABLE message_mentions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view mentions where they are a member of the space
CREATE POLICY "Users can view mentions in their spaces"
  ON message_mentions
  FOR SELECT
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert mentions in their spaces
CREATE POLICY "Users can create mentions in their spaces"
  ON message_mentions
  FOR INSERT
  WITH CHECK (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update their own mentions (mark as read)
CREATE POLICY "Users can update their own mentions"
  ON message_mentions
  FOR UPDATE
  USING (mentioned_user_id = auth.uid());

-- Policy: Users can delete mentions they created
CREATE POLICY "Users can delete mentions they created"
  ON message_mentions
  FOR DELETE
  USING (mentioned_by_user_id = auth.uid());

-- =====================================================
-- TRIGGER: Create notification when user is mentioned
-- =====================================================

CREATE OR REPLACE FUNCTION create_mention_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for the mentioned user
  INSERT INTO notifications (
    user_id,
    space_id,
    type,
    title,
    message,
    link,
    created_at
  )
  VALUES (
    NEW.mentioned_user_id,
    NEW.space_id,
    'mention',
    'You were mentioned',
    'You were mentioned in a message',
    '/messages?mention=' || NEW.message_id,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_mention_notification
  AFTER INSERT ON message_mentions
  FOR EACH ROW
  EXECUTE FUNCTION create_mention_notification();

-- =====================================================
-- FUNCTION: Extract mentions from message content
-- This is a helper function for the application layer
-- =====================================================

CREATE OR REPLACE FUNCTION get_space_members_for_mentions(space_id_param UUID)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sm.user_id,
    COALESCE(p.name, u.email) as display_name,
    u.email
  FROM space_members sm
  JOIN auth.users u ON u.id = sm.user_id
  LEFT JOIN partnerships p ON p.id = (
    SELECT partnership_id FROM spaces WHERE id = space_id_param
  )
  WHERE sm.space_id = space_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
