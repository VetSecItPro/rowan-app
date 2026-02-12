-- Fix handle_new_user trigger to NOT raise exceptions that rollback auth user creation
-- The trigger should be resilient and allow auth user creation to succeed even if profile creation fails

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create a resilient function that doesn't rollback on errors
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to insert user profile
  BEGIN
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

    RAISE LOG 'Successfully created user profile for user %', NEW.id;

  EXCEPTION WHEN OTHERS THEN
    -- Log the error but DON'T re-raise to prevent rollback
    RAISE WARNING 'Error in handle_new_user trigger for user %: % (SQLSTATE: %)',
      NEW.id, SQLERRM, SQLSTATE;
    RAISE LOG 'Auth user % will be created without profile - profile can be created manually', NEW.id;
  END;

  -- Always return NEW to allow auth user creation to succeed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Log that the trigger was fixed
DO $$
BEGIN
  RAISE NOTICE 'handle_new_user trigger fixed to prevent rollback on profile creation errors';
END $$;
