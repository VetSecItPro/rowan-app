-- ============================================================================
-- Migration: Fill remaining schema drift surfaced by Task 8.5 audit
-- Date: 2026-05-06
--
-- WHY:
-- The new schema-drift audit script (scripts/ci/schema-check.ts) ran on
-- a fresh CI Supabase boot and found two more columns that production
-- has via squashed history but migrations don't recreate:
--
--   1. user_notification_preferences.digest_enabled (and friends)
--      Referenced in lib/services/reminder-notifications-service.ts and
--      PREFERENCE_COLUMNS const in notification-preferences-service.ts.
--      Used by the daily/weekly digest email feature.
--
--   2. daily_checkins.energy_level
--      Referenced in lib/hooks/useCheckIn.ts + checkins-service.ts.
--      The check-in flow stores mood + energy as a 1-5 scale.
--
-- Same fix pattern as the prior 3 schema-drift migrations
-- (subscriptions trial cols, events countdown cols, sync_priority typo).
-- IDEMPOTENT — safe on prod (no-op) and local CI (where they're missing).
-- ============================================================================

-- ─── user_notification_preferences ─────────────────────────────────
-- Daily/weekly digest email preferences. Sourced from PREFERENCE_COLUMNS
-- in lib/services/notification-preferences-service.ts.
ALTER TABLE public.user_notification_preferences
  ADD COLUMN IF NOT EXISTS digest_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS digest_time TIME,
  ADD COLUMN IF NOT EXISTS digest_timezone TEXT;

COMMENT ON COLUMN public.user_notification_preferences.digest_enabled IS
  'When TRUE, user receives a daily/weekly summary email instead of (or in addition to) per-event notifications.';

COMMENT ON COLUMN public.user_notification_preferences.digest_time IS
  'Local time-of-day for the digest email (HH:MM:SS). NULL means use service default (typically 8am).';

COMMENT ON COLUMN public.user_notification_preferences.digest_timezone IS
  'IANA timezone for digest_time interpretation. NULL means fall back to user.timezone.';

-- ─── daily_checkins ─────────────────────────────────────────────────
-- Energy is a self-reported 1-5 scale paired with mood. NULL = not
-- recorded for this check-in (some users only answer mood).
ALTER TABLE public.daily_checkins
  ADD COLUMN IF NOT EXISTS energy_level SMALLINT;

ALTER TABLE public.daily_checkins
  DROP CONSTRAINT IF EXISTS daily_checkins_energy_level_check;

ALTER TABLE public.daily_checkins
  ADD CONSTRAINT daily_checkins_energy_level_check
    CHECK (energy_level IS NULL OR energy_level BETWEEN 1 AND 5);

COMMENT ON COLUMN public.daily_checkins.energy_level IS
  'Self-reported energy on a 1-5 scale (1=exhausted, 5=energized). NULL when user skipped the energy question.';

DO $$
BEGIN
  RAISE NOTICE '✅ user_notification_preferences digest_* + daily_checkins.energy_level columns ensured';
END
$$;
