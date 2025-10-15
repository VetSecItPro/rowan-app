-- =====================================================
-- MESSAGE PINNING
-- Allows users to pin important messages to the top
-- =====================================================

-- Add pinning columns to messages table
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES auth.users(id);

-- Index for querying pinned messages
CREATE INDEX IF NOT EXISTS idx_messages_pinned ON messages(conversation_id, is_pinned, pinned_at DESC) WHERE is_pinned = TRUE;

-- Update function to set pinned_at timestamp
CREATE OR REPLACE FUNCTION set_pinned_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_pinned = TRUE AND OLD.is_pinned = FALSE THEN
    NEW.pinned_at = NOW();
  ELSIF NEW.is_pinned = FALSE THEN
    NEW.pinned_at = NULL;
    NEW.pinned_by = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically set pinned_at
CREATE TRIGGER trigger_set_pinned_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  WHEN (OLD.is_pinned IS DISTINCT FROM NEW.is_pinned)
  EXECUTE FUNCTION set_pinned_at();

-- Grant permissions (already covered by existing RLS policies)
COMMENT ON COLUMN messages.is_pinned IS 'Whether this message is pinned to the top of the conversation';
COMMENT ON COLUMN messages.pinned_at IS 'Timestamp when the message was pinned';
COMMENT ON COLUMN messages.pinned_by IS 'User who pinned the message';
