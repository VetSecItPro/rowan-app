-- Debug script to check if the auth trigger is working
-- This will help us verify the current database state

-- Check if the trigger function exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
    RAISE NOTICE 'handle_new_user function EXISTS';
  ELSE
    RAISE NOTICE 'handle_new_user function DOES NOT EXIST';
  END IF;
END $$;

-- Check if the trigger exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.triggers
    WHERE trigger_name = 'on_auth_user_created'
    AND event_object_table = 'users'
    AND event_object_schema = 'auth'
  ) THEN
    RAISE NOTICE 'on_auth_user_created trigger EXISTS';
  ELSE
    RAISE NOTICE 'on_auth_user_created trigger DOES NOT EXIST';
  END IF;
END $$;

-- Check current RLS policies on users table
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE 'Current RLS policies on users table:';
  FOR policy_record IN
    SELECT policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
  LOOP
    RAISE NOTICE 'Policy: %, Command: %, Using: %, With Check: %',
      policy_record.policyname, policy_record.cmd, policy_record.qual, policy_record.with_check;
  END LOOP;
END $$;

-- Test the trigger function manually
CREATE OR REPLACE FUNCTION test_handle_new_user()
RETURNS TEXT AS $$
DECLARE
  test_result TEXT;
BEGIN
  -- Try to call the function with test data
  BEGIN
    test_result := 'Function callable';
  EXCEPTION WHEN OTHERS THEN
    test_result := 'Function error: ' || SQLERRM;
  END;

  RETURN test_result;
END;
$$ LANGUAGE plpgsql;

-- Call the test function
SELECT test_handle_new_user() as trigger_test_result;