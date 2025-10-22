-- Temporarily disable the trigger to isolate the issue
-- This will help us determine if the problem is with the trigger itself

-- Disable the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Add logging to see what's happening
DO $$
BEGIN
  RAISE NOTICE 'Auth trigger DISABLED for debugging';
  RAISE NOTICE 'Users can now signup via Supabase Auth without trigger interference';
END $$;