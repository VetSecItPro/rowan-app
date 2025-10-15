-- Create message_attachments table for rich media file uploads
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'document', 'audio')),
  file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 52428800), -- 50MB max
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  width INTEGER,
  height INTEGER,
  duration INTEGER, -- For videos and audio (seconds)
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_message_attachments_message_id ON message_attachments(message_id);
CREATE INDEX idx_message_attachments_uploaded_by ON message_attachments(uploaded_by);
CREATE INDEX idx_message_attachments_created_at ON message_attachments(created_at DESC);

-- Enable RLS
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view attachments in their space conversations
CREATE POLICY "Users can view attachments in their space conversations"
ON message_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages
    INNER JOIN conversations ON conversations.id = messages.conversation_id
    INNER JOIN space_members ON space_members.space_id = conversations.space_id
    WHERE messages.id = message_attachments.message_id
    AND space_members.user_id = auth.uid()
  )
);

-- Users can upload attachments to messages in their spaces
CREATE POLICY "Users can upload attachments to their messages"
ON message_attachments FOR INSERT
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM messages
    INNER JOIN conversations ON conversations.id = messages.conversation_id
    INNER JOIN space_members ON space_members.space_id = conversations.space_id
    WHERE messages.id = message_attachments.message_id
    AND space_members.user_id = auth.uid()
  )
);

-- Users can delete their own attachments
CREATE POLICY "Users can delete their own attachments"
ON message_attachments FOR DELETE
USING (uploaded_by = auth.uid());

-- Comment on table
COMMENT ON TABLE message_attachments IS 'Stores file attachments for messages (images, videos, documents, audio)';
