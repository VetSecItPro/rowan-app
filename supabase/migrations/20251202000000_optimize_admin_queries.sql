-- Optimize Admin Dashboard Query Performance
-- Creates indexes on frequently queried columns for admin endpoints

-- Beta Access Requests - frequently filtered by created_at, access_granted, approved_at
CREATE INDEX IF NOT EXISTS idx_beta_access_requests_created_at
  ON beta_access_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_beta_access_requests_access_granted
  ON beta_access_requests(access_granted)
  WHERE access_granted = true;

CREATE INDEX IF NOT EXISTS idx_beta_access_requests_approved_at
  ON beta_access_requests(approved_at DESC)
  WHERE approved_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_beta_access_requests_user_id
  ON beta_access_requests(user_id)
  WHERE user_id IS NOT NULL;

-- Launch Notifications - frequently filtered by created_at, subscribed, source
CREATE INDEX IF NOT EXISTS idx_launch_notifications_created_at
  ON launch_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_launch_notifications_subscribed
  ON launch_notifications(subscribed)
  WHERE subscribed = true;

CREATE INDEX IF NOT EXISTS idx_launch_notifications_source
  ON launch_notifications(source);

-- Composite index for common analytics queries (date range + status)
CREATE INDEX IF NOT EXISTS idx_beta_access_requests_created_granted
  ON beta_access_requests(created_at DESC, access_granted);

-- Comment explaining indexes
COMMENT ON INDEX idx_beta_access_requests_created_at IS
  'Optimizes date-range queries in analytics endpoint';
COMMENT ON INDEX idx_beta_access_requests_access_granted IS
  'Optimizes filtering by approval status';
COMMENT ON INDEX idx_beta_access_requests_approved_at IS
  'Optimizes user registration timeline queries';
COMMENT ON INDEX idx_launch_notifications_created_at IS
  'Optimizes date-range queries for notification stats';
COMMENT ON INDEX idx_launch_notifications_subscribed IS
  'Optimizes active subscriber counts';
