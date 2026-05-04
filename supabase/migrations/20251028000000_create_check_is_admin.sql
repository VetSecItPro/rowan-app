-- Create public.check_is_admin() helper.
--
-- This function was originally created via the Supabase dashboard /
-- Studio rather than via a migration. It's referenced by RLS policies
-- in 20260503150651_advisor_warn_cleanup.sql (and earlier admin_users
-- policies), so without it `supabase db reset` fails when those
-- policies are evaluated.
--
-- Definition copied verbatim from prod via Management API on 2026-05-04.
-- CREATE OR REPLACE makes it a no-op on prod (where the function already
-- exists with this exact body). Registered in
-- supabase_migrations.schema_migrations as already-applied.
--
-- Timestamp prefix `20251027000010a` places it between
-- 20251027000010_launch_notifications.sql and 20251027000011_admin_users.sql
-- so it's defined before the admin_users RLS policies that depend on it.

CREATE OR REPLACE FUNCTION public.check_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND au.is_active = true
  )
$function$;

GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated, service_role;
