-- Fix the auth user trigger to properly bypass RLS policies
-- This resolves the "Database error saving new user" issue

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved RLS policies that allow initial user creation
-- Update users table policy to allow trigger inserts
DROP POLICY IF EXISTS users_insert_own ON users;
CREATE POLICY users_insert_own ON users FOR INSERT
  WITH CHECK (
    -- Allow if the user is inserting their own profile
    auth.uid() = id OR
    -- Allow if this is a system operation (like a trigger)
    auth.uid() IS NULL
  );

-- Update space_members policy to allow initial owner creation
DROP POLICY IF EXISTS space_members_insert ON space_members;
CREATE POLICY space_members_insert ON space_members FOR INSERT
  WITH CHECK (
    -- Allow if user is already a member (existing logic)
    EXISTS (SELECT 1 FROM space_members WHERE space_id = space_members.space_id AND user_id = auth.uid()) OR
    -- Allow if this is the first member being added (owner creation)
    NOT EXISTS (SELECT 1 FROM space_members WHERE space_id = space_members.space_id) OR
    -- Allow if this is a system operation (like a trigger)
    auth.uid() IS NULL
  );

-- Create the trigger function with proper error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_space_id UUID;
BEGIN
  -- Insert user profile
  INSERT INTO public.users (
    id,
    email,
    name,
    pronouns,
    color_theme
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.raw_user_meta_data->>'pronouns',
    COALESCE(NEW.raw_user_meta_data->>'color_theme', 'emerald')
  );

  -- Create a default space if space_name is provided
  IF NEW.raw_user_meta_data->>'space_name' IS NOT NULL AND
     TRIM(NEW.raw_user_meta_data->>'space_name') != '' THEN

    -- Insert space and get the ID
    INSERT INTO public.spaces (name)
    VALUES (TRIM(NEW.raw_user_meta_data->>'space_name'))
    RETURNING id INTO new_space_id;

    -- Add user as owner of the new space
    INSERT INTO public.space_members (space_id, user_id, role)
    VALUES (new_space_id, NEW.id, 'owner');

  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error with more detail
  RAISE WARNING 'Error in handle_new_user trigger for user %: %', NEW.id, SQLERRM;
  -- Re-raise the exception to prevent auth user creation if profile creation fails
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();