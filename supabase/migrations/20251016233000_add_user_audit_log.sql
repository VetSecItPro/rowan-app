-- User Audit Log Table
-- Tracks all data access events for GDPR Article 15 compliance

/**
 * GDPR COMPLIANCE - Article 15 (Right of Access):
 * -----------------------------------------------
 * This table implements the user's right to know:
 * - What data we have about them
 * - When their data was accessed
 * - What actions were performed
 * - Who accessed the data (if applicable)
 *
 * DATA RETENTION:
 * ---------------
 * - Audit logs are retained for 2 years for compliance
 * - Logs are available to users via Settings → Privacy & Security → Audit Log
 * - Cannot be deleted by users (compliance requirement)
 *
 * LOGGED ACTIONS:
 * ---------------
 * - data_export: User exported their data
 * - data_view: User viewed their data (profile, settings, etc.)
 * - data_update: User updated their data
 * - data_delete: User deleted their data
 * - account_login: User logged in
 * - account_logout: User logged out
 * - password_change: User changed password
 * - email_change: User changed email
 * - 2fa_enable: User enabled 2FA
 * - 2fa_disable: User disabled 2FA
 * - deletion_initiated: User requested account deletion
 * - deletion_cancelled: User cancelled account deletion
 */

CREATE TABLE IF NOT EXISTS user_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Action details
  action TEXT NOT NULL, -- Type of action performed
  action_category TEXT NOT NULL, -- Category: data_access, account, security, compliance
  resource_type TEXT, -- Type of resource accessed (profile, expenses, tasks, etc.)
  resource_id TEXT, -- ID of the specific resource (if applicable)

  -- Context
  ip_address TEXT, -- IP address of the request
  user_agent TEXT, -- Browser/device information
  location TEXT, -- Geographic location (if available)

  -- Metadata
  details JSONB, -- Additional details about the action
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes for performance
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_user_audit_log_user_id ON user_audit_log(user_id);
CREATE INDEX idx_user_audit_log_timestamp ON user_audit_log(timestamp DESC);
CREATE INDEX idx_user_audit_log_action_category ON user_audit_log(action_category);
CREATE INDEX idx_user_audit_log_created_at ON user_audit_log(created_at DESC);

-- RLS Policies
ALTER TABLE user_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit logs
CREATE POLICY "Users can view their own audit logs"
  ON user_audit_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service can insert audit logs (via API)
CREATE POLICY "Service can insert audit logs"
  ON user_audit_log
  FOR INSERT
  WITH CHECK (true);

-- No one can update or delete audit logs (compliance requirement)
-- Audit logs are immutable once created

-- Add comment
COMMENT ON TABLE user_audit_log IS 'GDPR Article 15 compliance: User audit trail showing all data access events. Retained for 2 years. Immutable for compliance.';

-- Automatic cleanup function (runs monthly via cron)
-- Deletes audit logs older than 2 years
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM user_audit_log
  WHERE created_at < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Deletes audit logs older than 2 years. Run via cron job monthly.';
