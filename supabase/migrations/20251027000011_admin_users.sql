-- Migration: Admin Users System
-- Purpose: Create secure admin authentication for ops.rowanapp.com dashboard
-- Part of: Beta Launch Phase 1B - Backend Foundation
-- Date: 2025-10-27

-- =============================================
-- ADMIN USERS TABLE
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
COMMENT ON TABLE admin_users IS 'Secure admin users for ops.rowanapp.com dashboard access';
COMMENT ON COLUMN admin_users.email IS 'Admin email address (unique) - currently ops@steelmotionllc.com';
COMMENT ON COLUMN admin_users.role IS 'Admin role: admin, super_admin, or viewer';
COMMENT ON COLUMN admin_users.permissions IS 'JSON object defining specific permissions and access levels';
COMMENT ON COLUMN admin_users.last_login IS 'Timestamp of most recent login for security monitoring';
COMMENT ON COLUMN admin_users.login_count IS 'Total number of logins for usage analytics';
COMMENT ON COLUMN admin_users.is_active IS 'Whether admin account is active (for disabling access)';

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

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

-- =============================================
-- ADMIN UTILITY FUNCTIONS
-- =============================================

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

-- =============================================
-- INITIAL ADMIN SETUP
-- =============================================

-- Insert the primary admin user (ops@steelmotionllc.com)
INSERT INTO admin_users (email, role, permissions, is_active)
VALUES (
  'ops@steelmotionllc.com',
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
-- VERIFICATION
-- =============================================

DO $$
BEGIN
    -- Verify table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'admin_users'
    ) THEN
        RAISE EXCEPTION 'FAILED: admin_users table was not created';
    END IF;

    -- Verify primary admin was inserted
    IF NOT EXISTS (
        SELECT 1 FROM admin_users
        WHERE email = 'ops@steelmotionllc.com'
        AND role = 'super_admin'
        AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'FAILED: Primary admin user was not created';
    END IF;

    -- Verify utility functions exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'is_admin'
    ) THEN
        RAISE EXCEPTION 'FAILED: is_admin function was not created';
    END IF;

    RAISE NOTICE '✅ SUCCESS: Admin users system created successfully';
    RAISE NOTICE '👤 Primary Admin: ops@steelmotionllc.com (super_admin role)';
    RAISE NOTICE '🔒 Security: RLS enabled with role-based access policies';
    RAISE NOTICE '⚙️ Functions: Admin validation and permission utilities added';
    RAISE NOTICE '📊 Tracking: Login count and timestamp tracking enabled';
    RAISE NOTICE '🛡️ Permissions: Comprehensive JSON permission system ready';
END $$;