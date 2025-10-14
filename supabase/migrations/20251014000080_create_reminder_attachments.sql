-- Migration: Create Reminder Attachments
-- Purpose: Enable file uploads, URLs, and cross-feature links on reminders
-- Feature: Phase 3 - Attachments & Context (#7)
-- Date: 2025-10-14

-- =============================================
-- CREATE REMINDER_ATTACHMENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS reminder_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('file', 'url', 'link_task', 'link_shopping', 'link_event')),

  -- For file uploads (Supabase Storage)
  file_path TEXT,
  file_size INTEGER,
  mime_type TEXT,

  -- For URL attachments
  url TEXT,

  -- For linking to other features
  linked_id UUID,

  -- Display info
  display_name TEXT NOT NULL,

  -- Metadata
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

-- Query attachments by reminder
CREATE INDEX idx_reminder_attachments_reminder_id ON reminder_attachments(reminder_id);

-- Query attachments by type
CREATE INDEX idx_reminder_attachments_type ON reminder_attachments(type);

-- Query attachments by uploader
CREATE INDEX idx_reminder_attachments_uploaded_by ON reminder_attachments(uploaded_by);

-- Query attachments by created date
CREATE INDEX idx_reminder_attachments_created_at ON reminder_attachments(created_at DESC);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE reminder_attachments ENABLE ROW LEVEL SECURITY;

-- Space members can view attachments for reminders in their space
CREATE POLICY "Space members can view attachments"
  ON reminder_attachments
  FOR SELECT
  USING (
    reminder_id IN (
      SELECT id FROM reminders
      WHERE space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      )
    )
  );

-- Space members can upload attachments to reminders in their space
CREATE POLICY "Space members can create attachments"
  ON reminder_attachments
  FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND reminder_id IN (
      SELECT id FROM reminders
      WHERE space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      )
    )
  );

-- Only the uploader can delete their attachments
CREATE POLICY "Users can delete own attachments"
  ON reminder_attachments
  FOR DELETE
  USING (uploaded_by = auth.uid());

-- =============================================
-- TRIGGER: UPDATE TIMESTAMP
-- =============================================

CREATE OR REPLACE FUNCTION update_reminder_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reminder_attachments_timestamp
  BEFORE UPDATE ON reminder_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_reminder_attachments_updated_at();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE reminder_attachments IS 'Stores file uploads, URLs, and cross-feature links for reminders';
COMMENT ON COLUMN reminder_attachments.type IS 'Attachment type: file, url, link_task, link_shopping, link_event';
COMMENT ON COLUMN reminder_attachments.file_path IS 'Path to file in Supabase Storage (for type=file)';
COMMENT ON COLUMN reminder_attachments.url IS 'External URL (for type=url)';
COMMENT ON COLUMN reminder_attachments.linked_id IS 'ID of linked resource (for type=link_*)';
