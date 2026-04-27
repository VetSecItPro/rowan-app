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

-- =============================================================================
-- SECTION 1: Security Definer Views (ERROR)
-- Remove SECURITY DEFINER from automation views by enabling security_invoker
-- =============================================================================

ALTER VIEW automation.pending_responses SET (security_invoker = on);
ALTER VIEW automation.daily_stats SET (security_invoker = on);

-- =============================================================================
-- SECTION 2: RLS Disabled — automation schema tables (ERROR)
-- Enable RLS with service_role-only access
-- =============================================================================

ALTER TABLE automation.workflow_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON automation.workflow_logs
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE automation.reddit_monitoring ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON automation.reddit_monitoring
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE automation.subreddit_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON automation.subreddit_config
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE automation.product_context ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON automation.product_context
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- SECTION 3: RLS Disabled — sm_* shared SteelMotion CRM tables (ERROR)
-- Enable RLS with service_role-only access
-- =============================================================================

ALTER TABLE public.sm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON public.sm_leads
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.sm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON public.sm_activities
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.sm_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON public.sm_deals
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.sm_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON public.sm_proposals
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- SECTION 4: RLS Disabled — public.spatial_ref_sys (ERROR)
-- PostGIS system table — enable RLS with read-only access for all
-- =============================================================================

ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access" ON public.spatial_ref_sys
  FOR SELECT USING (true);

-- =============================================================================
-- SECTION 5: RLS Disabled — public.site_visits (ERROR)
-- Analytics table written by visitor tracking API (supabaseAdmin), read by admin
-- =============================================================================

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON public.site_visits
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- SECTION 6: Function Search Path Mutable (WARNING)
-- Set search_path on functions to prevent search path injection attacks
-- =============================================================================

ALTER FUNCTION public.get_task_stats SET search_path = public;
ALTER FUNCTION automation.update_updated_at SET search_path = automation;
ALTER FUNCTION public.sm_update_updated_at SET search_path = public;
ALTER FUNCTION public.cleanup_old_site_visits SET search_path = public;

-- =============================================================================
-- SECTION 7: RLS Policy Always True — sm_* tables (WARNING)
-- Replace overly permissive USING(true) policies with proper role checks
-- =============================================================================

DROP POLICY IF EXISTS "Service role full access" ON public.sm_clients;
CREATE POLICY "Service role full access" ON public.sm_clients
  FOR ALL USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON public.sm_invoice_items;
CREATE POLICY "Service role full access" ON public.sm_invoice_items
  FOR ALL USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON public.sm_invoices;
CREATE POLICY "Service role full access" ON public.sm_invoices
  FOR ALL USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON public.sm_service_templates;
CREATE POLICY "Service role full access" ON public.sm_service_templates
  FOR ALL USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

-- =============================================================================
-- SECTION 8: Auth RLS InitPlan — user_feedback policies (WARNING)
-- Recreate policies using (select auth.uid()) subselect pattern for performance
-- Also fixes "multiple permissive policies" by adding proper role check
-- =============================================================================

DROP POLICY IF EXISTS "Service role full access" ON public.user_feedback;
CREATE POLICY "Service role full access" ON public.user_feedback
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
