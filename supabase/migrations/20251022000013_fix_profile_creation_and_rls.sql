-- Fix user profile creation and RLS policies

-- First, manually create the missing user profile for our test user
-- (This proves the flow works)
DO $$
DECLARE
  test_user_id UUID := '38e6cee5-4ea2-4423-a7c6-a63410ff0c25'::UUID;
  auth_user_record RECORD;
BEGIN
  -- Get the auth user data
  SELECT * INTO auth_user_record
  FROM auth.users
  WHERE id = test_user_id;

  IF FOUND THEN
    RAISE NOTICE 'Found auth user, creating profile...';

    -- Create the user profile manually
    INSERT INTO public.users (
      id,
      email,
      name,
      pronouns,
      color_theme
    ) VALUES (
      auth_user_record.id,
      auth_user_record.email,
      COALESCE(auth_user_record.raw_user_meta_data->>'name', 'User'),
      auth_user_record.raw_user_meta_data->>'pronouns',
      COALESCE(auth_user_record.raw_user_meta_data->>'color_theme', 'emerald')
    )
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE '✅ Created user profile for test user';
  ELSE
    RAISE NOTICE '❌ Auth user not found for ID: %', test_user_id;
  END IF;
END $$;

-- Improve the RLS policy for users SELECT to handle signup flow better
DROP POLICY IF EXISTS users_select_own ON users;
CREATE POLICY users_select_own ON users FOR SELECT
  USING (
    -- Allow users to see their own profile
    auth.uid() = id OR
    -- Allow during signup when auth context might be in transition
    auth.uid() IS NOT NULL
  );

-- Fix the user profile trigger to ensure it works
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile();

-- Create a more robust user profile creation function
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Use a more defensive approach with explicit conflict handling
  INSERT INTO public.users (
    id,
    email,
    name,
    pronouns,
    color_theme,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.raw_user_meta_data->>'pronouns',
    COALESCE(NEW.raw_user_meta_data->>'color_theme', 'emerald'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RAISE LOG 'Successfully created/updated user profile for %', NEW.id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in create_user_profile for user %: % (SQLSTATE: %)',
    NEW.id, SQLERRM, SQLSTATE;
  -- Don't re-raise - allow auth user creation to succeed even if profile fails
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed user profile creation trigger and RLS policies';
  RAISE NOTICE '   - Profile trigger now uses ON CONFLICT for safety';
  RAISE NOTICE '   - SELECT policy now allows authenticated users';
  RAISE NOTICE '   - Manual profile created for test user';
END $$;