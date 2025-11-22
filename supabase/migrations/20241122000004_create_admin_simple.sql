-- Simple admin account creation script
-- This avoids ON CONFLICT issues by using conditional logic

-- Create admin_users table first
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  admin_level text DEFAULT 'super_admin',
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  permissions jsonb DEFAULT '{}',
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create admin account with conditional logic
DO $$
DECLARE
    admin_user_id uuid;
    admin_exists boolean := false;
BEGIN
    -- Check if admin user already exists in auth.users
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'anouarb@gmail.com';

    IF admin_user_id IS NULL THEN
        -- Create new admin user in auth.users
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
        );

        -- Get the newly created user ID
        SELECT id INTO admin_user_id
        FROM auth.users
        WHERE email = 'anouarb@gmail.com';
    ELSE
        -- Update existing user's password
        UPDATE auth.users
        SET encrypted_password = crypt('RabatMaroc1974@&$', gen_salt('bf', 10)),
            updated_at = now()
        WHERE id = admin_user_id;
    END IF;

    -- Handle public.users table
    IF admin_user_id IS NOT NULL THEN
        -- Check if user exists in public.users
        SELECT EXISTS(SELECT 1 FROM public.users WHERE email = 'anouarb@gmail.com') INTO admin_exists;

        IF NOT admin_exists THEN
            -- Insert new user
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
            ) VALUES (
                admin_user_id,
                'anouarb@gmail.com',
                'Admin User',
                null,
                'purple',
                now(),
                now(),
                true,
                'approved',
                now()
            );
        ELSE
            -- Update existing user
            UPDATE public.users
            SET is_beta_tester = true,
                beta_status = 'approved',
                beta_signup_date = COALESCE(beta_signup_date, now()),
                updated_at = now()
            WHERE email = 'anouarb@gmail.com';
        END IF;

        -- Handle admin_users table
        SELECT EXISTS(SELECT 1 FROM admin_users WHERE user_id = admin_user_id) INTO admin_exists;

        IF NOT admin_exists THEN
            -- Insert new admin record
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
                admin_user_id,
                true,
                '{"beta_management": true, "user_management": true, "feedback_management": true, "system_admin": true}',
                'Initial super admin account'
            );
        ELSE
            -- Update existing admin record
            UPDATE admin_users
            SET is_active = true,
                admin_level = 'super_admin',
                permissions = '{"beta_management": true, "user_management": true, "feedback_management": true, "system_admin": true}',
                updated_at = now()
            WHERE user_id = admin_user_id;
        END IF;
    END IF;

    RAISE NOTICE 'Admin account setup completed for anouarb@gmail.com';
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

-- Add RLS to admin_users table (after table is populated)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admin users management" ON admin_users;

-- Policy: Only admins can see admin_users table
CREATE POLICY "Admin users management" ON admin_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users admin_check
      WHERE admin_check.user_id = auth.uid()
      AND admin_check.is_active = true
    )
  );