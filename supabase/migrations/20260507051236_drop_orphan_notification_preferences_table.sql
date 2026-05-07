-- ============================================================================
-- Migration: Drop orphan notification_preferences table
-- Date: 2026-05-07
--
-- WHY:
-- Migration 20251020000002_cleanup_duplicate_notification_tables.sql tried
-- to DROP this table on 2025-10-20 but the drop silently failed against
-- prod (verified via direct probe 2026-05-07 — the table was still
-- physically present with 1 stale default row from 2026-02-15).
--
-- The only consumer was lib/services/notification-service.ts, which had
-- ZERO non-test callers in the application code. That service file +
-- its unit test were deleted in this same PR.
--
-- The active notification preferences live on the user_notification_preferences
-- table (note: plural-vs-singular was the only thing keeping the active and
-- orphan systems disambiguated). Future code uses ONLY user_notification_preferences.
--
-- IDEMPOTENT: IF EXISTS — safe to run on prod (drops it) and on any env
-- where the table was already cleaned up (no-op).
-- ============================================================================

DROP TABLE IF EXISTS public.notification_preferences CASCADE;

DO $$
BEGIN
  RAISE NOTICE '✅ Orphan notification_preferences table dropped (active table is user_notification_preferences)';
END
$$;
