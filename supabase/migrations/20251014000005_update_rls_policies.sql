-- Drop and recreate RLS policies with correct table names

-- EVENT_ATTACHMENTS POLICIES
DROP POLICY IF EXISTS "Users can view attachments in their space" ON event_attachments;
DROP POLICY IF EXISTS "Users can upload attachments to events in their space" ON event_attachments;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON event_attachments;

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
