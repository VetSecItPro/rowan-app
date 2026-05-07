-- ============================================================================
-- Migration: Create increment_daily_usage RPC
-- Date: 2026-05-07
--
-- WHY:
-- lib/services/usage-service.ts incrementUsage() calls this RPC, but no
-- migration creates it. Prod has it (presumably added via dashboard during
-- the Oct 2025 monetization rollout), but CI's local Supabase rebuilds
-- from migrations and lacks the function — making the free-tier daily
-- task creation gate structurally inert in CI (and any fresh staging).
--
-- This is the SAME pattern as the digest_columns + notification_preferences
-- table issues from earlier in 2026-05 — production state diverged from
-- migration history.
--
-- IDEMPOTENT: CREATE OR REPLACE — safe on prod (replaces existing, same
-- shape) and CI (creates it).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_daily_usage(
  p_user_id UUID,
  p_usage_type TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_column_name TEXT;
BEGIN
  -- Strict whitelist of usage-type column names. Any other input is a
  -- programmer error or an injection attempt — fail loudly.
  IF p_usage_type NOT IN ('tasks_created', 'messages_sent', 'shopping_list_updates', 'quick_actions_used') THEN
    RAISE EXCEPTION 'Invalid usage_type: %', p_usage_type;
  END IF;

  v_column_name := p_usage_type;

  -- UPSERT: insert today's row if missing, otherwise increment the named column.
  -- The UNIQUE(user_id, date) constraint on daily_usage drives the conflict path.
  -- format() with %I quotes the column name safely.
  EXECUTE format(
    'INSERT INTO public.daily_usage (user_id, date, %I) VALUES ($1, CURRENT_DATE, $2) '
    'ON CONFLICT (user_id, date) DO UPDATE SET %I = public.daily_usage.%I + EXCLUDED.%I, updated_at = NOW()',
    v_column_name, v_column_name, v_column_name, v_column_name
  )
  USING p_user_id, p_amount;
END;
$$;

-- Allow authenticated users + service role to call this RPC.
-- The function is SECURITY DEFINER so it runs as the function owner
-- (typically postgres), bypassing RLS — appropriate for an atomic counter
-- update where the caller's auth.uid() is passed in explicitly.
GRANT EXECUTE ON FUNCTION public.increment_daily_usage(UUID, TEXT, INTEGER) TO authenticated, service_role;

DO $$
BEGIN
  RAISE NOTICE '✅ increment_daily_usage RPC created/replaced';
END
$$;
