-- Check if the trigger functions exist and are working
DO $$
BEGIN
  RAISE NOTICE '=== CHECKING TRIGGER FUNCTIONS ===';

  -- Check if notification preferences function exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_default_notification_preferences') THEN
    RAISE NOTICE 'create_default_notification_preferences function EXISTS';
  ELSE
    RAISE NOTICE 'WARNING: create_default_notification_preferences function MISSING';
  END IF;

  -- Check if privacy preferences function exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_default_privacy_preferences') THEN
    RAISE NOTICE 'create_default_privacy_preferences function EXISTS';
  ELSE
    RAISE NOTICE 'WARNING: create_default_privacy_preferences function MISSING';
  END IF;
END $$;

-- Check if the required tables exist for these functions
DO $$
BEGIN
  RAISE NOTICE '=== CHECKING REQUIRED TABLES ===';

  -- Check notification_preferences table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notification_preferences') THEN
    RAISE NOTICE 'notification_preferences table EXISTS';
  ELSE
    RAISE NOTICE 'WARNING: notification_preferences table MISSING';
  END IF;

  -- Check privacy_preferences table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'privacy_preferences') THEN
    RAISE NOTICE 'privacy_preferences table EXISTS';
  ELSE
    RAISE NOTICE 'WARNING: privacy_preferences table MISSING';
  END IF;
END $$;