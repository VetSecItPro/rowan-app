-- Drop all functions flagged by Supabase DB lint as broken (reference dropped tables or missing columns).
-- These functions were left behind after the 2026-03-16 table cleanup (210→185 tables).
-- All are non-functional at runtime — they error on any call.
-- PostGIS functions (st_findextent, populate_geometry_columns, etc.) are NOT touched.

-- ============================================================
-- 1. Functions referencing dropped tables
-- ============================================================

-- References: meal_plan_tasks (dropped 2026-03-16)
DROP FUNCTION IF EXISTS public.auto_complete_meal_tasks();
DROP FUNCTION IF EXISTS public.create_meal_prep_task(uuid, uuid, uuid);

-- References: activity_feed (dropped 2026-03-16)
DROP FUNCTION IF EXISTS public.create_activity_feed_entry(uuid, uuid, character varying, jsonb, uuid, uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.get_activity_feed(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.get_user_activity_summary(uuid, integer);

-- References: task_activity_log (dropped 2026-03-16)
DROP FUNCTION IF EXISTS public.cleanup_old_activity_logs();
DROP FUNCTION IF EXISTS public.get_task_history(uuid);

-- References: event_audit_log (dropped 2026-03-16)
DROP FUNCTION IF EXISTS public.cleanup_event_audit_log();

-- References: calendar_oauth_tokens (dropped 2026-03-16)
DROP FUNCTION IF EXISTS public.get_oauth_token(uuid, text);
DROP FUNCTION IF EXISTS public.store_oauth_token(uuid, text, text, text);

-- References: reminder_mentions (dropped 2026-03-16)
DROP FUNCTION IF EXISTS public.process_reminder_mentions(uuid, text, uuid, text, uuid);

-- References: upgrade_page_visits (dropped 2026-03-16)
DROP FUNCTION IF EXISTS public.track_upgrade_page_visit(text);

-- References: beta_access_requests (dropped via beta cleanup)
DROP FUNCTION IF EXISTS public.get_admin_dashboard_stats();

-- References: private.admin_beta_users_status (never existed)
DROP FUNCTION IF EXISTS public.get_admin_beta_users_status();

-- References: beta system (fully removed 2026-02-10)
DROP FUNCTION IF EXISTS public.increment_beta_requests(text);

-- ============================================================
-- 2. Functions referencing existing tables but with wrong columns/types
-- ============================================================

-- References expenses.subcategory (column does not exist)
DROP FUNCTION IF EXISTS public.get_financial_report_data(uuid, date, date, jsonb);

-- References partnerships table (does not exist)
DROP FUNCTION IF EXISTS public.get_space_members_for_mentions(uuid);

-- Type mismatch: text = uuid operator error
DROP FUNCTION IF EXISTS public.soft_delete_message_for_user(uuid, uuid);

-- gen_random_bytes() not available (pgcrypto not in search path)
DROP FUNCTION IF EXISTS public.generate_report_share_token();

-- References habit_streaks.current_streak (column does not exist)
DROP FUNCTION IF EXISTS public.get_todays_habits(uuid, uuid);

-- References monetization_logs.stripe_customer_id (column renamed to polar_*)
DROP FUNCTION IF EXISTS public.insert_monetization_log(text, text, uuid, text, text, numeric, text, text, text, text, text, text, text, jsonb);

-- ============================================================
-- 3. Unused functions with warnings (cleanup)
-- ============================================================

-- Not referenced anywhere in codebase, has shadowed variable warning
DROP FUNCTION IF EXISTS public.generate_invite_code();

-- No-op placeholders with unused parameter warnings; daily_analytics table doesn't exist
DROP FUNCTION IF EXISTS public.increment_admin_logins(text);
DROP FUNCTION IF EXISTS public.increment_admin_logins(date);
DROP FUNCTION IF EXISTS public.increment_launch_signups(text);
DROP FUNCTION IF EXISTS public.increment_launch_signups(date);

-- ============================================================
-- 4. Fix cleanup_all_audit_logs (references now-dropped cleanup_event_audit_log)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_all_audit_logs()
RETURNS TABLE(log_table text, deleted_rows integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 'account_deletion_audit_log'::text, cleanup_account_deletion_audit_log()
  UNION ALL
  SELECT 'ccpa_audit_log'::text, cleanup_ccpa_audit_log()
  UNION ALL
  SELECT 'user_audit_log'::text, cleanup_user_audit_log();
END;
$function$;
