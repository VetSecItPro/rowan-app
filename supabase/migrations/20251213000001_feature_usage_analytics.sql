-- Migration: Feature Usage Analytics System
-- Purpose: Track detailed feature usage for admin analytics dashboard
-- Date: 2025-12-13

-- =============================================
-- FEATURE EVENTS TABLE (Raw Events)
-- =============================================

CREATE TABLE IF NOT EXISTS feature_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
  feature TEXT NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  device_type TEXT,
  browser TEXT,
  os TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_feature_events_user ON feature_events(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_events_feature ON feature_events(feature);
CREATE INDEX IF NOT EXISTS idx_feature_events_action ON feature_events(action);
CREATE INDEX IF NOT EXISTS idx_feature_events_created ON feature_events(created_at);
CREATE INDEX IF NOT EXISTS idx_feature_events_device ON feature_events(device_type);
CREATE INDEX IF NOT EXISTS idx_feature_events_feature_created ON feature_events(feature, created_at);

-- Comments
COMMENT ON TABLE feature_events IS 'Raw feature usage events for analytics';
COMMENT ON COLUMN feature_events.feature IS 'Feature name: tasks, calendar, shopping, meals, etc.';
COMMENT ON COLUMN feature_events.action IS 'Action type: page_view, create, update, delete, complete';
COMMENT ON COLUMN feature_events.device_type IS 'Device type: mobile, desktop, tablet';
COMMENT ON COLUMN feature_events.session_id IS 'Client-generated session identifier';

-- =============================================
-- FEATURE USAGE DAILY TABLE (Aggregated)
-- =============================================

CREATE TABLE IF NOT EXISTS feature_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  feature TEXT NOT NULL,
  page_views INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  actions_create INTEGER DEFAULT 0,
  actions_update INTEGER DEFAULT 0,
  actions_delete INTEGER DEFAULT 0,
  actions_complete INTEGER DEFAULT 0,
  total_actions INTEGER DEFAULT 0,
  avg_session_duration_seconds INTEGER DEFAULT 0,
  device_mobile INTEGER DEFAULT 0,
  device_desktop INTEGER DEFAULT 0,
  device_tablet INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, feature)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_usage_daily_date ON feature_usage_daily(date);
CREATE INDEX IF NOT EXISTS idx_feature_usage_daily_feature ON feature_usage_daily(feature);
CREATE INDEX IF NOT EXISTS idx_feature_usage_daily_date_feature ON feature_usage_daily(date, feature);

-- Comments
COMMENT ON TABLE feature_usage_daily IS 'Daily aggregated feature usage metrics';

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE feature_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own events" ON feature_events
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL
  );

CREATE POLICY "Admin read access" ON feature_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND is_active = TRUE
    )
  );

ALTER TABLE feature_usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only access" ON feature_usage_daily
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND is_active = TRUE
    )
  );

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to aggregate daily feature usage from raw events
CREATE OR REPLACE FUNCTION aggregate_feature_usage_daily(target_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day')
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  feature_record RECORD;
BEGIN
  FOR feature_record IN
    SELECT DISTINCT feature
    FROM feature_events
    WHERE created_at::date = target_date
  LOOP
    INSERT INTO feature_usage_daily (
      date,
      feature,
      page_views,
      unique_users,
      actions_create,
      actions_update,
      actions_delete,
      actions_complete,
      total_actions,
      device_mobile,
      device_desktop,
      device_tablet
    )
    SELECT
      target_date,
      feature_record.feature,
      COUNT(*) FILTER (WHERE action = 'page_view'),
      COUNT(DISTINCT user_id),
      COUNT(*) FILTER (WHERE action = 'create'),
      COUNT(*) FILTER (WHERE action = 'update'),
      COUNT(*) FILTER (WHERE action = 'delete'),
      COUNT(*) FILTER (WHERE action = 'complete'),
      COUNT(*) FILTER (WHERE action != 'page_view'),
      COUNT(*) FILTER (WHERE device_type = 'mobile'),
      COUNT(*) FILTER (WHERE device_type = 'desktop'),
      COUNT(*) FILTER (WHERE device_type = 'tablet')
    FROM feature_events
    WHERE created_at::date = target_date
      AND feature = feature_record.feature
    ON CONFLICT (date, feature) DO UPDATE SET
      page_views = EXCLUDED.page_views,
      unique_users = EXCLUDED.unique_users,
      actions_create = EXCLUDED.actions_create,
      actions_update = EXCLUDED.actions_update,
      actions_delete = EXCLUDED.actions_delete,
      actions_complete = EXCLUDED.actions_complete,
      total_actions = EXCLUDED.total_actions,
      device_mobile = EXCLUDED.device_mobile,
      device_desktop = EXCLUDED.device_desktop,
      device_tablet = EXCLUDED.device_tablet,
      updated_at = NOW();
  END LOOP;
END;
$$;

-- Function to get feature usage summary for admin dashboard
CREATE OR REPLACE FUNCTION get_feature_usage_summary(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
  feature TEXT,
  total_page_views BIGINT,
  total_unique_users BIGINT,
  total_actions BIGINT,
  avg_daily_users NUMERIC,
  trend_percent NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  start_date DATE := CURRENT_DATE - days_back;
  mid_date DATE := CURRENT_DATE - (days_back / 2);
BEGIN
  RETURN QUERY
  WITH period_stats AS (
    SELECT
      fud.feature,
      SUM(fud.page_views) as total_views,
      SUM(fud.unique_users) as total_users,
      SUM(fud.total_actions) as total_acts,
      AVG(fud.unique_users)::NUMERIC as avg_users
    FROM feature_usage_daily fud
    WHERE fud.date >= start_date
    GROUP BY fud.feature
  ),
  first_half AS (
    SELECT
      fud.feature,
      SUM(fud.unique_users) as users
    FROM feature_usage_daily fud
    WHERE fud.date >= start_date AND fud.date < mid_date
    GROUP BY fud.feature
  ),
  second_half AS (
    SELECT
      fud.feature,
      SUM(fud.unique_users) as users
    FROM feature_usage_daily fud
    WHERE fud.date >= mid_date
    GROUP BY fud.feature
  )
  SELECT
    ps.feature,
    ps.total_views,
    ps.total_users,
    ps.total_acts,
    ROUND(ps.avg_users, 1),
    CASE
      WHEN COALESCE(fh.users, 0) = 0 THEN 0
      ELSE ROUND(((COALESCE(sh.users, 0) - COALESCE(fh.users, 0))::NUMERIC / NULLIF(fh.users, 0) * 100), 1)
    END as trend_pct
  FROM period_stats ps
  LEFT JOIN first_half fh ON ps.feature = fh.feature
  LEFT JOIN second_half sh ON ps.feature = sh.feature
  ORDER BY ps.total_users DESC;
END;
$$;

-- Function to clean up old events (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_feature_events(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM feature_events
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Function to record a feature event (callable from API)
CREATE OR REPLACE FUNCTION record_feature_event(
  p_user_id UUID,
  p_space_id UUID,
  p_feature TEXT,
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}',
  p_device_type TEXT DEFAULT NULL,
  p_browser TEXT DEFAULT NULL,
  p_os TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO feature_events (
    user_id,
    space_id,
    feature,
    action,
    metadata,
    device_type,
    browser,
    os,
    session_id
  ) VALUES (
    p_user_id,
    p_space_id,
    p_feature,
    p_action,
    p_metadata,
    p_device_type,
    p_browser,
    p_os,
    p_session_id
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION record_feature_event TO authenticated;
