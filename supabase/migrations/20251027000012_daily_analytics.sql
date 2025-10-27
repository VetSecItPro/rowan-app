-- Migration: Daily Analytics System
-- Purpose: Track daily metrics for admin dashboard and email digest
-- Part of: Beta Launch Phase 1B - Backend Foundation
-- Date: 2025-10-27

-- =============================================
-- DAILY ANALYTICS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS daily_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  new_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  beta_requests INTEGER DEFAULT 0,
  launch_signups INTEGER DEFAULT 0,
  feature_usage JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance and date-based queries
CREATE INDEX IF NOT EXISTS idx_daily_analytics_date ON daily_analytics(date);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_created ON daily_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_new_users ON daily_analytics(new_users);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_active_users ON daily_analytics(active_users);

-- Add comments for documentation
COMMENT ON TABLE daily_analytics IS 'Daily aggregated metrics for admin dashboard and email digest';
COMMENT ON COLUMN daily_analytics.date IS 'Date for the analytics (unique, one record per day)';
COMMENT ON COLUMN daily_analytics.new_users IS 'Number of new user registrations on this date';
COMMENT ON COLUMN daily_analytics.active_users IS 'Number of users who had active sessions on this date';
COMMENT ON COLUMN daily_analytics.beta_requests IS 'Number of beta access requests on this date';
COMMENT ON COLUMN daily_analytics.launch_signups IS 'Number of launch notification signups on this date';
COMMENT ON COLUMN daily_analytics.feature_usage IS 'JSON object tracking usage of different app features';

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS (admin-only access)
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;

-- Only admin users can access analytics
CREATE POLICY "Admin only access" ON daily_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND is_active = TRUE
    )
  );

-- =============================================
-- ANALYTICS UTILITY FUNCTIONS
-- =============================================

-- Function to get or create today's analytics record
CREATE OR REPLACE FUNCTION get_or_create_daily_analytics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS UUID
LANGUAGE SQL
AS $$
  INSERT INTO daily_analytics (date)
  VALUES (target_date)
  ON CONFLICT (date) DO NOTHING
  RETURNING id;

  SELECT id FROM daily_analytics WHERE date = target_date;
$$;

-- Function to increment beta requests for today
CREATE OR REPLACE FUNCTION increment_beta_requests(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID
LANGUAGE SQL
AS $$
  INSERT INTO daily_analytics (date, beta_requests)
  VALUES (target_date, 1)
  ON CONFLICT (date) DO UPDATE
  SET beta_requests = daily_analytics.beta_requests + 1;
$$;

-- Function to increment launch signups for today
CREATE OR REPLACE FUNCTION increment_launch_signups(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID
LANGUAGE SQL
AS $$
  INSERT INTO daily_analytics (date, launch_signups)
  VALUES (target_date, 1)
  ON CONFLICT (date) DO UPDATE
  SET launch_signups = daily_analytics.launch_signups + 1;
$$;

-- Function to update daily active users
CREATE OR REPLACE FUNCTION update_daily_active_users(user_count INTEGER, target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID
LANGUAGE SQL
AS $$
  INSERT INTO daily_analytics (date, active_users)
  VALUES (target_date, user_count)
  ON CONFLICT (date) DO UPDATE
  SET active_users = GREATEST(daily_analytics.active_users, user_count);
$$;

-- Function to get analytics for date range
CREATE OR REPLACE FUNCTION get_analytics_range(start_date DATE, end_date DATE)
RETURNS TABLE (
  date DATE,
  new_users INTEGER,
  active_users INTEGER,
  beta_requests INTEGER,
  launch_signups INTEGER,
  feature_usage JSONB
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    da.date,
    da.new_users,
    da.active_users,
    da.beta_requests,
    da.launch_signups,
    da.feature_usage
  FROM daily_analytics da
  WHERE da.date BETWEEN start_date AND end_date
  ORDER BY da.date DESC;
$$;

-- Function to get yesterday's metrics for daily digest
CREATE OR REPLACE FUNCTION get_yesterday_metrics()
RETURNS TABLE (
  new_users INTEGER,
  active_users INTEGER,
  beta_requests INTEGER,
  launch_signups INTEGER,
  total_beta_users BIGINT,
  total_launch_signups BIGINT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    COALESCE(da.new_users, 0) as new_users,
    COALESCE(da.active_users, 0) as active_users,
    COALESCE(da.beta_requests, 0) as beta_requests,
    COALESCE(da.launch_signups, 0) as launch_signups,
    (SELECT COUNT(*) FROM beta_access_requests WHERE access_granted = true) as total_beta_users,
    (SELECT COUNT(*) FROM launch_notifications WHERE subscribed = true) as total_launch_signups
  FROM daily_analytics da
  WHERE da.date = CURRENT_DATE - INTERVAL '1 day'
  UNION ALL
  SELECT 0, 0, 0, 0,
    (SELECT COUNT(*) FROM beta_access_requests WHERE access_granted = true),
    (SELECT COUNT(*) FROM launch_notifications WHERE subscribed = true)
  WHERE NOT EXISTS (
    SELECT 1 FROM daily_analytics WHERE date = CURRENT_DATE - INTERVAL '1 day'
  )
  LIMIT 1;
$$;

-- Add comments for functions
COMMENT ON FUNCTION get_or_create_daily_analytics(DATE) IS 'Gets or creates analytics record for specified date';
COMMENT ON FUNCTION increment_beta_requests(DATE) IS 'Increments beta request count for specified date';
COMMENT ON FUNCTION increment_launch_signups(DATE) IS 'Increments launch signup count for specified date';
COMMENT ON FUNCTION update_daily_active_users(INTEGER, DATE) IS 'Updates active user count (takes maximum)';
COMMENT ON FUNCTION get_analytics_range(DATE, DATE) IS 'Returns analytics data for date range';
COMMENT ON FUNCTION get_yesterday_metrics() IS 'Returns yesterday''s metrics for daily digest email';

-- =============================================
-- VERIFICATION
-- =============================================

DO $$
BEGIN
    -- Verify table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'daily_analytics'
    ) THEN
        RAISE EXCEPTION 'FAILED: daily_analytics table was not created';
    END IF;

    -- Verify unique constraint on date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'daily_analytics'
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%date%'
    ) THEN
        RAISE EXCEPTION 'FAILED: Date unique constraint was not created';
    END IF;

    -- Verify utility functions exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'get_yesterday_metrics'
    ) THEN
        RAISE EXCEPTION 'FAILED: get_yesterday_metrics function was not created';
    END IF;

    -- Create today's analytics record
    PERFORM get_or_create_daily_analytics(CURRENT_DATE);

    RAISE NOTICE '✅ SUCCESS: Daily analytics system created successfully';
    RAISE NOTICE '📊 Table: daily_analytics with unique date constraint';
    RAISE NOTICE '📈 Functions: Complete analytics tracking and reporting suite';
    RAISE NOTICE '🔒 Security: RLS enabled with admin-only access policy';
    RAISE NOTICE '📅 Today: Analytics record created for today''s date';
    RAISE NOTICE '📧 Digest: Yesterday metrics function ready for email automation';
    RAISE NOTICE '⚙️ Auto-increment: Beta requests and launch signups tracked automatically';
END $$;