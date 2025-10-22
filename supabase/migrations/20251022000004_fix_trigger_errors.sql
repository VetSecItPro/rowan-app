-- Fix the auth user trigger to handle errors properly
-- Focus on just creating the user profile first, then add space creation later

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create a simpler, more robust function that focuses on user profile creation only
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert user profile only (no space creation for now)
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

  -- Log success
  RAISE LOG 'Successfully created user profile for user %', NEW.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the detailed error
  RAISE WARNING 'Error in handle_new_user trigger for user %: % (SQLSTATE: %)',
    NEW.id, SQLERRM, SQLSTATE;

  -- Re-raise the exception to prevent auth user creation if profile creation fails
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Log that the trigger was created
DO $$
BEGIN
  RAISE NOTICE 'handle_new_user trigger recreated with simplified profile-only logic';
END $$;