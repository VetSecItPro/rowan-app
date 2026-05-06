-- ============================================================================
-- Migration: Add missing show_countdown / countdown_label columns to events
-- Date: 2026-05-06
--
-- WHY:
-- Same class of schema drift as 20260506153334_add_subscription_trial_columns.
-- The events table's initial migration (20251005000000_initial_schema) does
-- not include show_countdown or countdown_label. The application code
-- references them in CalendarEvent (lib/services/calendar-service.ts) and
-- the NewEventModal sets them on create — but no migration adds them.
-- Production has the columns (presumably from squashed history); a fresh
-- Supabase boot from migrations alone does NOT — local CI rejected
-- INSERT INTO events with:
--   PGRST204: Could not find the 'countdown_label' column of 'events' in the schema cache
--
-- This bubbled up as the calendar.spec.ts:65 (can create new event) E2E
-- test failing — modal stayed open, "Failed to save event" alert visible.
--
-- IDEMPOTENT: ADD COLUMN IF NOT EXISTS — safe on prod (no-op) and local CI.
-- ============================================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS show_countdown BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS countdown_label TEXT;

COMMENT ON COLUMN public.events.show_countdown IS
  'When TRUE, this event renders as a countdown widget on the dashboard via CountdownWidget. Most events have FALSE; user opts in per-event.';

COMMENT ON COLUMN public.events.countdown_label IS
  'Optional custom label for the countdown widget (e.g., "Birthday!", "Vacation!"). NULL means use the event title as fallback.';

DO $$
BEGIN
  RAISE NOTICE '✅ events.show_countdown + countdown_label columns ensured';
END
$$;
