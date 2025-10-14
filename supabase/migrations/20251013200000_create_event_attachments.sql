-- Create event_attachments table for file storage
CREATE TABLE IF NOT EXISTS event_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_attachments_event_id ON event_attachments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attachments_uploaded_by ON event_attachments(uploaded_by);

-- Enable RLS
ALTER TABLE event_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view attachments for events in their space
CREATE POLICY "Users can view attachments for events in their space"
  ON event_attachments FOR SELECT
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can upload attachments to events in their space
CREATE POLICY "Users can upload attachments to events in their space"
  ON event_attachments FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid() AND
    event_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete their own attachments
CREATE POLICY "Users can delete their own attachments"
  ON event_attachments FOR DELETE
  USING (
    uploaded_by = auth.uid() AND
    event_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- Comment
COMMENT ON TABLE event_attachments IS 'Stores file attachments for calendar events';
