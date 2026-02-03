-- Migration: fix_medium_db_security
-- Fixes: FIX-009, FIX-010, FIX-011, FIX-012, FIX-014, FIX-032, FIX-033 (MEDIUM severity)
-- Date: 2026-02-02

-- FIX-009: nudge_history INSERT policy - restrict to service_role only
DROP POLICY IF EXISTS "Service can insert nudge history" ON nudge_history;
CREATE POLICY "Service can insert nudge history" ON nudge_history FOR INSERT TO service_role WITH CHECK (true);

-- FIX-010: activity_log INSERT policy - restrict to service_role only
DROP POLICY IF EXISTS "Service can insert activity logs" ON activity_log;
CREATE POLICY "Service can insert activity logs" ON activity_log FOR INSERT TO service_role WITH CHECK (true);

-- FIX-011: 11 SECURITY DEFINER functions missing SET search_path
ALTER FUNCTION IF EXISTS verify_calendar_rls_enabled SET search_path = public;
ALTER FUNCTION IF EXISTS resolve_calendar_conflict SET search_path = public;
ALTER FUNCTION IF EXISTS update_calendar_table_statistics SET search_path = public;
ALTER FUNCTION IF EXISTS check_calendar_index_health SET search_path = public;
ALTER FUNCTION IF EXISTS calculate_space_storage SET search_path = public;
ALTER FUNCTION IF EXISTS check_storage_quota SET search_path = public;
ALTER FUNCTION IF EXISTS claim_founding_member_number SET search_path = public;
ALTER FUNCTION IF EXISTS get_founding_member_spots_remaining SET search_path = public;
ALTER FUNCTION IF EXISTS aggregate_feature_usage_daily SET search_path = public;
ALTER FUNCTION IF EXISTS get_feature_usage_summary SET search_path = public;
ALTER FUNCTION IF EXISTS cleanup_old_feature_events SET search_path = public;

-- FIX-012: Webhook helper functions - set search_path and restrict access to service_role
ALTER FUNCTION IF EXISTS increment_webhook_event_count SET search_path = public;
ALTER FUNCTION IF EXISTS get_expiring_webhooks SET search_path = public;
ALTER FUNCTION IF EXISTS deactivate_webhook SET search_path = public;
REVOKE EXECUTE ON FUNCTION increment_webhook_event_count FROM public;
REVOKE EXECUTE ON FUNCTION get_expiring_webhooks FROM public;
REVOKE EXECUTE ON FUNCTION deactivate_webhook FROM public;
GRANT EXECUTE ON FUNCTION increment_webhook_event_count TO service_role;
GRANT EXECUTE ON FUNCTION get_expiring_webhooks TO service_role;
GRANT EXECUTE ON FUNCTION deactivate_webhook TO service_role;

-- FIX-014: user_has_space_access search_path
ALTER FUNCTION IF EXISTS user_has_space_access SET search_path = public;

-- FIX-032: late_penalties.user_id missing FK constraint
ALTER TABLE late_penalties ADD CONSTRAINT fk_late_penalties_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- FIX-033: late_penalties timestamps should be NOT NULL
ALTER TABLE late_penalties ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE late_penalties ALTER COLUMN updated_at SET NOT NULL;
