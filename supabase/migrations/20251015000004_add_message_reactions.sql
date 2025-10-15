-- Migration: Add Message Reactions
-- Purpose: Enable emoji reactions to messages
-- Feature: Phase 4 - Message Reactions
-- Date: 2025-10-15

-- Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL CHECK (length(emoji) <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Unique constraint: one reaction per user per message per emoji
  UNIQUE(message_id, user_id, emoji)
);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);

-- Enable RLS
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view reactions in their space conversations"
ON message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages
    INNER JOIN conversations ON conversations.id = messages.conversation_id
    INNER JOIN space_members ON space_members.space_id = conversations.space_id
    WHERE messages.id = message_reactions.message_id
    AND space_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add reactions to messages in their space"
ON message_reactions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM messages
    INNER JOIN conversations ON conversations.id = messages.conversation_id
    INNER JOIN space_members ON space_members.space_id = conversations.space_id
    WHERE messages.id = message_reactions.message_id
    AND space_members.user_id = auth.uid()
  )
  AND user_id = auth.uid()
);

CREATE POLICY "Users can delete their own reactions"
ON message_reactions FOR DELETE
USING (user_id = auth.uid());

-- Comments
COMMENT ON TABLE message_reactions IS 'Emoji reactions to messages';
COMMENT ON COLUMN message_reactions.emoji IS 'Emoji character (1-10 chars, typically 1-2 for standard emoji)';
