-- Migration: fix_high_rls_and_function_security
-- Fixes: FIX-001, FIX-002, FIX-003, FIX-004 (HIGH severity)
-- Date: 2026-02-02

-- FIX-001: late_penalties INSERT policy - restrict to service_role only
-- Previously allowed any authenticated user to insert penalties
DROP POLICY IF EXISTS "Service role can insert penalties" ON late_penalties;
CREATE POLICY "Service role can insert penalties" ON late_penalties FOR INSERT TO service_role WITH CHECK (true);

-- FIX-002: Compliance tables INSERT policies - restrict to service_role only
-- Previously allowed any authenticated user to insert into compliance tables
DROP POLICY IF EXISTS "Service can insert agreements" ON data_processing_agreements;
CREATE POLICY "Service can insert agreements" ON data_processing_agreements FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service can insert CCPA preferences" ON ccpa_do_not_sell;
CREATE POLICY "Service can insert CCPA preferences" ON ccpa_do_not_sell FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service can insert privacy preferences" ON user_privacy_preferences;
CREATE POLICY "Service can insert privacy preferences" ON user_privacy_preferences FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service can insert compliance events" ON compliance_events_log;
CREATE POLICY "Service can insert compliance events" ON compliance_events_log FOR INSERT TO service_role WITH CHECK (true);

-- FIX-003: Revoke store_oauth_token from authenticated users (no ownership validation)
REVOKE EXECUTE ON FUNCTION store_oauth_token FROM authenticated;

-- FIX-004: Revoke delete_oauth_tokens from authenticated users (no ownership validation)
REVOKE EXECUTE ON FUNCTION delete_oauth_tokens FROM authenticated;
