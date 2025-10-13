-- =============================================
-- FEATURE #11: QUICK ACTIONS MENU
-- =============================================
-- This migration creates a table for tracking quick action usage analytics.

CREATE TABLE IF NOT EXISTS quick_action_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- e.g., 'mark_complete', 'assign_to_me', 'snooze_1_day', 'delete'
  context TEXT, -- Additional context about the action

  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quick_action_usage_space ON quick_action_usage(space_id, used_at DESC);
CREATE INDEX IF NOT EXISTS idx_quick_action_usage_user ON quick_action_usage(user_id, used_at DESC);
CREATE INDEX IF NOT EXISTS idx_quick_action_usage_type ON quick_action_usage(action_type, used_at DESC);

-- Materialized view for most-used actions (refreshed every 30 days)
CREATE MATERIALIZED VIEW IF NOT EXISTS quick_action_stats AS
SELECT
  space_id,
  user_id,
  action_type,
  COUNT(*) as usage_count,
  MAX(used_at) as last_used_at
FROM quick_action_usage
WHERE used_at >= NOW() - INTERVAL '30 days'
GROUP BY space_id, user_id, action_type
ORDER BY usage_count DESC;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_quick_action_stats_space_user ON quick_action_stats(space_id, user_id, usage_count DESC);

-- Function to refresh materialized view (called by cron job every 24 hours)
CREATE OR REPLACE FUNCTION refresh_quick_action_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW quick_action_stats;
END;
$$ LANGUAGE plpgsql;

-- Add retention policy: Delete records older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_quick_action_usage()
RETURNS void AS $$
BEGIN
  DELETE FROM quick_action_usage
  WHERE used_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE quick_action_usage IS 'Tracks usage of quick actions for analytics';
COMMENT ON MATERIALIZED VIEW quick_action_stats IS 'Aggregated quick action usage stats (last 30 days)';
COMMENT ON COLUMN quick_action_usage.action_type IS 'Type of quick action (mark_complete, assign_to_me, snooze_1_day, etc.)';
