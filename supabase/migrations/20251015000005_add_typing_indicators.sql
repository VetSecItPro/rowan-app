-- Migration: Add Typing Indicators
-- Purpose: Enable real-time typing indicators in conversations
-- Feature: Phase 5 - Typing Indicators
-- Date: 2025-10-15

-- Create typing_indicators table
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  last_typed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Unique constraint: one typing indicator per user per conversation
  UNIQUE(conversation_id, user_id)
);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation_id ON typing_indicators(conversation_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_user_id ON typing_indicators(user_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_last_typed_at ON typing_indicators(last_typed_at);

-- Enable RLS
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view typing indicators in their space conversations"
ON typing_indicators FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations
    INNER JOIN space_members ON space_members.space_id = conversations.space_id
    WHERE conversations.id = typing_indicators.conversation_id
    AND space_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert typing indicators in their conversations"
ON typing_indicators FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations
    INNER JOIN space_members ON space_members.space_id = conversations.space_id
    WHERE conversations.id = typing_indicators.conversation_id
    AND space_members.user_id = auth.uid()
  )
  AND user_id = auth.uid()
);

CREATE POLICY "Users can update their own typing indicators"
ON typing_indicators FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own typing indicators"
ON typing_indicators FOR DELETE
USING (user_id = auth.uid());

-- Function to clean up old typing indicators (older than 10 seconds)
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM typing_indicators
  WHERE last_typed_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE typing_indicators IS 'Real-time typing indicators for conversations';
COMMENT ON COLUMN typing_indicators.last_typed_at IS 'Timestamp of last typing activity (auto-expires after 10 seconds)';
