-- ============================================
-- RLS Performance Optimization: auth.uid() → (SELECT auth.uid())
-- ============================================
-- PostgreSQL re-evaluates auth.uid() per row in RLS policies.
-- Wrapping it in (SELECT auth.uid()) makes PostgreSQL evaluate it
-- once per query as an InitPlan, which is significantly faster
-- on large tables.
--
-- This migration dynamically rewrites all RLS policies that use
-- bare auth.uid() calls to use the optimized subquery pattern.
-- ============================================

DO $$
DECLARE
  pol RECORD;
  new_qual TEXT;
  new_with_check TEXT;
  cmd_str TEXT;
  permissive_str TEXT;
  roles_str TEXT;
BEGIN
  FOR pol IN
    SELECT
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual IS NOT NULL AND qual ~ 'auth\.uid\(\)' AND qual !~ '\(\s*SELECT\s+auth\.uid\(\)\s*\)')
        OR
        (with_check IS NOT NULL AND with_check ~ 'auth\.uid\(\)' AND with_check !~ '\(\s*SELECT\s+auth\.uid\(\)\s*\)')
      )
  LOOP
    -- Build the optimized qual and with_check expressions
    new_qual := pol.qual;
    new_with_check := pol.with_check;

    IF new_qual IS NOT NULL THEN
      new_qual := regexp_replace(new_qual, 'auth\.uid\(\)', '(SELECT auth.uid())', 'g');
    END IF;

    IF new_with_check IS NOT NULL THEN
      new_with_check := regexp_replace(new_with_check, 'auth\.uid\(\)', '(SELECT auth.uid())', 'g');
    END IF;

    -- Determine PERMISSIVE or RESTRICTIVE
    IF pol.permissive = 'PERMISSIVE' THEN
      permissive_str := 'PERMISSIVE';
    ELSE
      permissive_str := 'RESTRICTIVE';
    END IF;

    -- Build roles string from the roles array
    roles_str := array_to_string(pol.roles, ', ');

    -- Drop the existing policy
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename);

    -- Recreate with optimized expressions
    cmd_str := format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      pol.policyname,
      pol.schemaname,
      pol.tablename,
      permissive_str,
      pol.cmd,
      roles_str
    );

    IF new_qual IS NOT NULL THEN
      cmd_str := cmd_str || ' USING (' || new_qual || ')';
    END IF;

    IF new_with_check IS NOT NULL THEN
      cmd_str := cmd_str || ' WITH CHECK (' || new_with_check || ')';
    END IF;

    EXECUTE cmd_str;

    RAISE NOTICE 'Optimized policy: % on %.%', pol.policyname, pol.schemaname, pol.tablename;
  END LOOP;
END;
$$;
