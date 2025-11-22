-- Bulletproof admin account creation script
-- This handles all edge cases and ensures proper table creation

-- First, drop the table if it exists to ensure clean state
-- Use CASCADE to remove all dependent objects (policies, etc.)
DROP TABLE IF EXISTS admin_users CASCADE;

-- Create admin_users table with proper structure
CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  admin_level text NOT NULL DEFAULT 'super_admin',
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  permissions jsonb DEFAULT '{}',
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);

-- Create the admin account step by step
DO $$
DECLARE
    admin_user_id uuid;
    user_exists_in_auth boolean := false;
    user_exists_in_public boolean := false;
    admin_record_exists boolean := false;
BEGIN
    RAISE NOTICE 'Starting admin account creation process...';

    -- Step 1: Check if user exists in auth.users
    SELECT EXISTS(
        SELECT 1 FROM auth.users
        WHERE email = 'anouarb@gmail.com'
    ) INTO user_exists_in_auth;

    IF user_exists_in_auth THEN
        -- Get existing user ID and update password
        SELECT id INTO admin_user_id
        FROM auth.users
        WHERE email = 'anouarb@gmail.com';

        UPDATE auth.users
        SET encrypted_password = crypt('RabatMaroc1974@&$', gen_salt('bf', 10)),
            updated_at = now()
        WHERE id = admin_user_id;

        RAISE NOTICE 'Updated existing auth user password for: %', admin_user_id;
    ELSE
        -- Create new user in auth.users
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

        RAISE NOTICE 'Created new auth user: %', admin_user_id;
    END IF;

    -- Verify we have a valid user ID
    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'Failed to create or find admin user in auth.users';
    END IF;

    -- Step 2: Handle public.users table
    SELECT EXISTS(
        SELECT 1 FROM public.users
        WHERE email = 'anouarb@gmail.com'
    ) INTO user_exists_in_public;

    IF user_exists_in_public THEN
        -- Update existing public user
        UPDATE public.users
        SET is_beta_tester = true,
            beta_status = 'approved',
            beta_signup_date = COALESCE(beta_signup_date, now()),
            updated_at = now()
        WHERE email = 'anouarb@gmail.com';

        RAISE NOTICE 'Updated existing public user';
    ELSE
        -- Create new public user
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

        RAISE NOTICE 'Created new public user';
    END IF;

    -- Step 3: Handle admin_users table
    -- Double-check the table exists and has the right columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'admin_users'
        AND column_name = 'user_id'
    ) THEN
        RAISE EXCEPTION 'admin_users table does not have user_id column';
    END IF;

    SELECT EXISTS(
        SELECT 1 FROM admin_users
        WHERE user_id = admin_user_id
    ) INTO admin_record_exists;

    IF admin_record_exists THEN
        -- Update existing admin record
        UPDATE admin_users
        SET is_active = true,
            admin_level = 'super_admin',
            permissions = '{"beta_management": true, "user_management": true, "feedback_management": true, "system_admin": true}',
            updated_at = now()
        WHERE user_id = admin_user_id;

        RAISE NOTICE 'Updated existing admin record';
    ELSE
        -- Create new admin record
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

        RAISE NOTICE 'Created new admin record';
    END IF;

    RAISE NOTICE 'Admin account setup completed successfully for anouarb@gmail.com (ID: %)', admin_user_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error occurred: %', SQLERRM;
        RAISE;
END $$;

-- Create admin utility functions
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

-- Enable RLS on admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Admin access only" ON admin_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users check_admin
      WHERE check_admin.user_id = auth.uid()
      AND check_admin.is_active = true
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_users TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Final verification
DO $$
DECLARE
    admin_count integer;
    admin_email text;
BEGIN
    SELECT COUNT(*), MAX(email) INTO admin_count, admin_email
    FROM admin_users
    WHERE is_active = true;

    RAISE NOTICE 'Verification: Found % active admin(s). Admin email: %', admin_count, admin_email;

    IF admin_count = 0 THEN
        RAISE EXCEPTION 'No active admin users found after setup!';
    END IF;
END $$;