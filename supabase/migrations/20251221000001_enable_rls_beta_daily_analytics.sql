-- =============================================================================
-- SECURITY FIX: Enable RLS on beta_daily_analytics
-- This fixes security advisor warning: rls_disabled_in_public
-- =============================================================================

ALTER TABLE public.beta_daily_analytics ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by admin API routes)
CREATE POLICY "Service role has full access to beta_daily_analytics"
ON public.beta_daily_analytics
FOR ALL
USING ((select auth.role()) = 'service_role')
WITH CHECK ((select auth.role()) = 'service_role');

COMMENT ON TABLE public.beta_daily_analytics IS 'Admin-only analytics data. RLS enabled with service-role-only access.';


-- =============================================================================
-- PERFORMANCE FIX: Optimize RLS policies using (select auth.xxx())
-- This fixes: auth_rls_initplan warnings
-- Wrapping auth functions in SELECT prevents re-evaluation per row
-- =============================================================================

-- Fix beta_config policies
DROP POLICY IF EXISTS "Admin can modify beta config" ON public.beta_config;
DROP POLICY IF EXISTS "Authenticated users can read beta config" ON public.beta_config;

-- Recreate with optimized auth function calls
CREATE POLICY "Admin can modify beta config" ON public.beta_config
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = (select auth.uid())
    AND admin_users.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = (select auth.uid())
    AND admin_users.is_active = true
  )
);

CREATE POLICY "Authenticated users can read beta config" ON public.beta_config
FOR SELECT
USING ((select auth.role()) = 'authenticated');


-- Fix beta_invite_codes policies
DROP POLICY IF EXISTS "Admin full access to invite codes" ON public.beta_invite_codes;
DROP POLICY IF EXISTS "Users can view own invite code" ON public.beta_invite_codes;

CREATE POLICY "Admin full access to invite codes" ON public.beta_invite_codes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = (select auth.uid())
    AND admin_users.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = (select auth.uid())
    AND admin_users.is_active = true
  )
);

CREATE POLICY "Users can view own invite code" ON public.beta_invite_codes
FOR SELECT
USING (used_by = (select auth.uid()));


-- Fix feature_events policy
DROP POLICY IF EXISTS "Admin read access" ON public.feature_events;

CREATE POLICY "Admin read access" ON public.feature_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = (select auth.uid())
    AND admin_users.is_active = true
  )
);


-- Fix feature_usage_daily policy
DROP POLICY IF EXISTS "Admin only access" ON public.feature_usage_daily;

CREATE POLICY "Admin only access" ON public.feature_usage_daily
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = (select auth.uid())
    AND admin_users.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = (select auth.uid())
    AND admin_users.is_active = true
  )
);
