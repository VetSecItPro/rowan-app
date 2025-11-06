-- Insert Admin User Record
-- Run this in Supabase SQL Editor to create the missing admin_users record

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