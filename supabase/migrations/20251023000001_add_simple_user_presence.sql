-- =============================================
-- ADD SIMPLE USER PRESENCE TRACKING
-- Date: October 23, 2025
-- Purpose: Add cached presence tracking (online/offline only)
-- =============================================

-- Create presence status enum (simple: just online/offline)
CREATE TYPE presence_status AS ENUM ('online', 'offline');

-- Create user presence table
CREATE TABLE user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  status presence_status DEFAULT 'offline',
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one presence record per user per space
  UNIQUE(user_id, space_id)
);

-- Index for efficient space member presence lookups
CREATE INDEX idx_user_presence_space_status ON user_presence(space_id, status);
CREATE INDEX idx_user_presence_last_activity ON user_presence(last_activity);

-- RLS policies for presence data
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Users can view presence for spaces they belong to
CREATE POLICY user_presence_select ON user_presence FOR SELECT
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

-- Users can update their own presence
CREATE POLICY user_presence_update ON user_presence FOR UPDATE
  USING (user_id = auth.uid());

-- Users can insert their own presence
CREATE POLICY user_presence_insert ON user_presence FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Function to automatically mark users offline after 5 minutes of inactivity
CREATE OR REPLACE FUNCTION mark_inactive_users_offline()
RETURNS void AS $$
BEGIN
  UPDATE user_presence
  SET status = 'offline', updated_at = NOW()
  WHERE status = 'online'
    AND last_activity < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Create enhanced view for space members with presence
CREATE OR REPLACE VIEW space_members_with_presence AS
SELECT
  sm.space_id,
  sm.user_id,
  sm.role,
  sm.joined_at,
  u.name,
  u.email,
  u.avatar_url,
  COALESCE(up.status, 'offline') as presence_status,
  up.last_activity,
  up.updated_at as presence_updated_at
FROM space_members sm
LEFT JOIN users u ON sm.user_id = u.id
LEFT JOIN user_presence up ON sm.user_id = up.user_id AND sm.space_id = up.space_id
ORDER BY
  CASE WHEN COALESCE(up.status, 'offline') = 'online' THEN 1 ELSE 2 END,
  sm.role,
  u.name;

-- Grant permissions
GRANT SELECT ON space_members_with_presence TO authenticated;

-- Add comment
COMMENT ON TABLE user_presence IS 'Simple cached presence tracking for space members (online/offline only)';