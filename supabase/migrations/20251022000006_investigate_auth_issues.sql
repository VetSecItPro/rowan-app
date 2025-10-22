-- Comprehensive investigation of auth issues
-- This will help us identify any RLS, constraints, or schema problems

-- Check if there are any RLS policies on auth schema tables
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '=== CHECKING AUTH SCHEMA RLS POLICIES ===';

  FOR policy_record IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'auth'
  LOOP
    RAISE NOTICE 'Auth Policy: %.% - %, Command: %, Using: %, With Check: %',
      policy_record.schemaname, policy_record.tablename, policy_record.policyname,
      policy_record.cmd, policy_record.qual, policy_record.with_check;
  END LOOP;

  -- If no policies found
  IF NOT FOUND THEN
    RAISE NOTICE 'No RLS policies found on auth schema tables';
  END IF;
END $$;

-- Check if RLS is enabled on auth tables
DO $$
DECLARE
  table_record RECORD;
BEGIN
  RAISE NOTICE '=== CHECKING RLS STATUS ON AUTH TABLES ===';

  FOR table_record IN
    SELECT schemaname, tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'auth'
  LOOP
    RAISE NOTICE 'Auth Table: %.% - RLS Enabled: %',
      table_record.schemaname, table_record.tablename, table_record.rowsecurity;
  END LOOP;
END $$;

-- Check for foreign key constraints from public tables to auth tables
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  RAISE NOTICE '=== CHECKING FOREIGN KEY CONSTRAINTS TO AUTH TABLES ===';

  FOR constraint_record IN
    SELECT
      tc.table_schema,
      tc.table_name,
      tc.constraint_name,
      ccu.table_schema AS foreign_table_schema,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = 'auth'
  LOOP
    RAISE NOTICE 'FK Constraint: %.% -> %.% (column: %)',
      constraint_record.table_schema, constraint_record.table_name,
      constraint_record.foreign_table_schema, constraint_record.foreign_table_name,
      constraint_record.foreign_column_name;
  END LOOP;

  -- If no constraints found
  IF NOT FOUND THEN
    RAISE NOTICE 'No foreign key constraints found pointing to auth tables';
  END IF;
END $$;

-- Check if users table has required structure
DO $$
BEGIN
  RAISE NOTICE '=== CHECKING USERS TABLE STRUCTURE ===';

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    RAISE NOTICE 'Public users table EXISTS';

    -- Check if users table has id column that references auth.users
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'id'
    ) THEN
      RAISE NOTICE 'Users table has id column';
    ELSE
      RAISE NOTICE 'WARNING: Users table missing id column';
    END IF;
  ELSE
    RAISE NOTICE 'WARNING: Public users table does NOT exist';
  END IF;
END $$;

-- Check for any triggers on auth.users table (besides ours)
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  RAISE NOTICE '=== CHECKING TRIGGERS ON AUTH.USERS TABLE ===';

  FOR trigger_record IN
    SELECT trigger_name, action_timing, event_manipulation, action_statement
    FROM information_schema.triggers
    WHERE event_object_schema = 'auth'
      AND event_object_table = 'users'
  LOOP
    RAISE NOTICE 'Auth Trigger: % (%) on % - Statement: %',
      trigger_record.trigger_name, trigger_record.action_timing,
      trigger_record.event_manipulation, trigger_record.action_statement;
  END LOOP;

  -- If no triggers found
  IF NOT FOUND THEN
    RAISE NOTICE 'No triggers found on auth.users table';
  END IF;
END $$;