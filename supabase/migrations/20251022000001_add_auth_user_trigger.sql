-- Create trigger to handle user profile creation on auth signup
-- This ensures that when a user signs up via Supabase Auth,
-- a corresponding record is created in the custom users table

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (
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
  IF NEW.raw_user_meta_data->>'space_name' IS NOT NULL THEN
    INSERT INTO spaces (name)
    VALUES (NEW.raw_user_meta_data->>'space_name')
    RETURNING id AS space_id;

    -- Add user as owner of the new space
    INSERT INTO space_members (space_id, user_id, role)
    VALUES (
      (SELECT id FROM spaces WHERE name = NEW.raw_user_meta_data->>'space_name' ORDER BY created_at DESC LIMIT 1),
      NEW.id,
      'owner'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();