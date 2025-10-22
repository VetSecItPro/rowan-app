-- Fix auth trigger functions to use correct table names
-- This resolves the 500 error during signup

-- Update notification preferences function to use correct table name
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RAISE LOG 'Created default notification preferences for user %', NEW.id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error creating notification preferences for user %: %', NEW.id, SQLERRM;
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update privacy preferences function to use correct table name
CREATE OR REPLACE FUNCTION create_default_privacy_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_privacy_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RAISE LOG 'Created default privacy preferences for user %', NEW.id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error creating privacy preferences for user %: %', NEW.id, SQLERRM;
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log that functions have been fixed
DO $$
BEGIN
  RAISE NOTICE 'Fixed auth trigger functions to use correct table names:';
  RAISE NOTICE '- user_notification_preferences (was notification_preferences)';
  RAISE NOTICE '- user_privacy_preferences (was privacy_preferences)';
END $$;