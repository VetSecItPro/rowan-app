-- ============================================================================
-- Migration: Fix calculate_sync_priority() — column "start_date" does not exist
-- Date: 2026-05-06
--
-- WHY:
-- migration 20251203110010_add_calendar_triggers.sql created the function:
--
--   CREATE OR REPLACE FUNCTION calculate_sync_priority(p_event_id UUID, ...)
--   ...
--     SELECT start_date INTO v_event_start FROM events WHERE id = p_event_id;
--                ^^^^^^^^^^ — typo, events column is start_time
--
-- This function is called from the calendar_sync_queue trigger
-- (queue_event_for_sync) which fires on every INSERT/UPDATE/DELETE on
-- events. Because PL/pgSQL function bodies are validated lazily, the
-- function compiles fine but throws at runtime when the trigger runs:
--
--   42703: column "start_date" does not exist
--   hint: Perhaps you meant to reference the column "events.start_time".
--
-- This blocked every calendar event INSERT in CI from succeeding —
-- the calendar.spec.ts:65 (can create event) test fails because the
-- API returns 500 → modal stays open with "Failed to save event".
--
-- Production has not seen this because the calendar sync queue trigger
-- only fires when there are active calendar_connections rows in the
-- bidirectional/outbound_only sync state. Production CI / dev workflows
-- without external calendar connections don't trip the bug. CI's local
-- Supabase has no connections either, but the function still gets
-- called inside the trigger's IF...LOOP, which evaluates the SELECT
-- regardless of LOOP body running.
--
-- FIX: drop and recreate the function with the correct column name.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_sync_priority(p_event_id UUID, p_operation queue_operation)
RETURNS INTEGER AS $$
DECLARE
  v_event_start TIMESTAMPTZ;
  v_hours_until_start DOUBLE PRECISION;
BEGIN
  -- Delete operations have higher priority
  IF p_operation = 'delete' THEN
    RETURN 2;
  END IF;

  -- Get event start time (FIX: was 'start_date', should be 'start_time')
  SELECT start_time INTO v_event_start FROM public.events WHERE id = p_event_id;

  IF v_event_start IS NULL THEN
    RETURN 5; -- Default priority
  END IF;

  -- Calculate hours until event starts
  v_hours_until_start := EXTRACT(EPOCH FROM (v_event_start - NOW())) / 3600;

  -- Priority based on time until event
  IF v_hours_until_start <= 1 THEN
    RETURN 1; -- Urgent: event within 1 hour
  ELSIF v_hours_until_start <= 24 THEN
    RETURN 3; -- High: event within 24 hours
  ELSIF v_hours_until_start <= 168 THEN
    RETURN 5; -- Normal: event within 7 days
  ELSE
    RETURN 7; -- Background: future events
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.calculate_sync_priority TO service_role;

DO $$
BEGIN
  RAISE NOTICE '✅ calculate_sync_priority() fixed (start_date → start_time)';
END
$$;
