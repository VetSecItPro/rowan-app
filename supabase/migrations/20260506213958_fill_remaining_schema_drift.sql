-- ============================================================================
-- Migration: Add daily_checkins.energy_level (Task 8.5 audit drift fix)
-- Date: 2026-05-06
--
-- WHY:
-- The schema-drift audit (scripts/ci/schema-check.ts) found that the
-- daily_checkins table is missing the energy_level column that
-- lib/hooks/useCheckIn.ts and checkins-service.ts reference. The
-- check-in flow stores mood + energy as a paired 1-5 scale.
--
-- IDEMPOTENT — safe on prod (no-op) and local CI (where it's missing).
--
-- NOTE: an earlier draft of this migration also re-added digest_*
-- columns to user_notification_preferences. That was wrong-direction —
-- migration 20251020060000_remove_digest_functionality.sql intentionally
-- DROPPED those columns. The application code in
-- notification-preferences-service.ts (PREFERENCE_COLUMNS const) is
-- stale and references columns that don't exist on the actual table.
-- That's a code-cleanup job (Phase 8.6 in backlog), not a schema fix.
-- ============================================================================

-- ─── daily_checkins.energy_level ─────────────────────────────────────
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
  RAISE NOTICE '✅ daily_checkins.energy_level column ensured';
END
$$;
