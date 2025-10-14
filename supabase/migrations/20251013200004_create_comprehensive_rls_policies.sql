-- Comprehensive RLS Policies for all new calendar tables

-- =============================================
-- EVENT_NOTES POLICIES
-- =============================================

CREATE POLICY "Users can view notes for events in their space"
  ON event_notes FOR SELECT
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create notes for events in their space"
  ON event_notes FOR INSERT
  WITH CHECK (
    event_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update notes for events in their space"
  ON event_notes FOR UPDATE
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- =============================================
-- EVENT_NOTE_VERSIONS POLICIES
-- =============================================

CREATE POLICY "Users can view note versions for events in their space"
  ON event_note_versions FOR SELECT
  USING (
    note_id IN (
      SELECT en.id FROM event_notes en
      JOIN events e ON e.id = en.event_id
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create note versions for events in their space"
  ON event_note_versions FOR INSERT
  WITH CHECK (
    note_id IN (
      SELECT en.id FROM event_notes en
      JOIN events e ON e.id = en.event_id
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- =============================================
-- EVENT_TEMPLATES POLICIES
-- =============================================

CREATE POLICY "Users can view public templates or templates in their space"
  ON event_templates FOR SELECT
  USING (
    is_public = true OR
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create templates in their space"
  ON event_templates FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own templates"
  ON event_templates FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own templates"
  ON event_templates FOR DELETE
  USING (created_by = auth.uid());

-- =============================================
-- AVAILABILITY_BLOCKS POLICIES
-- =============================================

CREATE POLICY "Users can view their own availability blocks"
  ON availability_blocks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own availability blocks"
  ON availability_blocks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own availability blocks"
  ON availability_blocks FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own availability blocks"
  ON availability_blocks FOR DELETE
  USING (user_id = auth.uid());

-- =============================================
-- EVENT_REMINDERS POLICIES
-- =============================================

CREATE POLICY "Users can view reminders for events in their space"
  ON event_reminders FOR SELECT
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create reminders for events in their space"
  ON event_reminders FOR INSERT
  WITH CHECK (
    event_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update reminders for events in their space"
  ON event_reminders FOR UPDATE
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete reminders for events in their space"
  ON event_reminders FOR DELETE
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- =============================================
-- RECURRING_EVENT_EXCEPTIONS POLICIES
-- =============================================

CREATE POLICY "Users can view exceptions for events in their space"
  ON recurring_event_exceptions FOR SELECT
  USING (
    series_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create exceptions for events in their space"
  ON recurring_event_exceptions FOR INSERT
  WITH CHECK (
    series_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete exceptions for events in their space"
  ON recurring_event_exceptions FOR DELETE
  USING (
    series_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- =============================================
-- EXTERNAL_CALENDAR_CONNECTIONS POLICIES
-- =============================================

CREATE POLICY "Users can view their own calendar connections"
  ON external_calendar_connections FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own calendar connections"
  ON external_calendar_connections FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own calendar connections"
  ON external_calendar_connections FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own calendar connections"
  ON external_calendar_connections FOR DELETE
  USING (user_id = auth.uid());

-- =============================================
-- CALENDAR_SYNC_MAP POLICIES
-- =============================================

CREATE POLICY "Users can view sync mappings for events in their space"
  ON calendar_sync_map FOR SELECT
  USING (
    rowan_event_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sync mappings for events in their space"
  ON calendar_sync_map FOR INSERT
  WITH CHECK (
    rowan_event_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sync mappings for events in their space"
  ON calendar_sync_map FOR DELETE
  USING (
    rowan_event_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- =============================================
-- EVENT_SHARE_LINKS POLICIES
-- =============================================

CREATE POLICY "Users can view share links for events in their space"
  ON event_share_links FOR SELECT
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create share links for events in their space"
  ON event_share_links FOR INSERT
  WITH CHECK (
    event_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete share links for events in their space"
  ON event_share_links FOR DELETE
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- =============================================
-- EVENT_AUDIT_LOG POLICIES (Read-only for users)
-- =============================================

CREATE POLICY "Users can view audit logs for events in their space"
  ON event_audit_log FOR SELECT
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- =============================================
-- USER_CALENDAR_PREFERENCES POLICIES
-- =============================================

CREATE POLICY "Users can view their own calendar preferences"
  ON user_calendar_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own calendar preferences"
  ON user_calendar_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own calendar preferences"
  ON user_calendar_preferences FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Comment
COMMENT ON POLICY "Users can view notes for events in their space" ON event_notes IS 'Space-based access control for event notes';
COMMENT ON POLICY "Users can view their own availability blocks" ON availability_blocks IS 'Users manage their own availability';
COMMENT ON POLICY "Users can view audit logs for events in their space" ON event_audit_log IS 'Audit logs are read-only for transparency';
