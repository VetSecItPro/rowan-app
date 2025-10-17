-- User Sessions Table
-- Tracks active user sessions with device and location information

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,

  -- Device Information
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  browser TEXT, -- 'Chrome', 'Safari', 'Firefox', etc.
  browser_version TEXT,
  os TEXT, -- 'macOS', 'Windows', 'iOS', 'Android', etc.
  os_version TEXT,
  device_name TEXT, -- 'MacBook Pro', 'iPhone 15', etc.

  -- Location Information
  ip_address TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  country_code TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Session Management
  is_current BOOLEAN DEFAULT false,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,

  -- Additional metadata
  user_agent TEXT,

  CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS user_sessions_session_token_idx ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS user_sessions_last_active_idx ON user_sessions(last_active DESC);
CREATE INDEX IF NOT EXISTS user_sessions_is_current_idx ON user_sessions(is_current) WHERE is_current = true;

-- Enable Row Level Security
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own sessions"
  ON user_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON user_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON user_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert sessions"
  ON user_sessions
  FOR INSERT
  WITH CHECK (true);

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions
  WHERE expires_at < NOW()
    OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE user_sessions IS 'Tracks active user sessions with device and location information for security monitoring';
COMMENT ON COLUMN user_sessions.session_token IS 'Hashed session token for security';
COMMENT ON COLUMN user_sessions.is_current IS 'Marks the current active session';
COMMENT ON COLUMN user_sessions.revoked_at IS 'Timestamp when session was manually revoked by user';
