-- =============================================================================
-- SECURITY FIX: Enable RLS on beta_daily_analytics
-- This fixes security advisor warning: rls_disabled_in_public
-- =============================================================================

-- The whole beta system was dropped in 20260212200443_drop_beta_system_complete.sql.
-- Wrap in IF EXISTS so this migration is a no-op on a fresh DB where the
-- table never existed; on prod it ran when the table still existed and
-- has since been dropped (RLS state was irrelevant after drop anyway).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='beta_daily_analytics') THEN
    EXECUTE 'ALTER TABLE public.beta_daily_analytics ENABLE ROW LEVEL SECURITY';
    EXECUTE $cmd$
      CREATE POLICY "Service role has full access to beta_daily_analytics"
      ON public.beta_daily_analytics
      FOR ALL
      USING ((select auth.role()) = 'service_role')
      WITH CHECK ((select auth.role()) = 'service_role')
    $cmd$;
    EXECUTE $cmd$
      COMMENT ON TABLE public.beta_daily_analytics IS 'Admin-only analytics data. RLS enabled with service-role-only access.'
    $cmd$;
  END IF;
END $$;


-- =============================================================================
-- PERFORMANCE FIX: Optimize RLS policies using (select auth.xxx())
-- This fixes: auth_rls_initplan warnings
-- Wrapping auth functions in SELECT prevents re-evaluation per row
-- =============================================================================

-- Beta config + invite codes were dropped with the rest of the beta
-- system in 20260212200443_drop_beta_system_complete.sql. Wrap in
-- table-existence guards so this migration is a no-op on fresh DBs.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='beta_config') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin can modify beta config" ON public.beta_config';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can read beta config" ON public.beta_config';
    EXECUTE $cmd$
      CREATE POLICY "Admin can modify beta config" ON public.beta_config
      FOR ALL
      USING ( EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = (select auth.uid()) AND admin_users.is_active = true) )
      WITH CHECK ( EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = (select auth.uid()) AND admin_users.is_active = true) )
    $cmd$;
    EXECUTE $cmd$
      CREATE POLICY "Authenticated users can read beta config" ON public.beta_config
      FOR SELECT
      USING ((select auth.role()) = 'authenticated')
    $cmd$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='beta_invite_codes') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin full access to invite codes" ON public.beta_invite_codes';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own invite code" ON public.beta_invite_codes';
    EXECUTE $cmd$
      CREATE POLICY "Admin full access to invite codes" ON public.beta_invite_codes
      FOR ALL
      USING ( EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = (select auth.uid()) AND admin_users.is_active = true) )
      WITH CHECK ( EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = (select auth.uid()) AND admin_users.is_active = true) )
    $cmd$;
    EXECUTE $cmd$
      CREATE POLICY "Users can view own invite code" ON public.beta_invite_codes
      FOR SELECT
      USING (used_by = (select auth.uid()))
    $cmd$;
  END IF;
END $$;


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
