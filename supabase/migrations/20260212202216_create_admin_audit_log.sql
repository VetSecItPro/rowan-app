-- Migration: create_admin_audit_log
-- Applied via MCP on 2026-02-12
-- Creates admin audit log table for tracking admin actions

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_resource TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only active admins can read audit logs
CREATE POLICY "Admins can read audit log"
  ON admin_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (SELECT auth.uid())
        AND admin_users.is_active = true
    )
  );

-- Authenticated admins can insert their own audit log entries
CREATE POLICY "Authenticated can insert audit log"
  ON admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (SELECT auth.uid())
        AND admin_users.is_active = true
    )
  );

-- Service role can always insert (for server-side logging)
CREATE POLICY "Service role can insert audit log"
  ON admin_audit_log FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_admin_audit_log_admin_user ON admin_audit_log(admin_user_id);
CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_log_action ON admin_audit_log(action);
