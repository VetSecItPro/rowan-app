-- Create admin account with specified credentials
-- This creates the admin user account for anouarb@gmail.com

-- Insert admin user into auth.users table (Supabase auth)
-- Note: This creates the user account that can be used for authentication
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'anouarb@gmail.com',
  crypt('RabatMaroc1974@&$', gen_salt('bf', 10)),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Admin User"}',
  false,
  'authenticated'
) ON CONFLICT (email) DO UPDATE SET
  encrypted_password = crypt('RabatMaroc1974@&$', gen_salt('bf', 10)),
  updated_at = now();

-- Also ensure the user exists in our users table
INSERT INTO public.users (
  id,
  email,
  full_name,
  avatar_url,
  color_theme,
  created_at,
  updated_at,
  is_beta_tester,
  beta_status,
  beta_signup_date
)
SELECT
  id,
  email,
  'Admin User',
  null,
  'purple',
  now(),
  now(),
  true,
  'approved',
  now()
FROM auth.users
WHERE email = 'anouarb@gmail.com'
ON CONFLICT (email) DO UPDATE SET
  is_beta_tester = true,
  beta_status = 'approved',
  beta_signup_date = COALESCE(users.beta_signup_date, now()),
  updated_at = now();

-- Create admin_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  admin_level text DEFAULT 'super_admin', -- 'super_admin', 'admin', 'moderator'
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  permissions jsonb DEFAULT '{}',
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add RLS to admin_users table
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can see admin_users table
CREATE POLICY "Admin users management" ON admin_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.is_active = true
    )
  );

-- Insert admin user into admin_users table
-- First, check if admin user already exists, if not insert
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Get the admin user ID
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'anouarb@gmail.com';

    -- Insert or update admin_users record
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO admin_users (
            user_id,
            email,
            admin_level,
            granted_by,
            is_active,
            permissions,
            notes
        ) VALUES (
            admin_user_id,
            'anouarb@gmail.com',
            'super_admin',
            admin_user_id, -- self-granted for initial setup
            true,
            '{"beta_management": true, "user_management": true, "feedback_management": true, "system_admin": true}',
            'Initial super admin account'
        )
        ON CONFLICT (user_id) DO UPDATE SET
            is_active = true,
            admin_level = 'super_admin',
            permissions = '{"beta_management": true, "user_management": true, "feedback_management": true, "system_admin": true}',
            updated_at = now();
    END IF;
END $$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_email text DEFAULT null)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_users au
    JOIN auth.users u ON u.id = au.user_id
    WHERE au.is_active = true
    AND (
      COALESCE(user_email, u.email) = au.email
      OR (user_email IS NULL AND u.id = auth.uid())
    )
  );
$$;

-- Function to get current user admin level
CREATE OR REPLACE FUNCTION get_admin_level()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.admin_level
  FROM admin_users au
  JOIN auth.users u ON u.id = au.user_id
  WHERE u.id = auth.uid()
  AND au.is_active = true;
$$;