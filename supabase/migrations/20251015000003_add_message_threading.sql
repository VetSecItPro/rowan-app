-- Migration: Add Message Threading
-- Purpose: Enable threaded conversations (replies to specific messages)
-- Feature: Phase 3 - Message Threading & Replies
-- Date: 2025-10-15

-- Add threading columns to messages table
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS thread_reply_count INTEGER DEFAULT 0;

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON messages(parent_message_id);

-- Update thread_reply_count when replies are added/removed
CREATE OR REPLACE FUNCTION update_thread_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.parent_message_id IS NOT NULL THEN
      UPDATE messages
      SET thread_reply_count = thread_reply_count + 1
      WHERE id = NEW.parent_message_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.parent_message_id IS NOT NULL THEN
      UPDATE messages
      SET thread_reply_count = GREATEST(thread_reply_count - 1, 0)
      WHERE id = OLD.parent_message_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_thread_reply_count ON messages;
CREATE TRIGGER trigger_update_thread_reply_count
  AFTER INSERT OR DELETE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_reply_count();

-- Comment
COMMENT ON COLUMN messages.parent_message_id IS 'Reference to parent message for threaded replies';
COMMENT ON COLUMN messages.thread_reply_count IS 'Number of direct replies to this message';
