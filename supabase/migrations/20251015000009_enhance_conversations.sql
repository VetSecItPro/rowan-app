-- =====================================================
-- CONVERSATIONS ENHANCEMENTS FOR PHASE 9
-- Add fields for multiple conversations support
-- =====================================================

-- Add new columns to conversations table
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS conversation_type TEXT DEFAULT 'direct' CHECK (conversation_type IN ('direct', 'group', 'general')),
  ADD COLUMN IF NOT EXISTS last_message_preview TEXT,
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(space_id, conversation_type) WHERE is_archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON conversations(space_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(space_id, last_message_at DESC) WHERE is_archived = FALSE;

-- =====================================================
-- FUNCTION: Update conversation last message metadata
-- =====================================================

CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the conversation's last message preview and timestamp
  UPDATE conversations
  SET
    last_message_preview = LEFT(NEW.content, 100),
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update conversation metadata
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- =====================================================
-- FUNCTION: Get conversations with unread counts
-- =====================================================

CREATE OR REPLACE FUNCTION get_conversations_with_unread(space_id_param UUID, user_id_param UUID)
RETURNS TABLE (
  id UUID,
  space_id UUID,
  title TEXT,
  conversation_type TEXT,
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ,
  is_archived BOOLEAN,
  avatar_url TEXT,
  description TEXT,
  participants JSONB,
  unread_count BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.space_id,
    c.title,
    c.conversation_type,
    c.last_message_preview,
    c.last_message_at,
    c.is_archived,
    c.avatar_url,
    c.description,
    c.participants,
    COUNT(m.id) FILTER (WHERE m.read = FALSE AND m.sender_id != user_id_param) AS unread_count,
    c.created_at,
    c.updated_at
  FROM conversations c
  LEFT JOIN messages m ON m.conversation_id = c.id
  WHERE c.space_id = space_id_param
  GROUP BY c.id
  ORDER BY c.last_message_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_conversations_with_unread(UUID, UUID) TO authenticated;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN conversations.conversation_type IS 'Type of conversation: direct (1-on-1), group (multiple users), or general (space-wide)';
COMMENT ON COLUMN conversations.last_message_preview IS 'Preview text of the last message (first 100 chars)';
COMMENT ON COLUMN conversations.last_message_at IS 'Timestamp of the last message for sorting';
COMMENT ON COLUMN conversations.is_archived IS 'Whether the conversation is archived';
COMMENT ON COLUMN conversations.avatar_url IS 'Optional avatar/icon URL for the conversation';
COMMENT ON COLUMN conversations.description IS 'Optional description for group conversations';
