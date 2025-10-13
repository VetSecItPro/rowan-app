-- =============================================
-- FEATURE #4: TASK ATTACHMENTS
-- =============================================
-- This migration creates a task_attachments table for file uploads.

CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL, -- in bytes
  file_type TEXT NOT NULL, -- MIME type
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  storage_bucket TEXT DEFAULT 'task-attachments',

  -- File metadata
  thumbnail_path TEXT, -- For image/video thumbnails
  is_image BOOLEAN DEFAULT FALSE,
  is_document BOOLEAN DEFAULT FALSE,
  is_video BOOLEAN DEFAULT FALSE,

  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_uploaded_by ON task_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_task_attachments_type ON task_attachments(file_type);
CREATE INDEX IF NOT EXISTS idx_task_attachments_uploaded_at ON task_attachments(uploaded_at DESC);

-- Add constraint for file size (max 50MB)
ALTER TABLE task_attachments
  ADD CONSTRAINT check_file_size CHECK (file_size <= 52428800);

-- Function to automatically set file type flags
CREATE OR REPLACE FUNCTION set_attachment_type_flags()
RETURNS TRIGGER AS $$
BEGIN
  -- Set flags based on MIME type
  NEW.is_image = NEW.file_type LIKE 'image/%';
  NEW.is_document = NEW.file_type IN ('application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain');
  NEW.is_video = NEW.file_type LIKE 'video/%';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_attachments_type_flags_trigger
  BEFORE INSERT OR UPDATE ON task_attachments
  FOR EACH ROW
  EXECUTE FUNCTION set_attachment_type_flags();

-- Add comments
COMMENT ON TABLE task_attachments IS 'File attachments for tasks (images, documents, etc.)';
COMMENT ON COLUMN task_attachments.storage_path IS 'Full path in Supabase Storage bucket';
COMMENT ON COLUMN task_attachments.thumbnail_path IS 'Path to generated thumbnail for preview';
COMMENT ON COLUMN task_attachments.file_size IS 'File size in bytes (max 50MB)';
