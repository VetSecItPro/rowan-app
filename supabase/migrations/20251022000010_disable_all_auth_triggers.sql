-- Temporarily disable ALL auth triggers to isolate the failing one
-- This will help us identify which trigger is actually causing the 500 error

-- Disable notification preferences trigger
DROP TRIGGER IF EXISTS on_auth_user_created_notification_preferences ON auth.users;

-- Disable privacy preferences trigger
DROP TRIGGER IF EXISTS on_auth_user_created_privacy ON auth.users;

-- Log what we've disabled
DO $$
BEGIN
  RAISE NOTICE 'TEMPORARILY DISABLED ALL AUTH TRIGGERS';
  RAISE NOTICE '   - on_auth_user_created_notification_preferences';
  RAISE NOTICE '   - on_auth_user_created_privacy';
  RAISE NOTICE '';
  RAISE NOTICE 'This is for debugging only!';
  RAISE NOTICE '   Users can now signup but will not get default preferences';
  RAISE NOTICE '   TEST SIGNUP NOW - should work without 500 error';
END $$;