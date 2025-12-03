-- Performance indexes for calendar integration tables
-- Optimizes common queries and ensures fast lookups

-- ============================================================================
-- CALENDAR_CONNECTIONS - Additional Performance Indexes
-- ============================================================================

-- Index for finding connections needing sync
CREATE INDEX IF NOT EXISTS idx_calendar_connections_needs_sync
  ON calendar_connections(provider, next_sync_at)
  WHERE sync_status = 'active' AND next_sync_at <= NOW();

-- Index for token expiry checks
CREATE INDEX IF NOT EXISTS idx_calendar_connections_token_expiry
  ON calendar_connections(token_expires_at)
  WHERE token_expires_at IS NOT NULL AND sync_status != 'disconnected';

-- Composite index for user's active connections by provider
CREATE INDEX IF NOT EXISTS idx_calendar_connections_user_provider_active
  ON calendar_connections(user_id, provider, sync_status)
  WHERE sync_status IN ('active', 'syncing');

-- ============================================================================
-- CALENDAR_EVENT_MAPPINGS - Additional Performance Indexes
-- ============================================================================

-- Index for finding unmapped Rowan events (for initial sync)
CREATE INDEX IF NOT EXISTS idx_events_unmapped
  ON events(space_id, created_at)
  WHERE deleted_at IS NULL
    AND id NOT IN (SELECT rowan_event_id FROM calendar_event_mappings);

-- Partial index for conflicted mappings
CREATE INDEX IF NOT EXISTS idx_event_mappings_has_conflict
  ON calendar_event_mappings(connection_id, has_conflict, conflict_detected_at)
  WHERE has_conflict = TRUE;

-- Index for finding stale mappings (not synced recently)
CREATE INDEX IF NOT EXISTS idx_event_mappings_stale
  ON calendar_event_mappings(connection_id, last_synced_at)
  WHERE last_synced_at < NOW() - INTERVAL '1 day';

-- ============================================================================
-- CALENDAR_SYNC_LOGS - Query Optimization Indexes
-- ============================================================================

-- Composite index for recent sync history per connection
CREATE INDEX IF NOT EXISTS idx_sync_logs_recent_by_connection
  ON calendar_sync_logs(connection_id, started_at DESC, status)
  WHERE started_at > NOW() - INTERVAL '30 days';

-- Index for finding failed syncs needing retry
CREATE INDEX IF NOT EXISTS idx_sync_logs_failed
  ON calendar_sync_logs(connection_id, started_at DESC)
  WHERE status = 'failed';

-- Index for sync performance monitoring
CREATE INDEX IF NOT EXISTS idx_sync_logs_performance
  ON calendar_sync_logs(sync_type, completed_at, duration_ms)
  WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '7 days';

-- ============================================================================
-- CALENDAR_SYNC_CONFLICTS - Resolution Tracking Indexes
-- ============================================================================

-- Index for finding recent unresolved conflicts
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_recent_unresolved
  ON calendar_sync_conflicts(connection_id, detected_at DESC)
  WHERE resolution_status = 'detected' AND detected_at > NOW() - INTERVAL '7 days';

-- Index for conflict resolution analytics
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_analytics
  ON calendar_sync_conflicts(winning_source, resolution_strategy, resolved_at)
  WHERE resolution_status = 'resolved';

-- ============================================================================
-- CALENDAR_WEBHOOK_SUBSCRIPTIONS - Webhook Management Indexes
-- ============================================================================

-- Index for webhook event tracking
CREATE INDEX IF NOT EXISTS idx_webhook_subs_activity
  ON calendar_webhook_subscriptions(connection_id, last_event_at DESC)
  WHERE is_active = TRUE;

-- ============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- Index for finding user's connections with sync stats
CREATE INDEX IF NOT EXISTS idx_user_connection_stats
  ON calendar_connections(user_id, space_id, provider, sync_status, last_sync_at);

-- Index for connection + mapping lookup
CREATE INDEX IF NOT EXISTS idx_connection_mapping_lookup
  ON calendar_event_mappings(connection_id, external_event_id, rowan_event_id);

-- ============================================================================
-- STATISTICS UPDATE FUNCTION
-- ============================================================================

-- Function to update table statistics for better query planning
CREATE OR REPLACE FUNCTION update_calendar_table_statistics()
RETURNS void AS $$
BEGIN
  ANALYZE calendar_connections;
  ANALYZE calendar_event_mappings;
  ANALYZE calendar_sync_logs;
  ANALYZE calendar_sync_conflicts;
  ANALYZE calendar_webhook_subscriptions;

  RAISE NOTICE 'Calendar table statistics updated successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_calendar_table_statistics TO service_role;

COMMENT ON FUNCTION update_calendar_table_statistics IS 'Updates statistics for calendar tables to optimize query planning';

-- ============================================================================
-- INDEX HEALTH CHECK FUNCTION
-- ============================================================================

-- Function to check index usage and health
CREATE OR REPLACE FUNCTION check_calendar_index_health()
RETURNS TABLE (
  table_name TEXT,
  index_name TEXT,
  index_size TEXT,
  index_scans BIGINT,
  last_used TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname || '.' || tablename AS table_name,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan AS index_scans,
    stats_reset AS last_used
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
    AND tablename IN (
      'calendar_connections',
      'calendar_event_mappings',
      'calendar_sync_logs',
      'calendar_sync_conflicts',
      'calendar_webhook_subscriptions'
    )
  ORDER BY tablename, indexname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_calendar_index_health TO service_role;

COMMENT ON FUNCTION check_calendar_index_health IS 'Checks index usage statistics for calendar tables';

-- Run initial statistics update
SELECT update_calendar_table_statistics();
