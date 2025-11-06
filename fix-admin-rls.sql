-- Direct SQL fix for admin_users RLS infinite recursion
-- This will be executed manually to fix the issue

-- Drop the problematic policies
DROP POLICY IF EXISTS "Super admin only access" ON admin_users;
DROP POLICY IF EXISTS "Admins can read own record" ON admin_users;

-- Create corrected policies that avoid infinite recursion
-- Allow service role to do everything (needed for admin functions)
CREATE POLICY "Service role full access" ON admin_users
  FOR ALL
  USING (auth.role() = 'service_role');

-- Allow authenticated users to read their own record only
CREATE POLICY "Users can read own record" ON admin_users
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' = email
    AND is_active = TRUE
  );

-- Allow updates to login tracking for own record
CREATE POLICY "Users can update own login" ON admin_users
  FOR UPDATE
  USING (
    auth.jwt() ->> 'email' = email
    AND is_active = TRUE
  )
  WITH CHECK (
    auth.jwt() ->> 'email' = email
    AND is_active = TRUE
  );