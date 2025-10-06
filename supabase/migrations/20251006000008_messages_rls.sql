-- Enable RLS on messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages table
-- Users can only access messages in conversations that belong to their spaces

-- SELECT Policy
CREATE POLICY "Users can view messages in their space conversations"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations
    INNER JOIN space_members ON space_members.space_id = conversations.space_id
    WHERE conversations.id = messages.conversation_id
    AND space_members.user_id = auth.uid()
  )
);

-- INSERT Policy
CREATE POLICY "Users can create messages in their space conversations"
ON messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations
    INNER JOIN space_members ON space_members.space_id = conversations.space_id
    WHERE conversations.id = messages.conversation_id
    AND space_members.user_id = auth.uid()
  )
);

-- UPDATE Policy
CREATE POLICY "Users can update their own messages"
ON messages FOR UPDATE
USING (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversations
    INNER JOIN space_members ON space_members.space_id = conversations.space_id
    WHERE conversations.id = messages.conversation_id
    AND space_members.user_id = auth.uid()
  )
);

-- DELETE Policy
CREATE POLICY "Users can delete their own messages"
ON messages FOR DELETE
USING (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversations
    INNER JOIN space_members ON space_members.space_id = conversations.space_id
    WHERE conversations.id = messages.conversation_id
    AND space_members.user_id = auth.uid()
  )
);
