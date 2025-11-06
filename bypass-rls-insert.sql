-- Bypass RLS to Insert Admin User
-- This script temporarily disables RLS to insert the admin user record

-- Temporarily disable RLS for the insert
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- Insert the admin user record
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

-- Re-enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Verify the record was inserted
SELECT email, role, is_active, created_at FROM admin_users WHERE email = 'ops@steelmotionllc.com';