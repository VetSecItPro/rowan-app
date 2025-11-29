-- Run this query in Supabase SQL Editor
-- It generates DROP and CREATE statements for all affected RLS policies
-- Copy the entire 'fix_sql' column output and run it in a new SQL Editor tab

SELECT
    E'-- Fix policy: ' || policyname || E' on ' || tablename || E'\n' ||
    'DROP POLICY IF EXISTS "' || policyname || '" ON public.' || tablename || ';' || E'\n' ||
    'CREATE POLICY "' || policyname || '" ON public.' || tablename || E'\n' ||
    '  AS ' || CASE WHEN permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END || E'\n' ||
    '  FOR ' || cmd || E'\n' ||
    '  TO ' || COALESCE(array_to_string(roles, ', '), 'public') || E'\n' ||
    CASE
        WHEN qual IS NOT NULL THEN
            '  USING (' || regexp_replace(qual, 'auth\.uid\(\)', '(select auth.uid())', 'g') || ')' || E'\n'
        ELSE ''
    END ||
    CASE
        WHEN with_check IS NOT NULL THEN
            '  WITH CHECK (' || regexp_replace(with_check, 'auth\.uid\(\)', '(select auth.uid())', 'g') || ')' || E'\n'
        ELSE ''
    END ||
    ';' || E'\n'
    AS fix_sql
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
  AND NOT (qual LIKE '%(select auth.uid())%' OR qual LIKE '%( select auth.uid())%')
ORDER BY tablename, policyname;
