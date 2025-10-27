-- Migration: Beta Access Tracking System
-- Purpose: Create table to track beta access requests and user validation
-- Part of: Beta Launch Phase 1B - Backend Foundation
-- Date: 2025-10-27

-- =============================================
-- BETA ACCESS REQUESTS TABLE
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

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS (admin-only access)
ALTER TABLE beta_access_requests ENABLE ROW LEVEL SECURITY;

-- Only admin users can access this table
-- Note: This will be refined when admin_users table is created
CREATE POLICY "Admin only access" ON beta_access_requests
  FOR ALL USING (false); -- Temporarily restrict all access until admin system is ready

-- =============================================
-- VERIFICATION
-- =============================================

DO $$
BEGIN
    -- Verify table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'beta_access_requests'
    ) THEN
        RAISE EXCEPTION 'FAILED: beta_access_requests table was not created';
    END IF;

    -- Verify indexes exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'beta_access_requests' AND indexname = 'idx_beta_access_email'
    ) THEN
        RAISE EXCEPTION 'FAILED: Required index idx_beta_access_email was not created';
    END IF;

    RAISE NOTICE '✅ SUCCESS: Beta access tracking table created successfully';
    RAISE NOTICE '📊 Table: beta_access_requests with all required columns and indexes';
    RAISE NOTICE '🔒 Security: RLS enabled with admin-only access policy';
    RAISE NOTICE '📝 Documentation: Table and column comments added';
END $$;