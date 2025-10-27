-- Migration: Launch Notification Email System
-- Purpose: Create table to store email signups for production launch notifications
-- Part of: Beta Launch Phase 1B - Backend Foundation
-- Date: 2025-10-27

-- =============================================
-- LAUNCH NOTIFICATIONS TABLE
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

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS (admin-only access for now)
ALTER TABLE launch_notifications ENABLE ROW LEVEL SECURITY;

-- Only admin users can access this table
-- Note: This will be refined when admin_users table is created
CREATE POLICY "Admin only access" ON launch_notifications
  FOR ALL USING (false); -- Temporarily restrict all access until admin system is ready

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

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
-- VERIFICATION
-- =============================================

DO $$
BEGIN
    -- Verify table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'launch_notifications'
    ) THEN
        RAISE EXCEPTION 'FAILED: launch_notifications table was not created';
    END IF;

    -- Verify unique constraint on email
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'launch_notifications'
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%email%'
    ) THEN
        RAISE EXCEPTION 'FAILED: Email unique constraint was not created';
    END IF;

    -- Verify utility functions exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'get_active_launch_subscribers'
    ) THEN
        RAISE EXCEPTION 'FAILED: get_active_launch_subscribers function was not created';
    END IF;

    RAISE NOTICE '✅ SUCCESS: Launch notifications table created successfully';
    RAISE NOTICE '📧 Table: launch_notifications with unique email constraint';
    RAISE NOTICE '📊 Analytics: Source tracking and subscriber management ready';
    RAISE NOTICE '🔒 Security: RLS enabled with admin-only access policy';
    RAISE NOTICE '⚙️ Functions: Subscriber count and unsubscribe utilities added';
    RAISE NOTICE '📝 Documentation: Table and function comments added';
END $$;