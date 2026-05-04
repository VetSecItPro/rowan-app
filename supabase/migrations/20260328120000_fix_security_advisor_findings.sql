-- Migration: Fix ALL Supabase Security Advisor findings
-- Date: 2026-03-28
-- Scope: 2 errors (security definer views, RLS disabled) + warnings (search path, permissive policies, auth initplan)
--
-- NOTE 2026-04-27: This migration originally addressed a "spatial_ref_sys
-- exposed via PostGIS" advisor finding via REVOKE statements. Those REVOKEs
-- were a silent no-op — the `postgres` role isn't a member of `supabase_admin`
-- so it cannot revoke privileges it doesn't own. The finding was instead
-- resolved by dropping the PostGIS extension entirely in
-- 20260426000002_drop_postgis.sql (PostGIS was unused — location tables
-- stored raw DECIMAL lat/lon, never PostGIS types).
--
-- Do NOT edit applied SQL below — migrations are immutable. This note exists
-- so the next reader understands the spatial_ref_sys handling is superseded.

BEGIN;

-- The `automation` schema and `sm_*` tables are not part of Rowan
-- (CLAUDE.md isolation rules — they belong to other tenants sharing
-- this Supabase project). They don't exist on a fresh DB. Wrap each
-- non-Rowan operation in existence guards so this migration is a
-- no-op locally; on prod where the schemas/tables exist, the body
-- runs normally.

-- =============================================================================
-- SECTION 1: Security Definer Views (ERROR) — automation schema
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name='automation') THEN
    EXECUTE 'ALTER VIEW automation.pending_responses SET (security_invoker = on)';
    EXECUTE 'ALTER VIEW automation.daily_stats SET (security_invoker = on)';
  END IF;
END $$;

-- =============================================================================
-- SECTION 2: RLS Disabled — automation schema tables (ERROR)
-- =============================================================================
DO $$
DECLARE t TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name='automation') THEN
    RETURN;
  END IF;
  FOREACH t IN ARRAY ARRAY['workflow_logs','reddit_monitoring','subreddit_config','product_context'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='automation' AND table_name=t) THEN
      EXECUTE format('ALTER TABLE automation.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format($cmd$
        DROP POLICY IF EXISTS "Service role only" ON automation.%I;
        CREATE POLICY "Service role only" ON automation.%I
          FOR ALL USING ((select auth.role()) = 'service_role')
      $cmd$, t, t);
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- SECTION 3: RLS Disabled — sm_* shared SteelMotion CRM tables (ERROR)
-- Enable RLS with service_role-only access
-- =============================================================================

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['sm_leads','sm_activities','sm_deals','sm_proposals'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format($cmd$
        DROP POLICY IF EXISTS "Service role only" ON public.%I;
        CREATE POLICY "Service role only" ON public.%I
          FOR ALL USING ((select auth.role()) = 'service_role')
      $cmd$, t, t);
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- SECTION 4: RLS Disabled — public.spatial_ref_sys (ERROR)
-- PostGIS system table — enable RLS with read-only access for all
-- =============================================================================

-- spatial_ref_sys: owned by supabase_admin, cannot enable RLS directly.
-- Restrict access via REVOKE/GRANT instead (same effect).
REVOKE ALL ON public.spatial_ref_sys FROM anon, authenticated;
GRANT SELECT ON public.spatial_ref_sys TO anon, authenticated;

-- =============================================================================
-- SECTION 5: RLS Disabled — public.site_visits (ERROR)
-- Analytics table written by visitor tracking API (supabaseAdmin), read by admin
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='site_visits') THEN
    EXECUTE 'ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Service role only" ON public.site_visits';
    EXECUTE $cmd$
      CREATE POLICY "Service role only" ON public.site_visits
        FOR ALL USING ((select auth.role()) = 'service_role')
    $cmd$;
  END IF;
END $$;

-- =============================================================================
-- SECTION 6: Function Search Path Mutable (WARNING)
-- Set search_path on functions to prevent search path injection attacks
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname='get_task_stats' AND pronamespace='public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.get_task_stats SET search_path = public';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name='automation') AND
     EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE p.proname='update_updated_at' AND n.nspname='automation') THEN
    EXECUTE 'ALTER FUNCTION automation.update_updated_at SET search_path = automation';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname='sm_update_updated_at' AND pronamespace='public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.sm_update_updated_at SET search_path = public';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname='cleanup_old_site_visits' AND pronamespace='public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.cleanup_old_site_visits SET search_path = public';
  END IF;
END $$;

-- =============================================================================
-- SECTION 7: RLS Policy Always True — sm_* tables (WARNING)
-- Replace overly permissive USING(true) policies with proper role checks
-- =============================================================================

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['sm_clients','sm_invoice_items','sm_invoices','sm_service_templates'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format($cmd$
        DROP POLICY IF EXISTS "Service role full access" ON public.%I;
        CREATE POLICY "Service role full access" ON public.%I
          FOR ALL USING ((select auth.role()) = 'service_role')
          WITH CHECK ((select auth.role()) = 'service_role')
      $cmd$, t, t);
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- SECTION 8: Auth RLS InitPlan — user_feedback policies (WARNING)
-- Recreate policies using (select auth.uid()) subselect pattern for performance
-- Also fixes "multiple permissive policies" by adding proper role check
-- =============================================================================

DROP POLICY IF EXISTS "Service role full access" ON public.user_feedback;
CREATE POLICY "Service role full access" ON public.user_feedback AS RESTRICTIVE
  FOR ALL USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Users can insert own feedback" ON public.user_feedback;
CREATE POLICY "Users can insert own feedback" ON public.user_feedback
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can read own feedback" ON public.user_feedback;
CREATE POLICY "Users can read own feedback" ON public.user_feedback
  FOR SELECT USING ((select auth.uid()) = user_id);

-- =============================================================================
-- SECTION 9: PostGIS Extension in Public Schema (INFO — acknowledged, deferred)
-- Moving postgis to a dedicated schema requires updating all spatial queries
-- and is high-risk for minimal security benefit. Deferring intentionally.
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public
-- =============================================================================

COMMIT;
