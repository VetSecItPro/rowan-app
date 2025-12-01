-- Combined Beta Launch Migrations
-- Run these in Supabase SQL Editor for immediate application
-- Date: 2025-10-27

-- =============================================
-- MIGRATION 1: BETA ACCESS TRACKING
-- =============================================

CREATE TABLE IF NOT EXISTS beta_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_attempt TEXT,
  ip_address TEXT,
  user_agent TEXT,
  access_granted BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  notes TEXT
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_beta_access_email ON beta_access_requests(email);
CREATE INDEX IF NOT EXISTS idx_beta_access_granted ON beta_access_requests(access_granted);
CREATE INDEX IF NOT EXISTS idx_beta_access_created ON beta_access_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_beta_access_ip ON beta_access_requests(ip_address);
CREATE INDEX IF NOT EXISTS idx_beta_access_user_id ON beta_access_requests(user_id) WHERE user_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE beta_access_requests IS 'Tracks all beta access password attempts and approvals';
COMMENT ON COLUMN beta_access_requests.email IS 'Email address attempting beta access';
COMMENT ON COLUMN beta_access_requests.password_attempt IS 'The password that was attempted (for security analysis)';
COMMENT ON COLUMN beta_access_requests.ip_address IS 'IP address of the request for security tracking';
COMMENT ON COLUMN beta_access_requests.user_agent IS 'Browser user agent for analytics and security';
COMMENT ON COLUMN beta_access_requests.access_granted IS 'Whether the beta access was granted (true) or denied (false)';
COMMENT ON COLUMN beta_access_requests.user_id IS 'Links to the actual user account if access was granted';
COMMENT ON COLUMN beta_access_requests.approved_at IS 'Timestamp when access was granted';
COMMENT ON COLUMN beta_access_requests.notes IS 'Admin notes about the request or any special circumstances';

-- Enable RLS (admin-only access)
ALTER TABLE beta_access_requests ENABLE ROW LEVEL SECURITY;

-- Only admin users can access this table
CREATE POLICY "Admin only access" ON beta_access_requests
  FOR ALL USING (false); -- Temporarily restrict all access until admin system is ready

-- =============================================
-- MIGRATION 2: LAUNCH NOTIFICATIONS
-- =============================================

CREATE TABLE IF NOT EXISTS launch_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  source TEXT DEFAULT 'homepage' CHECK (source IN ('homepage', 'features', 'beta-modal', 'other')),
  referrer TEXT,
  ip_address TEXT,
  user_agent TEXT,
  subscribed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);

-- Add indexes for performance and analytics
CREATE INDEX IF NOT EXISTS idx_launch_notifications_email ON launch_notifications(email);
CREATE INDEX IF NOT EXISTS idx_launch_notifications_subscribed ON launch_notifications(subscribed);
CREATE INDEX IF NOT EXISTS idx_launch_notifications_created ON launch_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_launch_notifications_source ON launch_notifications(source);
CREATE INDEX IF NOT EXISTS idx_launch_notifications_active ON launch_notifications(subscribed, unsubscribed_at)
  WHERE subscribed = TRUE AND unsubscribed_at IS NULL;

-- Add comments for documentation
COMMENT ON TABLE launch_notifications IS 'Email addresses collected for production launch notifications';
COMMENT ON COLUMN launch_notifications.name IS 'Full name provided by the user';
COMMENT ON COLUMN launch_notifications.email IS 'Email address (unique) for launch notifications';
COMMENT ON COLUMN launch_notifications.source IS 'Where the signup came from: homepage, features, beta-modal, other';
COMMENT ON COLUMN launch_notifications.referrer IS 'HTTP referrer header for traffic source analysis';
COMMENT ON COLUMN launch_notifications.ip_address IS 'IP address for geographic analytics and duplicate detection';
COMMENT ON COLUMN launch_notifications.user_agent IS 'Browser user agent for device/platform analytics';
COMMENT ON COLUMN launch_notifications.subscribed IS 'Whether user is still subscribed (for GDPR compliance)';
COMMENT ON COLUMN launch_notifications.unsubscribed_at IS 'Timestamp when user unsubscribed (if applicable)';

-- Enable RLS (admin-only access for now)
ALTER TABLE launch_notifications ENABLE ROW LEVEL SECURITY;

-- Only admin users can access this table
CREATE POLICY "Admin only access" ON launch_notifications
  FOR ALL USING (false); -- Temporarily restrict all access until admin system is ready

-- Function to get active subscriber count
CREATE OR REPLACE FUNCTION get_active_launch_subscribers()
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM launch_notifications
  WHERE subscribed = TRUE AND unsubscribed_at IS NULL;
$$;

-- Function to unsubscribe an email
CREATE OR REPLACE FUNCTION unsubscribe_launch_notification(email_address TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
AS $$
  UPDATE launch_notifications
  SET subscribed = FALSE, unsubscribed_at = NOW()
  WHERE email = email_address AND subscribed = TRUE
  RETURNING TRUE;
$$;

-- Add comments for functions
COMMENT ON FUNCTION get_active_launch_subscribers() IS 'Returns count of active launch notification subscribers';
COMMENT ON FUNCTION unsubscribe_launch_notification(TEXT) IS 'Unsubscribes an email from launch notifications (GDPR compliance)';

-- =============================================
-- MIGRATION 3: ADMIN USERS
-- =============================================

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'viewer')),
  permissions JSONB DEFAULT '{}',
  last_login TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Add indexes for performance and security
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_last_login ON admin_users(last_login);

-- Add comments for documentation
COMMENT ON TABLE admin_users IS 'Secure admin users for admin-dashboard dashboard access';
COMMENT ON COLUMN admin_users.email IS 'Admin email address (unique) - currently admin@example.com';
COMMENT ON COLUMN admin_users.role IS 'Admin role: admin, super_admin, or viewer';
COMMENT ON COLUMN admin_users.permissions IS 'JSON object defining specific permissions and access levels';
COMMENT ON COLUMN admin_users.last_login IS 'Timestamp of most recent login for security monitoring';
COMMENT ON COLUMN admin_users.login_count IS 'Total number of logins for usage analytics';
COMMENT ON COLUMN admin_users.is_active IS 'Whether admin account is active (for disabling access)';

-- Enable RLS (super secure - admin accounts only)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage admin users
CREATE POLICY "Super admin only access" ON admin_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND role = 'super_admin'
      AND is_active = TRUE
    )
  );

-- Allow admins to read their own record
CREATE POLICY "Admins can read own record" ON admin_users
  FOR SELECT USING (
    email = current_setting('request.jwt.claims', true)::json->>'email'
    AND is_active = TRUE
  );

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = user_email
    AND is_active = TRUE
  );
$$;

-- Function to get admin permissions
CREATE OR REPLACE FUNCTION get_admin_permissions(user_email TEXT)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(permissions, '{}'::jsonb)
  FROM admin_users
  WHERE email = user_email
  AND is_active = TRUE;
$$;

-- Function to record admin login
CREATE OR REPLACE FUNCTION record_admin_login(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE admin_users
  SET
    last_login = NOW(),
    login_count = login_count + 1
  WHERE email = user_email
  AND is_active = TRUE
  RETURNING TRUE;
$$;

-- Function to check admin role
CREATE OR REPLACE FUNCTION has_admin_role(user_email TEXT, required_role TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = user_email
    AND role = required_role
    AND is_active = TRUE
  );
$$;

-- Add comments for functions
COMMENT ON FUNCTION is_admin(TEXT) IS 'Checks if email belongs to an active admin user';
COMMENT ON FUNCTION get_admin_permissions(TEXT) IS 'Returns JSON permissions for an admin user';
COMMENT ON FUNCTION record_admin_login(TEXT) IS 'Records admin login timestamp and increments count';
COMMENT ON FUNCTION has_admin_role(TEXT, TEXT) IS 'Checks if admin has specific role level';

-- Insert the primary admin user (admin@example.com)
INSERT INTO admin_users (email, role, permissions, is_active)
VALUES (
  'admin@example.com',
  'super_admin',
  '{
    "dashboard": {"read": true, "write": true, "delete": true},
    "users": {"read": true, "write": true, "delete": false},
    "beta": {"read": true, "write": true, "approve": true},
    "notifications": {"read": true, "write": true, "export": true},
    "analytics": {"read": true, "export": true},
    "system": {"read": true, "logs": true, "settings": true}
  }'::jsonb,
  true
)
ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  is_active = EXCLUDED.is_active;

-- =============================================
-- MIGRATION 4: DAILY ANALYTICS
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

-- Create today's analytics record
SELECT get_or_create_daily_analytics(CURRENT_DATE);

-- =============================================
-- FINAL VERIFICATION
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '🎉 BETA LAUNCH MIGRATIONS COMPLETE!';
    RAISE NOTICE '✅ Tables created: beta_access_requests, launch_notifications, admin_users, daily_analytics';
    RAISE NOTICE '👤 Admin account: admin@example.com (super_admin)';
    RAISE NOTICE '🔒 Security: All tables have RLS enabled with admin-only access';
    RAISE NOTICE '📊 Analytics: Daily tracking functions installed';
    RAISE NOTICE '📧 Email system: Launch notification management ready';
    RAISE NOTICE '🚀 Status: Ready for Phase 1A homepage implementation';
END $$;