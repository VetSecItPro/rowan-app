-- Row Level Security (RLS) policies for all calendar integration tables
-- CRITICAL: Users can only access calendar data for spaces they're members of

-- ============================================================================
-- CALENDAR_CONNECTIONS
-- ============================================================================

ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own connections
CREATE POLICY "Users can view own calendar connections"
  ON calendar_connections FOR SELECT
  TO authenticated
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can create connections for their spaces
CREATE POLICY "Users can create calendar connections"
  ON calendar_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Policy: Users can update their own connections
CREATE POLICY "Users can update own calendar connections"
  ON calendar_connections FOR UPDATE
  TO authenticated
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Policy: Users can delete their own connections
CREATE POLICY "Users can delete own calendar connections"
  ON calendar_connections FOR DELETE
  TO authenticated
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Policy: Service role bypass (for cron jobs)
CREATE POLICY "Service role has full access to calendar_connections"
  ON calendar_connections FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- CALENDAR_EVENT_MAPPINGS
-- ============================================================================

ALTER TABLE calendar_event_mappings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view mappings for their events
CREATE POLICY "Users can view event mappings"
  ON calendar_event_mappings FOR SELECT
  TO authenticated
  USING (
    connection_id IN (
      SELECT id FROM calendar_connections
      WHERE space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Service role has full access (for sync operations)
CREATE POLICY "Service role has full access to event_mappings"
  ON calendar_event_mappings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- CALENDAR_SYNC_LOGS
-- ============================================================================

ALTER TABLE calendar_sync_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view sync logs for their connections
CREATE POLICY "Users can view sync logs"
  ON calendar_sync_logs FOR SELECT
  TO authenticated
  USING (
    connection_id IN (
      SELECT id FROM calendar_connections
      WHERE space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Service role has full access (for cron jobs)
CREATE POLICY "Service role has full access to sync_logs"
  ON calendar_sync_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- CALENDAR_SYNC_CONFLICTS
-- ============================================================================

ALTER TABLE calendar_sync_conflicts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view conflicts for their connections
CREATE POLICY "Users can view sync conflicts"
  ON calendar_sync_conflicts FOR SELECT
  TO authenticated
  USING (
    connection_id IN (
      SELECT id FROM calendar_connections
      WHERE space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Users can update conflicts (for manual resolution)
CREATE POLICY "Users can update sync conflicts"
  ON calendar_sync_conflicts FOR UPDATE
  TO authenticated
  USING (
    connection_id IN (
      SELECT id FROM calendar_connections
      WHERE space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Service role has full access (for automatic resolution)
CREATE POLICY "Service role has full access to sync_conflicts"
  ON calendar_sync_conflicts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- CALENDAR_WEBHOOK_SUBSCRIPTIONS
-- ============================================================================

ALTER TABLE calendar_webhook_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view webhooks for their connections
CREATE POLICY "Users can view webhook subscriptions"
  ON calendar_webhook_subscriptions FOR SELECT
  TO authenticated
  USING (
    connection_id IN (
      SELECT id FROM calendar_connections
      WHERE space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Service role has full access (for webhook management)
CREATE POLICY "Service role has full access to webhook_subscriptions"
  ON calendar_webhook_subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- SECURITY VERIFICATION FUNCTION
-- ============================================================================

-- Function to verify RLS is enabled on all calendar tables
CREATE OR REPLACE FUNCTION verify_calendar_rls_enabled()
RETURNS TABLE (
  table_name TEXT,
  rls_enabled BOOLEAN,
  policy_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.tablename::TEXT,
    t.rowsecurity,
    COUNT(p.policyname)
  FROM pg_tables t
  LEFT JOIN pg_policies p ON p.tablename = t.tablename
  WHERE t.schemaname = 'public'
    AND t.tablename IN (
      'calendar_connections',
      'calendar_event_mappings',
      'calendar_sync_logs',
      'calendar_sync_conflicts',
      'calendar_webhook_subscriptions'
    )
  GROUP BY t.tablename, t.rowsecurity
  ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION verify_calendar_rls_enabled TO authenticated, service_role;

COMMENT ON FUNCTION verify_calendar_rls_enabled IS 'Verifies RLS is enabled on all calendar tables and counts policies';

-- Run verification (results will show in migration logs)
SELECT * FROM verify_calendar_rls_enabled();
