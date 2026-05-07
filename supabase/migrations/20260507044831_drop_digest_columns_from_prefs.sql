-- ============================================================================
-- Migration: Drop digest_* + timezone columns from user_notification_preferences
-- Date: 2026-05-07
--
-- WHY:
-- The Daily Digest / "JARVIS Morning Briefing" feature was retired on
-- 2026-05-07. The cron + job + preview API + email templates + service
-- references + UI section have all been deleted.
--
-- An earlier migration (20251020060000_remove_digest_functionality.sql)
-- attempted to drop these columns but they remained physically present on
-- prod (verified via direct probe 2026-05-07). This migration uses
-- IF EXISTS to drop them idempotently — safe on prod (drops them) and
-- safe on any environment where they're already gone (no-op).
--
-- After this runs, prod's user_notification_preferences shape will match
-- the schema-check audit's EXPECTED_SCHEMA exactly.
-- ============================================================================

ALTER TABLE public.user_notification_preferences
  DROP COLUMN IF EXISTS digest_enabled,
  DROP COLUMN IF EXISTS digest_time,
  DROP COLUMN IF EXISTS digest_timezone,
  DROP COLUMN IF EXISTS digest_frequency,
  DROP COLUMN IF EXISTS timezone;

DO $$
BEGIN
  RAISE NOTICE '✅ Daily-digest columns dropped from user_notification_preferences';
END
$$;
