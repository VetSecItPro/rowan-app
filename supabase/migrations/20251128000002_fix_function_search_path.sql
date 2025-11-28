-- =============================================
-- FIX FUNCTION SEARCH PATH WARNINGS
-- Date: November 28, 2025
-- Purpose: Set search_path on all functions to prevent search_path injection attacks
-- =============================================

-- Use DO block to safely alter functions (ignores errors for non-existent signatures)
DO $$
DECLARE
    func_record RECORD;
    alter_sql TEXT;
BEGIN
    -- Loop through all functions in public schema that don't have search_path set
    FOR func_record IN
        SELECT
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as args,
            p.oid
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.prokind = 'f'  -- Only functions, not procedures or aggregates
          AND NOT EXISTS (
              SELECT 1 FROM pg_options_to_table(p.proconfig)
              WHERE option_name = 'search_path'
          )
    LOOP
        BEGIN
            alter_sql := format(
                'ALTER FUNCTION %I.%I(%s) SET search_path = public',
                func_record.schema_name,
                func_record.function_name,
                func_record.args
            );
            EXECUTE alter_sql;
            RAISE NOTICE 'Fixed: %.%(%)', func_record.schema_name, func_record.function_name, func_record.args;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipped: %.%(%): %', func_record.schema_name, func_record.function_name, func_record.args, SQLERRM;
        END;
    END LOOP;
END $$;

-- Fix materialized view - revoke public access
REVOKE SELECT ON public.quick_action_stats FROM anon;

-- Note: The "auth_leaked_password_protection" warning needs to be enabled in the Supabase Dashboard
-- Go to: Authentication > Providers > Email > Enable "Leaked password protection"

COMMENT ON SCHEMA public IS 'Function search_path security fixed on 2025-11-28';
