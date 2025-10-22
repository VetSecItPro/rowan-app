-- Create a simple, working user profile trigger
-- Focus only on creating the user profile, nothing else

-- Create simple function to create user profile only
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Just create the basic user profile
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

  RAISE LOG 'Created user profile for %', NEW.id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error creating user profile for %: %', NEW.id, SQLERRM;
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user profile creation
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ Created simple user profile trigger';
  RAISE NOTICE '   Only creates user profile, no other complications';
END $$;