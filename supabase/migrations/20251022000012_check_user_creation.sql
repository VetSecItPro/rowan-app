-- Check if the user profile was actually created and fix RLS issues

-- Check if the user profile exists
DO $$
DECLARE
  user_count INTEGER;
  test_user_id UUID := '38e6cee5-4ea2-4423-a7c6-a63410ff0c25'::UUID;
BEGIN
  RAISE NOTICE '=== CHECKING USER PROFILE CREATION ===';

  -- Count users in the table
  SELECT COUNT(*) INTO user_count FROM users;
  RAISE NOTICE 'Total users in database: %', user_count;

  -- Check if our specific test user exists
  IF EXISTS (SELECT 1 FROM users WHERE id = test_user_id) THEN
    RAISE NOTICE '✅ Test user profile EXISTS for ID: %', test_user_id;
  ELSE
    RAISE NOTICE '❌ Test user profile MISSING for ID: %', test_user_id;
  END IF;
END $$;

-- Fix the RLS policy issue that's causing 406 Not Acceptable
-- The issue might be that the RLS policy is too restrictive

-- Check current users table RLS policies
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '=== CURRENT USERS TABLE RLS POLICIES ===';

  FOR policy_record IN
    SELECT policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
  LOOP
    RAISE NOTICE 'Policy: % (%) - Using: %, With Check: %',
      policy_record.policyname, policy_record.cmd,
      policy_record.qual, policy_record.with_check;
  END LOOP;
END $$;