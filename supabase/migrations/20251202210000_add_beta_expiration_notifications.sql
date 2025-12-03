-- Create function to get users expiring within specified days
-- Used by cron job to send expiration warning emails
CREATE OR REPLACE FUNCTION get_expiring_beta_users(days_threshold INTEGER)
RETURNS TABLE(
  email TEXT,
  access_expires_at TIMESTAMPTZ,
  days_remaining NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bar.email,
    bar.access_expires_at,
    EXTRACT(EPOCH FROM (bar.access_expires_at - NOW())) / 86400 as days_remaining
  FROM beta_access_requests bar
  WHERE bar.access_granted = true
    AND bar.access_expires_at IS NOT NULL
    AND bar.access_expires_at > NOW()
    AND bar.access_expires_at <= NOW() + (days_threshold || ' days')::INTERVAL
    AND bar.access_expires_at >= NOW() + ((days_threshold - 1) || ' days')::INTERVAL
  ORDER BY bar.access_expires_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create table to track sent notifications (prevent duplicate emails)
CREATE TABLE IF NOT EXISTS beta_expiration_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  notification_type TEXT NOT NULL, -- '7_day' or '3_day'
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, notification_type)
);

-- Grant access
GRANT SELECT ON beta_expiration_notifications TO authenticated;

-- Create function to check if notification was already sent
CREATE OR REPLACE FUNCTION has_expiration_notification_sent(
  user_email TEXT,
  notif_type TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM beta_expiration_notifications
    WHERE email = user_email
      AND notification_type = notif_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to record sent notification
CREATE OR REPLACE FUNCTION record_expiration_notification(
  user_email TEXT,
  notif_type TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO beta_expiration_notifications (email, notification_type)
  VALUES (user_email, notif_type)
  ON CONFLICT (email, notification_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_expiring_beta_users IS 'Returns beta users expiring within the specified threshold (7 or 3 days)';
COMMENT ON FUNCTION has_expiration_notification_sent IS 'Checks if expiration notification was already sent to prevent duplicates';
COMMENT ON FUNCTION record_expiration_notification IS 'Records that an expiration notification was sent';
