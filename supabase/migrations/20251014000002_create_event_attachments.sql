-- Create event_attachments table
CREATE TABLE IF NOT EXISTS event_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add space_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'event_attachments' AND column_name = 'space_id'
  ) THEN
    ALTER TABLE event_attachments
    ADD COLUMN space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_event_attachments_event_id ON event_attachments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attachments_uploaded_by ON event_attachments(uploaded_by);

-- Add space_id index if not exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'event_attachments' AND column_name = 'space_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_event_attachments_space_id ON event_attachments(space_id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE event_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view attachments in their space"
  ON event_attachments FOR SELECT
  USING (
    space_id IN (
      SELECT space_id
      FROM space_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload attachments to events in their space"
  ON event_attachments FOR INSERT
  WITH CHECK (
    space_id IN (
      SELECT space_id
      FROM space_members
      WHERE user_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "Users can delete their own attachments"
  ON event_attachments FOR DELETE
  USING (uploaded_by = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER set_event_attachments_updated_at
  BEFORE UPDATE ON event_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
