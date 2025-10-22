-- Verify the actual database state and check what's still missing

-- Check if the tables actually exist that the triggers need
DO $$
BEGIN
  RAISE NOTICE '=== VERIFYING REQUIRED TABLES EXIST ===';

  -- Check user_notification_preferences table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_notification_preferences') THEN
    RAISE NOTICE '✅ user_notification_preferences table EXISTS';
  ELSE
    RAISE NOTICE '❌ user_notification_preferences table DOES NOT EXIST';
  END IF;

  -- Check user_privacy_preferences table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_privacy_preferences') THEN
    RAISE NOTICE '✅ user_privacy_preferences table EXISTS';
  ELSE
    RAISE NOTICE '❌ user_privacy_preferences table DOES NOT EXIST';
  END IF;
END $$;

-- Test the trigger functions manually
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  RAISE NOTICE '=== TESTING TRIGGER FUNCTIONS MANUALLY ===';

  -- Test notification preferences function
  BEGIN
    -- Can't call trigger function directly, just check if it exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_default_notification_preferences') THEN
      RAISE NOTICE '✅ create_default_notification_preferences function EXISTS';
    ELSE
      RAISE NOTICE '❌ create_default_notification_preferences function MISSING';
    END IF;
  END;

  -- Test privacy preferences function
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_default_privacy_preferences') THEN
      RAISE NOTICE '✅ create_default_privacy_preferences function EXISTS';
    ELSE
      RAISE NOTICE '❌ create_default_privacy_preferences function MISSING';
    END IF;
  END;
END $$;

-- Check what triggers are actually on auth.users
DO $$
BEGIN
  RAISE NOTICE '=== ALL TRIGGERS ON AUTH.USERS ===';

  IF EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE event_object_schema = 'auth' AND event_object_table = 'users'
    AND trigger_name = 'on_auth_user_created_notification_preferences'
  ) THEN
    RAISE NOTICE '✅ on_auth_user_created_notification_preferences trigger EXISTS';
  ELSE
    RAISE NOTICE '❌ on_auth_user_created_notification_preferences trigger MISSING';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE event_object_schema = 'auth' AND event_object_table = 'users'
    AND trigger_name = 'on_auth_user_created_privacy'
  ) THEN
    RAISE NOTICE '✅ on_auth_user_created_privacy trigger EXISTS';
  ELSE
    RAISE NOTICE '❌ on_auth_user_created_privacy trigger MISSING';
  END IF;
END $$;