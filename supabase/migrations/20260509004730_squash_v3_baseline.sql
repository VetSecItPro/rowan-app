-- =============================================================================
-- Migration: SQUASH v3 BASELINE — collapses 321 prior migrations into one
-- Date: 2026-05-08
--
-- This file is the canonical schema baseline for fresh CI replays. It is
-- NOT executed on prod — prod's schema already matches (Phase 9.3 closed
-- 0/0/0 drift), and the deploy workflow marks this migration as `applied`
-- without running it via `supabase migration repair --status applied`.
--
-- HOW THIS WAS GENERATED:
--   1. `pg_dump --schema-only --schema=public --no-owner --no-acl --no-comments`
--      against prod (PostgreSQL 17.6 via DATABASE_URL pooler)
--   2. Augmented with custom triggers on auth.users (extracted via
--      pg_get_triggerdef — pg_dump --schema=public misses these,
--      which was the cause of PR #387's first squash attempt failing
--      its E2E baseline)
--   3. Bracketed by SET statements that mirror what pg_dump emits
--
-- ON PROD:
--   The deploy workflow (.github/workflows/deploy.yml) detects the 321
--   "remote-only" old migrations (in schema_migrations table but not in
--   files) and auto-marks them as `reverted` via migration repair. This
--   PR's deploy step ALSO marks this new squash file as `applied` so
--   `supabase db push --linked` skips it. Net result on prod:
--   schema_migrations table has 1 row (this squash); prod schema is
--   unchanged.
--
-- ON FRESH CI REPLAY:
--   `supabase db reset` runs ONLY this file. CI gets a complete
--   prod-equivalent schema in seconds rather than replaying 321 files.
--
-- NEW MIGRATIONS GO AFTER THIS:
--   Future schema changes are added as 20260509+ timestamped files in
--   supabase/migrations/. The squash is the new "starting point" of the
--   timeline — earlier history is preserved in git but no longer
--   referenced for replay.
--
-- VERIFICATION POST-DEPLOY:
--   `npx tsx scripts/database/inventory-drift-extended.ts` → expect
--   MISMATCH: 0, LOCAL_ONLY: 0 (unchanged from pre-squash baseline).
-- =============================================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: activity_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.activity_type AS ENUM (
    'created',
    'updated',
    'deleted',
    'completed',
    'commented',
    'mentioned',
    'reacted',
    'shared',
    'assigned',
    'status_changed',
    'amount_changed',
    'date_changed'
);


--
-- Name: calendar_provider; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.calendar_provider AS ENUM (
    'google',
    'apple',
    'cozi'
);


--
-- Name: commentable_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.commentable_type AS ENUM (
    'expense',
    'goal',
    'task',
    'project',
    'budget',
    'bill',
    'meal_plan',
    'shopping_list',
    'message'
);


--
-- Name: presence_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.presence_status AS ENUM (
    'online',
    'offline'
);


--
-- Name: project_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.project_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


--
-- Name: project_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.project_status AS ENUM (
    'planning',
    'in-progress',
    'on-hold',
    'completed',
    'cancelled'
);


--
-- Name: queue_operation; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.queue_operation AS ENUM (
    'create',
    'update',
    'delete'
);


--
-- Name: queue_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.queue_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
);


--
-- Name: recurrence_frequency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.recurrence_frequency AS ENUM (
    'daily',
    'weekly',
    'bi-weekly',
    'monthly',
    'bi-monthly',
    'quarterly',
    'semi-annual',
    'annual'
);


--
-- Name: resolution_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.resolution_status AS ENUM (
    'detected',
    'resolved',
    'failed'
);


--
-- Name: resolution_strategy; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.resolution_strategy AS ENUM (
    'external_wins',
    'rowan_wins',
    'merge',
    'manual_review'
);


--
-- Name: sync_direction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sync_direction_type AS ENUM (
    'bidirectional',
    'inbound_only',
    'outbound_only'
);


--
-- Name: sync_log_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sync_log_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'failed',
    'partial'
);


--
-- Name: sync_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sync_status_type AS ENUM (
    'active',
    'syncing',
    'error',
    'token_expired',
    'disconnected'
);


--
-- Name: sync_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sync_type AS ENUM (
    'full',
    'incremental',
    'manual',
    'webhook_triggered'
);


--
-- Name: winning_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.winning_source AS ENUM (
    'external',
    'rowan',
    'merged',
    'manual'
);


--
-- Name: add_goal_creator_as_collaborator(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_goal_creator_as_collaborator() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only add for shared goals
  IF NEW.visibility = 'shared' AND NEW.created_by IS NOT NULL THEN
    INSERT INTO goal_collaborators (goal_id, user_id, role, invited_by)
    VALUES (NEW.id, NEW.created_by, 'owner', NEW.created_by)
    ON CONFLICT (goal_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: adjust_for_quiet_hours(uuid, uuid, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.adjust_for_quiet_hours(p_user_id uuid, p_space_id uuid, p_scheduled_time timestamp with time zone) RETURNS timestamp with time zone
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_prefs RECORD;
  v_adjusted_time TIMESTAMPTZ;
  v_end_time TIME;
  v_scheduled_date DATE;
BEGIN
  -- Get user preferences
  SELECT
    quiet_hours_enabled,
    quiet_hours_start,
    quiet_hours_end
  INTO v_prefs
  FROM user_notification_preferences
  WHERE user_id = p_user_id
    AND (space_id = p_space_id OR (space_id IS NULL AND p_space_id IS NULL))
  LIMIT 1;

  -- If quiet hours not enabled, return original time
  IF NOT FOUND OR NOT v_prefs.quiet_hours_enabled THEN
    RETURN p_scheduled_time;
  END IF;

  -- If scheduled time is in quiet hours, adjust to end of quiet hours
  IF is_in_quiet_hours(p_user_id, p_space_id, p_scheduled_time) THEN
    v_scheduled_date := p_scheduled_time::DATE;
    v_end_time := v_prefs.quiet_hours_end::TIME;

    -- Create timestamp for end of quiet hours
    v_adjusted_time := (v_scheduled_date + v_end_time::TIME)::TIMESTAMPTZ;

    -- If end time is before scheduled time (spans midnight), add a day
    IF v_adjusted_time < p_scheduled_time THEN
      v_adjusted_time := v_adjusted_time + interval '1 day';
    END IF;

    RETURN v_adjusted_time;
  END IF;

  RETURN p_scheduled_time;
END;
$$;


--
-- Name: aggregate_feature_usage_daily(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.aggregate_feature_usage_daily(target_date date DEFAULT (CURRENT_DATE - '1 day'::interval)) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  feature_record RECORD;
BEGIN
  FOR feature_record IN
    SELECT DISTINCT feature
    FROM feature_events
    WHERE created_at::date = target_date
  LOOP
    INSERT INTO feature_usage_daily (
      date,
      feature,
      page_views,
      unique_users,
      actions_create,
      actions_update,
      actions_delete,
      actions_complete,
      total_actions,
      device_mobile,
      device_desktop,
      device_tablet
    )
    SELECT
      target_date,
      feature_record.feature,
      COUNT(*) FILTER (WHERE action = 'page_view'),
      COUNT(DISTINCT user_id),
      COUNT(*) FILTER (WHERE action = 'create'),
      COUNT(*) FILTER (WHERE action = 'update'),
      COUNT(*) FILTER (WHERE action = 'delete'),
      COUNT(*) FILTER (WHERE action = 'complete'),
      COUNT(*) FILTER (WHERE action != 'page_view'),
      COUNT(*) FILTER (WHERE device_type = 'mobile'),
      COUNT(*) FILTER (WHERE device_type = 'desktop'),
      COUNT(*) FILTER (WHERE device_type = 'tablet')
    FROM feature_events
    WHERE created_at::date = target_date
      AND feature = feature_record.feature
    ON CONFLICT (date, feature) DO UPDATE SET
      page_views = EXCLUDED.page_views,
      unique_users = EXCLUDED.unique_users,
      actions_create = EXCLUDED.actions_create,
      actions_update = EXCLUDED.actions_update,
      actions_delete = EXCLUDED.actions_delete,
      actions_complete = EXCLUDED.actions_complete,
      total_actions = EXCLUDED.total_actions,
      device_mobile = EXCLUDED.device_mobile,
      device_desktop = EXCLUDED.device_desktop,
      device_tablet = EXCLUDED.device_tablet,
      updated_at = NOW();
  END LOOP;
END;
$$;


--
-- Name: apply_budget_template(uuid, uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_budget_template(p_space_id uuid, p_template_id uuid, p_monthly_income numeric) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_category RECORD;
BEGIN
  -- Verify user has access to the space
  IF NOT EXISTS (
    SELECT 1 FROM space_members 
    WHERE space_id = p_space_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied to space';
  END IF;

  -- Delete existing budget categories for this space
  DELETE FROM budget_categories WHERE space_id = p_space_id;

  -- Insert new categories based on template
  FOR v_category IN
    SELECT 
      category_name,
      percentage,
      icon,
      color,
      description
    FROM budget_template_categories
    WHERE template_id = p_template_id
    ORDER BY sort_order
  LOOP
    INSERT INTO budget_categories (
      space_id,
      category_name,
      allocated_amount,
      spent_amount,
      icon,
      color
    ) VALUES (
      p_space_id,
      v_category.category_name,
      ROUND((p_monthly_income * v_category.percentage / 100)::numeric, 2),
      0,
      v_category.icon,
      v_category.color
    );
  END LOOP;
END;
$$;


--
-- Name: assign_goal_priority_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_goal_priority_order() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- If priority_order is not set, assign it as max + 1
  IF NEW.priority_order IS NULL OR NEW.priority_order = 0 THEN
    SELECT COALESCE(MAX(priority_order), 0) + 1
    INTO NEW.priority_order
    FROM goals
    WHERE space_id = NEW.space_id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: assign_task_sort_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_task_sort_order() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  max_order INTEGER;
  lock_key BIGINT;
BEGIN
  IF NEW.sort_order = 0 OR NEW.sort_order IS NULL THEN
    -- SECURITY (RT-015): Use advisory lock to serialize sort_order per space.
    -- hashtext() converts space_id UUID to a stable integer for the lock key.
    lock_key := hashtext(NEW.space_id::text);
    PERFORM pg_advisory_xact_lock(lock_key);

    SELECT COALESCE(MAX(sort_order), 0) + 1
    INTO max_order
    FROM public.tasks
    WHERE space_id = NEW.space_id;

    NEW.sort_order = max_order;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: auto_complete_on_approval(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_complete_on_approval() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.approval_status = 'approved' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'approved') THEN
    -- Check if task should auto-complete on approval (based on metadata)
    IF (NEW.metadata->>'auto_complete_on_approval')::BOOLEAN = TRUE THEN
      NEW.status = 'completed';
      NEW.completed_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: auto_complete_shopping_tasks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_complete_shopping_tasks() RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Mark tasks as completed if they passed their auto_complete_at time
  UPDATE tasks
  SET
    status = 'completed',
    completed_at = NOW()
  WHERE id IN (
    SELECT task_id FROM shopping_tasks
    WHERE auto_complete_at IS NOT NULL
      AND auto_complete_at <= NOW()
      AND is_auto_created = TRUE
  )
  AND status != 'completed';
END;
$$;


--
-- Name: auto_create_bill_calendar_event(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_create_bill_calendar_event() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only create event for recurring expenses
  IF (NEW.is_recurring = TRUE OR NEW.recurring = TRUE) AND NEW.event_id IS NULL THEN
    PERFORM create_bill_calendar_event(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: auto_unsnooze_expired_tasks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_unsnooze_expired_tasks() RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE tasks
  SET
    is_snoozed = FALSE,
    snoozed_until = NULL,
    snoozed_by = NULL
  WHERE is_snoozed = TRUE
    AND snoozed_until IS NOT NULL
    AND snoozed_until <= NOW();
END;
$$;


--
-- Name: calculate_expense_splits(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_expense_splits(p_expense_id uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_expense RECORD;
  v_space_members uuid[];
  v_partner RECORD;
  v_user1_share numeric;
  v_user2_share numeric;
  v_total_income numeric;
BEGIN
  SELECT id, space_id, amount, paid_by, split_type, ownership, is_split,
         split_percentage_user1, split_percentage_user2,
         split_amount_user1, split_amount_user2
  INTO v_expense
  FROM expenses
  WHERE id = p_expense_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense not found: %', p_expense_id;
  END IF;

  IF v_expense.is_split IS NOT TRUE THEN
    DELETE FROM expense_splits WHERE expense_id = p_expense_id;
    RETURN;
  END IF;

  SELECT array_agg(user_id ORDER BY joined_at)
  INTO v_space_members
  FROM space_members
  WHERE space_id = v_expense.space_id;

  IF v_space_members IS NULL OR array_length(v_space_members, 1) < 2 THEN
    DELETE FROM expense_splits WHERE expense_id = p_expense_id;
    RETURN;
  END IF;

  DELETE FROM expense_splits WHERE expense_id = p_expense_id;

  CASE COALESCE(v_expense.split_type, 'equal')
    WHEN 'equal' THEN
      v_user1_share := ROUND(v_expense.amount / 2, 2);
      v_user2_share := v_expense.amount - v_user1_share;

    WHEN 'percentage' THEN
      v_user1_share := ROUND(v_expense.amount * COALESCE(v_expense.split_percentage_user1, 50) / 100, 2);
      v_user2_share := v_expense.amount - v_user1_share;

    WHEN 'fixed' THEN
      v_user1_share := COALESCE(v_expense.split_amount_user1, ROUND(v_expense.amount / 2, 2));
      v_user2_share := COALESCE(v_expense.split_amount_user2, v_expense.amount - v_user1_share);

    WHEN 'income-based' THEN
      SELECT user1_id, user2_id, user1_income, user2_income
      INTO v_partner
      FROM partnership_balances
      WHERE space_id = v_expense.space_id
      LIMIT 1;

      IF v_partner IS NULL THEN
        v_user1_share := ROUND(v_expense.amount / 2, 2);
        v_user2_share := v_expense.amount - v_user1_share;
      ELSE
        v_total_income := COALESCE(v_partner.user1_income, 0) + COALESCE(v_partner.user2_income, 0);
        IF v_total_income = 0 THEN
          v_user1_share := ROUND(v_expense.amount / 2, 2);
          v_user2_share := v_expense.amount - v_user1_share;
        ELSE
          IF v_space_members[1] = v_partner.user1_id THEN
            v_user1_share := ROUND(v_expense.amount * COALESCE(v_partner.user1_income, 0) / v_total_income, 2);
          ELSE
            v_user1_share := ROUND(v_expense.amount * COALESCE(v_partner.user2_income, 0) / v_total_income, 2);
          END IF;
          v_user2_share := v_expense.amount - v_user1_share;
        END IF;
      END IF;

    ELSE
      v_user1_share := ROUND(v_expense.amount / 2, 2);
      v_user2_share := v_expense.amount - v_user1_share;
  END CASE;

  IF v_expense.ownership = 'yours' THEN
    v_user1_share := v_expense.amount;
    v_user2_share := 0;
  ELSIF v_expense.ownership = 'theirs' THEN
    v_user1_share := 0;
    v_user2_share := v_expense.amount;
  END IF;

  INSERT INTO expense_splits (expense_id, user_id, amount_owed, percentage, is_payer, status)
  VALUES (
    p_expense_id, v_space_members[1], v_user1_share,
    CASE WHEN v_expense.amount > 0 THEN ROUND(v_user1_share / v_expense.amount * 100, 2) ELSE 0 END,
    (v_expense.paid_by = v_space_members[1]), 'pending'
  );

  INSERT INTO expense_splits (expense_id, user_id, amount_owed, percentage, is_payer, status)
  VALUES (
    p_expense_id, v_space_members[2], v_user2_share,
    CASE WHEN v_expense.amount > 0 THEN ROUND(v_user2_share / v_expense.amount * 100, 2) ELSE 0 END,
    (v_expense.paid_by = v_space_members[2]), 'pending'
  );
END;
$$;


--
-- Name: calculate_goal_completion_date(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_goal_completion_date(p_goal_id uuid) RETURNS date
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_target_amount DECIMAL(12, 2);
  v_current_amount DECIMAL(12, 2);
  v_remaining_amount DECIMAL(12, 2);
  v_avg_monthly_contribution DECIMAL(12, 2);
  v_months_remaining INTEGER;
  v_first_contribution_date DATE;
  v_last_contribution_date DATE;
  v_months_elapsed INTEGER;
  v_projected_date DATE;
BEGIN
  -- Get goal details
  SELECT target_amount, current_amount
  INTO v_target_amount, v_current_amount
  FROM goals
  WHERE id = p_goal_id;

  -- If no target or already reached, return NULL
  IF v_target_amount IS NULL OR v_current_amount >= v_target_amount THEN
    RETURN NULL;
  END IF;

  v_remaining_amount := v_target_amount - v_current_amount;

  -- Get contribution date range
  SELECT MIN(contribution_date), MAX(contribution_date)
  INTO v_first_contribution_date, v_last_contribution_date
  FROM goal_contributions
  WHERE goal_id = p_goal_id;

  -- If no contributions yet, return NULL
  IF v_first_contribution_date IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calculate months elapsed (minimum 1 month)
  v_months_elapsed := GREATEST(1,
    EXTRACT(YEAR FROM AGE(v_last_contribution_date, v_first_contribution_date)) * 12 +
    EXTRACT(MONTH FROM AGE(v_last_contribution_date, v_first_contribution_date))
  );

  -- Calculate average monthly contribution
  v_avg_monthly_contribution := v_current_amount / v_months_elapsed;

  -- Avoid division by zero
  IF v_avg_monthly_contribution <= 0 THEN
    RETURN NULL;
  END IF;

  -- Calculate months remaining
  v_months_remaining := CEIL(v_remaining_amount / v_avg_monthly_contribution);

  -- Calculate projected date
  v_projected_date := CURRENT_DATE + (v_months_remaining || ' months')::INTERVAL;

  RETURN v_projected_date;
END;
$$;


--
-- Name: calculate_late_penalty(timestamp with time zone, timestamp with time zone, integer, integer, boolean, numeric, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_late_penalty(p_due_date timestamp with time zone, p_completion_date timestamp with time zone, p_grace_period_hours integer, p_base_penalty integer, p_progressive boolean DEFAULT true, p_multiplier numeric DEFAULT 1.5, p_max_penalty integer DEFAULT 50) RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_deadline TIMESTAMPTZ;
  v_days_late INTEGER;
  v_penalty INTEGER;
BEGIN
  v_deadline := p_due_date + (p_grace_period_hours || ' hours')::INTERVAL;

  IF p_completion_date <= v_deadline THEN
    RETURN 0;
  END IF;

  v_days_late := CEIL(EXTRACT(EPOCH FROM (p_completion_date - v_deadline)) / 86400);

  IF p_progressive THEN
    v_penalty := LEAST(
      CEIL(p_base_penalty * POWER(p_multiplier, v_days_late - 1)),
      p_max_penalty
    );
  ELSE
    v_penalty := LEAST(p_base_penalty * v_days_late, p_max_penalty);
  END IF;

  RETURN v_penalty;
END;
$$;


--
-- Name: calculate_next_delivery_time(text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_next_delivery_time(p_frequency text, p_base_time timestamp with time zone DEFAULT now()) RETURNS timestamp with time zone
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_next_time TIMESTAMPTZ;
BEGIN
  CASE p_frequency
    WHEN 'instant' THEN
      v_next_time := p_base_time;

    WHEN 'hourly' THEN
      -- Round up to next hour
      v_next_time := date_trunc('hour', p_base_time) + interval '1 hour';

    WHEN 'daily' THEN
      -- Schedule for next day at 9 AM
      v_next_time := (date_trunc('day', p_base_time) + interval '1 day' + interval '9 hours');

      -- If we're before 9 AM today, schedule for today at 9 AM
      IF p_base_time < (date_trunc('day', p_base_time) + interval '9 hours') THEN
        v_next_time := date_trunc('day', p_base_time) + interval '9 hours';
      END IF;

    WHEN 'never' THEN
      -- Far future, effectively never
      v_next_time := p_base_time + interval '100 years';

    ELSE
      v_next_time := p_base_time;
  END CASE;

  RETURN v_next_time;
END;
$$;


--
-- Name: calculate_next_due_date(date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_next_due_date(current_due_date date, bill_frequency text) RETURNS date
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN CASE bill_frequency
    WHEN 'one-time' THEN NULL
    WHEN 'weekly' THEN current_due_date + INTERVAL '1 week'
    WHEN 'bi-weekly' THEN current_due_date + INTERVAL '2 weeks'
    WHEN 'monthly' THEN current_due_date + INTERVAL '1 month'
    WHEN 'quarterly' THEN current_due_date + INTERVAL '3 months'
    WHEN 'semi-annual' THEN current_due_date + INTERVAL '6 months'
    WHEN 'annual' THEN current_due_date + INTERVAL '1 year'
    ELSE NULL
  END;
END;
$$;


--
-- Name: calculate_reminder_time(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_reminder_time() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  task_due_date TIMESTAMPTZ;
BEGIN
  -- Get task due date
  SELECT due_date::TIMESTAMPTZ INTO task_due_date
  FROM tasks
  WHERE id = NEW.task_id;

  IF task_due_date IS NULL THEN
    RAISE EXCEPTION 'Cannot create reminder for task without due date';
  END IF;

  -- Calculate remind_at based on offset_type
  CASE NEW.offset_type
    WHEN 'at_due_time' THEN
      NEW.remind_at = task_due_date;
    WHEN '15_min_before' THEN
      NEW.remind_at = task_due_date - INTERVAL '15 minutes';
    WHEN '1_hour_before' THEN
      NEW.remind_at = task_due_date - INTERVAL '1 hour';
    WHEN '1_day_before' THEN
      NEW.remind_at = task_due_date - INTERVAL '1 day';
    WHEN '1_week_before' THEN
      NEW.remind_at = task_due_date - INTERVAL '1 week';
    WHEN 'custom' THEN
      IF NEW.custom_offset_minutes IS NULL THEN
        RAISE EXCEPTION 'custom_offset_minutes required for custom reminder';
      END IF;
      NEW.remind_at = task_due_date - (NEW.custom_offset_minutes || ' minutes')::INTERVAL;
    ELSE
      RAISE EXCEPTION 'Invalid offset_type: %', NEW.offset_type;
  END CASE;

  RETURN NEW;
END;
$$;


--
-- Name: calculate_space_storage(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_space_storage(p_space_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'storage'
    AS $$
DECLARE
  v_total_bytes bigint := 0;
  v_file_count  integer := 0;
  v_limit_bytes bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM spaces WHERE id = p_space_id) THEN
    RAISE EXCEPTION 'Space not found: %', p_space_id;
  END IF;

  SELECT COALESCE(SUM((o.metadata->>'size')::bigint), 0),
         COALESCE(COUNT(*), 0)
  INTO v_total_bytes, v_file_count
  FROM storage.objects o
  INNER JOIN space_members sm ON o.owner::uuid = sm.user_id
  WHERE sm.space_id = p_space_id;

  SELECT storage_limit_bytes INTO v_limit_bytes
  FROM storage_usage WHERE space_id = p_space_id;

  IF v_limit_bytes IS NULL THEN
    v_limit_bytes := 536870912; -- 512 MB default
  END IF;

  INSERT INTO storage_usage (space_id, total_bytes, file_count, storage_limit_bytes, last_calculated_at, updated_at)
  VALUES (p_space_id, v_total_bytes, v_file_count, v_limit_bytes, now(), now())
  ON CONFLICT (space_id)
  DO UPDATE SET
    total_bytes = EXCLUDED.total_bytes,
    file_count = EXCLUDED.file_count,
    last_calculated_at = now(),
    updated_at = now();
END;
$$;


--
-- Name: calculate_sync_duration(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_sync_duration() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    NEW.duration_ms := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: calculate_sync_priority(uuid, public.queue_operation); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_sync_priority(p_event_id uuid, p_operation public.queue_operation) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: calculate_time_entry_duration(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_time_entry_duration() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.end_time IS NOT NULL THEN
    NEW.duration = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: can_access_user_profile(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_access_user_profile(target_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  -- Fast path: always allow access to own profile
  IF auth.uid() = target_user_id THEN
    RETURN TRUE;
  END IF;

  -- Admin path: use the non-recursive admin check
  IF public.check_is_admin() THEN
    RETURN TRUE;
  END IF;

  -- Secondary path: check if users share any spaces
  RETURN EXISTS (
    SELECT 1
    FROM public.space_members sm1
    JOIN public.space_members sm2 ON sm1.space_id = sm2.space_id
    WHERE sm1.user_id = auth.uid()
      AND sm2.user_id = target_user_id
  );
END;
$$;


--
-- Name: check_and_award_badges(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_and_award_badges(p_user_id uuid, p_space_id uuid, p_trigger_type text DEFAULT 'goal_completed'::text) RETURNS json
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    badge_record RECORD;
    criteria_met BOOLEAN;
    awarded_badges JSON[];
    badge_result JSON;
BEGIN
    awarded_badges := ARRAY[]::JSON[];

    -- Loop through all active badges
    FOR badge_record IN
        SELECT * FROM achievement_badges
        WHERE is_active = true
    LOOP
        -- Check if user already has this badge in this space
        IF EXISTS (
            SELECT 1 FROM user_achievements
            WHERE user_id = p_user_id
            AND space_id = p_space_id
            AND badge_id = badge_record.id
        ) THEN
            CONTINUE;
        END IF;

        -- Evaluate badge criteria (simplified for now - can be expanded)
        criteria_met := false;

        -- Goal completion badges
        IF badge_record.criteria->>'type' = 'goals_completed' THEN
            criteria_met := (
                SELECT COUNT(*) FROM goals
                WHERE space_id = p_space_id
                AND status = 'completed'
                AND EXISTS (
                    SELECT 1 FROM space_members
                    WHERE space_id = p_space_id AND user_id = p_user_id
                )
            ) >= (badge_record.criteria->>'count')::INTEGER;
        END IF;

        -- Milestone badges
        IF badge_record.criteria->>'type' = 'milestones_completed' THEN
            criteria_met := (
                SELECT COUNT(*) FROM goal_milestones gm
                JOIN goals g ON g.id = gm.goal_id
                WHERE g.space_id = p_space_id
                AND gm.completed = true
                AND EXISTS (
                    SELECT 1 FROM space_members
                    WHERE space_id = p_space_id AND user_id = p_user_id
                )
            ) >= (badge_record.criteria->>'count')::INTEGER;
        END IF;

        -- Streak badges (placeholder - would need streak tracking)
        IF badge_record.criteria->>'type' = 'goal_streak' THEN
            -- Would implement streak calculation here
            criteria_met := false;
        END IF;

        -- Award badge if criteria met
        IF criteria_met THEN
            INSERT INTO user_achievements (user_id, space_id, badge_id, progress_data)
            VALUES (p_user_id, p_space_id, badge_record.id,
                    json_build_object('trigger', p_trigger_type, 'awarded_at', NOW()));

            -- Add to result array
            badge_result := json_build_object(
                'id', badge_record.id,
                'name', badge_record.name,
                'description', badge_record.description,
                'category', badge_record.category,
                'icon', badge_record.icon,
                'color', badge_record.color,
                'points', badge_record.points,
                'rarity', badge_record.rarity
            );
            awarded_badges := awarded_badges || badge_result;
        END IF;
    END LOOP;

    RETURN json_build_object('badges_awarded', awarded_badges);
END;
$$;


--
-- Name: check_circular_dependency(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_circular_dependency() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  has_cycle BOOLEAN;
BEGIN
  -- Check if adding this dependency would create a cycle
  WITH RECURSIVE dependency_chain AS (
    -- Start with the new dependency
    SELECT NEW.task_id AS current_task, NEW.depends_on_task_id AS blocking_task, 1 AS depth
    UNION ALL
    -- Recursively follow the chain
    SELECT dc.current_task, td.depends_on_task_id, dc.depth + 1
    FROM dependency_chain dc
    JOIN task_dependencies td ON td.task_id = dc.blocking_task
    WHERE dc.depth < 20 -- Prevent infinite recursion
  )
  SELECT EXISTS(
    SELECT 1 FROM dependency_chain
    WHERE current_task = blocking_task
  ) INTO has_cycle;

  IF has_cycle THEN
    RAISE EXCEPTION 'Circular dependency detected: Task % cannot depend on Task % (would create a cycle)', NEW.task_id, NEW.depends_on_task_id;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: check_goal_circular_dependency(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_goal_circular_dependency(p_goal_id uuid, p_depends_on_goal_id uuid, p_space_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    circular_count INTEGER;
BEGIN
    -- Use a recursive CTE to detect circular dependencies
    WITH RECURSIVE dependency_chain AS (
        -- Base case: start with the new dependency
        SELECT
            p_depends_on_goal_id as goal_id,
            p_goal_id as depends_on_goal_id,
            1 as depth

        UNION ALL

        -- Recursive case: follow the dependency chain
        SELECT
            gd.depends_on_goal_id,
            dc.depends_on_goal_id,
            dc.depth + 1
        FROM goal_dependencies gd
        JOIN dependency_chain dc ON gd.goal_id = dc.goal_id
        WHERE
            gd.space_id = p_space_id
            AND dc.depth < 10  -- Prevent infinite recursion
    )
    SELECT COUNT(*)
    INTO circular_count
    FROM dependency_chain
    WHERE goal_id = p_goal_id;

    RETURN circular_count > 0;
END;
$$;


--
-- Name: check_is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users au
    WHERE au.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND au.is_active = true
  )
$$;


--
-- Name: check_meal_plan_task_uniqueness(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_meal_plan_task_uniqueness() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  existing_count INTEGER;
BEGIN
  -- Check if a task already exists for this meal_date and meal_type
  -- (regardless of which meal_plan_id generated it)
  SELECT COUNT(*) INTO existing_count
  FROM meal_plan_tasks
  WHERE meal_date = NEW.meal_date
    AND meal_type = NEW.meal_type
    AND task_id != NEW.task_id;

  IF existing_count > 0 THEN
    RAISE EXCEPTION 'A task already exists for % on %', NEW.meal_type, NEW.meal_date;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: check_milestone_completion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_milestone_completion() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_goal RECORD;
  v_milestone RECORD;
  v_current_percentage NUMERIC;
  v_space_id UUID;
  v_goal_title TEXT;
BEGIN
  -- Get goal details
  SELECT g.*, g.space_id, g.title INTO v_goal
  FROM goals g
  WHERE g.id = NEW.goal_id;

  -- Only process financial goals
  IF v_goal.is_financial = TRUE AND v_goal.target_amount IS NOT NULL AND v_goal.target_amount > 0 THEN
    -- Calculate current completion percentage
    v_current_percentage := (v_goal.current_amount / v_goal.target_amount) * 100;

    -- Check all percentage milestones for this goal
    FOR v_milestone IN
      SELECT * FROM goal_milestones
      WHERE goal_id = NEW.goal_id
        AND type = 'percentage'
        AND completed = FALSE
        AND target_value <= v_current_percentage
    LOOP
      -- Mark milestone as complete
      UPDATE goal_milestones
      SET completed = TRUE,
          completed_at = NOW()
      WHERE id = v_milestone.id;

      -- Create notification for all space members
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        link,
        space_id,
        created_at
      )
      SELECT
        sm.user_id,
        'goal_milestone',
        '🎉 Goal Milestone Reached!',
        v_goal.title || ' - ' || v_milestone.title,
        '/goals/' || NEW.goal_id,
        v_goal.space_id,
        NOW()
      FROM space_members sm
      WHERE sm.space_id = v_goal.space_id;

    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: check_parent_task_completion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_parent_task_completion() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  total_subtasks INTEGER;
  completed_subtasks INTEGER;
BEGIN
  -- Count total and completed subtasks for parent task
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
  INTO total_subtasks, completed_subtasks
  FROM subtasks
  WHERE parent_task_id = NEW.parent_task_id;

  -- If all subtasks are completed, mark parent as completed
  IF total_subtasks > 0 AND total_subtasks = completed_subtasks THEN
    UPDATE tasks
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = NEW.parent_task_id
      AND status != 'completed';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: check_space_membership(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_space_membership(p_space_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM space_members
    WHERE space_id = p_space_id AND user_id = p_user_id
  );
$$;


--
-- Name: check_storage_quota(uuid, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_storage_quota(p_space_id uuid, p_file_size_bytes bigint) RETURNS TABLE(allowed boolean, current_bytes bigint, limit_bytes bigint, available_bytes bigint, percentage_used numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_current_bytes bigint;
  v_limit_bytes   bigint;
  v_available     bigint;
  v_pct_used      numeric;
BEGIN
  SELECT su.total_bytes, su.storage_limit_bytes
  INTO v_current_bytes, v_limit_bytes
  FROM storage_usage su
  WHERE su.space_id = p_space_id;

  IF NOT FOUND THEN
    PERFORM calculate_space_storage(p_space_id);
    SELECT su.total_bytes, su.storage_limit_bytes
    INTO v_current_bytes, v_limit_bytes
    FROM storage_usage su
    WHERE su.space_id = p_space_id;
    IF NOT FOUND THEN
      v_current_bytes := 0;
      v_limit_bytes := 536870912;
    END IF;
  END IF;

  v_available := GREATEST(v_limit_bytes - v_current_bytes, 0);
  v_pct_used := CASE
    WHEN v_limit_bytes > 0 THEN ROUND((v_current_bytes::numeric / v_limit_bytes) * 100, 2)
    ELSE 0
  END;

  RETURN QUERY SELECT
    (p_file_size_bytes <= v_available),
    v_current_bytes,
    v_limit_bytes,
    v_available,
    v_pct_used;
END;
$$;


--
-- Name: claim_founding_member_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_founding_member_number() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  claimed_number INTEGER;
BEGIN
  -- Lock the counter row and increment if under limit
  UPDATE public.founding_member_counter
  SET
    current_count = current_count + 1,
    updated_at = NOW()
  WHERE id = 1 AND current_count < max_count
  RETURNING current_count INTO claimed_number;

  RETURN claimed_number;
END;
$$;


--
-- Name: cleanup_account_deletion_audit_log(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_account_deletion_audit_log() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM account_deletion_audit_log WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_all_audit_logs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_all_audit_logs() RETURNS TABLE(log_table text, deleted_rows integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ BEGIN RETURN QUERY SELECT 'account_deletion_audit_log'::text, cleanup_account_deletion_audit_log() UNION ALL SELECT 'ccpa_audit_log'::text, cleanup_ccpa_audit_log() UNION ALL SELECT 'user_audit_log'::text, cleanup_user_audit_log(); END; $$;


--
-- Name: cleanup_ccpa_audit_log(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_ccpa_audit_log() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM ccpa_audit_log WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_completed_queue_items(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_completed_queue_items() RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM calendar_sync_queue
    WHERE status = 'completed'
      AND processed_at < NOW() - INTERVAL '7 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM deleted;

  RETURN v_count;
END;
$$;


--
-- Name: cleanup_expired_sessions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_sessions() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM user_sessions
  WHERE expires_at < NOW()
    OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '7 days');
END;
$$;


--
-- Name: cleanup_expired_shopping_tasks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_shopping_tasks() RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Delete tasks that have passed their auto_delete_at time
  DELETE FROM tasks
  WHERE id IN (
    SELECT task_id FROM shopping_tasks
    WHERE auto_delete_at IS NOT NULL
      AND auto_delete_at <= NOW()
      AND is_auto_created = TRUE
  );

  -- The shopping_tasks records will be deleted via CASCADE
END;
$$;


--
-- Name: cleanup_old_audit_logs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_audit_logs() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM user_audit_log
  WHERE created_at < NOW() - INTERVAL '2 years';
END;
$$;


--
-- Name: cleanup_old_feature_events(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_feature_events(retention_days integer DEFAULT 30) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM feature_events
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_old_notifications(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_notifications(days_to_keep integer DEFAULT 30) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM in_app_notifications
  WHERE is_read = TRUE
    AND read_at < NOW() - INTERVAL '1 day' * days_to_keep;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_old_quick_action_usage(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_quick_action_usage() RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM quick_action_usage
  WHERE used_at < NOW() - INTERVAL '90 days';
END;
$$;


--
-- Name: cleanup_old_reports(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_reports() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete reports older than 1 year that aren't favorites
    DELETE FROM generated_reports
    WHERE created_at < NOW() - INTERVAL '1 year'
    AND id NOT IN (SELECT report_id FROM report_favorites WHERE report_id IS NOT NULL);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_old_site_visits(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_site_visits() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM site_visits WHERE created_at < now() - interval '90 days';
END;
$$;


--
-- Name: cleanup_old_sync_logs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_sync_logs() RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM calendar_sync_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;


--
-- Name: cleanup_old_typing_indicators(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_typing_indicators() RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM typing_indicators
  WHERE last_typed_at < NOW() - INTERVAL '10 seconds';
END;
$$;


--
-- Name: cleanup_user_audit_log(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_user_audit_log() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM user_audit_log WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


--
-- Name: complete_chore_award_points(uuid, uuid, uuid, text, integer, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_chore_award_points(p_user_id uuid, p_space_id uuid, p_chore_id uuid, p_chore_title text, p_base_points integer, p_completion_date timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_current_streak INTEGER;
  v_new_streak INTEGER;
  v_streak_bonus INTEGER := 0;
  v_total_awarded INTEGER;
  v_last_completion TIMESTAMPTZ;
  v_is_streak BOOLEAN := false;
BEGIN
  INSERT INTO reward_points (user_id, space_id, points, current_streak, level)
  VALUES (p_user_id, p_space_id, 0, 0, 1)
  ON CONFLICT (user_id, space_id) DO UPDATE
    SET updated_at = now()
  RETURNING current_streak INTO v_current_streak;

  SELECT created_at INTO v_last_completion
  FROM point_transactions
  WHERE user_id = p_user_id
    AND space_id = p_space_id
    AND source_type = 'chore'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_completion IS NOT NULL
     AND (p_completion_date - v_last_completion) < INTERVAL '24 hours' THEN
    v_is_streak := true;
  END IF;

  v_new_streak := CASE WHEN v_is_streak THEN v_current_streak + 1 ELSE 1 END;

  IF v_new_streak > 0 AND v_new_streak % 5 = 0 THEN
    v_streak_bonus := 5;
  END IF;

  v_total_awarded := p_base_points + v_streak_bonus;

  UPDATE reward_points
  SET points = points + v_total_awarded,
      current_streak = v_new_streak,
      longest_streak = GREATEST(longest_streak, v_new_streak),
      last_activity_at = p_completion_date,
      updated_at = now()
  WHERE user_id = p_user_id
    AND space_id = p_space_id;

  INSERT INTO point_transactions (user_id, space_id, source_type, source_id, points, reason, metadata)
  VALUES (
    p_user_id, p_space_id, 'chore', p_chore_id,
    p_base_points,
    'Completed chore: ' || p_chore_title,
    jsonb_build_object('chore_title', p_chore_title)
  );

  IF v_streak_bonus > 0 THEN
    INSERT INTO point_transactions (user_id, space_id, source_type, source_id, points, reason, metadata)
    VALUES (
      p_user_id, p_space_id, 'streak_bonus', p_chore_id,
      v_streak_bonus,
      v_new_streak || '-day streak bonus!',
      jsonb_build_object('streak_count', v_new_streak)
    );
  END IF;

  RETURN jsonb_build_object(
    'points_awarded', v_total_awarded,
    'base_points', p_base_points,
    'streak_bonus', v_streak_bonus,
    'new_streak', v_new_streak
  );
END;
$$;


--
-- Name: create_bill_calendar_event(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_bill_calendar_event(p_expense_id uuid) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_expense RECORD;
  v_event_id UUID;
  v_event_title TEXT;
  v_event_description TEXT;
BEGIN
  -- Get expense details
  SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id;

  IF NOT FOUND OR (NOT COALESCE(v_expense.is_recurring, FALSE) AND NOT COALESCE(v_expense.recurring, FALSE)) THEN
    RETURN NULL;
  END IF;

  -- Build event title and description
  v_event_title := '💰 Bill Due: ' || v_expense.description;
  v_event_description := 'Amount: $' || v_expense.amount || '\n' ||
                         'Category: ' || COALESCE(v_expense.category, 'Uncategorized') || '\n' ||
                         'Frequency: ' || COALESCE(v_expense.recurring_frequency, 'Unknown');

  IF v_expense.payment_method IS NOT NULL THEN
    v_event_description := v_event_description || '\nPayment Method: ' || v_expense.payment_method;
  END IF;

  -- Create calendar event
  INSERT INTO events (
    space_id,
    title,
    description,
    event_type,
    start_time,
    end_time,
    is_recurring,
    recurrence_pattern,
    expense_id,
    created_by
  )
  VALUES (
    v_expense.space_id,
    v_event_title,
    v_event_description,
    'bill_due',
    v_expense.date::TIMESTAMPTZ,
    v_expense.date::TIMESTAMPTZ + INTERVAL '1 hour',
    TRUE,
    v_expense.recurring_frequency,
    p_expense_id,
    v_expense.created_by
  )
  RETURNING id INTO v_event_id;

  -- Update expense with event_id
  UPDATE expenses
  SET event_id = v_event_id
  WHERE id = p_expense_id;

  RETURN v_event_id;
END;
$_$;


--
-- Name: create_check_in_activity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_check_in_activity() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
  DECLARE
    v_space_id UUID;
    v_goal_title TEXT;
  BEGIN
    -- Get space_id and goal title
    SELECT g.space_id, g.title INTO v_space_id, v_goal_title
    FROM goals g
    WHERE g.id = NEW.goal_id;

    -- Create activity feed entry
    PERFORM create_activity_feed_entry(
      v_space_id,
      NEW.user_id,
      'goal_check_in',
      jsonb_build_object(
        'goal_title', v_goal_title,
        'mood_rating', NEW.mood_rating,
        'progress_rating', NEW.progress_rating,
        'has_voice_note', (NEW.voice_note_url IS NOT NULL),
        'milestone_reached', NEW.milestone_reached
      ),
      NEW.goal_id,
      NEW.id
    );

    RETURN NEW;
  END;
  $$;


--
-- Name: create_default_notification_preferences(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_default_notification_preferences() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO user_notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RAISE LOG 'Created default notification preferences for user %', NEW.id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error creating notification preferences for user %: %', NEW.id, SQLERRM;
  RAISE;
END;
$$;


--
-- Name: create_default_privacy_preferences(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_default_privacy_preferences() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO user_privacy_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RAISE LOG 'Created default privacy preferences for user %', NEW.id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error creating privacy preferences for user %: %', NEW.id, SQLERRM;
  RAISE;
END;
$$;


--
-- Name: create_financial_goal_milestones(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_financial_goal_milestones() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only create milestones for financial goals
  IF NEW.is_financial = TRUE AND NEW.target_amount IS NOT NULL THEN
    -- Create 25% milestone
    INSERT INTO goal_milestones (goal_id, title, description, type, target_value)
    VALUES (
      NEW.id,
      '25% Complete',
      'Reached 25% of your goal!',
      'percentage',
      25
    );

    -- Create 50% milestone
    INSERT INTO goal_milestones (goal_id, title, description, type, target_value)
    VALUES (
      NEW.id,
      'Halfway There!',
      'You have reached 50% of your goal!',
      'percentage',
      50
    );

    -- Create 75% milestone
    INSERT INTO goal_milestones (goal_id, title, description, type, target_value)
    VALUES (
      NEW.id,
      '75% Complete',
      'Almost there! 75% of your goal achieved!',
      'percentage',
      75
    );

    -- Create 100% milestone
    INSERT INTO goal_milestones (goal_id, title, description, type, target_value)
    VALUES (
      NEW.id,
      'Goal Complete!',
      'Congratulations! You have reached your goal!',
      'percentage',
      100
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: create_goal_activity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_goal_activity() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
  BEGIN
    -- Create activity feed entry for new goals
    PERFORM create_activity_feed_entry(
      NEW.space_id,
      NEW.created_by,
      'goal_created',
      jsonb_build_object(
        'goal_title', NEW.title,
        'goal_description', NEW.description,
        'priority', NEW.priority,
        'target_date', NEW.target_date
      ),
      NEW.id
    );

    RETURN NEW;
  END;
  $$;


--
-- Name: create_habit_activity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_habit_activity() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
  DECLARE
    v_space_id UUID;
    v_habit_title TEXT;
    v_current_streak INTEGER;
  BEGIN
    -- Only create activity for completed habits
    IF NEW.completed = TRUE AND (OLD IS NULL OR OLD.completed = FALSE) THEN
      -- Get space_id and habit title
      SELECT rt.space_id, rt.title INTO v_space_id, v_habit_title
      FROM recurring_goal_templates rt
      WHERE rt.id = NEW.template_id;

      -- Get current streak
      SELECT current_streak INTO v_current_streak
      FROM habit_streaks
      WHERE template_id = NEW.template_id AND user_id = NEW.user_id;

      -- Create activity feed entry
      PERFORM create_activity_feed_entry(
        v_space_id,
        NEW.user_id,
        'habit_completed',
        jsonb_build_object(
          'habit_title', v_habit_title,
          'entry_date', NEW.entry_date,
          'actual_value', NEW.actual_value,
          'current_streak', COALESCE(v_current_streak, 1),
          'mood_rating', NEW.mood_rating
        ),
        NULL,
        NULL,
        NEW.template_id,
        NEW.id
      );
    END IF;

    RETURN NEW;
  END;
  $$;


--
-- Name: create_in_app_notification(uuid, text, text, text, uuid, text, uuid, text, uuid, text, text, text, uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_in_app_notification(p_user_id uuid, p_type text, p_title text, p_content text, p_partnership_id uuid DEFAULT NULL::uuid, p_priority text DEFAULT 'normal'::text, p_space_id uuid DEFAULT NULL::uuid, p_space_name text DEFAULT NULL::text, p_related_item_id uuid DEFAULT NULL::uuid, p_related_item_type text DEFAULT NULL::text, p_action_url text DEFAULT NULL::text, p_emoji text DEFAULT NULL::text, p_sender_id uuid DEFAULT NULL::uuid, p_sender_name text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO in_app_notifications (
    user_id, type, title, content, partnership_id, priority,
    space_id, space_name, related_item_id, related_item_type,
    action_url, emoji, sender_id, sender_name, metadata
  ) VALUES (
    p_user_id, p_type, p_title, p_content, p_partnership_id, p_priority,
    p_space_id, p_space_name, p_related_item_id, p_related_item_type,
    p_action_url, p_emoji, p_sender_id, p_sender_name, p_metadata
  )
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;


--
-- Name: create_mention_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_mention_notification() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Create notification for the mentioned user
  INSERT INTO notifications (
    user_id,
    space_id,
    type,
    title,
    message,
    link,
    created_at
  )
  VALUES (
    NEW.mentioned_user_id,
    NEW.space_id,
    'mention',
    'You were mentioned',
    'You were mentioned in a message',
    '/messages?mention=' || NEW.message_id,
    NOW()
  );

  RETURN NEW;
END;
$$;


--
-- Name: create_milestone_activity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_milestone_activity() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
  DECLARE
    v_space_id UUID;
    v_goal_title TEXT;
  BEGIN
    -- Only trigger when milestone_reached changes from FALSE to TRUE
    IF NEW.milestone_reached = TRUE AND (OLD IS NULL OR OLD.milestone_reached = FALSE) THEN
      -- Get space_id and goal title
      SELECT g.space_id, g.title INTO v_space_id, v_goal_title
      FROM goals g
      WHERE g.id = NEW.goal_id;

      -- Create activity feed entry
      PERFORM create_activity_feed_entry(
        v_space_id,
        NEW.user_id,
        'milestone_reached',
        jsonb_build_object(
          'goal_title', v_goal_title,
          'check_in_content', NEW.content,
          'progress_rating', NEW.progress_rating
        ),
        NEW.goal_id,
        NEW.id
      );
    END IF;

    RETURN NEW;
  END;
  $$;


--
-- Name: create_user_profile(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_user_profile() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Use a more defensive approach with explicit conflict handling
  INSERT INTO public.users (
    id,
    email,
    name,
    pronouns,
    color_theme,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.raw_user_meta_data->>'pronouns',
    COALESCE(NEW.raw_user_meta_data->>'color_theme', 'emerald'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RAISE LOG 'Successfully created/updated user profile for %', NEW.id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in create_user_profile for user %: % (SQLSTATE: %)',
    NEW.id, SQLERRM, SQLSTATE;
  -- Don't re-raise - allow auth user creation to succeed even if profile fails
  RETURN NEW;
END;
$$;


--
-- Name: current_user_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_user_id() RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Try to get from auth first (for production)
  IF auth.uid() IS NOT NULL THEN
    RETURN auth.uid();
  END IF;

  -- Fall back to custom setting (for development)
  -- This will be set by the application layer
  RETURN current_setting('app.current_user_id', TRUE)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;


--
-- Name: days_overdue(timestamp with time zone, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.days_overdue(p_due_date timestamp with time zone, p_grace_period_hours integer DEFAULT 2) RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_deadline TIMESTAMPTZ;
BEGIN
  IF p_due_date IS NULL THEN
    RETURN 0;
  END IF;

  v_deadline := p_due_date + (p_grace_period_hours || ' hours')::INTERVAL;

  IF NOW() <= v_deadline THEN
    RETURN 0;
  END IF;

  RETURN CEIL(EXTRACT(EPOCH FROM (NOW() - v_deadline)) / 86400);
END;
$$;


--
-- Name: deactivate_webhook(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deactivate_webhook(p_webhook_id text) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE calendar_webhook_subscriptions
  SET is_active = FALSE
  WHERE webhook_id = p_webhook_id;
END;
$$;


--
-- Name: delete_bill_calendar_event(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_bill_calendar_event() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- If expense has an associated event, delete it
  IF OLD.event_id IS NOT NULL THEN
    DELETE FROM events WHERE id = OLD.event_id;
  END IF;

  RETURN OLD;
END;
$$;


--
-- Name: delete_calendar_event_for_meal(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_calendar_event_for_meal() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  DELETE FROM events WHERE id IN (
    SELECT event_id FROM meal_calendar_events WHERE meal_id = OLD.id
  );
  RETURN OLD;
END;
$$;


--
-- Name: delete_oauth_tokens(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_oauth_tokens(p_connection_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'vault'
    AS $$
DECLARE
  v_access_key TEXT;
  v_refresh_key TEXT;
BEGIN
  -- Build the vault secret keys
  v_access_key := 'calendar_' || p_connection_id || '_access_token';
  v_refresh_key := 'calendar_' || p_connection_id || '_refresh_token';
  
  -- Delete access token from vault
  DELETE FROM vault.secrets WHERE name = v_access_key;
  
  -- Delete refresh token from vault
  DELETE FROM vault.secrets WHERE name = v_refresh_key;
END;
$$;


--
-- Name: extract_mentions_from_comment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.extract_mentions_from_comment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_mention TEXT;
  v_user_id UUID;
  v_mentions TEXT[];
BEGIN
  -- Extract @username patterns (e.g., @john, @jane.doe, @user_123)
  v_mentions := ARRAY(
    SELECT DISTINCT regexp_matches(NEW.content, '@([a-zA-Z0-9_.]+)', 'g')
  );

  -- For each mention, find the user and create mention record
  IF v_mentions IS NOT NULL THEN
    FOREACH v_mention IN ARRAY v_mentions
    LOOP
      -- Remove the @ symbol
      v_mention := substring(v_mention from 2);

      -- Find user by email prefix (simplified - could be enhanced)
      SELECT id INTO v_user_id
      FROM users
      WHERE email ILIKE v_mention || '%'
      LIMIT 1;

      -- Create mention record if user found
      IF v_user_id IS NOT NULL THEN
        INSERT INTO mentions (comment_id, mentioned_user_id)
        VALUES (NEW.id, v_user_id)
        ON CONFLICT (comment_id, mentioned_user_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: fix_orphaned_users(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fix_orphaned_users() RETURNS TABLE(user_id uuid, action text, space_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  orphan RECORD;
  new_space_id UUID;
  space_name_to_use TEXT;
BEGIN
  FOR orphan IN
    SELECT u.id, u.name, u.email
    FROM public.users u
    LEFT JOIN space_members sm ON sm.user_id = u.id
    WHERE sm.user_id IS NULL
  LOOP
    space_name_to_use := COALESCE(
      (
        SELECT raw_user_meta_data->>'space_name'
        FROM auth.users
        WHERE id = orphan.id
      ),
      orphan.name || '''s Space'
    );

    INSERT INTO spaces (
      name,
      is_personal,
      auto_created,
      user_id,
      created_at,
      updated_at
    ) VALUES (
      space_name_to_use,
      true,
      true,
      orphan.id,
      NOW(),
      NOW()
    )
    RETURNING id INTO new_space_id;

    INSERT INTO space_members (
      space_id,
      user_id,
      role,
      joined_at
    ) VALUES (
      new_space_id,
      orphan.id,
      'owner',
      NOW()
    );

    user_id := orphan.id;
    action := 'Created workspace';
    space_id := new_space_id;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;


--
-- Name: generate_recurring_instances(uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_recurring_instances(template_id_param uuid, until_date date) RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_template RECORD;
  v_current_date date;
  v_period_end date;
  v_interval_days integer;
  v_days_of_week integer[];
  v_day_of_month integer;
  v_count integer := 0;
  v_dow integer;
  v_last_period_start date;
BEGIN
  SELECT id, space_id, recurrence_type, recurrence_pattern, start_date, end_date,
         target_value, is_active
  INTO v_template
  FROM recurring_goal_templates
  WHERE id = template_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found: %', template_id_param;
  END IF;

  IF v_template.is_active IS NOT TRUE THEN
    RETURN 0;
  END IF;

  IF v_template.end_date IS NOT NULL AND until_date > v_template.end_date THEN
    until_date := v_template.end_date;
  END IF;

  SELECT MAX(period_start) INTO v_last_period_start
  FROM recurring_goal_instances
  WHERE template_id = template_id_param;

  IF v_last_period_start IS NOT NULL THEN
    v_current_date := v_last_period_start + interval '1 day';
  ELSE
    v_current_date := v_template.start_date;
  END IF;

  v_interval_days := COALESCE((v_template.recurrence_pattern->>'interval')::integer, 1);

  CASE v_template.recurrence_type
    WHEN 'daily' THEN
      WHILE v_current_date <= until_date LOOP
        IF NOT EXISTS (
          SELECT 1 FROM recurring_goal_instances
          WHERE template_id = template_id_param AND period_start = v_current_date
        ) THEN
          INSERT INTO recurring_goal_instances (
            template_id, period_start, period_end, target_value,
            status, auto_generated, generation_date
          ) VALUES (
            template_id_param, v_current_date, v_current_date,
            COALESCE(v_template.target_value, 1), 'pending', true, now()
          );
          v_count := v_count + 1;
        END IF;
        v_current_date := v_current_date + (v_interval_days || ' days')::interval;
      END LOOP;

    WHEN 'weekly' THEN
      IF v_template.recurrence_pattern ? 'days_of_week' THEN
        SELECT array_agg(val::integer)
        INTO v_days_of_week
        FROM jsonb_array_elements_text(v_template.recurrence_pattern->'days_of_week') AS val;
      ELSE
        v_days_of_week := ARRAY[0,1,2,3,4,5,6];
      END IF;

      WHILE v_current_date <= until_date LOOP
        v_dow := EXTRACT(DOW FROM v_current_date)::integer;
        IF v_dow = ANY(v_days_of_week) THEN
          IF NOT EXISTS (
            SELECT 1 FROM recurring_goal_instances
            WHERE template_id = template_id_param AND period_start = v_current_date
          ) THEN
            INSERT INTO recurring_goal_instances (
              template_id, period_start, period_end, target_value,
              status, auto_generated, generation_date
            ) VALUES (
              template_id_param, v_current_date, v_current_date,
              COALESCE(v_template.target_value, 1), 'pending', true, now()
            );
            v_count := v_count + 1;
          END IF;
        END IF;
        v_current_date := v_current_date + interval '1 day';
      END LOOP;

    WHEN 'monthly' THEN
      v_day_of_month := COALESCE((v_template.recurrence_pattern->>'day_of_month')::integer, 1);
      WHILE v_current_date <= until_date LOOP
        v_current_date := make_date(
          EXTRACT(YEAR FROM v_current_date)::integer,
          EXTRACT(MONTH FROM v_current_date)::integer,
          LEAST(v_day_of_month,
            EXTRACT(DAY FROM (date_trunc('month', v_current_date) + interval '1 month - 1 day'))::integer)
        );
        IF v_current_date <= until_date THEN
          v_period_end := (date_trunc('month', v_current_date) + interval '1 month - 1 day')::date;
          IF NOT EXISTS (
            SELECT 1 FROM recurring_goal_instances
            WHERE template_id = template_id_param AND period_start = v_current_date
          ) THEN
            INSERT INTO recurring_goal_instances (
              template_id, period_start, period_end, target_value,
              status, auto_generated, generation_date
            ) VALUES (
              template_id_param, v_current_date, v_period_end,
              COALESCE(v_template.target_value, 1), 'pending', true, now()
            );
            v_count := v_count + 1;
          END IF;
        END IF;
        v_current_date := (date_trunc('month', v_current_date) + interval '1 month')::date;
      END LOOP;

    ELSE
      -- Custom or unknown: fall back to daily with configured interval
      WHILE v_current_date <= until_date LOOP
        IF NOT EXISTS (
          SELECT 1 FROM recurring_goal_instances
          WHERE template_id = template_id_param AND period_start = v_current_date
        ) THEN
          INSERT INTO recurring_goal_instances (
            template_id, period_start, period_end, target_value,
            status, auto_generated, generation_date
          ) VALUES (
            template_id_param, v_current_date, v_current_date,
            COALESCE(v_template.target_value, 1), 'pending', true, now()
          );
          v_count := v_count + 1;
        END IF;
        v_current_date := v_current_date + (v_interval_days || ' days')::interval;
      END LOOP;
  END CASE;

  RETURN v_count;
END;
$$;


--
-- Name: generate_secure_share_token(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_secure_share_token() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  random_bytes bytea;
  base64_string text;
BEGIN
  -- Explicit `extensions.` qualifier in case search_path resolution
  -- fails for any reason. Both should be safe — pgcrypto is universally
  -- in `extensions` on Supabase, but we add the SET search_path above
  -- as belt-and-suspenders.
  random_bytes := extensions.gen_random_bytes(32);

  base64_string := encode(random_bytes, 'base64');
  base64_string := REPLACE(REPLACE(TRIM(TRAILING '=' FROM base64_string), '+', '-'), '/', '_');

  RETURN base64_string;
END;
$$;


--
-- Name: get_active_launch_subscribers(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_active_launch_subscribers() RETURNS integer
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT COUNT(*)::INTEGER
  FROM launch_notifications
  WHERE subscribed = TRUE AND unsubscribed_at IS NULL;
$$;


--
-- Name: get_admin_details(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_admin_details() RETURNS TABLE(admin_id uuid, email text, role text, permissions jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id,
    au.email,
    au.role,
    au.permissions
  FROM admin_users au
  WHERE au.user_id = auth.uid()
    AND au.is_active = true
  LIMIT 1;
END;
$$;


--
-- Name: get_admin_permissions(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_admin_permissions(user_email text) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(permissions, '{}'::jsonb)
  FROM admin_users
  WHERE email = user_email
  AND is_active = TRUE;
$$;


--
-- Name: get_analytics_range(date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_analytics_range(start_date date, end_date date) RETURNS TABLE(date date, new_users integer, active_users integer, beta_requests integer, launch_signups integer, feature_usage jsonb)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT
    da.date,
    da.new_users,
    da.active_users,
    da.beta_requests,
    da.launch_signups,
    da.feature_usage
  FROM daily_analytics da
  WHERE da.date BETWEEN start_date AND end_date
  ORDER BY da.date DESC;
$$;


--
-- Name: get_conversations_with_unread(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_conversations_with_unread(space_id_param uuid, user_id_param uuid) RETURNS TABLE(id uuid, space_id uuid, title text, conversation_type text, last_message_preview text, last_message_at timestamp with time zone, is_archived boolean, avatar_url text, description text, participants jsonb, unread_count bigint, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.space_id,
    c.title,
    c.conversation_type,
    c.last_message_preview,
    c.last_message_at,
    c.is_archived,
    c.avatar_url,
    c.description,
    c.participants,
    COUNT(m.id) FILTER (WHERE m.read = FALSE AND m.sender_id != user_id_param) AS unread_count,
    c.created_at,
    c.updated_at
  FROM conversations c
  LEFT JOIN messages m ON m.conversation_id = c.id
  WHERE c.space_id = space_id_param
  GROUP BY c.id
  ORDER BY c.last_message_at DESC NULLS LAST;
END;
$$;


--
-- Name: get_daily_usage_count(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_daily_usage_count(p_user_id uuid, p_usage_type text) RETURNS integer
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $_$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_usage_type NOT IN ('tasks_created', 'messages_sent', 'quick_actions_used', 'shopping_list_updates') THEN
    RAISE EXCEPTION 'Invalid usage type: %', p_usage_type;
  END IF;

  EXECUTE format(
    'SELECT COALESCE(%I, 0) FROM public.daily_usage WHERE user_id = $1 AND date = CURRENT_DATE',
    p_usage_type
  )
  INTO v_count
  USING p_user_id;

  RETURN COALESCE(v_count, 0);
END;
$_$;


--
-- Name: get_dashboard_summary(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_dashboard_summary(p_space_id uuid, p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_result JSONB := '{}'::JSONB;
    v_today DATE := CURRENT_DATE;
    v_now TIMESTAMPTZ := CURRENT_TIMESTAMP;
    v_week_start TIMESTAMPTZ := date_trunc('week', CURRENT_TIMESTAMP);
    v_month_start TIMESTAMPTZ := date_trunc('month', CURRENT_TIMESTAMP);
BEGIN
    -- Verify user has access
    IF NOT EXISTS (SELECT 1 FROM space_members WHERE space_id = p_space_id AND user_id = p_user_id) THEN
        RAISE EXCEPTION 'User does not have access to this space';
    END IF;

    v_result := jsonb_build_object(
        -- TASKS
        'tasks', (
            SELECT jsonb_build_object(
                'total', COUNT(*),
                'pending', COUNT(*) FILTER (WHERE status = 'pending'),
                'inProgress', COUNT(*) FILTER (WHERE status = 'in_progress'),
                'completed', COUNT(*) FILTER (WHERE status = 'completed'),
                'dueToday', COUNT(*) FILTER (WHERE due_date::date = v_today AND status != 'completed'),
                'overdue', COUNT(*) FILTER (WHERE due_date::date < v_today AND status NOT IN ('completed', 'cancelled')),
                'highPriority', COUNT(*) FILTER (WHERE priority IN ('high', 'urgent') AND status != 'completed'),
                'assignedToMe', COUNT(*) FILTER (WHERE assigned_to = p_user_id AND status != 'completed'),
                'trend', 0
            )
            FROM tasks WHERE space_id = p_space_id
        ),
        'recentTasks', COALESCE((
            SELECT jsonb_agg(row_to_json(t))
            FROM (
                SELECT id, title, status, priority, due_date, assigned_to
                FROM tasks
                WHERE space_id = p_space_id AND status != 'completed'
                ORDER BY
                    CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                    due_date ASC NULLS LAST
                LIMIT 5
            ) t
        ), '[]'::JSONB),

        -- CHORES (due_date, not next_due_date)
        'chores', (
            SELECT jsonb_build_object(
                'total', COUNT(*),
                'pending', COUNT(*) FILTER (WHERE status = 'pending'),
                'dueToday', COUNT(*) FILTER (WHERE due_date::date = v_today AND status != 'completed'),
                'overdue', COUNT(*) FILTER (WHERE due_date::date < v_today AND status NOT IN ('completed', 'cancelled')),
                'assignedToMe', COUNT(*) FILTER (WHERE assigned_to = p_user_id AND status != 'completed'),
                'assignedToPartner', COUNT(*) FILTER (WHERE assigned_to IS NOT NULL AND assigned_to != p_user_id AND status != 'completed'),
                'completedThisWeek', COUNT(*) FILTER (WHERE status = 'completed' AND completed_at >= v_week_start),
                'trend', 0
            )
            FROM chores WHERE space_id = p_space_id
        ),
        'recentChores', '[]'::JSONB,

        -- CALENDAR EVENTS (no is_shared column)
        'events', (
            SELECT jsonb_build_object(
                'total', COUNT(*),
                'today', COUNT(*) FILTER (WHERE start_time::date = v_today),
                'thisWeek', COUNT(*) FILTER (WHERE start_time >= v_week_start AND start_time < v_week_start + INTERVAL '7 days'),
                'upcoming', COUNT(*) FILTER (WHERE start_time >= v_now),
                'personal', 0,
                'shared', 0,
                'trend', 0
            )
            FROM calendar_events WHERE space_id = p_space_id
        ),
        'nextEvent', (
            SELECT row_to_json(e)
            FROM (
                SELECT id, title, start_time, end_time, location, all_day
                FROM calendar_events
                WHERE space_id = p_space_id AND start_time >= v_now
                ORDER BY start_time ASC
                LIMIT 1
            ) e
        ),

        -- REMINDERS (reminder_time, not remind_at for time-based queries)
        'reminders', (
            SELECT jsonb_build_object(
                'total', COUNT(*),
                'active', COUNT(*) FILTER (WHERE status IN ('active', 'pending')),
                'completed', COUNT(*) FILTER (WHERE status = 'completed' OR completed = true),
                'overdue', COUNT(*) FILTER (WHERE reminder_time < v_now AND status NOT IN ('completed', 'dismissed') AND completed = false),
                'dueToday', COUNT(*) FILTER (WHERE reminder_time::date = v_today AND status NOT IN ('completed', 'dismissed') AND completed = false),
                'trend', 0
            )
            FROM reminders WHERE space_id = p_space_id
        ),
        'nextReminder', (
            SELECT row_to_json(r)
            FROM (
                SELECT id, title, reminder_time, priority
                FROM reminders
                WHERE space_id = p_space_id AND reminder_time >= v_now AND status NOT IN ('completed', 'dismissed') AND completed = false
                ORDER BY reminder_time ASC
                LIMIT 1
            ) r
        ),

        -- MESSAGES
        'messages', (
            SELECT jsonb_build_object(
                'total', COUNT(*),
                'today', COUNT(*) FILTER (WHERE created_at::date = v_today),
                'trend', 0
            )
            FROM messages WHERE space_id = p_space_id
        ),
        'messageStats', jsonb_build_object('unread', 0, 'conversations', 0),
        'lastMessage', NULL,

        -- SHOPPING LISTS
        'shopping', (
            SELECT jsonb_build_object(
                'totalLists', COUNT(*),
                'activeLists', COUNT(*) FILTER (WHERE status = 'active' OR completed_at IS NULL),
                'urgentList', NULL::TEXT
            )
            FROM shopping_lists WHERE space_id = p_space_id
        ),
        -- SHOPPING ITEMS (checked column exists in DB)
        'shoppingItems', (
            SELECT jsonb_build_object(
                'totalItems', COUNT(*),
                'checkedToday', COUNT(*) FILTER (WHERE si.checked = true AND si.updated_at::date = v_today),
                'uncheckedItems', COUNT(*) FILTER (WHERE si.checked = false),
                'checkedThisWeek', COUNT(*) FILTER (WHERE si.checked = true AND si.updated_at >= v_week_start)
            )
            FROM shopping_items si
            INNER JOIN shopping_lists sl ON si.list_id = sl.id
            WHERE sl.space_id = p_space_id
        ),

        -- MEALS
        'meals', (
            SELECT jsonb_build_object(
                'thisWeek', COUNT(*) FILTER (WHERE scheduled_date >= v_week_start AND scheduled_date < v_week_start + INTERVAL '7 days'),
                'mealsToday', COUNT(*) FILTER (WHERE scheduled_date::date = v_today),
                'trend', 0
            )
            FROM meals WHERE space_id = p_space_id
        ),
        'savedRecipes', (SELECT COUNT(*) FROM recipes WHERE space_id = p_space_id),
        'nextMeal', (
            SELECT row_to_json(m)
            FROM (
                SELECT id, COALESCE(name, meal_type) as recipe_name, meal_type, scheduled_date
                FROM meals
                WHERE space_id = p_space_id AND scheduled_date::date >= v_today
                ORDER BY scheduled_date ASC
                LIMIT 1
            ) m
        ),

        -- BUDGET (allocated_amount, not monthly_budget)
        'budget', (
            SELECT jsonb_build_object(
                'monthlyBudget', COALESCE(SUM(allocated_amount), 0),
                'pendingBills', 0
            )
            FROM budget_categories WHERE space_id = p_space_id
        ),
        'expenses', (
            SELECT jsonb_build_object(
                'spentThisMonth', COALESCE(SUM(amount), 0)
            )
            FROM expenses WHERE space_id = p_space_id AND created_at >= v_month_start
        ),

        -- PROJECTS (budget_amount, not budget)
        'projects', (
            SELECT jsonb_build_object(
                'total', COUNT(*),
                'planning', COUNT(*) FILTER (WHERE status = 'planning'),
                'inProgress', COUNT(*) FILTER (WHERE status = 'in_progress'),
                'completed', COUNT(*) FILTER (WHERE status = 'completed'),
                'onHold', COUNT(*) FILTER (WHERE status = 'on_hold'),
                'totalBudget', COALESCE(SUM(budget_amount), 0),
                'totalExpenses', COALESCE(SUM(actual_cost), 0),
                'trend', 0
            )
            FROM projects WHERE space_id = p_space_id
        ),

        -- GOALS
        'goals', (
            SELECT jsonb_build_object(
                'total', COUNT(*),
                'active', COUNT(*) FILTER (WHERE status IN ('active', 'in_progress')),
                'completed', COUNT(*) FILTER (WHERE status = 'completed'),
                'overallProgress', COALESCE(AVG(progress) FILTER (WHERE status IN ('active', 'in_progress')), 0)::INTEGER,
                'trend', 0
            )
            FROM goals WHERE space_id = p_space_id
        ),
        'topGoal', (
            SELECT row_to_json(g)
            FROM (
                SELECT id, title, progress, target_date
                FROM goals
                WHERE space_id = p_space_id AND status IN ('active', 'in_progress')
                ORDER BY progress DESC
                LIMIT 1
            ) g
        )
    );

    RETURN v_result;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: calendar_webhook_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_webhook_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    connection_id uuid NOT NULL,
    provider public.calendar_provider DEFAULT 'google'::public.calendar_provider NOT NULL,
    webhook_id text NOT NULL,
    webhook_url text NOT NULL,
    webhook_secret text NOT NULL,
    resource_id text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    events_received integer DEFAULT 0 NOT NULL,
    last_event_at timestamp with time zone,
    renewal_attempted_at timestamp with time zone,
    renewal_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: get_expiring_webhooks(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_expiring_webhooks(hours_ahead integer DEFAULT 24) RETURNS SETOF public.calendar_webhook_subscriptions
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM calendar_webhook_subscriptions
  WHERE is_active = TRUE
    AND provider = 'google'
    AND expires_at < NOW() + (hours_ahead || ' hours')::INTERVAL
    AND expires_at > NOW()
  ORDER BY expires_at ASC;
END;
$$;


--
-- Name: get_feature_usage_summary(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_feature_usage_summary(days_back integer DEFAULT 7) RETURNS TABLE(feature text, total_page_views bigint, total_unique_users bigint, total_actions bigint, avg_daily_users numeric, trend_percent numeric)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  start_date DATE := CURRENT_DATE - days_back;
  mid_date DATE := CURRENT_DATE - (days_back / 2);
BEGIN
  RETURN QUERY
  WITH period_stats AS (
    SELECT
      fud.feature,
      SUM(fud.page_views) as total_views,
      SUM(fud.unique_users) as total_users,
      SUM(fud.total_actions) as total_acts,
      AVG(fud.unique_users)::NUMERIC as avg_users
    FROM feature_usage_daily fud
    WHERE fud.date >= start_date
    GROUP BY fud.feature
  ),
  first_half AS (
    SELECT
      fud.feature,
      SUM(fud.unique_users) as users
    FROM feature_usage_daily fud
    WHERE fud.date >= start_date AND fud.date < mid_date
    GROUP BY fud.feature
  ),
  second_half AS (
    SELECT
      fud.feature,
      SUM(fud.unique_users) as users
    FROM feature_usage_daily fud
    WHERE fud.date >= mid_date
    GROUP BY fud.feature
  )
  SELECT
    ps.feature,
    ps.total_views,
    ps.total_users,
    ps.total_acts,
    ROUND(ps.avg_users, 1),
    CASE
      WHEN COALESCE(fh.users, 0) = 0 THEN 0
      ELSE ROUND(((COALESCE(sh.users, 0) - COALESCE(fh.users, 0))::NUMERIC / NULLIF(fh.users, 0) * 100), 1)
    END as trend_pct
  FROM period_stats ps
  LEFT JOIN first_half fh ON ps.feature = fh.feature
  LEFT JOIN second_half sh ON ps.feature = sh.feature
  ORDER BY ps.total_users DESC;
END;
$$;


--
-- Name: get_founding_member_spots_remaining(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_founding_member_spots_remaining() RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT max_count - current_count FROM public.founding_member_counter WHERE id = 1;
$$;


--
-- Name: get_goal_dependency_tree(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_goal_dependency_tree(p_goal_id uuid) RETURNS TABLE(goal_id uuid, goal_title text, depends_on_goal_id uuid, depends_on_title text, dependency_type text, completion_threshold integer, status text, depth integer)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE dependency_tree AS (
        -- Base case: direct dependencies
        SELECT
            gd.goal_id,
            g1.title as goal_title,
            gd.depends_on_goal_id,
            g2.title as depends_on_title,
            gd.dependency_type,
            gd.completion_threshold,
            gd.status,
            1 as depth
        FROM goal_dependencies gd
        JOIN goals g1 ON gd.goal_id = g1.id
        JOIN goals g2 ON gd.depends_on_goal_id = g2.id
        WHERE gd.goal_id = p_goal_id

        UNION ALL

        -- Recursive case: dependencies of dependencies
        SELECT
            gd.goal_id,
            g1.title,
            gd.depends_on_goal_id,
            g2.title,
            gd.dependency_type,
            gd.completion_threshold,
            gd.status,
            dt.depth + 1
        FROM goal_dependencies gd
        JOIN dependency_tree dt ON gd.goal_id = dt.depends_on_goal_id
        JOIN goals g1 ON gd.goal_id = g1.id
        JOIN goals g2 ON gd.depends_on_goal_id = g2.id
        WHERE dt.depth < 5  -- Limit depth to prevent infinite recursion
    )
    SELECT * FROM dependency_tree
    ORDER BY depth, goal_title;
END;
$$;


--
-- Name: get_meal_time(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_meal_time(meal_type text) RETURNS time without time zone
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN CASE meal_type
    WHEN 'breakfast' THEN '08:00:00'::TIME
    WHEN 'lunch' THEN '12:00:00'::TIME
    WHEN 'dinner' THEN '18:00:00'::TIME
    WHEN 'snack' THEN '15:00:00'::TIME
    ELSE '12:00:00'::TIME
  END;
END;
$$;


--
-- Name: get_next_rotation_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_rotation_user(rotation_id uuid) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  rotation_record RECORD;
  next_user_id UUID;
  user_list JSONB;
  list_length INTEGER;
BEGIN
  -- Get rotation record
  SELECT * INTO rotation_record
  FROM chore_rotations
  WHERE id = rotation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rotation not found: %', rotation_id;
  END IF;

  user_list := rotation_record.user_order;
  list_length := jsonb_array_length(user_list);

  IF list_length = 0 THEN
    RAISE EXCEPTION 'No users in rotation: %', rotation_id;
  END IF;

  -- Get next user based on rotation type
  IF rotation_record.rotation_type = 'round_robin' THEN
    -- Get user at current_index
    next_user_id := (user_list->>rotation_record.current_index)::UUID;

    -- Update current_index for next time (wrap around)
    UPDATE chore_rotations
    SET current_index = (current_index + 1) % list_length
    WHERE id = rotation_id;

  ELSIF rotation_record.rotation_type = 'random' THEN
    -- Pick random user
    next_user_id := (user_list->>floor(random() * list_length)::INTEGER)::UUID;

  ELSE
    RAISE EXCEPTION 'Unsupported rotation type: %', rotation_record.rotation_type;
  END IF;

  RETURN next_user_id;
END;
$$;


--
-- Name: get_or_create_daily_analytics(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_or_create_daily_analytics(target_date date DEFAULT CURRENT_DATE) RETURNS uuid
    LANGUAGE sql
    SET search_path TO 'public'
    AS $$
  INSERT INTO daily_analytics (date)
  VALUES (target_date)
  ON CONFLICT (date) DO NOTHING
  RETURNING id;

  SELECT id FROM daily_analytics WHERE date = target_date;
$$;


--
-- Name: get_pending_reminders(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pending_reminders() RETURNS TABLE(reminder_id uuid, task_id uuid, user_id uuid, task_title text, task_description text, reminder_type text, remind_at timestamp with time zone)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    tr.id,
    tr.task_id,
    tr.user_id,
    t.title,
    t.description,
    tr.reminder_type,
    tr.remind_at
  FROM task_reminders tr
  JOIN tasks t ON t.id = tr.task_id
  WHERE tr.is_sent = FALSE
    AND tr.remind_at <= NOW()
    AND t.status != 'completed'
  ORDER BY tr.remind_at ASC;
END;
$$;


--
-- Name: calendar_sync_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_sync_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid,
    connection_id uuid NOT NULL,
    mapping_id uuid,
    operation public.queue_operation NOT NULL,
    priority integer DEFAULT 5 NOT NULL,
    status public.queue_status DEFAULT 'pending'::public.queue_status NOT NULL,
    event_snapshot jsonb,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 3 NOT NULL,
    last_error text,
    next_retry_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone
);


--
-- Name: get_pending_sync_queue_items(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pending_sync_queue_items(p_limit integer DEFAULT 10) RETURNS SETOF public.calendar_sync_queue
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM calendar_sync_queue
  WHERE status = 'pending'
    OR (status = 'failed' AND retry_count < max_retries AND next_retry_at <= NOW())
  ORDER BY priority ASC, created_at ASC
  LIMIT p_limit;
END;
$$;


--
-- Name: get_recent_milestone_celebrations(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_recent_milestone_celebrations(p_space_id uuid, p_days integer DEFAULT 7) RETURNS TABLE(milestone_id uuid, goal_id uuid, goal_title text, milestone_title text, milestone_description text, completed_at timestamp with time zone, percentage_reached numeric)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    gm.id AS milestone_id,
    g.id AS goal_id,
    g.title AS goal_title,
    gm.title AS milestone_title,
    gm.description AS milestone_description,
    gm.completed_at,
    gm.target_value AS percentage_reached
  FROM goal_milestones gm
  INNER JOIN goals g ON gm.goal_id = g.id
  WHERE g.space_id = p_space_id
    AND gm.completed = TRUE
    AND gm.completed_at >= NOW() - INTERVAL '1 day' * p_days
  ORDER BY gm.completed_at DESC;
END;
$$;


--
-- Name: get_reminder_comment_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_reminder_comment_count(p_reminder_id uuid) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COUNT(*)::INTEGER
  FROM reminder_comments
  WHERE reminder_id = p_reminder_id;
$$;


--
-- Name: get_smart_nudges(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_smart_nudges(p_user_id uuid, p_space_id uuid, p_limit integer DEFAULT 10) RETURNS TABLE(nudge_id uuid, goal_id uuid, goal_title text, template_name text, category text, title text, message text, action_text text, icon text, priority integer, days_since_activity integer, days_until_deadline integer, should_send boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    user_settings RECORD;
    current_ts TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get user's nudge settings
    SELECT * INTO user_settings
    FROM nudge_settings
    WHERE user_id = p_user_id AND space_id = p_space_id;

    -- If no settings found, use defaults
    IF user_settings IS NULL THEN
        INSERT INTO nudge_settings (user_id, space_id)
        VALUES (p_user_id, p_space_id)
        RETURNING * INTO user_settings;
    END IF;

    -- Skip if nudges disabled
    IF NOT user_settings.nudges_enabled THEN
        RETURN;
    END IF;

    current_ts := NOW();

    RETURN QUERY
    WITH goal_analysis AS (
        SELECT
            g.id as goal_id,
            g.title as goal_title,
            g.status,
            g.progress,
            g.target_date,
            g.updated_at,
            gnt.last_nudge_sent_at,
            gnt.last_activity_at,
            gnt.nudge_count,
            gnt.is_snoozed,
            gnt.snoozed_until,
            EXTRACT(days FROM (current_ts - COALESCE(gnt.last_activity_at, g.updated_at)))::INTEGER as days_since_activity,
            CASE
                WHEN g.target_date IS NOT NULL
                THEN EXTRACT(days FROM (g.target_date::timestamp - current_ts))::INTEGER
                ELSE NULL
            END as days_until_deadline,
            CASE
                WHEN g.target_date IS NOT NULL AND g.target_date::timestamp < current_ts
                THEN EXTRACT(days FROM (current_ts - g.target_date::timestamp))::INTEGER
                ELSE 0
            END as days_overdue
        FROM goals g
        LEFT JOIN goal_nudge_tracking gnt ON g.id = gnt.goal_id AND gnt.user_id = p_user_id
        WHERE g.space_id = p_space_id
        AND g.status IN ('active', 'paused')
        AND (gnt.is_snoozed = false OR gnt.snoozed_until < current_ts OR gnt.is_snoozed IS NULL)
    ),

    nudge_candidates AS (
        SELECT DISTINCT
            gen_random_uuid() as nudge_id,
            ga.goal_id,
            ga.goal_title,
            nt.name as template_name,
            nt.category,
            REPLACE(REPLACE(nt.title, '{goal_title}', ga.goal_title), '{days_remaining}', COALESCE(ga.days_until_deadline::text, 'unknown')) as title,
            REPLACE(REPLACE(REPLACE(nt.message, '{goal_title}', ga.goal_title), '{days_remaining}', COALESCE(ga.days_until_deadline::text, 'unknown')), '{progress}', ga.progress::text) as message,
            nt.action_text,
            nt.icon,
            nt.priority,
            ga.days_since_activity,
            ga.days_until_deadline,
            CASE
                -- Overdue goals (high priority)
                WHEN nt.trigger_type = 'overdue' AND ga.days_overdue > 0 THEN true
                -- Upcoming deadlines
                WHEN nt.trigger_type = 'upcoming_deadline' AND ga.days_until_deadline BETWEEN 1 AND 7 THEN true
                -- Stagnant goals (no activity for configured days)
                WHEN nt.trigger_type = 'stagnant' AND ga.days_since_activity >= COALESCE(nt.days_since_activity, 3) THEN true
                -- Daily check-in (if enabled and not sent today)
                WHEN nt.trigger_type = 'daily_checkin' AND user_settings.daily_nudges_enabled
                     AND (ga.last_nudge_sent_at IS NULL OR ga.last_nudge_sent_at::date < current_ts::date) THEN true
                -- Weekly summary (once per week)
                WHEN nt.trigger_type = 'weekly_summary' AND user_settings.weekly_summary_enabled
                     AND (ga.last_nudge_sent_at IS NULL OR ga.last_nudge_sent_at < current_ts - INTERVAL '7 days') THEN true
                ELSE false
            END as should_send
        FROM goal_analysis ga
        CROSS JOIN nudge_templates nt
        WHERE nt.is_active = true
        AND (
            -- Match specific triggers
            (nt.trigger_type = 'overdue' AND ga.days_overdue > 0) OR
            (nt.trigger_type = 'upcoming_deadline' AND ga.days_until_deadline BETWEEN 1 AND 7) OR
            (nt.trigger_type = 'stagnant' AND ga.days_since_activity >= COALESCE(nt.days_since_activity, 3)) OR
            (nt.trigger_type = 'daily_checkin' AND user_settings.daily_nudges_enabled) OR
            (nt.trigger_type = 'weekly_summary' AND user_settings.weekly_summary_enabled)
        )
    )

    SELECT
        nc.nudge_id,
        nc.goal_id,
        nc.goal_title,
        nc.template_name,
        nc.category,
        nc.title,
        nc.message,
        nc.action_text,
        nc.icon,
        nc.priority,
        nc.days_since_activity,
        nc.days_until_deadline,
        nc.should_send
    FROM nudge_candidates nc
    WHERE nc.should_send = true
    ORDER BY nc.priority DESC, nc.days_until_deadline ASC NULLS LAST
    LIMIT p_limit;
END;
$$;


--
-- Name: get_task_stats(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_task_stats(p_space_id uuid) RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT json_build_object(
    'total', COUNT(*),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'inProgress', COUNT(*) FILTER (WHERE status IN ('in-progress', 'in_progress')),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'blocked', COUNT(*) FILTER (WHERE status = 'blocked'),
    'onHold', COUNT(*) FILTER (WHERE status IN ('on-hold', 'on_hold')),
    'byPriority', json_build_object(
      'low', COUNT(*) FILTER (WHERE priority = 'low'),
      'medium', COUNT(*) FILTER (WHERE priority = 'medium'),
      'high', COUNT(*) FILTER (WHERE priority = 'high'),
      'urgent', COUNT(*) FILTER (WHERE priority = 'urgent')
    )
  )
  FROM public.tasks WHERE space_id = p_space_id
$$;


--
-- Name: get_unread_mentions(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_unread_mentions(p_user_id uuid) RETURNS TABLE(mention_id uuid, reminder_id uuid, reminder_title text, mentioning_user_name text, created_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    rm.id AS mention_id,
    r.id AS reminder_id,
    r.title AS reminder_title,
    u.name AS mentioning_user_name,
    rm.created_at
  FROM reminder_mentions rm
  INNER JOIN reminders r ON r.id = rm.reminder_id
  INNER JOIN users u ON u.id = rm.mentioning_user_id
  WHERE rm.mentioned_user_id = p_user_id
  ORDER BY rm.created_at DESC
  LIMIT 50;
$$;


--
-- Name: get_unread_notification_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_unread_notification_count(p_user_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  count_result INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO count_result
  FROM in_app_notifications
  WHERE user_id = p_user_id AND is_read = FALSE;

  RETURN COALESCE(count_result, 0);
END;
$$;


--
-- Name: get_upcoming_bills(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_upcoming_bills(p_space_id uuid, p_days_ahead integer DEFAULT 30) RETURNS TABLE(event_id uuid, expense_id uuid, title text, amount numeric, due_date timestamp with time zone, category text, payment_method text, days_until_due integer)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id AS event_id,
    ex.id AS expense_id,
    e.title,
    ex.amount,
    e.start_time AS due_date,
    ex.category,
    ex.payment_method,
    EXTRACT(DAY FROM (e.start_time - NOW()))::INTEGER AS days_until_due
  FROM events e
  INNER JOIN expenses ex ON e.expense_id = ex.id
  WHERE e.space_id = p_space_id
    AND e.event_type = 'bill_due'
    AND e.start_time BETWEEN NOW() AND NOW() + (p_days_ahead || ' days')::INTERVAL
  ORDER BY e.start_time ASC;
END;
$$;


--
-- Name: get_user_space_ids(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_space_ids(user_uuid uuid) RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT space_id FROM space_members WHERE user_id = user_uuid;
$$;


--
-- Name: get_user_subscription_tier(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_subscription_tier(p_user_id uuid) RETURNS text
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_tier TEXT;
  v_trial_ends_at TIMESTAMPTZ;
BEGIN
  SELECT tier, trial_ends_at INTO v_tier, v_trial_ends_at
  FROM public.subscriptions
  WHERE user_id = p_user_id
    AND status = 'active';

  -- No subscription found = free tier
  IF v_tier IS NULL THEN
    RETURN 'free';
  END IF;

  -- If user has paid tier, return it
  IF v_tier IN ('pro', 'family') THEN
    RETURN v_tier;
  END IF;

  -- If user is in active trial, give them Pro tier access
  IF v_trial_ends_at IS NOT NULL AND v_trial_ends_at > NOW() THEN
    RETURN 'pro';  -- Trial users get Pro features
  END IF;

  -- Default to free tier
  RETURN 'free';
END;
$$;


--
-- Name: get_yesterday_metrics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_yesterday_metrics() RETURNS TABLE(new_users integer, active_users integer, beta_requests integer, launch_signups integer, total_beta_users bigint, total_launch_signups bigint)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT
    COALESCE(da.new_users, 0) as new_users,
    COALESCE(da.active_users, 0) as active_users,
    COALESCE(da.beta_requests, 0) as beta_requests,
    COALESCE(da.launch_signups, 0) as launch_signups,
    (SELECT COUNT(*) FROM beta_access_requests WHERE access_granted = true) as total_beta_users,
    (SELECT COUNT(*) FROM launch_notifications WHERE subscribed = true) as total_launch_signups
  FROM daily_analytics da
  WHERE da.date = CURRENT_DATE - INTERVAL '1 day'
  UNION ALL
  SELECT 0, 0, 0, 0,
    (SELECT COUNT(*) FROM beta_access_requests WHERE access_granted = true),
    (SELECT COUNT(*) FROM launch_notifications WHERE subscribed = true)
  WHERE NOT EXISTS (
    SELECT 1 FROM daily_analytics WHERE date = CURRENT_DATE - INTERVAL '1 day'
  )
  LIMIT 1;
$$;


--
-- Name: handle_new_learn_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_learn_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  INSERT INTO learn.profiles (id, email, account_type)
  VALUES (NEW.id, NEW.email, 'parent')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  -- Try to insert user profile
  BEGIN
    INSERT INTO public.users (
      id,
      email,
      name,
      pronouns,
      color_theme
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
      NEW.raw_user_meta_data->>'pronouns',
      COALESCE(NEW.raw_user_meta_data->>'color_theme', 'emerald')
    );

    RAISE LOG 'Successfully created user profile for user %', NEW.id;

  EXCEPTION WHEN OTHERS THEN
    -- Log the error but DON'T re-raise to prevent rollback
    RAISE WARNING 'Error in handle_new_user trigger for user %: % (SQLSTATE: %)',
      NEW.id, SQLERRM, SQLSTATE;
    RAISE LOG 'Auth user % will be created without profile - profile can be created manually', NEW.id;
  END;

  -- Always return NEW to allow auth user creation to succeed
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user_workspace_provisioning(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user_workspace_provisioning() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_space_id UUID;
  space_name_to_use TEXT;
  pending_invitation RECORD;
BEGIN
  -- Skip if user already has a space membership
  IF EXISTS (SELECT 1 FROM space_members WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Check if this user has a pending invitation (invited users don't get a default space)
  SELECT id, space_id, role INTO pending_invitation
  FROM space_invitations
  WHERE email = NEW.email
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF pending_invitation.id IS NOT NULL THEN
    -- User was invited - add them to the inviter's space instead of creating a new space
    INSERT INTO space_members (
      space_id,
      user_id,
      role,
      joined_at
    ) VALUES (
      pending_invitation.space_id,
      NEW.id,
      pending_invitation.role,  -- Use the role from the invitation
      NOW()
    );

    -- Mark the invitation as accepted
    UPDATE space_invitations
    SET status = 'accepted',
        accepted_at = NOW()
    WHERE id = pending_invitation.id;

    RAISE LOG 'Added invited user % to space % with role %', NEW.id, pending_invitation.space_id, pending_invitation.role;
    RETURN NEW;
  END IF;

  -- Not an invited user - create default space as normal
  space_name_to_use := COALESCE(
    (
      SELECT raw_user_meta_data->>'space_name'
      FROM auth.users
      WHERE id = NEW.id
    ),
    NEW.name || '''s Space'
  );

  INSERT INTO spaces (
    name,
    is_personal,
    auto_created,
    user_id,
    created_at,
    updated_at
  ) VALUES (
    space_name_to_use,
    true,
    true,
    NEW.id,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_space_id;

  INSERT INTO space_members (
    space_id,
    user_id,
    role,
    joined_at
  ) VALUES (
    new_space_id,
    NEW.id,
    'owner',
    NOW()
  );

  RAISE LOG 'Auto-provisioned workspace % for user %', new_space_id, NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Failed to auto-provision workspace for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;


--
-- Name: handle_token_expiry(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_token_expiry(p_connection_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE calendar_connections
  SET 
    sync_status = 'token_expired',
    updated_at = NOW()
  WHERE id = p_connection_id;
END;
$$;


--
-- Name: has_admin_role(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_admin_role(user_email text, required_role text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = user_email
    AND role = required_role
    AND is_active = TRUE
  );
$$;


--
-- Name: increment_daily_usage(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_daily_usage(p_user_id uuid, p_usage_type text, p_amount integer DEFAULT 1) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $_$
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
$_$;


--
-- Name: increment_points(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_points(p_user_id uuid, p_space_id uuid, p_amount integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE reward_points
  SET points = points + p_amount, updated_at = now()
  WHERE user_id = p_user_id AND space_id = p_space_id;

  IF NOT FOUND THEN
    INSERT INTO reward_points (user_id, space_id, points, updated_at)
    VALUES (p_user_id, p_space_id, GREATEST(p_amount, 0), now())
    ON CONFLICT (user_id, space_id) DO UPDATE
    SET points = reward_points.points + p_amount, updated_at = now();
  END IF;
END;
$$;


--
-- Name: increment_template_usage(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_template_usage() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Find which template was used (if any) and increment its usage count
  -- This will be called when a goal is created with a template_id
  IF NEW.template_id IS NOT NULL THEN
    UPDATE goal_templates
    SET usage_count = usage_count + 1
    WHERE id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: increment_template_usage(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_template_usage(p_template_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE reminder_templates
  SET usage_count = usage_count + 1
  WHERE id = p_template_id;
END;
$$;


--
-- Name: increment_usage_count(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_usage_count(p_user_id uuid, p_usage_type text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
BEGIN
  IF p_usage_type NOT IN ('tasks_created', 'messages_sent', 'quick_actions_used', 'shopping_list_updates') THEN
    RAISE EXCEPTION 'Invalid usage type: %', p_usage_type;
  END IF;

  EXECUTE format(
    'INSERT INTO public.daily_usage (user_id, date, %I)
     VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (user_id, date)
     DO UPDATE SET %I = public.daily_usage.%I + 1',
    p_usage_type, p_usage_type, p_usage_type
  )
  USING p_user_id;
END;
$_$;


--
-- Name: increment_webhook_event_count(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_webhook_event_count(p_webhook_id text) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE calendar_webhook_subscriptions
  SET
    events_received = events_received + 1,
    last_event_at = NOW()
  WHERE webhook_id = p_webhook_id;
END;
$$;


--
-- Name: initialize_subscription(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.initialize_subscription(p_user_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_subscription_id UUID;
BEGIN
  -- Create subscription with 14-day trial (full Pro features during trial)
  INSERT INTO public.subscriptions (
    user_id,
    tier,
    status,
    period,
    subscription_started_at,
    trial_started_at,
    trial_ends_at
  )
  VALUES (
    p_user_id,
    'free',          -- Base tier is free (trial gives Pro access)
    'active',
    'monthly',
    NOW(),
    NOW(),           -- Trial starts now
    NOW() + INTERVAL '14 days'  -- Trial ends in 14 days
  )
  ON CONFLICT (user_id) DO NOTHING -- Skip if already exists
  RETURNING id INTO v_subscription_id;

  RETURN v_subscription_id;
END;
$$;


--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    -- Check if the user exists in admin_users table and is active
    RETURN EXISTS (
        SELECT 1 FROM admin_users
        WHERE admin_users.user_id = is_admin.user_id
        AND is_active = true
    );
END;
$$;


--
-- Name: is_chore_overdue(timestamp with time zone, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_chore_overdue(p_due_date timestamp with time zone, p_grace_period_hours integer DEFAULT 2) RETURNS boolean
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF p_due_date IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN NOW() > (p_due_date + (p_grace_period_hours || ' hours')::INTERVAL);
END;
$$;


--
-- Name: is_in_quiet_hours(uuid, uuid, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_in_quiet_hours(p_user_id uuid, p_space_id uuid DEFAULT NULL::uuid, p_check_time timestamp with time zone DEFAULT now()) RETURNS boolean
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_prefs RECORD;
  v_current_time TIME;
  v_start_time TIME;
  v_end_time TIME;
  v_is_in_quiet_hours BOOLEAN;
BEGIN
  -- Get user preferences
  SELECT
    quiet_hours_enabled,
    quiet_hours_start,
    quiet_hours_end
  INTO v_prefs
  FROM user_notification_preferences
  WHERE user_id = p_user_id
    AND (space_id = p_space_id OR (space_id IS NULL AND p_space_id IS NULL))
  LIMIT 1;

  -- If no preferences found or quiet hours disabled, return false
  IF NOT FOUND OR NOT v_prefs.quiet_hours_enabled THEN
    RETURN FALSE;
  END IF;

  -- If start/end times not set, return false
  IF v_prefs.quiet_hours_start IS NULL OR v_prefs.quiet_hours_end IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Extract time component from check_time
  v_current_time := p_check_time::TIME;
  v_start_time := v_prefs.quiet_hours_start::TIME;
  v_end_time := v_prefs.quiet_hours_end::TIME;

  -- Check if current time is in quiet hours
  -- Handle cases where quiet hours span midnight
  IF v_start_time < v_end_time THEN
    -- Normal case: e.g., 22:00 to 08:00 next day
    v_is_in_quiet_hours := v_current_time >= v_start_time AND v_current_time < v_end_time;
  ELSE
    -- Spans midnight: e.g., 22:00 to 08:00
    v_is_in_quiet_hours := v_current_time >= v_start_time OR v_current_time < v_end_time;
  END IF;

  RETURN v_is_in_quiet_hours;
END;
$$;


--
-- Name: is_token_expired(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_token_expired(p_connection_id uuid, p_buffer_minutes integer DEFAULT 5) RETURNS boolean
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT token_expires_at INTO v_expires_at
  FROM calendar_connections
  WHERE id = p_connection_id;

  IF v_expires_at IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN v_expires_at <= NOW() + (p_buffer_minutes || ' minutes')::INTERVAL;
END;
$$;


--
-- Name: is_within_geofence(numeric, numeric, numeric, numeric, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_within_geofence(p_lat numeric, p_lng numeric, p_center_lat numeric, p_center_lng numeric, p_radius_meters integer) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  distance_meters FLOAT;
BEGIN
  distance_meters := 6371000 * 2 * ASIN(
    SQRT(
      POWER(SIN(RADIANS(p_lat - p_center_lat) / 2), 2) +
      COS(RADIANS(p_center_lat)) * COS(RADIANS(p_lat)) *
      POWER(SIN(RADIANS(p_lng - p_center_lng) / 2), 2)
    )
  );

  RETURN distance_meters <= p_radius_meters;
END;
$$;


--
-- Name: join_space_with_invitation(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.join_space_with_invitation(p_space_id uuid, p_user_id uuid, p_invitation_token text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_invitation RECORD;
  v_role text;
  v_space_name text;
BEGIN
  SELECT id, space_id, email, token, status, role, expires_at
  INTO v_invitation
  FROM space_invitations
  WHERE token = p_invitation_token
    AND space_id = p_space_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation token'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < now() THEN
    UPDATE space_invitations SET status = 'expired', updated_at = now()
    WHERE id = v_invitation.id;
    RAISE EXCEPTION 'Invitation has expired' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM space_members WHERE space_id = p_space_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User is already a member of this space' USING ERRCODE = 'P0001';
  END IF;

  v_role := COALESCE(v_invitation.role, 'member');

  INSERT INTO space_members (space_id, user_id, role, joined_at)
  VALUES (p_space_id, p_user_id, v_role, now());

  UPDATE space_invitations
  SET status = 'accepted', accepted_at = now(), updated_at = now()
  WHERE id = v_invitation.id;

  SELECT name INTO v_space_name FROM spaces WHERE id = p_space_id;

  RETURN jsonb_build_object(
    'space_id', p_space_id,
    'user_id', p_user_id,
    'role', v_role,
    'space_name', v_space_name,
    'joined_at', now()
  );
END;
$$;


--
-- Name: lock_event_for_sync(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.lock_event_for_sync(p_event_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_locked BOOLEAN;
BEGIN
  UPDATE events
  SET sync_locked = TRUE
  WHERE id = p_event_id AND sync_locked = FALSE
  RETURNING TRUE INTO v_locked;

  RETURN COALESCE(v_locked, FALSE);
END;
$$;


--
-- Name: log_comment_activity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_comment_activity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (
      space_id,
      activity_type,
      entity_type,
      entity_id,
      user_id,
      description,
      metadata
    ) VALUES (
      NEW.space_id,
      'commented',
      NEW.commentable_type,
      NEW.commentable_id,
      NEW.created_by,
      'Added a comment',
      jsonb_build_object('comment_id', NEW.id, 'content_preview', LEFT(NEW.content, 100))
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.content != OLD.content THEN
      INSERT INTO activity_logs (
        space_id,
        activity_type,
        entity_type,
        entity_id,
        user_id,
        description,
        metadata
      ) VALUES (
        NEW.space_id,
        'updated',
        NEW.commentable_type,
        NEW.commentable_id,
        NEW.created_by,
        'Updated a comment',
        jsonb_build_object('comment_id', NEW.id)
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs (
      space_id,
      activity_type,
      entity_type,
      entity_id,
      user_id,
      description,
      metadata
    ) VALUES (
      OLD.space_id,
      'deleted',
      OLD.commentable_type,
      OLD.commentable_id,
      OLD.created_by,
      'Deleted a comment',
      jsonb_build_object('comment_id', OLD.id)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: log_mention_activity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_mention_activity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_comment RECORD;
BEGIN
  -- Get comment details
  SELECT * INTO v_comment FROM comments WHERE id = NEW.comment_id;

  INSERT INTO activity_logs (
    space_id,
    activity_type,
    entity_type,
    entity_id,
    user_id,
    description,
    metadata
  ) VALUES (
    v_comment.space_id,
    'mentioned',
    v_comment.commentable_type,
    v_comment.commentable_id,
    v_comment.created_by,
    'Mentioned a user',
    jsonb_build_object('mentioned_user_id', NEW.mentioned_user_id, 'comment_id', NEW.comment_id)
  );

  RETURN NEW;
END;
$$;


--
-- Name: log_privacy_preference_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_privacy_preference_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  col_name TEXT;
  old_val BOOLEAN;
  new_val BOOLEAN;
BEGIN
  -- Get the IP address and user agent from the current request context
  -- Note: This would need to be set by the application layer

  -- Log changes for each boolean column
  FOR col_name IN
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'user_privacy_preferences'
    AND data_type = 'boolean'
    AND column_name NOT IN ('id', 'user_id', 'created_at', 'updated_at')
  LOOP
    EXECUTE format('SELECT ($1).%I, ($2).%I', col_name, col_name)
    INTO old_val, new_val
    USING OLD, NEW;

    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO privacy_preference_history (
        user_id, preference_key, old_value, new_value
      ) VALUES (
        NEW.user_id, col_name, old_val, new_val
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$_$;


--
-- Name: log_reaction_activity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_reaction_activity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_comment RECORD;
BEGIN
  -- Get comment details
  SELECT * INTO v_comment FROM comments WHERE id = NEW.comment_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (
      space_id,
      activity_type,
      entity_type,
      entity_id,
      user_id,
      description,
      metadata
    ) VALUES (
      v_comment.space_id,
      'reacted',
      v_comment.commentable_type,
      v_comment.commentable_id,
      NEW.user_id,
      'Reacted to a comment',
      jsonb_build_object('emoji', NEW.emoji, 'comment_id', NEW.comment_id)
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: log_reminder_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_reminder_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
     DECLARE
       action_type TEXT;
       change_metadata JSONB := '{}'::JSONB;
     BEGIN
       -- Skip DELETE operations entirely to prevent race conditions
       IF TG_OP = 'DELETE' THEN
         RETURN OLD;
       END IF;

       -- Handle INSERT operations
       IF TG_OP = 'INSERT' THEN
         action_type := 'created';
         change_metadata := jsonb_build_object(
           'title', NEW.title,
           'category', NEW.category,
           'priority', NEW.priority
         );

       -- Handle UPDATE operations
       ELSIF TG_OP = 'UPDATE' THEN
         IF OLD.status != NEW.status THEN
           IF NEW.status = 'completed' THEN
             action_type := 'completed';
           ELSIF NEW.status = 'snoozed' THEN
             action_type := 'snoozed';
             change_metadata := jsonb_build_object('snooze_until', NEW.snooze_until);
           ELSIF OLD.status = 'snoozed' AND NEW.status = 'active' THEN
             action_type := 'unsnoozed';
           ELSIF OLD.status = 'completed' AND NEW.status = 'active' THEN
             action_type := 'uncompleted';
           ELSE
             action_type := 'status_changed';
             change_metadata := jsonb_build_object(
               'old_status', OLD.status,
               'new_status', NEW.status
             );
           END IF;
         ELSE
           action_type := 'updated';
         END IF;
       END IF;

       -- Insert activity log (only for INSERT and UPDATE)
       INSERT INTO reminder_activities (reminder_id, user_id, action, metadata)
       VALUES (NEW.id, auth.uid(), action_type, change_metadata);

       RETURN NEW;
     END;
     $$;


--
-- Name: log_reminder_comment_activity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_reminder_comment_activity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  BEGIN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO reminder_activities (reminder_id, user_id, action, metadata)
      VALUES (
        NEW.reminder_id,
        NEW.user_id,
        'commented',
        jsonb_build_object(
          'comment_id', NEW.id,
          'comment_preview', LEFT(NEW.content, 100)
        )
      );
    ELSIF TG_OP = 'UPDATE' AND OLD.content != NEW.content THEN
      INSERT INTO reminder_activities (reminder_id, user_id, action, metadata)
      VALUES (
        NEW.reminder_id,
        NEW.user_id,
        'edited_comment',
        jsonb_build_object(
          'comment_id', NEW.id,
          'comment_preview', LEFT(NEW.content, 100)
        )
      );
    ELSIF TG_OP = 'DELETE' THEN
      INSERT INTO reminder_activities (reminder_id, user_id, action, metadata)
      VALUES (
        OLD.reminder_id,
        OLD.user_id,
        'deleted_comment',
        jsonb_build_object(
          'comment_id', OLD.id
        )
      );
    END IF;

    RETURN COALESCE(NEW, OLD);
  END;
  $$;


--
-- Name: log_task_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_task_changes() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  current_user_id UUID;
  change_summary_text TEXT;
BEGIN
  -- Get current user (from session context)
  current_user_id := current_setting('app.current_user_id', TRUE)::UUID;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO task_activity_log (task_id, user_id, action_type, change_summary)
    VALUES (NEW.id, current_user_id, 'created', 'Task created: ' || NEW.title);

  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'completed' THEN
        INSERT INTO task_activity_log (task_id, user_id, action_type, field_name, old_value, new_value, change_summary)
        VALUES (NEW.id, current_user_id, 'completed', 'status', OLD.status, NEW.status, 'Task marked as completed');
      ELSIF OLD.status = 'completed' THEN
        INSERT INTO task_activity_log (task_id, user_id, action_type, field_name, old_value, new_value, change_summary)
        VALUES (NEW.id, current_user_id, 'uncompleted', 'status', OLD.status, NEW.status, 'Task marked as incomplete');
      ELSE
        INSERT INTO task_activity_log (task_id, user_id, action_type, field_name, old_value, new_value, change_summary)
        VALUES (NEW.id, current_user_id, 'status_changed', 'status', OLD.status, NEW.status, 'Status changed from ' || OLD.status || ' to ' || NEW.status);
      END IF;
    END IF;

    -- Log priority changes
    IF NEW.priority IS DISTINCT FROM OLD.priority THEN
      INSERT INTO task_activity_log (task_id, user_id, action_type, field_name, old_value, new_value, change_summary)
      VALUES (NEW.id, current_user_id, 'priority_changed', 'priority', OLD.priority, NEW.priority, 'Priority changed from ' || OLD.priority || ' to ' || NEW.priority);
    END IF;

    -- Log due date changes
    IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
      INSERT INTO task_activity_log (task_id, user_id, action_type, field_name, old_value, new_value, change_summary)
      VALUES (NEW.id, current_user_id, 'due_date_changed', 'due_date', OLD.due_date::TEXT, NEW.due_date::TEXT, 'Due date changed');
    END IF;

    -- Log assignment changes
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      IF NEW.assigned_to IS NULL THEN
        INSERT INTO task_activity_log (task_id, user_id, action_type, field_name, change_summary)
        VALUES (NEW.id, current_user_id, 'unassigned', 'assigned_to', 'Task unassigned');
      ELSE
        INSERT INTO task_activity_log (task_id, user_id, action_type, field_name, change_summary)
        VALUES (NEW.id, current_user_id, 'assigned', 'assigned_to', 'Task assigned');
      END IF;
    END IF;

    -- Log general updates (title, description changes)
    IF NEW.title IS DISTINCT FROM OLD.title OR NEW.description IS DISTINCT FROM OLD.description THEN
      INSERT INTO task_activity_log (task_id, user_id, action_type, change_summary)
      VALUES (NEW.id, current_user_id, 'updated', 'Task details updated');
    END IF;

  -- REMOVED DELETE HANDLING TO PREVENT FOREIGN KEY CONSTRAINT VIOLATION
  -- The CASCADE deletion will handle cleaning up activity logs
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: mark_all_notifications_read(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_all_notifications_read(p_user_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE in_app_notifications
  SET is_read = TRUE, read_at = NOW(), updated_at = NOW()
  WHERE user_id = p_user_id AND is_read = FALSE;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;


--
-- Name: mark_bills_overdue(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_bills_overdue() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE bills
  SET status = 'overdue'
  WHERE status = 'scheduled'
    AND due_date < CURRENT_DATE;
END;
$$;


--
-- Name: mark_inactive_users_offline(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_inactive_users_offline() RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
  BEGIN
    UPDATE user_presence
    SET status = 'offline', updated_at = NOW()
    WHERE status = 'online'
      AND last_activity < NOW() - INTERVAL '5 minutes';
  END;
  $$;


--
-- Name: mark_queue_item_completed(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_queue_item_completed(p_queue_id uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE calendar_sync_queue
  SET
    status = 'completed',
    processed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_queue_id;
END;
$$;


--
-- Name: mark_queue_item_failed(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_queue_item_failed(p_queue_id uuid, p_error_message text) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_retry_count INTEGER;
  v_next_retry TIMESTAMPTZ;
BEGIN
  SELECT retry_count INTO v_retry_count
  FROM calendar_sync_queue
  WHERE id = p_queue_id;

  IF v_retry_count = 0 THEN
    v_next_retry := NOW() + INTERVAL '1 minute';
  ELSIF v_retry_count = 1 THEN
    v_next_retry := NOW() + INTERVAL '5 minutes';
  ELSE
    v_next_retry := NOW() + INTERVAL '15 minutes';
  END IF;

  UPDATE calendar_sync_queue
  SET
    status = 'failed',
    retry_count = retry_count + 1,
    last_error = p_error_message,
    next_retry_at = CASE WHEN retry_count + 1 < max_retries THEN v_next_retry ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_queue_id;
END;
$$;


--
-- Name: mark_queue_item_processing(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_queue_item_processing(p_queue_id uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE calendar_sync_queue
  SET status = 'processing', updated_at = NOW()
  WHERE id = p_queue_id;
END;
$$;


--
-- Name: mark_reminder_sent(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_reminder_sent(reminder_id uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE task_reminders
  SET
    is_sent = TRUE,
    sent_at = NOW()
  WHERE id = reminder_id;
END;
$$;


--
-- Name: meal_event_title(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.meal_event_title(p_meal_type text, p_meal_name text, p_recipe_name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN meal_type_emoji(p_meal_type) || ' ' ||
    INITCAP(p_meal_type) || ': ' ||
    COALESCE(NULLIF(p_meal_name, ''), p_recipe_name, 'Untitled meal');
END;
$$;


--
-- Name: meal_type_default_time(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.meal_type_default_time(p_meal_type text) RETURNS interval
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  CASE p_meal_type
    WHEN 'breakfast' THEN RETURN INTERVAL '8 hours';
    WHEN 'lunch'     THEN RETURN INTERVAL '12 hours';
    WHEN 'dinner'    THEN RETURN INTERVAL '18 hours';
    WHEN 'snack'     THEN RETURN INTERVAL '15 hours';
    ELSE                  RETURN INTERVAL '12 hours';
  END CASE;
END;
$$;


--
-- Name: meal_type_duration(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.meal_type_duration(p_meal_type text) RETURNS interval
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  CASE p_meal_type
    WHEN 'breakfast' THEN RETURN INTERVAL '30 minutes';
    WHEN 'lunch'     THEN RETURN INTERVAL '30 minutes';
    WHEN 'dinner'    THEN RETURN INTERVAL '60 minutes';
    WHEN 'snack'     THEN RETURN INTERVAL '15 minutes';
    ELSE                  RETURN INTERVAL '30 minutes';
  END CASE;
END;
$$;


--
-- Name: meal_type_emoji(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.meal_type_emoji(p_meal_type text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  CASE p_meal_type
    WHEN 'breakfast' THEN RETURN '🍳';
    WHEN 'lunch'     THEN RETURN '🥗';
    WHEN 'dinner'    THEN RETURN '🍽️';
    WHEN 'snack'     THEN RETURN '🍎';
    ELSE                  RETURN '🍴';
  END CASE;
END;
$$;


--
-- Name: process_chore_rotations(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_chore_rotations() RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  rotation_record RECORD;
  next_user_id UUID;
BEGIN
  -- Find rotations due today
  FOR rotation_record IN
    SELECT * FROM chore_rotations
    WHERE is_active = TRUE
      AND next_rotation_date <= CURRENT_DATE
  LOOP
    -- Get next user in rotation
    next_user_id := get_next_rotation_user(rotation_record.id);

    -- Update chore assignment
    UPDATE chores
    SET assigned_to = next_user_id
    WHERE id = rotation_record.chore_id;

    -- Update rotation record
    UPDATE chore_rotations
    SET
      last_rotation_date = CURRENT_DATE,
      last_assigned_to = next_user_id,
      next_rotation_date = CASE rotation_frequency
        WHEN 'daily' THEN CURRENT_DATE + INTERVAL '1 day'
        WHEN 'weekly' THEN CURRENT_DATE + INTERVAL '1 week'
        WHEN 'biweekly' THEN CURRENT_DATE + INTERVAL '2 weeks'
        WHEN 'monthly' THEN CURRENT_DATE + INTERVAL '1 month'
        ELSE CURRENT_DATE + INTERVAL '1 week'
      END
    WHERE id = rotation_record.id;
  END LOOP;
END;
$$;


--
-- Name: provision_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.provision_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_meta JSONB;
    v_name TEXT;
    v_space_name TEXT;
    v_color_theme TEXT;
    v_invite_token TEXT;
    v_marketing_emails BOOLEAN;
    v_space_id UUID;
    v_invitation RECORD;
BEGIN
    v_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

    v_name := COALESCE(
        v_meta->>'name',
        v_meta->>'full_name',
        split_part(NEW.email, '@', 1)
    );

    v_space_name := COALESCE(
        v_meta->>'space_name',
        v_name || '''s Space'
    );

    v_color_theme := COALESCE(v_meta->>'color_theme', 'emerald');
    v_invite_token := v_meta->>'invite_token';
    v_marketing_emails := COALESCE((v_meta->>'marketing_emails_enabled')::boolean, false);

    INSERT INTO public.users (
        id, email, name, color_theme, timezone,
        show_tasks_on_calendar, calendar_task_filter, default_reminder_offset,
        privacy_settings, show_chores_on_calendar, calendar_chore_filter,
        created_at, updated_at
    ) VALUES (
        NEW.id, NEW.email, v_name, v_color_theme, 'America/New_York',
        true, '{"categories": [], "priorities": []}'::jsonb, '1_day_before',
        '{"analytics": true, "readReceipts": true, "activityStatus": true, "profileVisibility": true}'::jsonb,
        true, '{"categories": [], "frequencies": []}'::jsonb,
        NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(users.name, EXCLUDED.name),
        color_theme = COALESCE(users.color_theme, EXCLUDED.color_theme),
        updated_at = NOW();

    INSERT INTO public.profiles (
        id, email, full_name, name, timezone, created_at, updated_at
    ) VALUES (
        NEW.id, NEW.email, v_name, v_name, 'America/New_York', NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
        name = COALESCE(profiles.name, EXCLUDED.name),
        updated_at = NOW();

    IF v_invite_token IS NOT NULL AND v_invite_token != '' THEN
        SELECT * INTO v_invitation
        FROM public.space_invitations
        WHERE token = v_invite_token
          AND status = 'pending'
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1;

        IF v_invitation.id IS NOT NULL THEN
            v_space_id := v_invitation.space_id;

            UPDATE public.space_invitations
            SET status = 'accepted', updated_at = NOW()
            WHERE id = v_invitation.id;

            INSERT INTO public.space_members (space_id, user_id, role, joined_at)
            VALUES (v_space_id, NEW.id, COALESCE(v_invitation.role, 'member'), NOW())
            ON CONFLICT (space_id, user_id) DO NOTHING;
        ELSE
            INSERT INTO public.spaces (name, is_personal, auto_created, user_id, created_by, created_at, updated_at)
            VALUES (v_space_name, true, true, NEW.id, NEW.id, NOW(), NOW())
            RETURNING id INTO v_space_id;

            INSERT INTO public.space_members (space_id, user_id, role, joined_at)
            VALUES (v_space_id, NEW.id, 'owner', NOW());
        END IF;
    ELSE
        INSERT INTO public.spaces (name, is_personal, auto_created, user_id, created_by, created_at, updated_at)
        VALUES (v_space_name, true, true, NEW.id, NEW.id, NOW(), NOW())
        RETURNING id INTO v_space_id;

        INSERT INTO public.space_members (space_id, user_id, role, joined_at)
        VALUES (v_space_id, NEW.id, 'owner', NOW());
    END IF;

    -- Create subscription with 14-day Pro trial
    INSERT INTO public.subscriptions (
        user_id, tier, status, period,
        trial_started_at, trial_ends_at,
        subscription_started_at, created_at, updated_at
    ) VALUES (
        NEW.id, 'pro', 'active', 'monthly',
        NOW(), NOW() + INTERVAL '14 days',
        NOW(), NOW(), NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW();

    RAISE LOG 'provision_new_user: Successfully provisioned user % with space % (14-day Pro trial)', NEW.id, v_space_id;
    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'provision_new_user error for user %: % (SQLSTATE: %)',
        NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;


--
-- Name: queue_calendar_sync_on_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.queue_calendar_sync_on_change() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_connection RECORD;
  v_operation queue_operation;
  v_priority INTEGER;
  v_event_snapshot JSONB;
BEGIN
  -- Determine operation type
  IF TG_OP = 'DELETE' THEN
    v_operation := 'delete';
    v_event_snapshot := row_to_json(OLD)::JSONB;
  ELSIF TG_OP = 'INSERT' THEN
    v_operation := 'create';
    v_event_snapshot := NULL;
  ELSE
    v_operation := 'update';
    v_event_snapshot := NULL;
  END IF;

  -- Don't queue if event is currently locked for sync (prevents loops)
  IF (TG_OP = 'UPDATE' AND NEW.sync_locked = TRUE) OR
     (TG_OP = 'INSERT' AND NEW.sync_locked = TRUE) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Don't queue if this change came from external sync
  IF TG_OP = 'UPDATE' AND NEW.last_external_sync IS NOT NULL AND
     OLD.last_external_sync IS NOT NULL AND
     NEW.last_external_sync > OLD.last_external_sync THEN
    RETURN NEW;
  END IF;

  -- Calculate priority
  IF TG_OP = 'DELETE' THEN
    v_priority := calculate_sync_priority(OLD.id, v_operation);
  ELSE
    v_priority := calculate_sync_priority(NEW.id, v_operation);
  END IF;

  -- Find all active connections for this event's space
  FOR v_connection IN
    SELECT id, provider
    FROM calendar_connections
    WHERE space_id = COALESCE(NEW.space_id, OLD.space_id)
      AND sync_status = 'active'
      AND (sync_direction = 'bidirectional' OR sync_direction = 'outbound_only')
  LOOP
    -- Queue sync operation for this connection
    INSERT INTO calendar_sync_queue (
      event_id,
      connection_id,
      mapping_id,
      operation,
      priority,
      event_snapshot
    ) VALUES (
      COALESCE(NEW.id, OLD.id),
      v_connection.id,
      (SELECT id FROM calendar_event_mappings
       WHERE rowan_event_id = COALESCE(NEW.id, OLD.id)
         AND connection_id = v_connection.id
       LIMIT 1),
      v_operation,
      v_priority,
      v_event_snapshot
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: queue_existing_events_for_sync(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.queue_existing_events_for_sync(p_connection_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_connection RECORD;
  v_event RECORD;
  v_queued_count INTEGER := 0;
BEGIN
  -- Get connection details
  SELECT * INTO v_connection
  FROM calendar_connections
  WHERE id = p_connection_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Connection not found: %', p_connection_id;
  END IF;
  
  -- Only queue for bidirectional or outbound_only connections
  IF v_connection.sync_direction = 'inbound_only' THEN
    RETURN 0;
  END IF;
  
  -- Queue all events in the space that:
  -- 1. Don't already have a mapping to this connection
  -- 2. Are not from an external source (or are from a different external source)
  -- 3. Are not deleted
  FOR v_event IN
    SELECT e.id, e.title, e.is_recurring
    FROM events e
    WHERE e.space_id = v_connection.space_id
      AND e.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM calendar_event_mappings cem
        WHERE cem.rowan_event_id = e.id
          AND cem.connection_id = p_connection_id
      )
      -- Include events that have no external source, or have a different external source
      AND (e.external_source IS NULL OR e.external_source != v_connection.provider)
  LOOP
    -- Insert into sync queue
    INSERT INTO calendar_sync_queue (
      event_id,
      connection_id,
      operation,
      priority,
      status
    ) VALUES (
      v_event.id,
      p_connection_id,
      'create',
      CASE WHEN v_event.is_recurring THEN 5 ELSE 10 END, -- Higher priority (lower number) for recurring events
      'pending'
    )
    ON CONFLICT DO NOTHING;
    
    v_queued_count := v_queued_count + 1;
    
    RAISE NOTICE 'Queued event % (%) for sync', v_event.id, v_event.title;
  END LOOP;
  
  RETURN v_queued_count;
END;
$$;


--
-- Name: record_admin_login(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_admin_login(user_email text) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  UPDATE admin_users
  SET
    last_login = NOW(),
    login_count = login_count + 1
  WHERE email = user_email
  AND is_active = TRUE
  RETURNING TRUE;
$$;


--
-- Name: record_feature_event(uuid, uuid, text, text, jsonb, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_feature_event(p_user_id uuid, p_space_id uuid, p_feature text, p_action text, p_metadata jsonb DEFAULT '{}'::jsonb, p_device_type text DEFAULT NULL::text, p_browser text DEFAULT NULL::text, p_os text DEFAULT NULL::text, p_session_id text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO feature_events (
    user_id,
    space_id,
    feature,
    action,
    metadata,
    device_type,
    browser,
    os,
    session_id
  ) VALUES (
    p_user_id,
    p_space_id,
    p_feature,
    p_action,
    p_metadata,
    p_device_type,
    p_browser,
    p_os,
    p_session_id
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;


--
-- Name: record_subscription_event(uuid, text, text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_subscription_event(p_user_id uuid, p_event_type text, p_from_tier text DEFAULT NULL::text, p_to_tier text DEFAULT NULL::text, p_trigger_source text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO public.subscription_events (
    user_id,
    event_type,
    from_tier,
    to_tier,
    trigger_source,
    metadata
  )
  VALUES (
    p_user_id,
    p_event_type,
    p_from_tier,
    p_to_tier,
    p_trigger_source,
    p_metadata
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;


--
-- Name: record_task_handoff(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_task_handoff() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Only record if assigned_to actually changed
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    -- Get current user (from session context or use created_by as fallback)
    current_user_id := current_setting('app.current_user_id', TRUE)::UUID;
    IF current_user_id IS NULL THEN
      current_user_id := NEW.created_by;
    END IF;

    -- Record the handoff
    INSERT INTO task_handoffs (
      task_id,
      from_user_id,
      to_user_id,
      performed_by,
      performed_at
    ) VALUES (
      NEW.id,
      OLD.assigned_to,
      NEW.assigned_to,
      current_user_id,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: record_task_snooze(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_task_snooze() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.is_snoozed = TRUE AND (OLD.is_snoozed IS NULL OR OLD.is_snoozed = FALSE) THEN
    -- Increment snooze count
    NEW.snooze_count = COALESCE(OLD.snooze_count, 0) + 1;

    -- Record in history
    INSERT INTO task_snooze_history (
      task_id,
      snoozed_by,
      snoozed_from_date,
      snoozed_to_date,
      snooze_duration_minutes
    ) VALUES (
      NEW.id,
      NEW.snoozed_by,
      NEW.due_date,
      CASE
        WHEN NEW.snoozed_until IS NOT NULL
        THEN NEW.snoozed_until::DATE
        ELSE NULL
      END,
      CASE
        WHEN NEW.snoozed_until IS NOT NULL AND NEW.due_date IS NOT NULL
        THEN EXTRACT(EPOCH FROM (NEW.snoozed_until - NEW.due_date::TIMESTAMPTZ)) / 60
        ELSE NULL
      END
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: record_trial_expired(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_trial_expired(p_user_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN public.record_subscription_event(
    p_user_id,
    'trial_expired',
    'pro',  -- Was pro during trial
    'free', -- Now free
    'system',
    '{}'::jsonb
  );
END;
$$;


--
-- Name: redeem_reward(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.redeem_reward(p_user_id uuid, p_space_id uuid, p_reward_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_reward RECORD;
  v_points_record RECORD;
  v_week_count INTEGER;
  v_week_start TIMESTAMPTZ;
  v_redemption_id UUID;
  v_new_points INTEGER;
  v_new_level INTEGER;
BEGIN
  -- Verify the caller is the user (prevent redemption for other users)
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- 1. Get reward and verify it exists in the correct space and is active
  SELECT * INTO v_reward
  FROM rewards_catalog
  WHERE id = p_reward_id AND space_id = p_space_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Reward not found');
  END IF;

  IF NOT v_reward.is_active THEN
    RETURN json_build_object('success', false, 'error', 'This reward is no longer available');
  END IF;

  -- 2. Lock the points record with FOR UPDATE to serialize concurrent redemptions
  SELECT * INTO v_points_record
  FROM reward_points
  WHERE user_id = p_user_id AND space_id = p_space_id
  FOR UPDATE;

  -- Create record if it doesn't exist
  IF NOT FOUND THEN
    INSERT INTO reward_points (user_id, space_id, points, level, current_streak, longest_streak)
    VALUES (p_user_id, p_space_id, 0, 1, 0, 0)
    RETURNING * INTO v_points_record;
  END IF;

  -- Check balance (atomic — no concurrent request can change this while we hold the lock)
  IF v_points_record.points < v_reward.cost_points THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Not enough points. You need %s but have %s', v_reward.cost_points, v_points_record.points)
    );
  END IF;

  -- 3. Check weekly redemption limit if configured
  IF v_reward.max_redemptions_per_week IS NOT NULL THEN
    -- Calculate week start (Sunday, matching the TypeScript behavior)
    v_week_start := date_trunc('week', now() + interval '1 day') - interval '1 day';

    SELECT COUNT(*) INTO v_week_count
    FROM reward_redemptions
    WHERE user_id = p_user_id
      AND reward_id = p_reward_id
      AND created_at >= v_week_start
      AND status NOT IN ('cancelled', 'denied');

    IF v_week_count >= v_reward.max_redemptions_per_week THEN
      RETURN json_build_object(
        'success', false,
        'error', format('You''ve already redeemed this %s time(s) this week', v_reward.max_redemptions_per_week)
      );
    END IF;
  END IF;

  -- 4. Create redemption record
  INSERT INTO reward_redemptions (user_id, space_id, reward_id, points_spent, status)
  VALUES (p_user_id, p_space_id, p_reward_id, v_reward.cost_points, 'pending')
  RETURNING id INTO v_redemption_id;

  -- 5. Create negative point transaction
  INSERT INTO point_transactions (user_id, space_id, source_type, source_id, points, reason, metadata)
  VALUES (
    p_user_id, p_space_id, 'redemption', v_redemption_id,
    -v_reward.cost_points,
    'Redeemed: ' || v_reward.name,
    jsonb_build_object('reward_name', v_reward.name)
  );

  -- 6. Update balance and level
  v_new_points := v_points_record.points - v_reward.cost_points;

  -- Calculate level (matches TypeScript LEVEL_DEFINITIONS)
  v_new_level := CASE
    WHEN v_new_points >= 5000 THEN 6
    WHEN v_new_points >= 2500 THEN 5
    WHEN v_new_points >= 1000 THEN 4
    WHEN v_new_points >= 500  THEN 3
    WHEN v_new_points >= 100  THEN 2
    ELSE 1
  END;

  UPDATE reward_points
  SET points = v_new_points,
      level = v_new_level,
      last_activity_at = now()
  WHERE id = v_points_record.id;

  -- 7. Return success with redemption data
  RETURN json_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'points_spent', v_reward.cost_points,
    'new_balance', v_new_points
  );
END;
$$;


--
-- Name: refresh_quick_action_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_quick_action_stats() RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW quick_action_stats;
END;
$$;


--
-- Name: calendar_sync_conflicts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_sync_conflicts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mapping_id uuid NOT NULL,
    connection_id uuid NOT NULL,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    resolution_status public.resolution_status DEFAULT 'detected'::public.resolution_status NOT NULL,
    rowan_version jsonb NOT NULL,
    external_version jsonb NOT NULL,
    winning_source public.winning_source,
    resolution_strategy public.resolution_strategy DEFAULT 'external_wins'::public.resolution_strategy NOT NULL,
    resolved_by uuid,
    resolution_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: resolve_calendar_conflict(uuid, public.winning_source, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.resolve_calendar_conflict(conflict_id uuid, p_winning_source public.winning_source, p_resolved_by uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text) RETURNS public.calendar_sync_conflicts
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  result calendar_sync_conflicts;
BEGIN
  UPDATE calendar_sync_conflicts
  SET
    resolution_status = 'resolved',
    resolved_at = NOW(),
    winning_source = p_winning_source,
    resolved_by = p_resolved_by,
    resolution_notes = p_notes
  WHERE id = conflict_id
  RETURNING * INTO result;

  -- Also clear the conflict flag on the mapping
  UPDATE calendar_event_mappings
  SET has_conflict = FALSE
  WHERE id = result.mapping_id;

  RETURN result;
END;
$$;


--
-- Name: set_attachment_type_flags(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_attachment_type_flags() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Set flags based on MIME type
  NEW.is_image = NEW.file_type LIKE 'image/%';
  NEW.is_document = NEW.file_type IN ('application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain');
  NEW.is_video = NEW.file_type LIKE 'video/%';

  RETURN NEW;
END;
$$;


--
-- Name: set_initial_next_due_date(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_initial_next_due_date() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Set next_due_date based on frequency
  IF NEW.frequency != 'one-time' THEN
    NEW.next_due_date := calculate_next_due_date(NEW.due_date, NEW.frequency);
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: set_milestone_space_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_milestone_space_id() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.space_id IS NULL AND NEW.goal_id IS NOT NULL THEN
    SELECT space_id INTO NEW.space_id 
    FROM public.goals 
    WHERE id = NEW.goal_id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_notification_read_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_notification_read_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- If marking as read and read_at is not set
  IF NEW.is_read = TRUE AND OLD.is_read = FALSE AND NEW.read_at IS NULL THEN
    NEW.read_at = NOW();
  END IF;

  -- If marking as unread, clear read_at
  IF NEW.is_read = FALSE AND OLD.is_read = TRUE THEN
    NEW.read_at = NULL;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: set_pinned_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_pinned_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.is_pinned = TRUE AND OLD.is_pinned = FALSE THEN
    NEW.pinned_at = NOW();
  ELSIF NEW.is_pinned = FALSE THEN
    NEW.pinned_at = NULL;
    NEW.pinned_by = NULL;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_shopping_task_auto_times(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_shopping_task_auto_times() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  user_timezone TEXT;
  midnight_time TIMESTAMPTZ;
BEGIN
  IF NEW.is_auto_created = TRUE THEN
    -- Get user's timezone
    SELECT timezone INTO user_timezone
    FROM users
    WHERE id = (
      SELECT created_by FROM tasks WHERE id = NEW.task_id LIMIT 1
    );

    IF user_timezone IS NULL THEN
      user_timezone := 'America/New_York'; -- Default fallback
    END IF;

    -- Calculate midnight in user's local timezone
    midnight_time := (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMP AT TIME ZONE user_timezone;

    NEW.auto_delete_at := midnight_time;
    NEW.auto_complete_at := midnight_time;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: set_space_creator(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_space_creator() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: should_send_notification(uuid, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.should_send_notification(p_user_id uuid, p_space_id uuid, p_notification_type text, p_channel text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  DECLARE
    v_prefs user_notification_preferences;
    v_current_time TIME;
  BEGIN
    -- Get user preferences (simplified to avoid recursion)
    SELECT * INTO v_prefs
    FROM user_notification_preferences
    WHERE user_id = p_user_id AND (space_id = p_space_id OR space_id IS NULL)
    ORDER BY space_id NULLS LAST
    LIMIT 1;

    -- If no preferences found, use defaults (allow)
    IF v_prefs IS NULL THEN
      RETURN TRUE;
    END IF;

    -- Check if channel is enabled
    IF p_channel = 'email' AND NOT v_prefs.email_enabled THEN
      RETURN FALSE;
    END IF;

    IF p_channel = 'in_app' AND NOT v_prefs.in_app_enabled THEN
      RETURN FALSE;
    END IF;

    -- Check quiet hours
    IF v_prefs.quiet_hours_enabled AND v_prefs.quiet_hours_start IS NOT NULL AND v_prefs.quiet_hours_end IS NOT NULL THEN
      v_current_time := CURRENT_TIME;

      -- Handle quiet hours that span midnight
      IF v_prefs.quiet_hours_start > v_prefs.quiet_hours_end THEN
        IF v_current_time >= v_prefs.quiet_hours_start OR v_current_time < v_prefs.quiet_hours_end THEN
          RETURN FALSE;
        END IF;
      ELSE
        IF v_current_time >= v_prefs.quiet_hours_start AND v_current_time < v_prefs.quiet_hours_end THEN
          RETURN FALSE;
        END IF;
      END IF;
    END IF;

    -- Check type-specific preferences
    IF p_channel = 'email' THEN
      IF p_notification_type IN ('due', 'overdue') AND NOT v_prefs.email_due_reminders THEN
        RETURN FALSE;
      END IF;
      IF p_notification_type IN ('assigned', 'unassigned') AND NOT v_prefs.email_assignments THEN
        RETURN FALSE;
      END IF;
      IF p_notification_type = 'mentioned' AND NOT v_prefs.email_mentions THEN
        RETURN FALSE;
      END IF;
      IF p_notification_type = 'commented' AND NOT v_prefs.email_comments THEN
        RETURN FALSE;
      END IF;
    END IF;

    IF p_channel = 'in_app' THEN
      IF p_notification_type IN ('due', 'overdue') AND NOT v_prefs.in_app_due_reminders THEN
        RETURN FALSE;
      END IF;
      IF p_notification_type IN ('assigned', 'unassigned') AND NOT v_prefs.in_app_assignments THEN
        RETURN FALSE;
      END IF;
      IF p_notification_type = 'mentioned' AND NOT v_prefs.in_app_mentions THEN
        RETURN FALSE;
      END IF;
      IF p_notification_type = 'commented' AND NOT v_prefs.in_app_comments THEN
        RETURN FALSE;
      END IF;
    END IF;

    RETURN TRUE;
  END;
  $$;


--
-- Name: sm_update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sm_update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: sync_admin_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_admin_role() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    -- When admin_level changes, update role to match
    IF NEW.admin_level IS DISTINCT FROM OLD.admin_level THEN
        NEW.role = NEW.admin_level;
    END IF;
    -- When role changes, update admin_level to match  
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        NEW.admin_level = NEW.role;
    END IF;
    -- Always update the updated_at timestamp
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: sync_meal_to_calendar(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_meal_to_calendar() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_new_event_id UUID;
  v_recipe_name  TEXT;
  v_event_start  TIMESTAMPTZ;
  v_event_end    TIMESTAMPTZ;
BEGIN
  IF NEW.calendar_sync = TRUE AND NEW.scheduled_date IS NOT NULL THEN
    -- Skip if a sync record already exists (handled by the update trigger instead)
    IF NOT EXISTS (SELECT 1 FROM meal_calendar_events WHERE meal_id = NEW.id) THEN
      SELECT name INTO v_recipe_name FROM recipes WHERE id = NEW.recipe_id;
      v_event_start := DATE_TRUNC('day', NEW.scheduled_date) + meal_type_default_time(NEW.meal_type);
      v_event_end   := v_event_start + meal_type_duration(NEW.meal_type);

      INSERT INTO events (
        space_id, title, description,
        event_type, start_time, end_time,
        category, status, is_recurring,
        assigned_to, created_by
      )
      VALUES (
        NEW.space_id,
        meal_event_title(NEW.meal_type, NEW.name, v_recipe_name),
        NEW.notes,
        'meal',
        v_event_start,
        v_event_end,
        'family',
        'not-started',
        FALSE,
        NEW.assigned_to,
        NEW.created_by
      )
      RETURNING id INTO v_new_event_id;

      INSERT INTO meal_calendar_events (meal_id, event_id, is_synced, sync_enabled)
      VALUES (NEW.id, v_new_event_id, TRUE, TRUE);
    END IF;
  ELSIF NEW.calendar_sync = FALSE THEN
    -- Sync toggled off — remove the linked event and join row.
    DELETE FROM events WHERE id IN (
      SELECT event_id FROM meal_calendar_events WHERE meal_id = NEW.id
    );
    DELETE FROM meal_calendar_events WHERE meal_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: sync_task_primary_assignment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_task_primary_assignment() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.is_primary = TRUE THEN
      -- Update task.assigned_to to match primary assignee
      UPDATE tasks
      SET assigned_to = NEW.user_id
      WHERE id = NEW.task_id;

      -- Remove primary flag from other assignments
      UPDATE task_assignments
      SET is_primary = FALSE
      WHERE task_id = NEW.task_id
        AND user_id != NEW.user_id
        AND is_primary = TRUE;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- If primary assignment deleted, clear task.assigned_to
    IF OLD.is_primary = TRUE THEN
      UPDATE tasks
      SET assigned_to = NULL
      WHERE id = OLD.task_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: sync_task_to_calendar(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_task_to_calendar() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_wants_sync BOOLEAN;
  new_event_id UUID;
BEGIN
  -- Only sync if task has a due_date
  IF NEW.due_date IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if user wants tasks on calendar (default TRUE)
  SELECT COALESCE(show_tasks_on_calendar, TRUE)
  INTO user_wants_sync
  FROM users
  WHERE id = NEW.created_by;

  IF user_wants_sync THEN
    -- Create calendar event
    INSERT INTO events (
      space_id,
      title,
      description,
      event_type,
      start_time,
      end_time,
      assigned_to,
      created_by
    ) VALUES (
      NEW.space_id,
      '📋 ' || NEW.title, -- Prefix with task emoji
      COALESCE(NEW.description, 'Task from Tasks page'),
      'task',
      NEW.due_date::TIMESTAMPTZ,
      (NEW.due_date::TIMESTAMPTZ + INTERVAL '1 hour'), -- Default 1-hour duration
      NEW.assigned_to,
      NEW.created_by
    )
    RETURNING id INTO new_event_id;

    -- Create sync record
    INSERT INTO task_calendar_events (task_id, event_id, is_synced, sync_enabled)
    VALUES (NEW.id, new_event_id, TRUE, TRUE);
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: test_handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.test_handle_new_user() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  test_result TEXT;
BEGIN
  -- Try to call the function with test data
  BEGIN
    test_result := 'Function callable';
  EXCEPTION WHEN OTHERS THEN
    test_result := 'Function error: ' || SQLERRM;
  END;

  RETURN test_result;
END;
$$;


--
-- Name: track_shopping_item_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_shopping_item_history() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_space_id UUID;
BEGIN
  -- Only track when item is checked
  IF NEW.checked = true AND (OLD.checked IS NULL OR OLD.checked = false) THEN
    -- Get space_id from list
    SELECT space_id INTO v_space_id
    FROM shopping_lists
    WHERE id = NEW.list_id;

    -- Insert or update history
    INSERT INTO shopping_item_history (space_id, item_name, category, frequency, last_purchased)
    VALUES (v_space_id, NEW.name, NEW.category, 1, NOW())
    ON CONFLICT (space_id, item_name)
    DO UPDATE SET
      frequency = shopping_item_history.frequency + 1,
      last_purchased = NOW(),
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: unlock_all_sync_locked_events(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.unlock_all_sync_locked_events() RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH unlocked AS (
    UPDATE events
    SET sync_locked = FALSE
    WHERE sync_locked = TRUE
      AND updated_at < NOW() - INTERVAL '5 minutes'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM unlocked;

  RETURN v_count;
END;
$$;


--
-- Name: unlock_event_after_sync(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.unlock_event_after_sync(p_event_id uuid, p_mark_synced boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE events
  SET
    sync_locked = FALSE,
    last_external_sync = CASE WHEN p_mark_synced THEN NOW() ELSE last_external_sync END
  WHERE id = p_event_id;
END;
$$;


--
-- Name: unsubscribe_launch_notification(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.unsubscribe_launch_notification(email_address text) RETURNS boolean
    LANGUAGE sql
    SET search_path TO 'public'
    AS $$
  UPDATE launch_notifications
  SET subscribed = FALSE, unsubscribed_at = NOW()
  WHERE email = email_address AND subscribed = TRUE
  RETURNING TRUE;
$$;


--
-- Name: update_achievement_badges_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_achievement_badges_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_achievement_progress_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_achievement_progress_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_ai_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_ai_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_bill_calendar_event(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_bill_calendar_event() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_event_title TEXT;
  v_event_description TEXT;
BEGIN
  -- If expense has an associated event, update it
  IF NEW.event_id IS NOT NULL THEN
    -- Build updated event title and description
    v_event_title := '💰 Bill Due: ' || NEW.description;
    v_event_description := 'Amount: $' || NEW.amount || '\n' ||
                           'Category: ' || COALESCE(NEW.category, 'Uncategorized') || '\n' ||
                           'Frequency: ' || COALESCE(NEW.recurring_frequency, 'Unknown');

    IF NEW.payment_method IS NOT NULL THEN
      v_event_description := v_event_description || '\nPayment Method: ' || NEW.payment_method;
    END IF;

    -- Update the associated calendar event
    UPDATE events
    SET
      title = v_event_title,
      description = v_event_description,
      start_time = NEW.date::TIMESTAMPTZ,
      end_time = NEW.date::TIMESTAMPTZ + INTERVAL '1 hour',
      recurrence_pattern = NEW.recurring_frequency,
      is_recurring = COALESCE(NEW.is_recurring, NEW.recurring, FALSE)
    WHERE id = NEW.event_id;
  END IF;

  RETURN NEW;
END;
$_$;


--
-- Name: update_bills_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_bills_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_blocked_tasks_on_completion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_blocked_tasks_on_completion() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Update all tasks that were blocked by this task
    UPDATE tasks
    SET is_blocked = EXISTS(
      SELECT 1 FROM task_dependencies td
      JOIN tasks t ON t.id = td.depends_on_task_id
      WHERE td.task_id = tasks.id
        AND t.status != 'completed'
        AND td.dependency_type = 'blocks'
    )
    WHERE id IN (
      SELECT task_id FROM task_dependencies
      WHERE depends_on_task_id = NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: update_budgets_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_budgets_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_calendar_event_from_meal(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_calendar_event_from_meal() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_recipe_name TEXT;
  v_event_start TIMESTAMPTZ;
  v_event_end   TIMESTAMPTZ;
BEGIN
  IF NEW.calendar_sync = TRUE AND NEW.scheduled_date IS NOT NULL THEN
    SELECT name INTO v_recipe_name FROM recipes WHERE id = NEW.recipe_id;
    v_event_start := DATE_TRUNC('day', NEW.scheduled_date) + meal_type_default_time(NEW.meal_type);
    v_event_end   := v_event_start + meal_type_duration(NEW.meal_type);

    UPDATE events SET
      title = meal_event_title(NEW.meal_type, NEW.name, v_recipe_name),
      description = NEW.notes,
      start_time = v_event_start,
      end_time = v_event_end,
      assigned_to = NEW.assigned_to,
      updated_at = NOW()
    WHERE id = (
      SELECT event_id FROM meal_calendar_events WHERE meal_id = NEW.id LIMIT 1
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_calendar_event_from_task(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_calendar_event_from_task() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.due_date != OLD.due_date OR NEW.title != OLD.title THEN
    UPDATE events
    SET
      title = '📋 ' || NEW.title,
      start_time = NEW.due_date::TIMESTAMPTZ,
      end_time = (NEW.due_date::TIMESTAMPTZ + INTERVAL '1 hour'),
      updated_at = NOW()
    WHERE id = (
      SELECT event_id FROM task_calendar_events WHERE task_id = NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: update_calendar_table_statistics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_calendar_table_statistics() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  ANALYZE calendar_connections;
  ANALYZE calendar_event_mappings;
  ANALYZE calendar_sync_logs;
  ANALYZE calendar_sync_conflicts;
  ANALYZE calendar_webhook_subscriptions;
  ANALYZE calendar_sync_queue;

  RAISE NOTICE 'Calendar table statistics updated successfully';
END;
$$;


--
-- Name: update_calendar_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_calendar_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_ccpa_opt_out_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_ccpa_opt_out_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_chore_rotations_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_chore_rotations_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_chores_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_chores_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_conversation_last_message(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_conversation_last_message() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Update the conversation's last message preview and timestamp
  UPDATE conversations
  SET
    last_message_preview = LEFT(NEW.content, 100),
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;


--
-- Name: update_custom_categories_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_custom_categories_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_daily_active_users(integer, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_daily_active_users(user_count integer, target_date date DEFAULT CURRENT_DATE) RETURNS void
    LANGUAGE sql
    SET search_path TO 'public'
    AS $$
  INSERT INTO daily_analytics (date, active_users)
  VALUES (target_date, user_count)
  ON CONFLICT (date) DO UPDATE
  SET active_users = GREATEST(daily_analytics.active_users, user_count);
$$;


--
-- Name: update_daily_checkins_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_daily_checkins_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_daily_usage_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_daily_usage_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_event_comments_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_event_comments_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_event_proposals_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_event_proposals_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_expenses_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_expenses_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_goal_current_amount(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_goal_current_amount() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Recalculate the current amount for the goal
  UPDATE goals
  SET
    current_amount = COALESCE((
      SELECT SUM(amount)
      FROM goal_contributions
      WHERE goal_id = COALESCE(NEW.goal_id, OLD.goal_id)
    ), 0),
    progress = CASE
      WHEN target_amount > 0 THEN
        LEAST(100, ROUND((COALESCE((
          SELECT SUM(amount)
          FROM goal_contributions
          WHERE goal_id = COALESCE(NEW.goal_id, OLD.goal_id)
        ), 0) / target_amount) * 100))
      ELSE progress
    END
  WHERE id = COALESCE(NEW.goal_id, OLD.goal_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: update_goal_dependencies_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_goal_dependencies_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_goal_dependency_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_goal_dependency_status() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    -- Only process when a goal is completed or progress changes
    IF (NEW.status = 'completed' AND OLD.status != 'completed') OR
       (NEW.progress != OLD.progress) THEN

        -- Update dependencies that depend on this goal
        UPDATE goal_dependencies
        SET
            status = CASE
                WHEN NEW.status = 'completed' OR NEW.progress >= completion_threshold THEN 'satisfied'
                ELSE status
            END,
            satisfied_at = CASE
                WHEN NEW.status = 'completed' OR NEW.progress >= completion_threshold THEN NOW()
                ELSE satisfied_at
            END
        WHERE
            depends_on_goal_id = NEW.id
            AND status = 'pending';
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: update_habit_streak(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_habit_streak() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
  DECLARE
    v_current_streak INTEGER := 0;
    v_longest_streak INTEGER := 0;
    v_total_completions INTEGER := 0;
    v_completion_rate DECIMAL(5,2) := 0.0;
    v_days_since_start INTEGER;
    v_start_date DATE;
  BEGIN
    -- Get template start date
    SELECT start_date INTO v_start_date
    FROM recurring_goal_templates
    WHERE id = NEW.template_id;

    -- Calculate total completions
    SELECT COUNT(*) INTO v_total_completions
    FROM habit_entries
    WHERE template_id = NEW.template_id
      AND user_id = NEW.user_id
      AND completed = TRUE;

    -- Calculate completion rate
    v_days_since_start := EXTRACT(DAY FROM (NEW.entry_date - v_start_date)) + 1;
    IF v_days_since_start > 0 THEN
      v_completion_rate := (v_total_completions::DECIMAL / v_days_since_start) * 100;
    END IF;

    -- Calculate current streak (consecutive days from today backwards)
    WITH streak_calc AS (
      SELECT
        entry_date,
        completed,
        ROW_NUMBER() OVER (ORDER BY entry_date DESC) as rn,
        CASE WHEN completed THEN 0 ELSE 1 END as break_marker
      FROM habit_entries
      WHERE template_id = NEW.template_id
        AND user_id = NEW.user_id
        AND entry_date <= NEW.entry_date
      ORDER BY entry_date DESC
    ),
    first_break AS (
      SELECT MIN(rn) as first_break_rn
      FROM streak_calc
      WHERE break_marker = 1
    )
    SELECT COALESCE(first_break_rn - 1, COUNT(*)) INTO v_current_streak
    FROM streak_calc, first_break
    WHERE completed = TRUE;

    -- Calculate longest streak
    WITH streak_groups AS (
      SELECT
        entry_date,
        completed,
        SUM(CASE WHEN completed THEN 0 ELSE 1 END) OVER (ORDER BY entry_date) as group_id
      FROM habit_entries
      WHERE template_id = NEW.template_id
        AND user_id = NEW.user_id
      ORDER BY entry_date
    ),
    streak_lengths AS (
      SELECT COUNT(*) as streak_length
      FROM streak_groups
      WHERE completed = TRUE
      GROUP BY group_id
    )
    SELECT COALESCE(MAX(streak_length), 0) INTO v_longest_streak
    FROM streak_lengths;

    -- Update or insert streak record
    INSERT INTO habit_streaks (
      template_id, user_id, current_streak, longest_streak,
      last_completed_date, total_completions, completion_rate
    )
    VALUES (
      NEW.template_id, NEW.user_id, v_current_streak, v_longest_streak,
      CASE WHEN NEW.completed THEN NEW.entry_date ELSE NULL END,
      v_total_completions, v_completion_rate
    )
    ON CONFLICT (template_id, user_id)
    DO UPDATE SET
      current_streak = v_current_streak,
      longest_streak = GREATEST(habit_streaks.longest_streak, v_longest_streak),
      last_completed_date = CASE WHEN NEW.completed THEN NEW.entry_date ELSE
  habit_streaks.last_completed_date END,
      total_completions = v_total_completions,
      completion_rate = v_completion_rate,
      updated_at = NOW();

    RETURN NEW;
  END;
  $$;


--
-- Name: update_important_dates_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_important_dates_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_catalog'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_in_app_notifications_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_in_app_notifications_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_line_item_actual_cost(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_line_item_actual_cost() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_line_item_id UUID;
  v_total_cost DECIMAL(12, 2);
BEGIN
  -- Get line_item_id from expense
  v_line_item_id := COALESCE(NEW.line_item_id, OLD.line_item_id);

  IF v_line_item_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Calculate total actual cost from expenses
  SELECT COALESCE(SUM(amount), 0) INTO v_total_cost
  FROM expenses
  WHERE line_item_id = v_line_item_id;

  -- Update line item
  UPDATE project_line_items
  SET actual_cost = v_total_cost
  WHERE id = v_line_item_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: update_meal_calendar_events_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_meal_calendar_events_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_notification_queue_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_notification_queue_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_notifications_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_notifications_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_project_actual_cost(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_project_actual_cost() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_project_id UUID;
  v_total_cost DECIMAL(12, 2);
  v_estimated_budget DECIMAL(12, 2);
BEGIN
  -- Get project_id from expense
  v_project_id := COALESCE(NEW.project_id, OLD.project_id);

  IF v_project_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Calculate total actual cost from expenses
  SELECT COALESCE(SUM(amount), 0) INTO v_total_cost
  FROM expenses
  WHERE project_id = v_project_id;

  -- Get estimated budget
  SELECT estimated_budget INTO v_estimated_budget
  FROM projects
  WHERE id = v_project_id;

  -- Update project
  UPDATE projects
  SET
    actual_cost = v_total_cost,
    budget_variance = COALESCE(v_estimated_budget, 0) - v_total_cost,
    variance_percentage = CASE
      WHEN v_estimated_budget > 0 THEN
        ROUND((((v_estimated_budget - v_total_cost) / v_estimated_budget) * 100)::NUMERIC, 2)
      ELSE 0
    END
  WHERE id = v_project_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: update_projects_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_projects_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_receipts_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_receipts_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_recurring_patterns_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_recurring_patterns_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_reminder_attachments_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_reminder_attachments_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_reminder_comment_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_reminder_comment_timestamp() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_reminder_template_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_reminder_template_timestamp() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_rewards_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_rewards_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_shared_at_secure(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_shared_at_secure() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- If list is being made public and wasn't public before
  IF NEW.is_public = TRUE AND (OLD.is_public IS NULL OR OLD.is_public = FALSE) THEN
    NEW.shared_at = NOW();
    -- Generate a new secure token when making list public
    NEW.share_token = generate_secure_share_token();
  END IF;

  -- If list is being made private
  IF NEW.is_public = FALSE AND OLD.is_public = TRUE THEN
    NEW.shared_at = NULL;
    -- Keep existing token for now to avoid breaking existing links
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: update_shopping_list_modified(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_shopping_list_modified() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.last_modified_at = NOW();
  -- Set last_modified_by if not explicitly set
  IF NEW.last_modified_by IS NULL THEN
    NEW.last_modified_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_sm_content_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_sm_content_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_subscriptions_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_subscriptions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_subtasks_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_subtasks_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_task_actual_duration(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_task_actual_duration() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  total_duration INTEGER;
BEGIN
  -- Calculate total duration for the task
  SELECT COALESCE(SUM(duration), 0)
  INTO total_duration
  FROM task_time_entries
  WHERE task_id = COALESCE(NEW.task_id, OLD.task_id)
    AND duration IS NOT NULL;

  -- Update task's actual_duration
  UPDATE tasks
  SET actual_duration = total_duration
  WHERE id = COALESCE(NEW.task_id, OLD.task_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: update_task_approval_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_task_approval_status() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  total_approvers INTEGER;
  approved_count INTEGER;
  rejected_count INTEGER;
  changes_requested_count INTEGER;
BEGIN
  -- Count approval statuses for this task
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'approved'),
    COUNT(*) FILTER (WHERE status = 'rejected'),
    COUNT(*) FILTER (WHERE status = 'changes_requested')
  INTO total_approvers, approved_count, rejected_count, changes_requested_count
  FROM task_approvals
  WHERE task_id = NEW.task_id;

  -- Update task based on approval states
  IF rejected_count > 0 THEN
    UPDATE tasks
    SET approval_status = 'rejected'
    WHERE id = NEW.task_id;
  ELSIF changes_requested_count > 0 THEN
    UPDATE tasks
    SET approval_status = 'changes_requested'
    WHERE id = NEW.task_id;
  ELSIF approved_count = total_approvers AND total_approvers > 0 THEN
    UPDATE tasks
    SET
      approval_status = 'approved',
      approved_at = NOW(),
      approved_by = NEW.approver_id
    WHERE id = NEW.task_id;
  ELSE
    UPDATE tasks
    SET approval_status = 'pending'
    WHERE id = NEW.task_id;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: update_task_approvals_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_task_approvals_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status != OLD.status AND NEW.status != 'pending' THEN
    NEW.reviewed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_task_blocked_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_task_blocked_status() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Update the dependent task's blocked status
  UPDATE tasks
  SET is_blocked = EXISTS(
    SELECT 1 FROM task_dependencies td
    JOIN tasks t ON t.id = td.depends_on_task_id
    WHERE td.task_id = tasks.id
      AND t.status != 'completed'
      AND td.dependency_type = 'blocks'
  )
  WHERE id = COALESCE(NEW.task_id, OLD.task_id);

  -- Update the blocking task's blocking_count
  IF TG_OP = 'INSERT' THEN
    UPDATE tasks
    SET blocking_count = blocking_count + 1
    WHERE id = NEW.depends_on_task_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tasks
    SET blocking_count = GREATEST(blocking_count - 1, 0)
    WHERE id = OLD.depends_on_task_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: update_task_calendar_events_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_task_calendar_events_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_task_categories_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_task_categories_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_task_comment_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_task_comment_count() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tasks
    SET comment_count = comment_count + 1
    WHERE id = NEW.task_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tasks
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE id = OLD.task_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: update_task_comments_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_task_comments_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.content != OLD.content THEN
    NEW.is_edited = TRUE;
    NEW.edited_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_task_handoff_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_task_handoff_count() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE tasks
  SET handoff_count = handoff_count + 1
  WHERE id = NEW.task_id;

  RETURN NEW;
END;
$$;


--
-- Name: update_task_reminders_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_task_reminders_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_task_stats_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_task_stats_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_task_templates_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_task_templates_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_template_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_template_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_thread_reply_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_thread_reply_count() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.parent_message_id IS NOT NULL THEN
      UPDATE messages
      SET thread_reply_count = thread_reply_count + 1
      WHERE id = NEW.parent_message_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.parent_message_id IS NOT NULL THEN
      UPDATE messages
      SET thread_reply_count = GREATEST(thread_reply_count - 1, 0)
      WHERE id = OLD.parent_message_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: update_time_entries_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_time_entries_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_token_expiry(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_token_expiry(p_connection_id uuid, p_expires_in_seconds integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE calendar_connections
  SET 
    token_expires_at = NOW() + (p_expires_in_seconds || ' seconds')::INTERVAL,
    updated_at = NOW()
  WHERE id = p_connection_id;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_user_feedback_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_feedback_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: user_has_space_access(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_has_space_access(p_space_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  -- Use check_space_membership function which bypasses RLS
  SELECT check_space_membership(p_space_id, auth.uid());
$$;


--
-- Name: monetization_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monetization_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    level text NOT NULL,
    event text NOT NULL,
    user_id uuid,
    tier text,
    period text,
    amount numeric(10,2),
    currency text DEFAULT 'usd'::text,
    polar_customer_id text,
    polar_subscription_id text,
    polar_session_id text,
    polar_event_id text,
    trigger_source text,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT monetization_logs_level_check CHECK ((level = ANY (ARRAY['info'::text, 'warn'::text, 'error'::text])))
);


--
-- Name: account_deletion_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_deletion_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action character varying(50) NOT NULL,
    action_details jsonb,
    performed_by uuid,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: account_deletion_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_deletion_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    requested_at timestamp with time zone DEFAULT now(),
    scheduled_deletion_date timestamp with time zone NOT NULL,
    reminder_sent_7_days boolean DEFAULT false,
    reminder_sent_1_day boolean DEFAULT false,
    deletion_completed boolean DEFAULT false,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: achievement_badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.achievement_badges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    icon text NOT NULL,
    color text DEFAULT 'indigo'::text NOT NULL,
    criteria jsonb NOT NULL,
    points integer DEFAULT 10,
    rarity text DEFAULT 'common'::text NOT NULL,
    is_active boolean DEFAULT true,
    is_secret boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT achievement_badges_category_check CHECK ((category = ANY (ARRAY['goals'::text, 'milestones'::text, 'streaks'::text, 'social'::text, 'special'::text, 'seasonal'::text]))),
    CONSTRAINT achievement_badges_points_check CHECK ((points >= 0)),
    CONSTRAINT achievement_badges_rarity_check CHECK ((rarity = ANY (ARRAY['common'::text, 'uncommon'::text, 'rare'::text, 'epic'::text, 'legendary'::text])))
);


--
-- Name: achievement_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.achievement_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    space_id uuid NOT NULL,
    badge_id uuid NOT NULL,
    current_progress integer DEFAULT 0,
    target_progress integer NOT NULL,
    progress_data jsonb DEFAULT '{}'::jsonb,
    last_updated timestamp with time zone DEFAULT now()
);


--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    activity_type public.activity_type NOT NULL,
    entity_type public.commentable_type NOT NULL,
    entity_id uuid NOT NULL,
    user_id uuid NOT NULL,
    description text,
    metadata jsonb,
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_user_id uuid NOT NULL,
    action text NOT NULL,
    target_resource text,
    metadata jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_name text NOT NULL,
    target_value numeric NOT NULL,
    current_value numeric DEFAULT 0,
    unit text DEFAULT 'count'::text,
    deadline timestamp with time zone,
    status text DEFAULT 'active'::text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT admin_goals_status_check CHECK ((status = ANY (ARRAY['active'::text, 'achieved'::text, 'missed'::text, 'paused'::text]))),
    CONSTRAINT admin_goals_unit_check CHECK ((unit = ANY (ARRAY['count'::text, 'currency'::text, 'percentage'::text])))
);


--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    admin_level text DEFAULT 'super_admin'::text NOT NULL,
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    permissions jsonb DEFAULT '{}'::jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    role text,
    login_count integer DEFAULT 0 NOT NULL,
    last_login timestamp with time zone,
    last_session_ip text,
    session_count integer DEFAULT 0 NOT NULL,
    CONSTRAINT chk_admin_role CHECK ((role = ANY (ARRAY['super_admin'::text, 'admin'::text, 'moderator'::text])))
);


--
-- Name: ai_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    space_id uuid NOT NULL,
    title text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    last_message_at timestamp with time zone DEFAULT now() NOT NULL,
    message_count integer DEFAULT 0 NOT NULL,
    summary text,
    model_used text DEFAULT 'gemini-2.0-flash'::text NOT NULL,
    total_input_tokens integer DEFAULT 0 NOT NULL,
    total_output_tokens integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    input_type text DEFAULT 'text'::text NOT NULL,
    tool_calls_json jsonb,
    tool_results_json jsonb,
    input_tokens integer DEFAULT 0 NOT NULL,
    output_tokens integer DEFAULT 0 NOT NULL,
    model_used text,
    latency_ms integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    feedback text,
    feedback_text text,
    CONSTRAINT ai_messages_feedback_check CHECK ((feedback = ANY (ARRAY['positive'::text, 'negative'::text, NULL::text]))),
    CONSTRAINT ai_messages_input_type_check CHECK ((input_type = ANY (ARRAY['text'::text, 'voice'::text]))),
    CONSTRAINT ai_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])))
);


--
-- Name: ai_usage_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_usage_daily (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    space_id uuid NOT NULL,
    date date NOT NULL,
    input_tokens integer DEFAULT 0 NOT NULL,
    output_tokens integer DEFAULT 0 NOT NULL,
    voice_seconds integer DEFAULT 0 NOT NULL,
    conversation_count integer DEFAULT 0 NOT NULL,
    tool_calls_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    feature_source text DEFAULT 'chat'::text NOT NULL,
    estimated_cost_usd numeric(10,6) DEFAULT 0 NOT NULL,
    CONSTRAINT ai_usage_daily_feature_source_check CHECK ((feature_source = ANY (ARRAY['chat'::text, 'briefing'::text, 'suggestions'::text, 'event_parser'::text, 'digest'::text, 'ocr'::text, 'recipe_parse'::text])))
);


--
-- Name: ai_user_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_user_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    ai_enabled boolean DEFAULT true NOT NULL,
    voice_enabled boolean DEFAULT true NOT NULL,
    proactive_suggestions boolean DEFAULT true NOT NULL,
    morning_briefing boolean DEFAULT false NOT NULL,
    preferred_voice_lang text DEFAULT 'en'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ai_onboarding_seen boolean DEFAULT false NOT NULL
);


--
-- Name: availability_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.availability_blocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    day_of_week integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    block_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT availability_blocks_block_type_check CHECK ((block_type = ANY (ARRAY['work'::text, 'sleep'::text, 'busy'::text, 'available'::text]))),
    CONSTRAINT availability_blocks_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);


--
-- Name: aws_course_memory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aws_course_memory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_number integer NOT NULL,
    module_title text NOT NULL,
    document_title text NOT NULL,
    notion_page_id text,
    topics_covered jsonb DEFAULT '[]'::jsonb,
    key_terms_defined jsonb DEFAULT '[]'::jsonb,
    examples_used jsonb DEFAULT '[]'::jsonb,
    prerequisites text[] DEFAULT '{}'::text[],
    learning_objectives text[] DEFAULT '{}'::text[],
    exam_tips text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: bills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    name text NOT NULL,
    amount numeric(10,2) NOT NULL,
    category text,
    payee text,
    notes text,
    due_date date NOT NULL,
    frequency text DEFAULT 'monthly'::text NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    auto_pay boolean DEFAULT false,
    last_paid_date date,
    next_due_date date,
    linked_expense_id uuid,
    linked_calendar_event_id uuid,
    reminder_enabled boolean DEFAULT true,
    reminder_days_before integer DEFAULT 3,
    last_reminder_sent_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    linked_reminder_id uuid,
    CONSTRAINT bills_frequency_check CHECK ((frequency = ANY (ARRAY['one-time'::text, 'weekly'::text, 'bi-weekly'::text, 'monthly'::text, 'quarterly'::text, 'semi-annual'::text, 'annual'::text]))),
    CONSTRAINT bills_reminder_days_before_check CHECK (((reminder_days_before >= 0) AND (reminder_days_before <= 30))),
    CONSTRAINT bills_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text])))
);


--
-- Name: budget_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    category_name text NOT NULL,
    allocated_amount numeric(10,2) DEFAULT 0 NOT NULL,
    spent_amount numeric(10,2) DEFAULT 0,
    icon text,
    color text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: budget_goal_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_goal_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    goal_id uuid NOT NULL,
    budget_category text NOT NULL,
    link_type text NOT NULL,
    target_amount numeric,
    current_amount numeric DEFAULT 0,
    target_percentage numeric,
    current_percentage numeric DEFAULT 0,
    time_period text DEFAULT 'monthly'::text NOT NULL,
    auto_update boolean DEFAULT true NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT budget_goal_links_link_type_check CHECK ((link_type = ANY (ARRAY['budget_limit'::text, 'savings_target'::text, 'spending_reduction'::text, 'expense_tracking'::text]))),
    CONSTRAINT budget_goal_links_time_period_check CHECK ((time_period = ANY (ARRAY['monthly'::text, 'quarterly'::text, 'yearly'::text])))
);


--
-- Name: budget_template_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_template_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    category_name text NOT NULL,
    percentage numeric(5,2) NOT NULL,
    icon text,
    color text,
    description text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: budget_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    household_type text NOT NULL,
    icon text DEFAULT '📊'::text,
    recommended_income_min integer,
    recommended_income_max integer,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    monthly_budget numeric(10,2) DEFAULT 0 NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    threshold_50_enabled boolean DEFAULT true,
    threshold_75_enabled boolean DEFAULT true,
    threshold_90_enabled boolean DEFAULT true,
    notifications_enabled boolean DEFAULT true,
    notification_preferences jsonb DEFAULT '{"push": true, "email": true, "toast": true}'::jsonb,
    last_alert_sent_at timestamp with time zone,
    last_alert_threshold integer
);


--
-- Name: calendar_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    space_id uuid NOT NULL,
    provider public.calendar_provider NOT NULL,
    provider_account_id text,
    provider_calendar_id text,
    access_token_vault_id uuid,
    refresh_token_vault_id uuid,
    token_expires_at timestamp with time zone,
    sync_direction public.sync_direction_type DEFAULT 'bidirectional'::public.sync_direction_type NOT NULL,
    sync_status public.sync_status_type DEFAULT 'active'::public.sync_status_type NOT NULL,
    sync_token text,
    last_sync_at timestamp with time zone,
    next_sync_at timestamp with time zone,
    webhook_channel_id text,
    webhook_resource_id text,
    webhook_expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sync_enabled boolean DEFAULT true NOT NULL,
    last_error_message text,
    oauth_state_nonce text,
    oauth_state_created_at timestamp with time zone,
    provider_config jsonb
);


--
-- Name: calendar_event_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_event_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rowan_event_id uuid NOT NULL,
    connection_id uuid NOT NULL,
    external_event_id text NOT NULL,
    external_calendar_id text NOT NULL,
    sync_direction public.sync_direction_type DEFAULT 'bidirectional'::public.sync_direction_type NOT NULL,
    rowan_etag text,
    external_etag text,
    last_synced_at timestamp with time zone DEFAULT now() NOT NULL,
    has_conflict boolean DEFAULT false NOT NULL,
    conflict_detected_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    all_day boolean DEFAULT false,
    location text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    show_countdown boolean DEFAULT false,
    countdown_label text,
    important_date_id uuid
);


--
-- Name: calendar_sync_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_sync_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    connection_id uuid NOT NULL,
    sync_type public.sync_type NOT NULL,
    sync_direction public.sync_direction_type NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    status public.sync_log_status DEFAULT 'pending'::public.sync_log_status NOT NULL,
    events_created integer DEFAULT 0 NOT NULL,
    events_updated integer DEFAULT 0 NOT NULL,
    events_deleted integer DEFAULT 0 NOT NULL,
    conflicts_detected integer DEFAULT 0 NOT NULL,
    error_code text,
    error_message text,
    error_details jsonb,
    triggered_by text,
    duration_ms integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calendar_sync_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_sync_state (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    connection_id uuid NOT NULL,
    delta_link text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ccpa_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ccpa_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    action_details jsonb DEFAULT '{}'::jsonb,
    ip_address inet,
    user_agent text,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ccpa_audit_log_action_check CHECK ((action = ANY (ARRAY['opt_out_enabled'::text, 'opt_out_disabled'::text, 'data_request'::text, 'california_resident_verified'::text])))
);


--
-- Name: ccpa_opt_out_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ccpa_opt_out_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    opted_out boolean DEFAULT false NOT NULL,
    opt_out_date timestamp with time zone,
    ip_address inet,
    user_agent text,
    california_resident boolean,
    verification_method text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ccpa_opt_out_status_verification_method_check CHECK ((verification_method = ANY (ARRAY['geolocation'::text, 'user_declaration'::text, 'admin'::text])))
);


--
-- Name: checkin_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checkin_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    checkin_id uuid NOT NULL,
    from_user_id uuid NOT NULL,
    reaction_type text NOT NULL,
    message text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT checkin_reactions_reaction_type_check CHECK ((reaction_type = ANY (ARRAY['heart'::text, 'hug'::text, 'strength'::text, 'custom'::text])))
);


--
-- Name: chore_calendar_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chore_calendar_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chore_id uuid NOT NULL,
    event_id uuid NOT NULL,
    is_synced boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chore_rotations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chore_rotations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chore_id uuid NOT NULL,
    rotation_name text NOT NULL,
    rotation_type text DEFAULT 'round_robin'::text,
    user_order jsonb DEFAULT '[]'::jsonb NOT NULL,
    current_index integer DEFAULT 0,
    rotation_frequency text DEFAULT 'weekly'::text,
    next_rotation_date date NOT NULL,
    last_rotation_date date,
    last_assigned_to uuid,
    is_active boolean DEFAULT true,
    skip_on_absence boolean DEFAULT false,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chore_rotations_rotation_frequency_check CHECK ((rotation_frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'biweekly'::text, 'monthly'::text]))),
    CONSTRAINT chore_rotations_rotation_type_check CHECK ((rotation_type = ANY (ARRAY['round_robin'::text, 'random'::text, 'custom'::text])))
);


--
-- Name: chores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    frequency text,
    assigned_to uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    due_date timestamp with time zone,
    completed_at timestamp with time zone,
    completion_percentage integer DEFAULT 0,
    notes text,
    status text DEFAULT 'pending'::text,
    has_rotation boolean DEFAULT false,
    rotation_id uuid,
    sort_order integer DEFAULT 0,
    calendar_sync boolean DEFAULT false,
    point_value integer DEFAULT 10 NOT NULL,
    bonus_multiplier numeric(3,2) DEFAULT 1.0,
    late_penalty_enabled boolean DEFAULT false,
    late_penalty_points integer DEFAULT 5,
    grace_period_hours integer DEFAULT 2,
    penalty_applied_at timestamp with time zone,
    penalty_points_deducted integer DEFAULT 0,
    category text,
    CONSTRAINT chores_bonus_multiplier_check CHECK (((bonus_multiplier >= (0)::numeric) AND (bonus_multiplier <= (5)::numeric))),
    CONSTRAINT chores_completion_percentage_check CHECK (((completion_percentage >= 0) AND (completion_percentage <= 100))),
    CONSTRAINT chores_frequency_check CHECK ((frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'biweekly'::text, 'monthly'::text, 'once'::text]))),
    CONSTRAINT chores_point_value_check CHECK ((point_value >= 0)),
    CONSTRAINT chores_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in-progress'::text, 'blocked'::text, 'on-hold'::text, 'completed'::text, 'skipped'::text])))
);


--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    commentable_type public.commentable_type NOT NULL,
    commentable_id uuid NOT NULL,
    content text NOT NULL,
    parent_comment_id uuid,
    thread_depth integer DEFAULT 0,
    created_by uuid NOT NULL,
    edited_at timestamp with time zone,
    is_edited boolean DEFAULT false,
    is_pinned boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone,
    deleted_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT comments_content_check CHECK ((length(content) > 0)),
    CONSTRAINT comments_thread_depth_check CHECK (((thread_depth >= 0) AND (thread_depth <= 5)))
);


--
-- Name: comment_counts; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.comment_counts WITH (security_invoker='true') AS
 SELECT commentable_type,
    commentable_id,
    count(*) AS comment_count,
    count(DISTINCT created_by) AS unique_commenters,
    max(created_at) AS last_comment_at
   FROM public.comments
  WHERE (is_deleted = false)
  GROUP BY commentable_type, commentable_id;


--
-- Name: comment_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comment_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    comment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    emoji text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: compliance_events_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_events_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    event_type text NOT NULL,
    event_category text NOT NULL,
    description text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT compliance_events_log_event_category_check CHECK ((event_category = ANY (ARRAY['gdpr'::text, 'ccpa'::text, 'general_privacy'::text])))
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    title text,
    participants jsonb DEFAULT '[]'::jsonb,
    unread_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    conversation_type text DEFAULT 'direct'::text,
    last_message_preview text,
    last_message_at timestamp with time zone,
    is_archived boolean DEFAULT false,
    avatar_url text,
    description text,
    CONSTRAINT conversations_conversation_type_check CHECK ((conversation_type = ANY (ARRAY['direct'::text, 'group'::text, 'general'::text])))
);


--
-- Name: custom_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    icon text,
    color text DEFAULT '#6366f1'::text,
    parent_category_id uuid,
    monthly_budget numeric(10,2),
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: daily_checkins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_checkins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    space_id uuid NOT NULL,
    date date NOT NULL,
    mood text,
    highlights text,
    challenges text,
    gratitude text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    note text,
    energy_level integer,
    CONSTRAINT daily_checkins_energy_level_check CHECK (((energy_level IS NULL) OR ((energy_level >= 1) AND (energy_level <= 5)))),
    CONSTRAINT energy_level_range CHECK (((energy_level IS NULL) OR ((energy_level >= 1) AND (energy_level <= 5))))
);


--
-- Name: daily_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    tasks_created integer DEFAULT 0 NOT NULL,
    messages_sent integer DEFAULT 0 NOT NULL,
    quick_actions_used integer DEFAULT 0 NOT NULL,
    shopping_list_updates integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: data_export_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_export_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    export_format text NOT NULL,
    status text DEFAULT 'pending'::text,
    file_url text,
    file_size_bytes bigint,
    expires_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT data_export_requests_export_format_check CHECK ((export_format = ANY (ARRAY['json'::text, 'csv'::text, 'pdf'::text]))),
    CONSTRAINT data_export_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'expired'::text])))
);


--
-- Name: data_processing_agreements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_processing_agreements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    agreement_type text NOT NULL,
    agreement_version text NOT NULL,
    legal_basis text NOT NULL,
    consented boolean DEFAULT false NOT NULL,
    consent_date timestamp with time zone,
    consent_method text,
    withdrawn boolean DEFAULT false NOT NULL,
    processing_purposes text[],
    data_categories text[],
    retention_period text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: deleted_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deleted_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    deleted_at timestamp with time zone DEFAULT now() NOT NULL,
    permanent_deletion_at timestamp with time zone NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deletion_requested_at timestamp with time zone DEFAULT now()
);


--
-- Name: email_change_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_change_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    current_email text NOT NULL,
    new_email text NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    confirmed_at timestamp with time zone
);


--
-- Name: email_verification_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_verification_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    used_at timestamp with time zone
);


--
-- Name: event_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    file_name text NOT NULL,
    file_size integer,
    mime_type text,
    storage_path text NOT NULL,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    space_id uuid NOT NULL,
    file_type text,
    file_url text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: event_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    mentions uuid[],
    parent_comment_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    space_id uuid NOT NULL,
    edited boolean DEFAULT false
);


--
-- Name: event_proposal_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_proposal_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    proposal_id uuid NOT NULL,
    time_slot_index integer NOT NULL,
    user_id uuid NOT NULL,
    vote text NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT event_proposal_votes_vote_check CHECK ((vote = ANY (ARRAY['available'::text, 'unavailable'::text, 'preferred'::text])))
);


--
-- Name: event_proposals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_proposals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid,
    space_id uuid NOT NULL,
    proposed_by uuid NOT NULL,
    title text NOT NULL,
    description text,
    time_slots jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    counter_proposal_id uuid,
    approved_slot_index integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_event_id uuid,
    category text,
    expires_at timestamp with time zone,
    location text,
    CONSTRAINT event_proposals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'countered'::text])))
);


--
-- Name: event_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    created_by uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    category character varying(50) DEFAULT 'personal'::character varying NOT NULL,
    icon character varying(10),
    is_system_template boolean DEFAULT false,
    default_duration integer,
    default_location character varying(255),
    default_attendees uuid[],
    default_reminders jsonb,
    default_color character varying(50),
    default_recurrence jsonb,
    use_count integer DEFAULT 0,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    event_type text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    location text,
    is_recurring boolean DEFAULT false,
    recurrence_pattern text,
    assigned_to uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'not-started'::text,
    category text DEFAULT 'personal'::text,
    custom_color text,
    timezone text DEFAULT 'UTC'::text,
    deleted_at timestamp with time zone,
    deleted_by uuid,
    expense_id uuid,
    external_source public.calendar_provider,
    sync_locked boolean DEFAULT false NOT NULL,
    last_external_sync timestamp with time zone,
    all_day boolean DEFAULT false,
    linked_bill_id uuid,
    important_date_id uuid,
    show_countdown boolean DEFAULT false,
    countdown_label text,
    CONSTRAINT events_category_check CHECK ((category = ANY (ARRAY['work'::text, 'personal'::text, 'family'::text, 'health'::text, 'social'::text]))),
    CONSTRAINT events_status_check CHECK ((status = ANY (ARRAY['not-started'::text, 'in-progress'::text, 'completed'::text])))
);


--
-- Name: expense_splits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_splits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expense_id uuid NOT NULL,
    user_id uuid NOT NULL,
    amount_owed numeric DEFAULT 0 NOT NULL,
    amount_paid numeric DEFAULT 0 NOT NULL,
    percentage numeric,
    is_payer boolean DEFAULT false NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    settled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT expense_splits_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'partially-paid'::text, 'settled'::text])))
);


--
-- Name: expense_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expense_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    title text NOT NULL,
    amount numeric(10,2) NOT NULL,
    category text,
    date date NOT NULL,
    paid_by uuid,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    due_date timestamp with time zone,
    paid_at timestamp with time zone,
    recurring boolean DEFAULT false,
    created_by uuid,
    project_id uuid,
    status text DEFAULT 'pending'::text,
    payment_method text,
    receipt_id uuid,
    vendor_id uuid,
    line_item_id uuid,
    event_id uuid,
    recurring_frequency text,
    is_recurring boolean DEFAULT false,
    notes text,
    split_type text,
    ownership text DEFAULT 'shared'::text,
    is_split boolean DEFAULT false,
    split_percentage_user1 numeric,
    split_percentage_user2 numeric,
    split_amount_user1 numeric,
    split_amount_user2 numeric,
    CONSTRAINT expenses_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'overdue'::text])))
);


--
-- Name: feature_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    space_id uuid,
    feature text NOT NULL,
    action text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    device_type text,
    browser text,
    os text,
    session_id text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: feature_usage_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_usage_daily (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    feature text NOT NULL,
    page_views integer DEFAULT 0,
    unique_users integer DEFAULT 0,
    actions_create integer DEFAULT 0,
    actions_update integer DEFAULT 0,
    actions_delete integer DEFAULT 0,
    actions_complete integer DEFAULT 0,
    total_actions integer DEFAULT 0,
    avg_session_duration_seconds integer DEFAULT 0,
    device_mobile integer DEFAULT 0,
    device_desktop integer DEFAULT 0,
    device_tablet integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: founding_member_counter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.founding_member_counter (
    id integer DEFAULT 1 NOT NULL,
    current_count integer DEFAULT 0 NOT NULL,
    max_count integer DEFAULT 1000 NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT founding_member_counter_id_check CHECK ((id = 1))
);


--
-- Name: generated_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generated_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid,
    space_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    report_type text NOT NULL,
    date_range_start date NOT NULL,
    date_range_end date NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    charts_config jsonb DEFAULT '{}'::jsonb,
    summary_stats jsonb DEFAULT '{}'::jsonb,
    pdf_url text,
    pdf_size integer,
    file_path text,
    generated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    generated_by uuid NOT NULL,
    generation_time_ms integer,
    status text DEFAULT 'generated'::text,
    is_shared boolean DEFAULT false,
    share_token text,
    shared_until timestamp with time zone,
    view_count integer DEFAULT 0,
    download_count integer DEFAULT 0,
    last_viewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


--
-- Name: goal_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goal_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    goal_id uuid,
    milestone_id uuid,
    check_in_id uuid,
    user_id uuid NOT NULL,
    activity_type text NOT NULL,
    activity_data jsonb DEFAULT '{}'::jsonb,
    title text NOT NULL,
    description text,
    entity_title text,
    entity_type text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT goal_activities_activity_type_check CHECK ((activity_type = ANY (ARRAY['goal_created'::text, 'goal_updated'::text, 'goal_completed'::text, 'goal_deleted'::text, 'milestone_created'::text, 'milestone_completed'::text, 'milestone_updated'::text, 'milestone_deleted'::text, 'check_in_created'::text, 'check_in_updated'::text, 'goal_shared'::text, 'goal_collaborated'::text, 'goal_commented'::text])))
);


--
-- Name: goal_check_in_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goal_check_in_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    check_in_id uuid NOT NULL,
    photo_url text NOT NULL,
    caption text,
    order_index integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: goal_check_in_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goal_check_in_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    check_in_id uuid NOT NULL,
    user_id uuid NOT NULL,
    emoji text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: goal_check_in_reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goal_check_in_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    goal_id uuid NOT NULL,
    user_id uuid NOT NULL,
    scheduled_for timestamp with time zone NOT NULL,
    notification_sent boolean DEFAULT false NOT NULL,
    notification_sent_at timestamp with time zone,
    completed boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: goal_check_in_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goal_check_in_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    goal_id uuid NOT NULL,
    user_id uuid NOT NULL,
    frequency text DEFAULT 'weekly'::text NOT NULL,
    day_of_week integer,
    day_of_month integer,
    reminder_time time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL,
    enable_reminders boolean DEFAULT true NOT NULL,
    enable_voice_notes boolean DEFAULT true,
    enable_photos boolean DEFAULT true,
    reminder_days_before integer,
    auto_schedule boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: goal_check_ins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goal_check_ins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    goal_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text,
    mood_rating integer,
    progress_rating integer,
    voice_note_url text,
    voice_note_duration integer,
    voice_note_transcript text,
    voice_note_category character varying(50),
    voice_note_template_id uuid,
    voice_note_metadata jsonb DEFAULT '{}'::jsonb,
    milestone_reached boolean DEFAULT false,
    obstacles_faced text,
    next_steps text,
    check_in_type character varying(50) DEFAULT 'manual'::character varying,
    reminder_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    progress_percentage integer,
    mood text,
    notes text,
    blockers text,
    need_help_from_partner boolean DEFAULT false,
    scheduled_date date,
    CONSTRAINT goal_check_ins_check_in_type_check CHECK (((check_in_type)::text = ANY (ARRAY[('manual'::character varying)::text, ('scheduled'::character varying)::text, ('reminder'::character varying)::text]))),
    CONSTRAINT goal_check_ins_mood_rating_check CHECK (((mood_rating >= 1) AND (mood_rating <= 5))),
    CONSTRAINT goal_check_ins_progress_rating_check CHECK (((progress_rating >= 1) AND (progress_rating <= 10)))
);


--
-- Name: goal_collaborators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goal_collaborators (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    goal_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    invited_by uuid,
    invited_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT goal_collaborators_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'contributor'::text, 'viewer'::text])))
);


--
-- Name: goal_comment_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goal_comment_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    comment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    emoji text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: goal_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goal_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    goal_id uuid NOT NULL,
    user_id uuid NOT NULL,
    parent_comment_id uuid,
    content text NOT NULL,
    content_type text DEFAULT 'text'::text NOT NULL,
    reaction_counts jsonb DEFAULT '{}'::jsonb,
    is_edited boolean DEFAULT false,
    edited_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: goal_contributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goal_contributions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    goal_id uuid NOT NULL,
    user_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    contribution_date date DEFAULT CURRENT_DATE NOT NULL,
    description text,
    payment_method text,
    expense_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT goal_contributions_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    category text,
    target_date date,
    status text DEFAULT 'active'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    progress integer DEFAULT 0,
    visibility text DEFAULT 'private'::text,
    template_id uuid,
    priority_order integer DEFAULT 0,
    priority text DEFAULT 'none'::text,
    is_pinned boolean DEFAULT false,
    target_amount numeric(12,2),
    current_amount numeric(12,2) DEFAULT 0,
    is_financial boolean DEFAULT false,
    assigned_to uuid,
    CONSTRAINT goals_priority_check CHECK ((priority = ANY (ARRAY['none'::text, 'p1'::text, 'p2'::text, 'p3'::text, 'p4'::text]))),
    CONSTRAINT goals_progress_check CHECK (((progress >= 0) AND (progress <= 100))),
    CONSTRAINT goals_visibility_check CHECK ((visibility = ANY (ARRAY['private'::text, 'shared'::text])))
);


--
-- Name: goal_contribution_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.goal_contribution_stats WITH (security_invoker='true') AS
 SELECT gc.goal_id,
    count(gc.id) AS contribution_count,
    count(DISTINCT gc.user_id) AS contributor_count,
    sum(gc.amount) AS total_contributed,
    avg(gc.amount) AS avg_contribution,
    min(gc.contribution_date) AS first_contribution_date,
    max(gc.contribution_date) AS last_contribution_date,
    g.target_amount,
    g.current_amount,
    g.target_date,
        CASE
            WHEN (g.target_amount > (0)::numeric) THEN round(((g.current_amount / g.target_amount) * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS completion_percentage,
        CASE
            WHEN (g.target_amount > g.current_amount) THEN (g.target_amount - g.current_amount)
            ELSE (0)::numeric
        END AS amount_remaining
   FROM (public.goal_contributions gc
     JOIN public.goals g ON ((gc.goal_id = g.id)))
  GROUP BY gc.goal_id, g.target_amount, g.current_amount, g.target_date;


--
-- Name: goal_dependencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goal_dependencies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    goal_id uuid NOT NULL,
    depends_on_goal_id uuid NOT NULL,
    dependency_type text NOT NULL,
    completion_threshold integer DEFAULT 100,
    auto_unlock boolean DEFAULT true,
    unlock_delay_days integer DEFAULT 0,
    status text DEFAULT 'pending'::text NOT NULL,
    satisfied_at timestamp with time zone,
    bypassed_at timestamp with time zone,
    bypassed_by uuid,
    bypass_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT goal_dependencies_completion_threshold_check CHECK (((completion_threshold >= 0) AND (completion_threshold <= 100))),
    CONSTRAINT goal_dependencies_dependency_type_check CHECK ((dependency_type = ANY (ARRAY['prerequisite'::text, 'trigger'::text, 'blocking'::text]))),
    CONSTRAINT goal_dependencies_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'satisfied'::text, 'bypassed'::text]))),
    CONSTRAINT goal_dependencies_unlock_delay_days_check CHECK ((unlock_delay_days >= 0)),
    CONSTRAINT no_self_dependency CHECK ((goal_id <> depends_on_goal_id)),
    CONSTRAINT valid_threshold CHECK ((((dependency_type = 'prerequisite'::text) AND (completion_threshold > 0)) OR (dependency_type <> 'prerequisite'::text)))
);


--
-- Name: goal_mentions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goal_mentions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    comment_id uuid NOT NULL,
    mentioned_user_id uuid NOT NULL,
    mentioning_user_id uuid NOT NULL,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: goal_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goal_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    goal_id uuid,
    title text NOT NULL,
    description text,
    target_date date,
    completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    type text DEFAULT 'percentage'::text,
    target_value numeric(10,2),
    current_value numeric(10,2) DEFAULT 0,
    space_id uuid,
    CONSTRAINT goal_milestones_type_check CHECK ((type = ANY (ARRAY['percentage'::text, 'money'::text, 'count'::text, 'date'::text])))
);


--
-- Name: goal_nudge_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goal_nudge_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    goal_id uuid NOT NULL,
    user_id uuid NOT NULL,
    last_nudge_sent_at timestamp with time zone,
    last_activity_at timestamp with time zone,
    nudge_count integer DEFAULT 0,
    is_snoozed boolean DEFAULT false,
    snoozed_until timestamp with time zone,
    custom_nudge_enabled boolean DEFAULT true,
    custom_nudge_frequency_days integer,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


--
-- Name: goal_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goal_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    goal_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: goal_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goal_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    category text NOT NULL,
    icon text,
    target_days integer,
    is_public boolean DEFAULT true,
    created_by uuid,
    usage_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT goal_templates_category_check CHECK ((category = ANY (ARRAY['financial'::text, 'health'::text, 'home'::text, 'relationship'::text, 'career'::text, 'personal'::text, 'education'::text, 'family'::text])))
);


--
-- Name: goal_updates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goal_updates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    goal_id uuid,
    user_id uuid,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: habit_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.habit_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    user_id uuid NOT NULL,
    period_type text NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    total_days integer DEFAULT 0 NOT NULL,
    completed_days integer DEFAULT 0 NOT NULL,
    completion_rate numeric DEFAULT 0,
    average_value numeric DEFAULT 0,
    total_value numeric DEFAULT 0,
    longest_streak integer DEFAULT 0,
    current_streak integer DEFAULT 0,
    calculated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT habit_analytics_period_type_check CHECK ((period_type = ANY (ARRAY['weekly'::text, 'monthly'::text, 'quarterly'::text, 'yearly'::text])))
);


--
-- Name: habit_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.habit_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    user_id uuid NOT NULL,
    entry_date date NOT NULL,
    completed boolean DEFAULT false,
    completion_time timestamp with time zone,
    actual_value integer,
    notes text,
    mood_rating integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT habit_entries_mood_rating_check CHECK (((mood_rating >= 1) AND (mood_rating <= 5)))
);


--
-- Name: habit_streaks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.habit_streaks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    user_id uuid NOT NULL,
    streak_type text NOT NULL,
    streak_count integer DEFAULT 0 NOT NULL,
    start_date date,
    end_date date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT habit_streaks_streak_type_check CHECK ((streak_type = ANY (ARRAY['current'::text, 'longest'::text, 'weekly'::text, 'monthly'::text])))
);


--
-- Name: important_dates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.important_dates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    title text NOT NULL,
    person_name text,
    date_type text DEFAULT 'birthday'::text NOT NULL,
    month integer NOT NULL,
    day_of_month integer NOT NULL,
    year_started integer,
    year_ended integer,
    emoji text DEFAULT '🎂'::text,
    color text DEFAULT 'pink'::text,
    notes text,
    notify_days_before integer[] DEFAULT '{7,1,0}'::integer[],
    shopping_reminder_enabled boolean DEFAULT false,
    shopping_reminder_days_before integer DEFAULT 7,
    shopping_reminder_text text,
    show_on_calendar boolean DEFAULT true,
    calendar_all_day boolean DEFAULT true,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    show_on_countdown boolean DEFAULT true,
    countdown_days_before integer DEFAULT 30,
    countdown_label text,
    linked_calendar_event_id uuid,
    CONSTRAINT important_dates_date_type_check CHECK ((date_type = ANY (ARRAY['birthday'::text, 'anniversary'::text, 'memorial'::text, 'renewal'::text, 'appointment'::text, 'custom'::text]))),
    CONSTRAINT important_dates_day_of_month_check CHECK (((day_of_month >= 1) AND (day_of_month <= 31))),
    CONSTRAINT important_dates_month_check CHECK (((month >= 1) AND (month <= 12)))
);


--
-- Name: in_app_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.in_app_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    partnership_id uuid,
    type text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    space_id uuid,
    space_name text,
    related_item_id uuid,
    related_item_type text,
    action_url text,
    emoji text,
    sender_id uuid,
    sender_name text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT in_app_notifications_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT in_app_notifications_type_check CHECK ((type = ANY (ARRAY['task'::text, 'event'::text, 'message'::text, 'shopping'::text, 'meal'::text, 'reminder'::text, 'milestone'::text, 'goal_update'::text, 'expense'::text, 'bill_due'::text, 'space_invite'::text, 'system'::text])))
);


--
-- Name: investor_summary_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.investor_summary_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token character varying(64) NOT NULL,
    label character varying(200),
    expires_at timestamp with time zone NOT NULL,
    created_by uuid,
    last_accessed timestamp with time zone,
    access_count integer DEFAULT 0,
    is_revoked boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: late_penalties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.late_penalties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    chore_id uuid NOT NULL,
    user_id uuid NOT NULL,
    points_deducted integer NOT NULL,
    days_late integer DEFAULT 1 NOT NULL,
    due_date timestamp with time zone NOT NULL,
    completion_date timestamp with time zone,
    penalty_type text NOT NULL,
    is_forgiven boolean DEFAULT false,
    forgiven_by uuid,
    forgiven_at timestamp with time zone,
    forgiven_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT late_penalties_penalty_type_check CHECK ((penalty_type = ANY (ARRAY['daily_accrual'::text, 'completion_late'::text, 'manual'::text])))
);


--
-- Name: launch_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.launch_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    source text DEFAULT 'homepage'::text,
    referrer text,
    ip_address text,
    user_agent text,
    subscribed boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    unsubscribed_at timestamp with time zone,
    CONSTRAINT launch_notifications_source_check CHECK ((source = ANY (ARRAY['homepage'::text, 'features'::text, 'beta-modal'::text, 'other'::text])))
);


--
-- Name: magic_link_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.magic_link_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    used_at timestamp with time zone
);


--
-- Name: meal_calendar_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meal_calendar_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    meal_id uuid NOT NULL,
    event_id uuid,
    is_synced boolean DEFAULT false,
    sync_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: meal_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meal_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    recipe_id uuid,
    meal_date date NOT NULL,
    meal_type text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: meals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    recipe_id uuid,
    meal_type text NOT NULL,
    scheduled_date date NOT NULL,
    notes text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    name text,
    assigned_to uuid,
    calendar_sync boolean DEFAULT true,
    CONSTRAINT meals_meal_type_check CHECK ((meal_type = ANY (ARRAY['breakfast'::text, 'lunch'::text, 'dinner'::text, 'snack'::text])))
);


--
-- Name: mentions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mentions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    comment_id uuid NOT NULL,
    mentioned_user_id uuid NOT NULL,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: message_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    file_name text NOT NULL,
    file_type text NOT NULL,
    file_size bigint NOT NULL,
    mime_type text NOT NULL,
    storage_path text NOT NULL,
    thumbnail_path text,
    width integer,
    height integer,
    duration integer,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT message_attachments_file_size_check CHECK (((file_size > 0) AND (file_size <= 52428800))),
    CONSTRAINT message_attachments_file_type_check CHECK ((file_type = ANY (ARRAY['image'::text, 'video'::text, 'document'::text, 'audio'::text])))
);


--
-- Name: message_mentions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_mentions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    mentioned_user_id uuid NOT NULL,
    mentioned_by_user_id uuid NOT NULL,
    space_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    read boolean DEFAULT false,
    read_at timestamp with time zone
);


--
-- Name: message_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    emoji text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT message_reactions_emoji_check CHECK ((length(emoji) <= 10))
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    sender_id uuid,
    content text NOT NULL,
    thread_id uuid,
    is_pinned boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    conversation_id uuid,
    read boolean DEFAULT false,
    read_at timestamp with time zone,
    attachments jsonb DEFAULT '[]'::jsonb,
    parent_message_id uuid,
    thread_reply_count integer DEFAULT 0,
    pinned_at timestamp with time zone,
    pinned_by uuid,
    deleted_at timestamp with time zone,
    deleted_for_everyone boolean DEFAULT false,
    deleted_by uuid,
    deleted_for_users uuid[] DEFAULT '{}'::uuid[]
);


--
-- Name: milestone_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.milestone_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    type text NOT NULL,
    target_value integer,
    order_index integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT milestone_templates_type_check CHECK ((type = ANY (ARRAY['percentage'::text, 'money'::text, 'count'::text, 'date'::text])))
);


--
-- Name: notification_interactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_interactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    notification_id text,
    action text DEFAULT 'dismissed'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notification_interactions_action_check CHECK ((action = ANY (ARRAY['dismissed'::text, 'clicked'::text, 'closed'::text])))
);


--
-- Name: notification_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_log (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    category text NOT NULL,
    subject text NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL,
    error_message text,
    CONSTRAINT notification_log_category_check CHECK ((category = ANY (ARRAY['reminder'::text, 'task'::text, 'shopping'::text, 'meal'::text, 'event'::text, 'message'::text, 'digest'::text, 'goal_milestone'::text]))),
    CONSTRAINT notification_log_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'failed'::text, 'bounced'::text]))),
    CONSTRAINT notification_log_type_check CHECK ((type = ANY (ARRAY['email'::text, 'push'::text])))
);


--
-- Name: notification_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    space_id uuid,
    notification_type text NOT NULL,
    notification_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    delivery_method text DEFAULT 'instant'::text NOT NULL,
    scheduled_for timestamp with time zone NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    sent_at timestamp with time zone,
    failed_at timestamp with time zone,
    failure_reason text,
    retry_count integer DEFAULT 0 NOT NULL,
    suppressed_by_quiet_hours boolean DEFAULT false NOT NULL,
    original_scheduled_for timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notification_queue_delivery_method_check CHECK ((delivery_method = ANY (ARRAY['instant'::text, 'hourly'::text, 'daily'::text]))),
    CONSTRAINT notification_queue_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'cancelled'::text])))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    space_id uuid,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    link text,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: nudge_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nudge_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    space_id uuid NOT NULL,
    goal_id uuid,
    template_id uuid,
    title text NOT NULL,
    message text NOT NULL,
    category text NOT NULL,
    trigger_type text NOT NULL,
    delivery_method text DEFAULT 'in_app'::text,
    sent_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    read_at timestamp with time zone,
    clicked_at timestamp with time zone,
    dismissed_at timestamp with time zone,
    was_effective boolean,
    effectiveness_score integer,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


--
-- Name: nudge_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nudge_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    space_id uuid NOT NULL,
    nudges_enabled boolean DEFAULT true,
    daily_nudges_enabled boolean DEFAULT true,
    weekly_summary_enabled boolean DEFAULT true,
    milestone_reminders_enabled boolean DEFAULT true,
    deadline_alerts_enabled boolean DEFAULT true,
    motivation_quotes_enabled boolean DEFAULT true,
    preferred_nudge_time time without time zone DEFAULT '09:00:00'::time without time zone,
    preferred_timezone text DEFAULT 'UTC'::text,
    nudge_frequency_days integer DEFAULT 1,
    max_daily_nudges integer DEFAULT 3,
    quiet_hours_start time without time zone DEFAULT '22:00:00'::time without time zone,
    quiet_hours_end time without time zone DEFAULT '07:00:00'::time without time zone,
    weekend_nudges_enabled boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


--
-- Name: nudge_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nudge_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    trigger_type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    action_text text,
    icon text,
    goal_categories text[],
    days_before_deadline integer,
    days_since_activity integer,
    priority integer DEFAULT 1,
    is_active boolean DEFAULT true,
    is_system boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


--
-- Name: partnership_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partnership_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partnership_id uuid,
    space_id uuid NOT NULL,
    user1_id uuid,
    user2_id uuid,
    balance numeric DEFAULT 0,
    user1_income numeric DEFAULT 0,
    user2_income numeric DEFAULT 0,
    last_calculated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    used_at timestamp with time zone
);


--
-- Name: point_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    space_id uuid NOT NULL,
    source_type text NOT NULL,
    source_id uuid,
    points integer NOT NULL,
    reason text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT point_transactions_source_type_check CHECK ((source_type = ANY (ARRAY['chore'::text, 'task'::text, 'streak_bonus'::text, 'weekly_goal'::text, 'perfect_week'::text, 'redemption'::text, 'adjustment'::text, 'bonus'::text, 'late_penalty'::text, 'penalty_forgiven'::text])))
);


--
-- Name: privacy_email_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.privacy_email_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    notification_type text NOT NULL,
    email_address text NOT NULL,
    sent_at timestamp with time zone DEFAULT now(),
    delivery_status text DEFAULT 'sent'::text,
    email_provider_id text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT privacy_email_notifications_delivery_status_check CHECK ((delivery_status = ANY (ARRAY['sent'::text, 'delivered'::text, 'failed'::text, 'bounced'::text]))),
    CONSTRAINT privacy_email_notifications_notification_type_check CHECK ((notification_type = ANY (ARRAY['deletion_confirmation'::text, 'deletion_reminder_7_days'::text, 'deletion_reminder_1_day'::text, 'deletion_completed'::text, 'deletion_cancelled'::text, 'data_export_ready'::text, 'privacy_settings_changed'::text])))
);


--
-- Name: privacy_preference_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.privacy_preference_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    preference_key text NOT NULL,
    old_value boolean,
    new_value boolean NOT NULL,
    changed_at timestamp with time zone DEFAULT now(),
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    full_name text,
    avatar_url text,
    phone text,
    timezone text DEFAULT 'America/New_York'::text,
    notification_preferences jsonb DEFAULT '{"sms": false, "push": true, "email": true}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    name text,
    phone_number text,
    CONSTRAINT chk_profiles_email_format CHECK ((email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))
);


--
-- Name: project_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_line_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    vendor_id uuid,
    category text NOT NULL,
    description text NOT NULL,
    quantity numeric(10,2) DEFAULT 1,
    unit_price numeric(10,2),
    estimated_cost numeric(10,2) NOT NULL,
    actual_cost numeric(10,2) DEFAULT 0,
    is_paid boolean DEFAULT false,
    paid_date date,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT project_line_items_estimated_cost_check CHECK ((estimated_cost >= (0)::numeric))
);


--
-- Name: project_cost_breakdown; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.project_cost_breakdown WITH (security_invoker='true') AS
 SELECT project_id,
    category,
    count(id) AS line_item_count,
    sum(estimated_cost) AS total_estimated,
    sum(actual_cost) AS total_actual,
    sum((estimated_cost - actual_cost)) AS variance,
        CASE
            WHEN (sum(estimated_cost) > (0)::numeric) THEN round((((sum(estimated_cost) - sum(actual_cost)) / sum(estimated_cost)) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS variance_percentage
   FROM public.project_line_items pli
  GROUP BY project_id, category;


--
-- Name: project_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    space_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    is_completed boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    due_date date,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: project_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    title text,
    description text,
    photo_url text NOT NULL,
    photo_type text DEFAULT 'progress'::text,
    taken_date date DEFAULT CURRENT_DATE,
    display_order integer DEFAULT 0,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: project_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.project_summary AS
SELECT
    NULL::uuid AS project_id,
    NULL::uuid AS space_id,
    NULL::text AS name,
    NULL::text AS status,
    NULL::public.project_priority AS priority,
    NULL::numeric(12,2) AS estimated_budget,
    NULL::numeric(12,2) AS actual_cost,
    NULL::numeric(12,2) AS budget_variance,
    NULL::numeric(5,2) AS variance_percentage,
    NULL::timestamp with time zone AS start_date,
    NULL::date AS estimated_completion_date,
    NULL::date AS actual_completion_date,
    NULL::bigint AS line_item_count,
    NULL::bigint AS expense_count,
    NULL::bigint AS photo_count,
    NULL::bigint AS vendor_count,
    NULL::text[] AS vendor_names,
    NULL::uuid AS created_by,
    NULL::timestamp with time zone AS created_at,
    NULL::timestamp with time zone AS updated_at;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    space_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'planning'::text NOT NULL,
    start_date timestamp with time zone,
    target_date timestamp with time zone,
    budget_amount numeric(10,2),
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    progress_percentage integer,
    priority public.project_priority DEFAULT 'medium'::public.project_priority,
    estimated_completion_date date,
    actual_completion_date date,
    estimated_budget numeric(12,2),
    actual_cost numeric(12,2) DEFAULT 0,
    budget_variance numeric(12,2) DEFAULT 0,
    variance_percentage numeric(5,2) DEFAULT 0,
    location text,
    tags text[],
    CONSTRAINT projects_progress_percentage_check CHECK (((progress_percentage >= 0) AND (progress_percentage <= 100))),
    CONSTRAINT projects_status_check CHECK ((status = ANY (ARRAY['planning'::text, 'in_progress'::text, 'completed'::text, 'on_hold'::text])))
);


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone DEFAULT now() NOT NULL,
    space_id uuid,
    device_name text,
    is_active boolean DEFAULT true,
    expires_at timestamp with time zone
);


--
-- Name: push_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    platform text NOT NULL,
    device_name text,
    is_active boolean DEFAULT true,
    last_used_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT push_tokens_platform_check CHECK ((platform = ANY (ARRAY['ios'::text, 'android'::text, 'web'::text])))
);


--
-- Name: quick_action_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quick_action_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    user_id uuid NOT NULL,
    action_type text NOT NULL,
    context text,
    used_at timestamp with time zone DEFAULT now()
);


--
-- Name: quick_action_stats; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.quick_action_stats AS
 SELECT space_id,
    user_id,
    action_type,
    count(*) AS usage_count,
    max(used_at) AS last_used_at
   FROM public.quick_action_usage
  WHERE (used_at >= (now() - '30 days'::interval))
  GROUP BY space_id, user_id, action_type
  ORDER BY (count(*)) DESC
  WITH NO DATA;


--
-- Name: reaction_counts; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.reaction_counts WITH (security_invoker='true') AS
 SELECT comment_id,
    emoji,
    count(*) AS reaction_count,
    array_agg(user_id) AS user_ids
   FROM public.comment_reactions
  GROUP BY comment_id, emoji;


--
-- Name: receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    expense_id uuid,
    storage_path text NOT NULL,
    file_name text NOT NULL,
    file_size integer NOT NULL,
    mime_type text NOT NULL,
    merchant_name text,
    total_amount numeric(10,2),
    receipt_date date,
    category text,
    currency text DEFAULT 'USD'::text,
    ocr_text text,
    ocr_confidence numeric(5,2),
    ocr_processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: recipes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    ingredients jsonb,
    instructions text,
    prep_time integer,
    cook_time integer,
    servings integer,
    category text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    cuisine_type text,
    difficulty text,
    source_url text,
    image_url text,
    tags jsonb DEFAULT '[]'::jsonb
);


--
-- Name: recurring_expense_patterns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recurring_expense_patterns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    pattern_name text NOT NULL,
    merchant_name text,
    category text,
    frequency public.recurrence_frequency NOT NULL,
    average_amount numeric(10,2) NOT NULL,
    amount_variance numeric(10,2) DEFAULT 0,
    confidence_score numeric(5,2) NOT NULL,
    detection_method text,
    first_occurrence date NOT NULL,
    last_occurrence date NOT NULL,
    occurrence_count integer DEFAULT 1,
    expense_ids uuid[],
    next_expected_date date,
    next_expected_amount numeric(10,2),
    user_confirmed boolean DEFAULT false,
    user_ignored boolean DEFAULT false,
    auto_created boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_analyzed_at timestamp with time zone DEFAULT now()
);


--
-- Name: recurring_goal_instances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recurring_goal_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    goal_id uuid,
    period_start date NOT NULL,
    period_end date NOT NULL,
    target_value numeric NOT NULL,
    current_value numeric DEFAULT 0,
    status text DEFAULT 'pending'::text,
    completion_percentage numeric DEFAULT 0,
    completed_at timestamp with time zone,
    auto_generated boolean DEFAULT true,
    generation_date timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT recurring_goal_instances_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'completed'::text, 'skipped'::text, 'failed'::text])))
);


--
-- Name: recurring_goal_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recurring_goal_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    category character varying(100),
    priority character varying(20) DEFAULT 'medium'::character varying,
    recurrence_type character varying(50) NOT NULL,
    recurrence_pattern jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_habit boolean DEFAULT false,
    habit_category character varying(50),
    target_value integer,
    target_unit character varying(20),
    start_date date DEFAULT CURRENT_DATE NOT NULL,
    end_date date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid NOT NULL,
    CONSTRAINT recurring_goal_templates_priority_check CHECK (((priority)::text = ANY (ARRAY[('low'::character varying)::text, ('medium'::character varying)::text, ('high'::character varying)::text]))),
    CONSTRAINT recurring_goal_templates_recurrence_type_check CHECK (((recurrence_type)::text = ANY (ARRAY[('daily'::character varying)::text, ('weekly'::character varying)::text, ('monthly'::character varying)::text, ('custom'::character varying)::text])))
);


--
-- Name: reminder_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reminder_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reminder_id uuid NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reminder_activities_valid_uuid_check CHECK (((reminder_id)::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'::text)),
    CONSTRAINT valid_action_type CHECK ((action = ANY (ARRAY['created'::text, 'updated'::text, 'completed'::text, 'uncompleted'::text, 'snoozed'::text, 'unsnoozed'::text, 'assigned'::text, 'unassigned'::text, 'priority_changed'::text, 'category_changed'::text, 'status_changed'::text, 'deleted'::text, 'commented'::text, 'edited_comment'::text, 'deleted_comment'::text])))
);


--
-- Name: reminder_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reminder_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reminder_id uuid NOT NULL,
    type text NOT NULL,
    file_path text,
    file_size integer,
    mime_type text,
    url text,
    linked_id uuid,
    display_name text NOT NULL,
    uploaded_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reminder_attachments_type_check CHECK ((type = ANY (ARRAY['file'::text, 'url'::text, 'link_task'::text, 'link_shopping'::text, 'link_event'::text])))
);


--
-- Name: reminder_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reminder_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reminder_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT valid_comment_content CHECK (((char_length(TRIM(BOTH FROM content)) >= 1) AND (char_length(content) <= 5000)))
);


--
-- Name: reminder_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reminder_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reminder_id uuid,
    user_id uuid NOT NULL,
    type text NOT NULL,
    channel text NOT NULL,
    is_read boolean DEFAULT false,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    goal_id uuid,
    title text,
    message text,
    CONSTRAINT reminder_notifications_entity_check CHECK (((reminder_id IS NOT NULL) OR (goal_id IS NOT NULL))),
    CONSTRAINT valid_notification_channel CHECK ((channel = ANY (ARRAY['in_app'::text, 'email'::text, 'push'::text]))),
    CONSTRAINT valid_notification_type CHECK ((type = ANY (ARRAY['due'::text, 'overdue'::text, 'assigned'::text, 'unassigned'::text, 'mentioned'::text, 'commented'::text, 'completed'::text, 'snoozed'::text])))
);


--
-- Name: reminder_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reminder_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid,
    created_by uuid,
    name text NOT NULL,
    description text,
    emoji text DEFAULT '🔔'::text,
    category text DEFAULT 'personal'::text,
    priority text DEFAULT 'medium'::text,
    template_title text NOT NULL,
    template_description text,
    reminder_type text DEFAULT 'time'::text,
    default_time_offset_minutes integer,
    default_location text,
    repeat_pattern text,
    repeat_days integer[],
    is_system_template boolean DEFAULT false,
    usage_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT valid_category CHECK ((category = ANY (ARRAY['bills'::text, 'health'::text, 'work'::text, 'personal'::text, 'household'::text]))),
    CONSTRAINT valid_priority CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT valid_reminder_type CHECK ((reminder_type = ANY (ARRAY['time'::text, 'location'::text])))
);


--
-- Name: reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    remind_at timestamp with time zone NOT NULL,
    is_recurring boolean DEFAULT false,
    recurrence_pattern text,
    assigned_to uuid,
    created_by uuid,
    completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    category text DEFAULT 'personal'::text,
    emoji text DEFAULT '🔔'::text,
    priority text DEFAULT 'medium'::text,
    status text DEFAULT 'active'::text,
    snooze_until timestamp with time zone,
    repeat_pattern text,
    reminder_time timestamp with time zone,
    repeat_days jsonb DEFAULT '[]'::jsonb,
    snoozed_by uuid,
    location text,
    reminder_type text DEFAULT 'time'::text,
    linked_bill_id uuid,
    CONSTRAINT reminders_category_check CHECK ((category = ANY (ARRAY['bills'::text, 'health'::text, 'work'::text, 'personal'::text, 'household'::text]))),
    CONSTRAINT reminders_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT reminders_reminder_type_check CHECK ((reminder_type = ANY (ARRAY['time'::text, 'location'::text]))),
    CONSTRAINT reminders_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'snoozed'::text])))
);


--
-- Name: report_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    report_id uuid,
    template_id uuid,
    name text,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT favorite_target CHECK ((((report_id IS NOT NULL) AND (template_id IS NULL)) OR ((report_id IS NULL) AND (template_id IS NOT NULL))))
);


--
-- Name: report_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    category text NOT NULL,
    report_type text NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    default_date_range text DEFAULT 'current_month'::text,
    is_system boolean DEFAULT true,
    is_active boolean DEFAULT true,
    requires_goals boolean DEFAULT false,
    requires_budget boolean DEFAULT false,
    created_by uuid,
    space_id uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


--
-- Name: reward_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reward_points (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    space_id uuid NOT NULL,
    points integer DEFAULT 0 NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    current_streak integer DEFAULT 0 NOT NULL,
    longest_streak integer DEFAULT 0 NOT NULL,
    last_activity_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reward_points_level_check CHECK ((level >= 1)),
    CONSTRAINT reward_points_points_check CHECK ((points >= 0))
);


--
-- Name: reward_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reward_redemptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    space_id uuid NOT NULL,
    reward_id uuid NOT NULL,
    points_spent integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    fulfilled_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reward_redemptions_points_spent_check CHECK ((points_spent > 0)),
    CONSTRAINT reward_redemptions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'fulfilled'::text, 'denied'::text, 'cancelled'::text])))
);


--
-- Name: rewards_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rewards_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    cost_points integer NOT NULL,
    category text DEFAULT 'other'::text NOT NULL,
    image_url text,
    emoji text DEFAULT '🎁'::text,
    is_active boolean DEFAULT true NOT NULL,
    max_redemptions_per_week integer,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT rewards_catalog_category_check CHECK ((category = ANY (ARRAY['screen_time'::text, 'treats'::text, 'activities'::text, 'money'::text, 'privileges'::text, 'other'::text]))),
    CONSTRAINT rewards_catalog_cost_points_check CHECK ((cost_points > 0))
);


--
-- Name: settlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    from_user_id uuid NOT NULL,
    to_user_id uuid NOT NULL,
    amount numeric NOT NULL,
    settlement_date date DEFAULT CURRENT_DATE NOT NULL,
    payment_method text,
    reference_number text,
    notes text,
    expense_ids uuid[],
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: settlement_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.settlement_summary WITH (security_invoker='on') AS
 SELECT space_id,
    from_user_id,
    to_user_id,
    count(*) AS total_settlements,
    sum(amount) AS total_amount,
    max(settlement_date) AS last_settlement_date
   FROM public.settlements s
  GROUP BY space_id, from_user_id, to_user_id;


--
-- Name: shopping_calendar_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shopping_calendar_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    list_id uuid NOT NULL,
    event_id uuid NOT NULL,
    reminder_time integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: shopping_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shopping_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    list_id uuid,
    name text NOT NULL,
    quantity text,
    category text,
    is_purchased boolean DEFAULT false,
    added_by uuid,
    purchased_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    checked boolean DEFAULT false,
    recipe_id uuid,
    notes text,
    unit text,
    sort_order integer DEFAULT 0,
    assigned_to uuid,
    estimated_price numeric(10,2),
    actual_price numeric(10,2),
    recipe_source_id uuid
);


--
-- Name: shopping_lists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shopping_lists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    store text,
    status text DEFAULT 'active'::text,
    completed_at timestamp with time zone,
    share_token text DEFAULT public.generate_secure_share_token(),
    meal_ids jsonb DEFAULT '[]'::jsonb,
    is_public boolean DEFAULT false,
    shared_at timestamp with time zone,
    auto_generated boolean DEFAULT false,
    store_name character varying(255),
    estimated_total numeric(10,2),
    actual_total numeric(10,2),
    budget numeric(10,2),
    last_modified_by uuid,
    last_modified_at timestamp with time zone DEFAULT now(),
    CONSTRAINT shopping_lists_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'archived'::text])))
);


--
-- Name: shopping_reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shopping_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    list_id uuid,
    item_id uuid,
    reminder_id uuid NOT NULL,
    trigger_type character varying(50) DEFAULT 'time'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT shopping_reminders_check CHECK (((list_id IS NOT NULL) OR (item_id IS NOT NULL)))
);


--
-- Name: shopping_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shopping_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    list_id uuid NOT NULL,
    task_id uuid NOT NULL,
    sync_completion boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    auto_delete_at timestamp with time zone,
    auto_complete_at timestamp with time zone,
    is_auto_created boolean DEFAULT false,
    source_recipe_id uuid
);


--
-- Name: shopping_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shopping_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: site_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_visits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    visitor_hash text NOT NULL,
    path text NOT NULL,
    referrer text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    device_type text,
    browser text,
    country text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: sm_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sm_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    type text NOT NULL,
    description text NOT NULL,
    date timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sm_activities_type_check CHECK ((type = ANY (ARRAY['call'::text, 'email'::text, 'meeting'::text, 'note'::text, 'proposal'::text, 'follow-up'::text])))
);


--
-- Name: sm_admin_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sm_admin_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    user_agent text,
    ip text
);


--
-- Name: sm_clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sm_clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    company text,
    phone text,
    address_line1 text,
    address_line2 text,
    city text,
    state text,
    zip text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sm_contact_inquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sm_contact_inquiries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    company text,
    message text NOT NULL,
    email_sent boolean DEFAULT false NOT NULL,
    resend_id text,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_contact_email_format CHECK ((email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'::text)),
    CONSTRAINT chk_contact_email_len CHECK ((length(email) <= 320)),
    CONSTRAINT chk_contact_message_len CHECK ((length(message) <= 5000)),
    CONSTRAINT chk_contact_name_len CHECK ((length(name) <= 200))
);


--
-- Name: sm_content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sm_content (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    platform text NOT NULL,
    status text DEFAULT 'idea'::text NOT NULL,
    content text,
    published_date timestamp with time zone,
    scheduled_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    url text,
    topics jsonb DEFAULT '[]'::jsonb,
    likes integer DEFAULT 0,
    comments integer DEFAULT 0,
    shares integer DEFAULT 0,
    views integer DEFAULT 0,
    notes text,
    attachments jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT sm_content_platform_check CHECK ((platform = ANY (ARRAY['linkedin'::text, 'x'::text, 'blog'::text, 'instagram'::text, 'youtube'::text, 'tiktok'::text, 'newsletter'::text, 'facebook'::text, 'reddit'::text, 'producthunt'::text, 'hackernews'::text, 'indiehackers'::text, 'devto'::text, 'other'::text]))),
    CONSTRAINT sm_content_status_check CHECK ((status = ANY (ARRAY['idea'::text, 'draft'::text, 'ready'::text, 'scheduled'::text, 'published'::text, 'archived'::text])))
);


--
-- Name: sm_deals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sm_deals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    title text NOT NULL,
    stage text DEFAULT 'inquiry'::text NOT NULL,
    value integer DEFAULT 0 NOT NULL,
    notes text,
    closed_at timestamp with time zone,
    invoice_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sm_deals_stage_check CHECK ((stage = ANY (ARRAY['inquiry'::text, 'contacted'::text, 'proposal'::text, 'negotiation'::text, 'won'::text, 'lost'::text])))
);


--
-- Name: sm_invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sm_invoice_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    description text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_amount integer NOT NULL,
    total integer NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    service_template_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sm_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sm_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_number text NOT NULL,
    client_id uuid NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    subtotal integer DEFAULT 0 NOT NULL,
    tax_amount integer DEFAULT 0 NOT NULL,
    total integer DEFAULT 0 NOT NULL,
    currency text DEFAULT 'usd'::text NOT NULL,
    due_date date,
    payment_terms text DEFAULT 'due_on_receipt'::text,
    notes text,
    stripe_payment_intent_id text,
    stripe_checkout_session_id text,
    paid_at timestamp with time zone,
    viewed_at timestamp with time zone,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    stripe_invoice_id text,
    stripe_hosted_invoice_url text,
    stripe_invoice_pdf_url text,
    stripe_customer_id text,
    portal_token_hash text,
    portal_token_expires_at timestamp with time zone,
    CONSTRAINT sm_invoices_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'viewed'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text])))
);


--
-- Name: sm_leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sm_leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    company text,
    phone text,
    source text DEFAULT 'manual'::text NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    estimated_value integer DEFAULT 0,
    notes text,
    contact_inquiry_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sm_leads_status_check CHECK ((status = ANY (ARRAY['new'::text, 'contacted'::text, 'qualified'::text, 'proposal'::text, 'won'::text, 'lost'::text, 'inactive'::text])))
);


--
-- Name: sm_partnership_inquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sm_partnership_inquiries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    organization text NOT NULL,
    partnership_type text NOT NULL,
    message text NOT NULL,
    email_sent boolean DEFAULT false NOT NULL,
    resend_id text,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_partner_email_len CHECK ((length(email) <= 320)),
    CONSTRAINT chk_partner_message_len CHECK ((length(message) <= 5000)),
    CONSTRAINT chk_partner_name_len CHECK ((length(name) <= 200)),
    CONSTRAINT chk_partner_org_len CHECK ((length(organization) <= 500)),
    CONSTRAINT chk_partnership_email_format CHECK ((email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'::text)),
    CONSTRAINT sm_partnership_inquiries_partnership_type_check CHECK ((partnership_type = ANY (ARRAY['referral'::text, 'overflow-subcontracting'::text, 'complementary-services'::text, 'product-integration'::text, 'veteran-network'::text, 'other'::text])))
);


--
-- Name: sm_proposals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sm_proposals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deal_id uuid NOT NULL,
    lead_id uuid NOT NULL,
    title text NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    total integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    notes text,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sm_proposals_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'accepted'::text, 'rejected'::text])))
);


--
-- Name: sm_service_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sm_service_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    category text DEFAULT 'automation'::text NOT NULL,
    default_amount integer NOT NULL,
    is_recurring boolean DEFAULT false NOT NULL,
    recurring_interval text,
    sort_order integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: space_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.space_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    email text NOT NULL,
    invited_by uuid,
    token text NOT NULL,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
    role text DEFAULT 'member'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    accepted_at timestamp with time zone,
    CONSTRAINT space_invitations_role_check CHECK ((role = ANY (ARRAY['member'::text, 'admin'::text]))),
    CONSTRAINT space_invitations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'cancelled'::text])))
);


--
-- Name: space_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.space_members (
    space_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text,
    joined_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_member_role CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text, 'viewer'::text])))
);


--
-- Name: user_presence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_presence (
    user_id uuid NOT NULL,
    space_id uuid,
    status public.presence_status DEFAULT 'offline'::public.presence_status,
    last_activity timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    pronouns text,
    color_theme text DEFAULT 'emerald'::text,
    timezone text DEFAULT 'America/New_York'::text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    show_tasks_on_calendar boolean DEFAULT true,
    calendar_task_filter jsonb DEFAULT '{"categories": [], "priorities": []}'::jsonb,
    default_reminder_offset text DEFAULT '1_day_before'::text,
    privacy_settings jsonb DEFAULT '{"analytics": true, "readReceipts": true, "activityStatus": true, "profileVisibility": true}'::jsonb,
    show_chores_on_calendar boolean DEFAULT true,
    calendar_chore_filter jsonb DEFAULT '{"categories": [], "frequencies": []}'::jsonb,
    last_seen timestamp with time zone DEFAULT now(),
    is_online boolean DEFAULT false,
    show_meals_on_calendar boolean DEFAULT true,
    welcome_completed_at timestamp with time zone,
    CONSTRAINT users_default_reminder_offset_check CHECK ((default_reminder_offset = ANY (ARRAY['at_due_time'::text, '15_min_before'::text, '1_hour_before'::text, '1_day_before'::text, '1_week_before'::text, 'custom'::text])))
);


--
-- Name: space_members_with_presence; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.space_members_with_presence WITH (security_invoker='true') AS
 SELECT sm.space_id,
    sm.user_id,
    sm.role,
    sm.joined_at,
    u.name,
    u.email,
    u.avatar_url,
    COALESCE(up.status, 'offline'::public.presence_status) AS presence_status,
    up.last_activity,
    up.updated_at AS presence_updated_at
   FROM ((public.space_members sm
     LEFT JOIN public.users u ON ((sm.user_id = u.id)))
     LEFT JOIN public.user_presence up ON (((sm.user_id = up.user_id) AND (sm.space_id = up.space_id))))
  ORDER BY
        CASE
            WHEN (COALESCE(up.status, 'offline'::public.presence_status) = 'online'::public.presence_status) THEN 1
            ELSE 2
        END, sm.role, u.name;


--
-- Name: spaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    user_id uuid,
    is_personal boolean DEFAULT false,
    auto_created boolean DEFAULT false,
    description text,
    type text DEFAULT 'household'::text,
    settings jsonb DEFAULT '{}'::jsonb,
    late_penalty_settings jsonb DEFAULT '{"enabled": false, "exclude_weekends": false, "forgiveness_allowed": true, "progressive_penalty": true, "max_penalty_per_chore": 50, "default_penalty_points": 5, "default_grace_period_hours": 2, "penalty_multiplier_per_day": 1.5}'::jsonb
);


--
-- Name: storage_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.storage_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    total_bytes bigint DEFAULT 0 NOT NULL,
    file_count integer DEFAULT 0 NOT NULL,
    storage_limit_bytes bigint DEFAULT 536870912 NOT NULL,
    last_calculated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: storage_warnings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.storage_warnings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    space_id uuid NOT NULL,
    warning_type text NOT NULL,
    storage_bytes bigint,
    storage_limit_bytes bigint,
    dismissed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT storage_warnings_warning_type_check CHECK ((warning_type = ANY (ARRAY['80_percent'::text, '90_percent'::text, '100_percent'::text])))
);


--
-- Name: subscription_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    event_type text NOT NULL,
    from_tier text,
    to_tier text,
    trigger_source text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tier text DEFAULT 'free'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    period text DEFAULT 'monthly'::text NOT NULL,
    subscription_started_at timestamp with time zone,
    subscription_ends_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    trial_started_at timestamp with time zone,
    trial_ends_at timestamp with time zone,
    is_founding_member boolean DEFAULT false,
    founding_member_number integer,
    founding_member_locked_price_id text,
    polar_customer_id text,
    polar_subscription_id text,
    CONSTRAINT subscriptions_period_check CHECK ((period = ANY (ARRAY['monthly'::text, 'annual'::text]))),
    CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'past_due'::text, 'canceled'::text, 'paused'::text]))),
    CONSTRAINT subscriptions_tier_check CHECK ((tier = ANY (ARRAY['free'::text, 'pro'::text, 'family'::text, 'owner'::text])))
);


--
-- Name: subtasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subtasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_task_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'pending'::text,
    priority text DEFAULT 'medium'::text,
    sort_order integer DEFAULT 0,
    assigned_to uuid,
    due_date date,
    estimated_duration integer,
    actual_duration integer,
    completed_at timestamp with time zone,
    completed_by uuid,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT subtasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT subtasks_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'blocked'::text])))
);


--
-- Name: tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    name text NOT NULL,
    color text DEFAULT '#8b5cf6'::text,
    description text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    approver_id uuid NOT NULL,
    status text DEFAULT 'pending'::text,
    reviewed_at timestamp with time zone,
    review_note text,
    changes_requested text,
    requested_by uuid NOT NULL,
    requested_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT task_approvals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'changes_requested'::text])))
);


--
-- Name: task_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    file_name text NOT NULL,
    file_size integer NOT NULL,
    file_type text NOT NULL,
    storage_path text NOT NULL,
    storage_bucket text DEFAULT 'task-attachments'::text,
    thumbnail_path text,
    is_image boolean DEFAULT false,
    is_document boolean DEFAULT false,
    is_video boolean DEFAULT false,
    uploaded_by uuid NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_file_size CHECK ((file_size <= 52428800))
);


--
-- Name: task_calendar_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_calendar_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    event_id uuid,
    is_synced boolean DEFAULT false,
    sync_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    name text NOT NULL,
    color text NOT NULL,
    icon text,
    description text,
    sort_order integer DEFAULT 0,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_comment_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_comment_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    comment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    emoji text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    parent_comment_id uuid,
    is_edited boolean DEFAULT false,
    edited_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_dependencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_dependencies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    depends_on_task_id uuid NOT NULL,
    dependency_type text DEFAULT 'blocks'::text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_no_self_dependency CHECK ((task_id <> depends_on_task_id)),
    CONSTRAINT task_dependencies_dependency_type_check CHECK ((dependency_type = ANY (ARRAY['blocks'::text, 'relates_to'::text])))
);


--
-- Name: task_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    user_id uuid NOT NULL,
    emoji text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    user_id uuid NOT NULL,
    remind_at timestamp with time zone NOT NULL,
    reminder_type text DEFAULT 'notification'::text,
    offset_type text,
    custom_offset_minutes integer,
    is_sent boolean DEFAULT false,
    sent_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT task_reminders_offset_type_check CHECK ((offset_type = ANY (ARRAY['at_due_time'::text, '15_min_before'::text, '1_hour_before'::text, '1_day_before'::text, '1_week_before'::text, 'custom'::text]))),
    CONSTRAINT task_reminders_reminder_type_check CHECK ((reminder_type = ANY (ARRAY['notification'::text, 'email'::text, 'both'::text])))
);


--
-- Name: task_snooze_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_snooze_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    snoozed_by uuid NOT NULL,
    snoozed_from_date date,
    snoozed_to_date date,
    snooze_duration_minutes integer,
    reason text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    month date NOT NULL,
    total_tasks integer DEFAULT 0,
    completed_tasks integer DEFAULT 0,
    pending_tasks integer DEFAULT 0,
    in_progress_tasks integer DEFAULT 0,
    total_chores integer DEFAULT 0,
    completed_chores integer DEFAULT 0,
    pending_chores integer DEFAULT 0,
    total_items integer DEFAULT 0,
    completed_items integer DEFAULT 0,
    completion_rate numeric(5,2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    title text NOT NULL,
    task_description text,
    category text,
    priority text DEFAULT 'medium'::text,
    estimated_duration integer,
    default_recurrence_pattern text,
    default_recurrence_interval integer DEFAULT 1,
    default_recurrence_days_of_week jsonb DEFAULT '[]'::jsonb,
    default_assigned_to uuid,
    use_count integer DEFAULT 0,
    is_favorite boolean DEFAULT false,
    tags jsonb DEFAULT '[]'::jsonb,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT task_templates_default_recurrence_pattern_check CHECK ((default_recurrence_pattern = ANY (ARRAY['daily'::text, 'weekly'::text, 'biweekly'::text, 'monthly'::text, 'yearly'::text]))),
    CONSTRAINT task_templates_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])))
);


--
-- Name: task_time_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_time_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    user_id uuid NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    duration integer,
    notes text,
    is_manual boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_time_entry_order CHECK (((end_time IS NULL) OR (end_time > start_time)))
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    category text,
    priority text DEFAULT 'medium'::text,
    status text DEFAULT 'pending'::text,
    due_date date,
    assigned_to uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    is_recurring boolean DEFAULT false,
    recurrence_pattern text,
    recurrence_interval integer DEFAULT 1,
    recurrence_days_of_week jsonb DEFAULT '[]'::jsonb,
    recurrence_day_of_month integer,
    recurrence_month integer,
    recurrence_end_date date,
    recurrence_end_count integer,
    parent_recurrence_id uuid,
    is_recurrence_template boolean DEFAULT false,
    recurrence_exceptions jsonb DEFAULT '[]'::jsonb,
    recurrence_metadata jsonb DEFAULT '{}'::jsonb,
    estimated_duration integer,
    actual_duration integer,
    is_blocked boolean DEFAULT false,
    blocking_count integer DEFAULT 0,
    sort_order integer DEFAULT 0,
    color text,
    comment_count integer DEFAULT 0,
    is_snoozed boolean DEFAULT false,
    snoozed_until timestamp with time zone,
    snoozed_by uuid,
    snooze_count integer DEFAULT 0,
    handoff_count integer DEFAULT 0,
    requires_approval boolean DEFAULT false,
    approval_status text,
    approved_at timestamp with time zone,
    approved_by uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    calendar_sync boolean DEFAULT false,
    estimated_hours numeric(5,2),
    quick_note text,
    tags text,
    archived boolean DEFAULT false,
    archived_at timestamp with time zone,
    CONSTRAINT chk_task_status CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'in-progress'::text, 'completed'::text, 'blocked'::text, 'cancelled'::text]))),
    CONSTRAINT tasks_approval_status_check CHECK ((approval_status = ANY (ARRAY['not_required'::text, 'pending'::text, 'approved'::text, 'rejected'::text, 'changes_requested'::text]))),
    CONSTRAINT tasks_estimated_hours_check CHECK ((estimated_hours >= (0)::numeric)),
    CONSTRAINT tasks_recurrence_day_of_month_check CHECK (((recurrence_day_of_month >= 1) AND (recurrence_day_of_month <= 31))),
    CONSTRAINT tasks_recurrence_end_count_check CHECK ((recurrence_end_count >= 1)),
    CONSTRAINT tasks_recurrence_interval_check CHECK (((recurrence_interval >= 1) AND (recurrence_interval <= 365))),
    CONSTRAINT tasks_recurrence_month_check CHECK (((recurrence_month >= 1) AND (recurrence_month <= 12))),
    CONSTRAINT tasks_recurrence_pattern_check CHECK ((recurrence_pattern = ANY (ARRAY['daily'::text, 'weekly'::text, 'biweekly'::text, 'monthly'::text, 'yearly'::text])))
);


--
-- Name: typing_indicators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.typing_indicators (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    last_typed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: unread_mentions; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.unread_mentions WITH (security_invoker='true') AS
 SELECT m.id,
    m.comment_id,
    m.mentioned_user_id,
    c.content AS comment_content,
    c.commentable_type,
    c.commentable_id,
    c.created_by AS comment_author_id,
    u.email AS comment_author_email,
    c.created_at
   FROM ((public.mentions m
     JOIN public.comments c ON ((m.comment_id = c.id)))
     JOIN public.users u ON ((c.created_by = u.id)))
  WHERE ((m.is_read = false) AND (c.is_deleted = false));


--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    space_id uuid NOT NULL,
    badge_id uuid NOT NULL,
    earned_at timestamp with time zone DEFAULT now(),
    progress_data jsonb
);


--
-- Name: user_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    action_category text NOT NULL,
    resource_type text,
    resource_id text,
    ip_address text,
    user_agent text,
    location text,
    details jsonb,
    "timestamp" timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_feedback_category_check CHECK ((category = ANY (ARRAY['bug_report'::text, 'feature_request'::text, 'general'::text]))),
    CONSTRAINT user_feedback_description_check CHECK (((char_length(description) >= 1) AND (char_length(description) <= 2000))),
    CONSTRAINT user_feedback_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'done'::text, 'deleted'::text]))),
    CONSTRAINT user_feedback_title_check CHECK (((char_length(title) >= 1) AND (char_length(title) <= 100)))
);


--
-- Name: user_notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    space_id uuid,
    email_enabled boolean DEFAULT true,
    email_due_reminders boolean DEFAULT true,
    email_assignments boolean DEFAULT true,
    email_mentions boolean DEFAULT true,
    email_comments boolean DEFAULT false,
    in_app_enabled boolean DEFAULT true,
    in_app_due_reminders boolean DEFAULT true,
    in_app_assignments boolean DEFAULT true,
    in_app_mentions boolean DEFAULT true,
    in_app_comments boolean DEFAULT true,
    notification_frequency text DEFAULT 'instant'::text,
    quiet_hours_enabled boolean DEFAULT false,
    quiet_hours_start time without time zone,
    quiet_hours_end time without time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    push_enabled boolean DEFAULT true NOT NULL,
    push_due_reminders boolean DEFAULT true NOT NULL,
    push_assignments boolean DEFAULT true NOT NULL,
    push_mentions boolean DEFAULT true NOT NULL,
    push_comments boolean DEFAULT false NOT NULL,
    CONSTRAINT valid_notification_frequency CHECK ((notification_frequency = ANY (ARRAY['instant'::text, 'hourly'::text, 'daily'::text, 'never'::text])))
);


--
-- Name: user_privacy_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_privacy_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    share_anonymous_analytics boolean DEFAULT false,
    ccpa_do_not_sell boolean DEFAULT true,
    marketing_emails_enabled boolean DEFAULT false,
    analytics_cookies_enabled boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    activity_status_visible boolean DEFAULT true,
    third_party_analytics_enabled boolean DEFAULT false
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_token text NOT NULL,
    device_type text,
    browser text,
    browser_version text,
    os text,
    os_version text,
    device_name text,
    ip_address text,
    city text,
    region text,
    country text,
    country_code text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    is_current boolean DEFAULT false,
    last_active timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    revoked_at timestamp with time zone,
    user_agent text
);


--
-- Name: vendor_spend_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vendor_spend_summary AS
SELECT
    NULL::uuid AS vendor_id,
    NULL::uuid AS space_id,
    NULL::text AS name,
    NULL::text AS company_name,
    NULL::text AS trade,
    NULL::integer AS rating,
    NULL::boolean AS is_preferred,
    NULL::bigint AS project_count,
    NULL::bigint AS expense_count,
    NULL::numeric AS total_spent,
    NULL::date AS first_transaction_date,
    NULL::date AS last_transaction_date;


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    name text NOT NULL,
    company_name text,
    trade text,
    email text,
    phone text,
    address text,
    website text,
    license_number text,
    insurance_verified boolean DEFAULT false,
    rating integer,
    notes text,
    is_preferred boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT vendors_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: voice_transcriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voice_transcriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    goal_check_in_id uuid,
    audio_file_path text NOT NULL,
    audio_duration numeric(10,2),
    audio_size_bytes bigint,
    audio_format text DEFAULT 'webm'::text,
    transcription text NOT NULL,
    confidence numeric(3,2) DEFAULT 0.0,
    language character varying(10) DEFAULT 'en'::character varying,
    word_count integer DEFAULT 0,
    sentiment_score numeric(3,2),
    keywords jsonb DEFAULT '[]'::jsonb,
    summary text,
    action_items jsonb DEFAULT '[]'::jsonb,
    voice_note_category character varying(50),
    voice_note_template_id uuid,
    voice_note_metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: workspace_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_migrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    from_space_id uuid NOT NULL,
    to_space_id uuid NOT NULL,
    item_type text NOT NULL,
    item_id uuid NOT NULL,
    migrated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT workspace_migrations_item_type_check CHECK ((item_type = ANY (ARRAY['task'::text, 'event'::text, 'reminder'::text, 'message'::text, 'shopping_list'::text, 'recipe'::text, 'meal_plan'::text, 'chore'::text, 'expense'::text, 'budget'::text, 'goal'::text, 'daily_checkin'::text, 'activity_log'::text, 'conversation'::text, 'meal'::text, 'project'::text, 'bill'::text, 'receipt'::text, 'comment'::text])))
);


--
-- Name: account_deletion_audit_log account_deletion_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_deletion_audit_log
    ADD CONSTRAINT account_deletion_audit_log_pkey PRIMARY KEY (id);


--
-- Name: account_deletion_requests account_deletion_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_deletion_requests
    ADD CONSTRAINT account_deletion_requests_pkey PRIMARY KEY (id);


--
-- Name: account_deletion_requests account_deletion_requests_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_deletion_requests
    ADD CONSTRAINT account_deletion_requests_user_id_key UNIQUE (user_id);


--
-- Name: achievement_badges achievement_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievement_badges
    ADD CONSTRAINT achievement_badges_pkey PRIMARY KEY (id);


--
-- Name: achievement_progress achievement_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievement_progress
    ADD CONSTRAINT achievement_progress_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: admin_audit_log admin_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log
    ADD CONSTRAINT admin_audit_log_pkey PRIMARY KEY (id);


--
-- Name: admin_goals admin_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_goals
    ADD CONSTRAINT admin_goals_pkey PRIMARY KEY (id);


--
-- Name: admin_users admin_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_email_key UNIQUE (email);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: admin_users admin_users_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_user_id_key UNIQUE (user_id);


--
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);


--
-- Name: ai_usage_daily ai_usage_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_daily
    ADD CONSTRAINT ai_usage_daily_pkey PRIMARY KEY (id);


--
-- Name: ai_user_settings ai_user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_user_settings
    ADD CONSTRAINT ai_user_settings_pkey PRIMARY KEY (id);


--
-- Name: ai_user_settings ai_user_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_user_settings
    ADD CONSTRAINT ai_user_settings_user_id_key UNIQUE (user_id);


--
-- Name: availability_blocks availability_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_blocks
    ADD CONSTRAINT availability_blocks_pkey PRIMARY KEY (id);


--
-- Name: aws_course_memory aws_course_memory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aws_course_memory
    ADD CONSTRAINT aws_course_memory_pkey PRIMARY KEY (id);


--
-- Name: bills bills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_pkey PRIMARY KEY (id);


--
-- Name: budget_categories budget_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_categories
    ADD CONSTRAINT budget_categories_pkey PRIMARY KEY (id);


--
-- Name: budget_categories budget_categories_space_id_category_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_categories
    ADD CONSTRAINT budget_categories_space_id_category_name_key UNIQUE (space_id, category_name);


--
-- Name: budget_goal_links budget_goal_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_goal_links
    ADD CONSTRAINT budget_goal_links_pkey PRIMARY KEY (id);


--
-- Name: budget_template_categories budget_template_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_template_categories
    ADD CONSTRAINT budget_template_categories_pkey PRIMARY KEY (id);


--
-- Name: budget_templates budget_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_templates
    ADD CONSTRAINT budget_templates_pkey PRIMARY KEY (id);


--
-- Name: budgets budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);


--
-- Name: budgets budgets_space_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_space_id_key UNIQUE (space_id);


--
-- Name: calendar_connections calendar_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_connections
    ADD CONSTRAINT calendar_connections_pkey PRIMARY KEY (id);


--
-- Name: calendar_event_mappings calendar_event_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_event_mappings
    ADD CONSTRAINT calendar_event_mappings_pkey PRIMARY KEY (id);


--
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- Name: calendar_sync_conflicts calendar_sync_conflicts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_sync_conflicts
    ADD CONSTRAINT calendar_sync_conflicts_pkey PRIMARY KEY (id);


--
-- Name: calendar_sync_logs calendar_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_sync_logs
    ADD CONSTRAINT calendar_sync_logs_pkey PRIMARY KEY (id);


--
-- Name: calendar_sync_queue calendar_sync_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_sync_queue
    ADD CONSTRAINT calendar_sync_queue_pkey PRIMARY KEY (id);


--
-- Name: calendar_sync_state calendar_sync_state_connection_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_sync_state
    ADD CONSTRAINT calendar_sync_state_connection_id_key UNIQUE (connection_id);


--
-- Name: calendar_sync_state calendar_sync_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_sync_state
    ADD CONSTRAINT calendar_sync_state_pkey PRIMARY KEY (id);


--
-- Name: calendar_webhook_subscriptions calendar_webhook_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_webhook_subscriptions
    ADD CONSTRAINT calendar_webhook_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: calendar_webhook_subscriptions calendar_webhook_subscriptions_webhook_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_webhook_subscriptions
    ADD CONSTRAINT calendar_webhook_subscriptions_webhook_id_key UNIQUE (webhook_id);


--
-- Name: ccpa_audit_log ccpa_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ccpa_audit_log
    ADD CONSTRAINT ccpa_audit_log_pkey PRIMARY KEY (id);


--
-- Name: ccpa_opt_out_status ccpa_opt_out_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ccpa_opt_out_status
    ADD CONSTRAINT ccpa_opt_out_status_pkey PRIMARY KEY (id);


--
-- Name: ccpa_opt_out_status ccpa_opt_out_status_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ccpa_opt_out_status
    ADD CONSTRAINT ccpa_opt_out_status_user_id_key UNIQUE (user_id);


--
-- Name: checkin_reactions checkin_reactions_checkin_id_from_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkin_reactions
    ADD CONSTRAINT checkin_reactions_checkin_id_from_user_id_key UNIQUE (checkin_id, from_user_id);


--
-- Name: checkin_reactions checkin_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkin_reactions
    ADD CONSTRAINT checkin_reactions_pkey PRIMARY KEY (id);


--
-- Name: chore_calendar_events chore_calendar_events_chore_event_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chore_calendar_events
    ADD CONSTRAINT chore_calendar_events_chore_event_key UNIQUE (chore_id, event_id);


--
-- Name: chore_calendar_events chore_calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chore_calendar_events
    ADD CONSTRAINT chore_calendar_events_pkey PRIMARY KEY (id);


--
-- Name: chore_rotations chore_rotations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chore_rotations
    ADD CONSTRAINT chore_rotations_pkey PRIMARY KEY (id);


--
-- Name: chores chores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chores
    ADD CONSTRAINT chores_pkey PRIMARY KEY (id);


--
-- Name: comment_reactions comment_reactions_comment_id_user_id_emoji_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_reactions
    ADD CONSTRAINT comment_reactions_comment_id_user_id_emoji_key UNIQUE (comment_id, user_id, emoji);


--
-- Name: comment_reactions comment_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_reactions
    ADD CONSTRAINT comment_reactions_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: compliance_events_log compliance_events_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_events_log
    ADD CONSTRAINT compliance_events_log_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: custom_categories custom_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_categories
    ADD CONSTRAINT custom_categories_pkey PRIMARY KEY (id);


--
-- Name: custom_categories custom_categories_space_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_categories
    ADD CONSTRAINT custom_categories_space_id_name_key UNIQUE (space_id, name);


--
-- Name: daily_checkins daily_checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_checkins
    ADD CONSTRAINT daily_checkins_pkey PRIMARY KEY (id);


--
-- Name: daily_checkins daily_checkins_user_id_space_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_checkins
    ADD CONSTRAINT daily_checkins_user_id_space_id_date_key UNIQUE (user_id, space_id, date);


--
-- Name: daily_usage daily_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_usage
    ADD CONSTRAINT daily_usage_pkey PRIMARY KEY (id);


--
-- Name: daily_usage daily_usage_user_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_usage
    ADD CONSTRAINT daily_usage_user_id_date_key UNIQUE (user_id, date);


--
-- Name: data_export_requests data_export_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_export_requests
    ADD CONSTRAINT data_export_requests_pkey PRIMARY KEY (id);


--
-- Name: data_processing_agreements data_processing_agreements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_processing_agreements
    ADD CONSTRAINT data_processing_agreements_pkey PRIMARY KEY (id);


--
-- Name: deleted_accounts deleted_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deleted_accounts
    ADD CONSTRAINT deleted_accounts_pkey PRIMARY KEY (id);


--
-- Name: deleted_accounts deleted_accounts_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deleted_accounts
    ADD CONSTRAINT deleted_accounts_user_id_key UNIQUE (user_id);


--
-- Name: email_change_tokens email_change_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_change_tokens
    ADD CONSTRAINT email_change_tokens_pkey PRIMARY KEY (id);


--
-- Name: email_change_tokens email_change_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_change_tokens
    ADD CONSTRAINT email_change_tokens_token_key UNIQUE (token);


--
-- Name: email_verification_tokens email_verification_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id);


--
-- Name: email_verification_tokens email_verification_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_token_key UNIQUE (token);


--
-- Name: event_attachments event_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_attachments
    ADD CONSTRAINT event_attachments_pkey PRIMARY KEY (id);


--
-- Name: event_comments event_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_comments
    ADD CONSTRAINT event_comments_pkey PRIMARY KEY (id);


--
-- Name: event_proposal_votes event_proposal_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_proposal_votes
    ADD CONSTRAINT event_proposal_votes_pkey PRIMARY KEY (id);


--
-- Name: event_proposal_votes event_proposal_votes_proposal_id_time_slot_index_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_proposal_votes
    ADD CONSTRAINT event_proposal_votes_proposal_id_time_slot_index_user_id_key UNIQUE (proposal_id, time_slot_index, user_id);


--
-- Name: event_proposals event_proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_proposals
    ADD CONSTRAINT event_proposals_pkey PRIMARY KEY (id);


--
-- Name: event_templates event_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_templates
    ADD CONSTRAINT event_templates_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: expense_splits expense_splits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_splits
    ADD CONSTRAINT expense_splits_pkey PRIMARY KEY (id);


--
-- Name: expense_tags expense_tags_expense_id_tag_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_tags
    ADD CONSTRAINT expense_tags_expense_id_tag_id_key UNIQUE (expense_id, tag_id);


--
-- Name: expense_tags expense_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_tags
    ADD CONSTRAINT expense_tags_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: feature_events feature_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_events
    ADD CONSTRAINT feature_events_pkey PRIMARY KEY (id);


--
-- Name: feature_usage_daily feature_usage_daily_date_feature_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_usage_daily
    ADD CONSTRAINT feature_usage_daily_date_feature_key UNIQUE (date, feature);


--
-- Name: feature_usage_daily feature_usage_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_usage_daily
    ADD CONSTRAINT feature_usage_daily_pkey PRIMARY KEY (id);


--
-- Name: founding_member_counter founding_member_counter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.founding_member_counter
    ADD CONSTRAINT founding_member_counter_pkey PRIMARY KEY (id);


--
-- Name: generated_reports generated_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_reports
    ADD CONSTRAINT generated_reports_pkey PRIMARY KEY (id);


--
-- Name: generated_reports generated_reports_share_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_reports
    ADD CONSTRAINT generated_reports_share_token_key UNIQUE (share_token);


--
-- Name: goal_activities goal_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_activities
    ADD CONSTRAINT goal_activities_pkey PRIMARY KEY (id);


--
-- Name: goal_check_in_photos goal_check_in_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_check_in_photos
    ADD CONSTRAINT goal_check_in_photos_pkey PRIMARY KEY (id);


--
-- Name: goal_check_in_reactions goal_check_in_reactions_check_in_id_user_id_emoji_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_check_in_reactions
    ADD CONSTRAINT goal_check_in_reactions_check_in_id_user_id_emoji_key UNIQUE (check_in_id, user_id, emoji);


--
-- Name: goal_check_in_reactions goal_check_in_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_check_in_reactions
    ADD CONSTRAINT goal_check_in_reactions_pkey PRIMARY KEY (id);


--
-- Name: goal_check_in_reminders goal_check_in_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_check_in_reminders
    ADD CONSTRAINT goal_check_in_reminders_pkey PRIMARY KEY (id);


--
-- Name: goal_check_in_settings goal_check_in_settings_goal_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_check_in_settings
    ADD CONSTRAINT goal_check_in_settings_goal_id_user_id_key UNIQUE (goal_id, user_id);


--
-- Name: goal_check_in_settings goal_check_in_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_check_in_settings
    ADD CONSTRAINT goal_check_in_settings_pkey PRIMARY KEY (id);


--
-- Name: goal_check_ins goal_check_ins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_check_ins
    ADD CONSTRAINT goal_check_ins_pkey PRIMARY KEY (id);


--
-- Name: goal_collaborators goal_collaborators_goal_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_collaborators
    ADD CONSTRAINT goal_collaborators_goal_id_user_id_key UNIQUE (goal_id, user_id);


--
-- Name: goal_collaborators goal_collaborators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_collaborators
    ADD CONSTRAINT goal_collaborators_pkey PRIMARY KEY (id);


--
-- Name: goal_comment_reactions goal_comment_reactions_comment_id_user_id_emoji_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_comment_reactions
    ADD CONSTRAINT goal_comment_reactions_comment_id_user_id_emoji_key UNIQUE (comment_id, user_id, emoji);


--
-- Name: goal_comment_reactions goal_comment_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_comment_reactions
    ADD CONSTRAINT goal_comment_reactions_pkey PRIMARY KEY (id);


--
-- Name: goal_comments goal_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_comments
    ADD CONSTRAINT goal_comments_pkey PRIMARY KEY (id);


--
-- Name: goal_contributions goal_contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_contributions
    ADD CONSTRAINT goal_contributions_pkey PRIMARY KEY (id);


--
-- Name: goal_dependencies goal_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_dependencies
    ADD CONSTRAINT goal_dependencies_pkey PRIMARY KEY (id);


--
-- Name: goal_mentions goal_mentions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_mentions
    ADD CONSTRAINT goal_mentions_pkey PRIMARY KEY (id);


--
-- Name: goal_milestones goal_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_milestones
    ADD CONSTRAINT goal_milestones_pkey PRIMARY KEY (id);


--
-- Name: goal_nudge_tracking goal_nudge_tracking_goal_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_nudge_tracking
    ADD CONSTRAINT goal_nudge_tracking_goal_id_user_id_key UNIQUE (goal_id, user_id);


--
-- Name: goal_nudge_tracking goal_nudge_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_nudge_tracking
    ADD CONSTRAINT goal_nudge_tracking_pkey PRIMARY KEY (id);


--
-- Name: goal_tags goal_tags_goal_id_tag_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_tags
    ADD CONSTRAINT goal_tags_goal_id_tag_id_key UNIQUE (goal_id, tag_id);


--
-- Name: goal_tags goal_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_tags
    ADD CONSTRAINT goal_tags_pkey PRIMARY KEY (id);


--
-- Name: goal_templates goal_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_templates
    ADD CONSTRAINT goal_templates_pkey PRIMARY KEY (id);


--
-- Name: goal_updates goal_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_updates
    ADD CONSTRAINT goal_updates_pkey PRIMARY KEY (id);


--
-- Name: goals goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_pkey PRIMARY KEY (id);


--
-- Name: habit_analytics habit_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_analytics
    ADD CONSTRAINT habit_analytics_pkey PRIMARY KEY (id);


--
-- Name: habit_entries habit_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_entries
    ADD CONSTRAINT habit_entries_pkey PRIMARY KEY (id);


--
-- Name: habit_entries habit_entries_template_id_user_id_entry_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_entries
    ADD CONSTRAINT habit_entries_template_id_user_id_entry_date_key UNIQUE (template_id, user_id, entry_date);


--
-- Name: habit_streaks habit_streaks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_streaks
    ADD CONSTRAINT habit_streaks_pkey PRIMARY KEY (id);


--
-- Name: important_dates important_dates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.important_dates
    ADD CONSTRAINT important_dates_pkey PRIMARY KEY (id);


--
-- Name: in_app_notifications in_app_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.in_app_notifications
    ADD CONSTRAINT in_app_notifications_pkey PRIMARY KEY (id);


--
-- Name: investor_summary_tokens investor_summary_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investor_summary_tokens
    ADD CONSTRAINT investor_summary_tokens_pkey PRIMARY KEY (id);


--
-- Name: investor_summary_tokens investor_summary_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investor_summary_tokens
    ADD CONSTRAINT investor_summary_tokens_token_key UNIQUE (token);


--
-- Name: late_penalties late_penalties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.late_penalties
    ADD CONSTRAINT late_penalties_pkey PRIMARY KEY (id);


--
-- Name: launch_notifications launch_notifications_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.launch_notifications
    ADD CONSTRAINT launch_notifications_email_key UNIQUE (email);


--
-- Name: launch_notifications launch_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.launch_notifications
    ADD CONSTRAINT launch_notifications_pkey PRIMARY KEY (id);


--
-- Name: magic_link_tokens magic_link_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_link_tokens
    ADD CONSTRAINT magic_link_tokens_pkey PRIMARY KEY (id);


--
-- Name: magic_link_tokens magic_link_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_link_tokens
    ADD CONSTRAINT magic_link_tokens_token_key UNIQUE (token);


--
-- Name: meal_calendar_events meal_calendar_events_meal_id_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_calendar_events
    ADD CONSTRAINT meal_calendar_events_meal_id_event_id_key UNIQUE (meal_id, event_id);


--
-- Name: meal_calendar_events meal_calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_calendar_events
    ADD CONSTRAINT meal_calendar_events_pkey PRIMARY KEY (id);


--
-- Name: meal_plans meal_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_plans
    ADD CONSTRAINT meal_plans_pkey PRIMARY KEY (id);


--
-- Name: meals meals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meals
    ADD CONSTRAINT meals_pkey PRIMARY KEY (id);


--
-- Name: mentions mentions_comment_id_mentioned_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentions
    ADD CONSTRAINT mentions_comment_id_mentioned_user_id_key UNIQUE (comment_id, mentioned_user_id);


--
-- Name: mentions mentions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentions
    ADD CONSTRAINT mentions_pkey PRIMARY KEY (id);


--
-- Name: message_attachments message_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_pkey PRIMARY KEY (id);


--
-- Name: message_mentions message_mentions_message_id_mentioned_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_mentions
    ADD CONSTRAINT message_mentions_message_id_mentioned_user_id_key UNIQUE (message_id, mentioned_user_id);


--
-- Name: message_mentions message_mentions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_mentions
    ADD CONSTRAINT message_mentions_pkey PRIMARY KEY (id);


--
-- Name: message_reactions message_reactions_message_id_user_id_emoji_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_message_id_user_id_emoji_key UNIQUE (message_id, user_id, emoji);


--
-- Name: message_reactions message_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: milestone_templates milestone_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_templates
    ADD CONSTRAINT milestone_templates_pkey PRIMARY KEY (id);


--
-- Name: monetization_logs monetization_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monetization_logs
    ADD CONSTRAINT monetization_logs_pkey PRIMARY KEY (id);


--
-- Name: notification_interactions notification_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_interactions
    ADD CONSTRAINT notification_interactions_pkey PRIMARY KEY (id);


--
-- Name: notification_log notification_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_log
    ADD CONSTRAINT notification_log_pkey PRIMARY KEY (id);


--
-- Name: notification_queue notification_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_queue
    ADD CONSTRAINT notification_queue_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: nudge_history nudge_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nudge_history
    ADD CONSTRAINT nudge_history_pkey PRIMARY KEY (id);


--
-- Name: nudge_settings nudge_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nudge_settings
    ADD CONSTRAINT nudge_settings_pkey PRIMARY KEY (id);


--
-- Name: nudge_settings nudge_settings_user_id_space_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nudge_settings
    ADD CONSTRAINT nudge_settings_user_id_space_id_key UNIQUE (user_id, space_id);


--
-- Name: nudge_templates nudge_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nudge_templates
    ADD CONSTRAINT nudge_templates_pkey PRIMARY KEY (id);


--
-- Name: partnership_balances partnership_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partnership_balances
    ADD CONSTRAINT partnership_balances_pkey PRIMARY KEY (id);


--
-- Name: partnership_balances partnership_balances_space_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partnership_balances
    ADD CONSTRAINT partnership_balances_space_id_key UNIQUE (space_id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- Name: point_transactions point_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_transactions
    ADD CONSTRAINT point_transactions_pkey PRIMARY KEY (id);


--
-- Name: privacy_email_notifications privacy_email_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_email_notifications
    ADD CONSTRAINT privacy_email_notifications_pkey PRIMARY KEY (id);


--
-- Name: privacy_preference_history privacy_preference_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_preference_history
    ADD CONSTRAINT privacy_preference_history_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: project_line_items project_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_line_items
    ADD CONSTRAINT project_line_items_pkey PRIMARY KEY (id);


--
-- Name: project_milestones project_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT project_milestones_pkey PRIMARY KEY (id);


--
-- Name: project_photos project_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_photos
    ADD CONSTRAINT project_photos_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: push_tokens push_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_tokens
    ADD CONSTRAINT push_tokens_pkey PRIMARY KEY (id);


--
-- Name: push_tokens push_tokens_user_id_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_tokens
    ADD CONSTRAINT push_tokens_user_id_token_key UNIQUE (user_id, token);


--
-- Name: quick_action_usage quick_action_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quick_action_usage
    ADD CONSTRAINT quick_action_usage_pkey PRIMARY KEY (id);


--
-- Name: receipts receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_pkey PRIMARY KEY (id);


--
-- Name: recipes recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_pkey PRIMARY KEY (id);


--
-- Name: recurring_expense_patterns recurring_expense_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_expense_patterns
    ADD CONSTRAINT recurring_expense_patterns_pkey PRIMARY KEY (id);


--
-- Name: recurring_goal_instances recurring_goal_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_goal_instances
    ADD CONSTRAINT recurring_goal_instances_pkey PRIMARY KEY (id);


--
-- Name: recurring_goal_templates recurring_goal_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_goal_templates
    ADD CONSTRAINT recurring_goal_templates_pkey PRIMARY KEY (id);


--
-- Name: reminder_activities reminder_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_activities
    ADD CONSTRAINT reminder_activity_pkey PRIMARY KEY (id);


--
-- Name: reminder_attachments reminder_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_attachments
    ADD CONSTRAINT reminder_attachments_pkey PRIMARY KEY (id);


--
-- Name: reminder_comments reminder_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_comments
    ADD CONSTRAINT reminder_comments_pkey PRIMARY KEY (id);


--
-- Name: reminder_notifications reminder_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_notifications
    ADD CONSTRAINT reminder_notifications_pkey PRIMARY KEY (id);


--
-- Name: reminder_templates reminder_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_templates
    ADD CONSTRAINT reminder_templates_pkey PRIMARY KEY (id);


--
-- Name: reminders reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_pkey PRIMARY KEY (id);


--
-- Name: report_favorites report_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_favorites
    ADD CONSTRAINT report_favorites_pkey PRIMARY KEY (id);


--
-- Name: report_favorites report_favorites_user_id_report_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_favorites
    ADD CONSTRAINT report_favorites_user_id_report_id_key UNIQUE (user_id, report_id);


--
-- Name: report_favorites report_favorites_user_id_template_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_favorites
    ADD CONSTRAINT report_favorites_user_id_template_id_key UNIQUE (user_id, template_id);


--
-- Name: report_templates report_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_pkey PRIMARY KEY (id);


--
-- Name: reward_points reward_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_points
    ADD CONSTRAINT reward_points_pkey PRIMARY KEY (id);


--
-- Name: reward_points reward_points_user_id_space_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_points
    ADD CONSTRAINT reward_points_user_id_space_id_key UNIQUE (user_id, space_id);


--
-- Name: reward_redemptions reward_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_redemptions
    ADD CONSTRAINT reward_redemptions_pkey PRIMARY KEY (id);


--
-- Name: rewards_catalog rewards_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rewards_catalog
    ADD CONSTRAINT rewards_catalog_pkey PRIMARY KEY (id);


--
-- Name: settlements settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_pkey PRIMARY KEY (id);


--
-- Name: shopping_calendar_events shopping_calendar_events_list_id_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_calendar_events
    ADD CONSTRAINT shopping_calendar_events_list_id_event_id_key UNIQUE (list_id, event_id);


--
-- Name: shopping_calendar_events shopping_calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_calendar_events
    ADD CONSTRAINT shopping_calendar_events_pkey PRIMARY KEY (id);


--
-- Name: shopping_items shopping_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_items
    ADD CONSTRAINT shopping_items_pkey PRIMARY KEY (id);


--
-- Name: shopping_lists shopping_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_lists
    ADD CONSTRAINT shopping_lists_pkey PRIMARY KEY (id);


--
-- Name: shopping_lists shopping_lists_share_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_lists
    ADD CONSTRAINT shopping_lists_share_token_key UNIQUE (share_token);


--
-- Name: shopping_reminders shopping_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_reminders
    ADD CONSTRAINT shopping_reminders_pkey PRIMARY KEY (id);


--
-- Name: shopping_tasks shopping_tasks_list_id_task_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_tasks
    ADD CONSTRAINT shopping_tasks_list_id_task_id_key UNIQUE (list_id, task_id);


--
-- Name: shopping_tasks shopping_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_tasks
    ADD CONSTRAINT shopping_tasks_pkey PRIMARY KEY (id);


--
-- Name: shopping_templates shopping_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_templates
    ADD CONSTRAINT shopping_templates_pkey PRIMARY KEY (id);


--
-- Name: site_visits site_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_visits
    ADD CONSTRAINT site_visits_pkey PRIMARY KEY (id);


--
-- Name: sm_activities sm_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sm_activities
    ADD CONSTRAINT sm_activities_pkey PRIMARY KEY (id);


--
-- Name: sm_admin_sessions sm_admin_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sm_admin_sessions
    ADD CONSTRAINT sm_admin_sessions_pkey PRIMARY KEY (id);


--
-- Name: sm_admin_sessions sm_admin_sessions_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sm_admin_sessions
    ADD CONSTRAINT sm_admin_sessions_token_hash_key UNIQUE (token_hash);


--
-- Name: sm_clients sm_clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sm_clients
    ADD CONSTRAINT sm_clients_pkey PRIMARY KEY (id);


--
-- Name: sm_contact_inquiries sm_contact_inquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sm_contact_inquiries
    ADD CONSTRAINT sm_contact_inquiries_pkey PRIMARY KEY (id);


--
-- Name: sm_content sm_content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sm_content
    ADD CONSTRAINT sm_content_pkey PRIMARY KEY (id);


--
-- Name: sm_deals sm_deals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sm_deals
    ADD CONSTRAINT sm_deals_pkey PRIMARY KEY (id);


--
-- Name: sm_invoice_items sm_invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sm_invoice_items
    ADD CONSTRAINT sm_invoice_items_pkey PRIMARY KEY (id);


--
-- Name: sm_invoices sm_invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sm_invoices
    ADD CONSTRAINT sm_invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: sm_invoices sm_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sm_invoices
    ADD CONSTRAINT sm_invoices_pkey PRIMARY KEY (id);


--
-- Name: sm_leads sm_leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sm_leads
    ADD CONSTRAINT sm_leads_pkey PRIMARY KEY (id);


--
-- Name: sm_partnership_inquiries sm_partnership_inquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sm_partnership_inquiries
    ADD CONSTRAINT sm_partnership_inquiries_pkey PRIMARY KEY (id);


--
-- Name: sm_proposals sm_proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sm_proposals
    ADD CONSTRAINT sm_proposals_pkey PRIMARY KEY (id);


--
-- Name: sm_service_templates sm_service_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sm_service_templates
    ADD CONSTRAINT sm_service_templates_pkey PRIMARY KEY (id);


--
-- Name: space_invitations space_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.space_invitations
    ADD CONSTRAINT space_invitations_pkey PRIMARY KEY (id);


--
-- Name: space_invitations space_invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.space_invitations
    ADD CONSTRAINT space_invitations_token_key UNIQUE (token);


--
-- Name: space_members space_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.space_members
    ADD CONSTRAINT space_members_pkey PRIMARY KEY (space_id, user_id);


--
-- Name: spaces spaces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spaces
    ADD CONSTRAINT spaces_pkey PRIMARY KEY (id);


--
-- Name: storage_usage storage_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_usage
    ADD CONSTRAINT storage_usage_pkey PRIMARY KEY (id);


--
-- Name: storage_usage storage_usage_space_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_usage
    ADD CONSTRAINT storage_usage_space_id_key UNIQUE (space_id);


--
-- Name: storage_warnings storage_warnings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_warnings
    ADD CONSTRAINT storage_warnings_pkey PRIMARY KEY (id);


--
-- Name: storage_warnings storage_warnings_user_space_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_warnings
    ADD CONSTRAINT storage_warnings_user_space_type_key UNIQUE (user_id, space_id, warning_type);


--
-- Name: subscription_events subscription_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_events
    ADD CONSTRAINT subscription_events_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);


--
-- Name: subtasks subtasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subtasks
    ADD CONSTRAINT subtasks_pkey PRIMARY KEY (id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: tags tags_space_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_space_id_name_key UNIQUE (space_id, name);


--
-- Name: task_approvals task_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_approvals
    ADD CONSTRAINT task_approvals_pkey PRIMARY KEY (id);


--
-- Name: task_attachments task_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_pkey PRIMARY KEY (id);


--
-- Name: task_calendar_events task_calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_calendar_events
    ADD CONSTRAINT task_calendar_events_pkey PRIMARY KEY (id);


--
-- Name: task_calendar_events task_calendar_events_task_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_calendar_events
    ADD CONSTRAINT task_calendar_events_task_id_key UNIQUE (task_id);


--
-- Name: task_categories task_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_categories
    ADD CONSTRAINT task_categories_pkey PRIMARY KEY (id);


--
-- Name: task_categories task_categories_space_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_categories
    ADD CONSTRAINT task_categories_space_id_name_key UNIQUE (space_id, name);


--
-- Name: task_comment_reactions task_comment_reactions_comment_id_user_id_emoji_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comment_reactions
    ADD CONSTRAINT task_comment_reactions_comment_id_user_id_emoji_key UNIQUE (comment_id, user_id, emoji);


--
-- Name: task_comment_reactions task_comment_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comment_reactions
    ADD CONSTRAINT task_comment_reactions_pkey PRIMARY KEY (id);


--
-- Name: task_comments task_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_pkey PRIMARY KEY (id);


--
-- Name: task_dependencies task_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_dependencies
    ADD CONSTRAINT task_dependencies_pkey PRIMARY KEY (id);


--
-- Name: task_dependencies task_dependencies_task_id_depends_on_task_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_dependencies
    ADD CONSTRAINT task_dependencies_task_id_depends_on_task_id_key UNIQUE (task_id, depends_on_task_id);


--
-- Name: task_reactions task_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_reactions
    ADD CONSTRAINT task_reactions_pkey PRIMARY KEY (id);


--
-- Name: task_reactions task_reactions_task_id_user_id_emoji_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_reactions
    ADD CONSTRAINT task_reactions_task_id_user_id_emoji_key UNIQUE (task_id, user_id, emoji);


--
-- Name: task_reminders task_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_reminders
    ADD CONSTRAINT task_reminders_pkey PRIMARY KEY (id);


--
-- Name: task_snooze_history task_snooze_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_snooze_history
    ADD CONSTRAINT task_snooze_history_pkey PRIMARY KEY (id);


--
-- Name: task_stats task_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_stats
    ADD CONSTRAINT task_stats_pkey PRIMARY KEY (id);


--
-- Name: task_stats task_stats_space_id_month_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_stats
    ADD CONSTRAINT task_stats_space_id_month_key UNIQUE (space_id, month);


--
-- Name: task_tags task_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_tags
    ADD CONSTRAINT task_tags_pkey PRIMARY KEY (id);


--
-- Name: task_tags task_tags_task_id_tag_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_tags
    ADD CONSTRAINT task_tags_task_id_tag_id_key UNIQUE (task_id, tag_id);


--
-- Name: task_templates task_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_templates
    ADD CONSTRAINT task_templates_pkey PRIMARY KEY (id);


--
-- Name: task_time_entries task_time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_time_entries
    ADD CONSTRAINT task_time_entries_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: typing_indicators typing_indicators_conversation_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_indicators
    ADD CONSTRAINT typing_indicators_conversation_id_user_id_key UNIQUE (conversation_id, user_id);


--
-- Name: typing_indicators typing_indicators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_indicators
    ADD CONSTRAINT typing_indicators_pkey PRIMARY KEY (id);


--
-- Name: achievement_badges unique_badge_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievement_badges
    ADD CONSTRAINT unique_badge_name UNIQUE (name);


--
-- Name: calendar_webhook_subscriptions unique_connection_webhook; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_webhook_subscriptions
    ADD CONSTRAINT unique_connection_webhook UNIQUE (connection_id);


--
-- Name: calendar_event_mappings unique_external_event; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_event_mappings
    ADD CONSTRAINT unique_external_event UNIQUE (connection_id, external_event_id);


--
-- Name: calendar_event_mappings unique_rowan_event_connection; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_event_mappings
    ADD CONSTRAINT unique_rowan_event_connection UNIQUE (rowan_event_id, connection_id);


--
-- Name: habit_streaks unique_streak_per_type; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_streaks
    ADD CONSTRAINT unique_streak_per_type UNIQUE (template_id, user_id, streak_type);


--
-- Name: user_achievements unique_user_badge_per_space; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT unique_user_badge_per_space UNIQUE (user_id, space_id, badge_id);


--
-- Name: achievement_progress unique_user_badge_progress; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievement_progress
    ADD CONSTRAINT unique_user_badge_progress UNIQUE (user_id, space_id, badge_id);


--
-- Name: calendar_connections unique_user_provider_space; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_connections
    ADD CONSTRAINT unique_user_provider_space UNIQUE (user_id, provider, space_id);


--
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);


--
-- Name: user_audit_log user_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_audit_log
    ADD CONSTRAINT user_audit_log_pkey PRIMARY KEY (id);


--
-- Name: user_feedback user_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_feedback
    ADD CONSTRAINT user_feedback_pkey PRIMARY KEY (id);


--
-- Name: user_notification_preferences user_notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_notification_preferences user_notification_preferences_user_id_space_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_user_id_space_id_key UNIQUE (user_id, space_id);


--
-- Name: user_presence user_presence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_presence
    ADD CONSTRAINT user_presence_pkey PRIMARY KEY (user_id);


--
-- Name: user_presence user_presence_user_id_space_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_presence
    ADD CONSTRAINT user_presence_user_id_space_id_key UNIQUE (user_id, space_id);


--
-- Name: user_privacy_preferences user_privacy_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_privacy_preferences
    ADD CONSTRAINT user_privacy_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_privacy_preferences user_privacy_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_privacy_preferences
    ADD CONSTRAINT user_privacy_preferences_user_id_key UNIQUE (user_id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_token_key UNIQUE (session_token);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: voice_transcriptions voice_transcriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_transcriptions
    ADD CONSTRAINT voice_transcriptions_pkey PRIMARY KEY (id);


--
-- Name: workspace_migrations workspace_migrations_item_type_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_migrations
    ADD CONSTRAINT workspace_migrations_item_type_item_id_key UNIQUE (item_type, item_id);


--
-- Name: workspace_migrations workspace_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_migrations
    ADD CONSTRAINT workspace_migrations_pkey PRIMARY KEY (id);


--
-- Name: ai_usage_daily_date_cost_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_usage_daily_date_cost_idx ON public.ai_usage_daily USING btree (date, estimated_cost_usd);


--
-- Name: ai_usage_daily_feature_source_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_usage_daily_feature_source_idx ON public.ai_usage_daily USING btree (feature_source, date);


--
-- Name: ai_usage_daily_space_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_usage_daily_space_date_idx ON public.ai_usage_daily USING btree (space_id, date);


--
-- Name: ai_usage_daily_user_date_feature_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ai_usage_daily_user_date_feature_idx ON public.ai_usage_daily USING btree (user_id, date, feature_source);


--
-- Name: idx_account_deletion_audit_log_performed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_deletion_audit_log_performed_by ON public.account_deletion_audit_log USING btree (performed_by);


--
-- Name: idx_achievement_progress_badge_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_achievement_progress_badge_id ON public.achievement_progress USING btree (badge_id);


--
-- Name: idx_achievement_progress_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_achievement_progress_space_id ON public.achievement_progress USING btree (space_id);


--
-- Name: idx_achievement_progress_user_space; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_achievement_progress_user_space ON public.achievement_progress USING btree (user_id, space_id);


--
-- Name: idx_activity_logs_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_space_id ON public.activity_logs USING btree (space_id);


--
-- Name: idx_activity_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_user_id ON public.activity_logs USING btree (user_id);


--
-- Name: idx_admin_audit_log_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_log_action ON public.admin_audit_log USING btree (action);


--
-- Name: idx_admin_audit_log_admin_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_log_admin_user ON public.admin_audit_log USING btree (admin_user_id);


--
-- Name: idx_admin_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log USING btree (created_at DESC);


--
-- Name: idx_admin_goals_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_goals_created_by ON public.admin_goals USING btree (created_by);


--
-- Name: idx_admin_goals_deadline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_goals_deadline ON public.admin_goals USING btree (deadline) WHERE (status = 'active'::text);


--
-- Name: idx_admin_goals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_goals_status ON public.admin_goals USING btree (status);


--
-- Name: idx_admin_users_granted_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_users_granted_by ON public.admin_users USING btree (granted_by);


--
-- Name: idx_ai_conversations_last_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_conversations_last_message ON public.ai_conversations USING btree (last_message_at DESC);


--
-- Name: idx_ai_conversations_space; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_conversations_space ON public.ai_conversations USING btree (space_id);


--
-- Name: idx_ai_conversations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_conversations_user ON public.ai_conversations USING btree (user_id);


--
-- Name: idx_ai_messages_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_messages_conversation_id ON public.ai_messages USING btree (conversation_id);


--
-- Name: idx_ai_messages_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_messages_created ON public.ai_messages USING btree (created_at DESC);


--
-- Name: idx_ai_messages_feedback; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_messages_feedback ON public.ai_messages USING btree (feedback) WHERE (feedback IS NOT NULL);


--
-- Name: idx_ai_usage_daily_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_usage_daily_user_date ON public.ai_usage_daily USING btree (user_id, date);


--
-- Name: idx_availability_blocks_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_availability_blocks_user_id ON public.availability_blocks USING btree (user_id);


--
-- Name: idx_aws_course_memory_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aws_course_memory_module ON public.aws_course_memory USING btree (module_number);


--
-- Name: idx_bills_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bills_created_by ON public.bills USING btree (created_by);


--
-- Name: idx_bills_linked_calendar_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bills_linked_calendar_event_id ON public.bills USING btree (linked_calendar_event_id);


--
-- Name: idx_bills_linked_expense_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bills_linked_expense_id ON public.bills USING btree (linked_expense_id);


--
-- Name: idx_bills_linked_reminder_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bills_linked_reminder_id ON public.bills USING btree (linked_reminder_id);


--
-- Name: idx_bills_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bills_space_id ON public.bills USING btree (space_id);


--
-- Name: idx_budget_goal_links_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_goal_links_created_by ON public.budget_goal_links USING btree (created_by);


--
-- Name: idx_budget_goal_links_goal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_goal_links_goal_id ON public.budget_goal_links USING btree (goal_id);


--
-- Name: idx_budget_goal_links_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_goal_links_space_id ON public.budget_goal_links USING btree (space_id);


--
-- Name: idx_budget_template_categories_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_template_categories_template_id ON public.budget_template_categories USING btree (template_id);


--
-- Name: idx_calendar_connections_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_connections_space_id ON public.calendar_connections USING btree (space_id);


--
-- Name: idx_calendar_events_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_events_created_by ON public.calendar_events USING btree (created_by);


--
-- Name: idx_calendar_events_important_date_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_events_important_date_id ON public.calendar_events USING btree (important_date_id);


--
-- Name: idx_calendar_events_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_events_space_id ON public.calendar_events USING btree (space_id);


--
-- Name: idx_calendar_sync_conflicts_connection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_sync_conflicts_connection_id ON public.calendar_sync_conflicts USING btree (connection_id);


--
-- Name: idx_calendar_sync_conflicts_mapping_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_sync_conflicts_mapping_id ON public.calendar_sync_conflicts USING btree (mapping_id);


--
-- Name: idx_calendar_sync_conflicts_resolved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_sync_conflicts_resolved_by ON public.calendar_sync_conflicts USING btree (resolved_by);


--
-- Name: idx_calendar_sync_logs_connection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_sync_logs_connection_id ON public.calendar_sync_logs USING btree (connection_id);


--
-- Name: idx_calendar_sync_queue_connection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_sync_queue_connection_id ON public.calendar_sync_queue USING btree (connection_id);


--
-- Name: idx_calendar_sync_queue_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_sync_queue_event_id ON public.calendar_sync_queue USING btree (event_id);


--
-- Name: idx_calendar_sync_queue_mapping_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_sync_queue_mapping_id ON public.calendar_sync_queue USING btree (mapping_id);


--
-- Name: idx_calendar_sync_state_connection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_sync_state_connection_id ON public.calendar_sync_state USING btree (connection_id);


--
-- Name: idx_checkin_reactions_from_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checkin_reactions_from_user_id ON public.checkin_reactions USING btree (from_user_id);


--
-- Name: idx_chore_calendar_events_chore_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chore_calendar_events_chore_id ON public.chore_calendar_events USING btree (chore_id);


--
-- Name: idx_chore_calendar_events_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chore_calendar_events_event_id ON public.chore_calendar_events USING btree (event_id);


--
-- Name: idx_chore_rotations_chore_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chore_rotations_chore_id ON public.chore_rotations USING btree (chore_id);


--
-- Name: idx_chore_rotations_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chore_rotations_created_by ON public.chore_rotations USING btree (created_by);


--
-- Name: idx_chore_rotations_last_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chore_rotations_last_assigned_to ON public.chore_rotations USING btree (last_assigned_to);


--
-- Name: idx_chores_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chores_assigned_to ON public.chores USING btree (assigned_to);


--
-- Name: idx_chores_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chores_created_by ON public.chores USING btree (created_by);


--
-- Name: idx_chores_rotation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chores_rotation_id ON public.chores USING btree (rotation_id);


--
-- Name: idx_chores_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chores_space_id ON public.chores USING btree (space_id);


--
-- Name: idx_comment_reactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comment_reactions_user_id ON public.comment_reactions USING btree (user_id);


--
-- Name: idx_comments_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_created_by ON public.comments USING btree (created_by);


--
-- Name: idx_comments_deleted_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_deleted_by ON public.comments USING btree (deleted_by);


--
-- Name: idx_comments_parent_comment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_parent_comment_id ON public.comments USING btree (parent_comment_id);


--
-- Name: idx_comments_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_space_id ON public.comments USING btree (space_id);


--
-- Name: idx_compliance_events_log_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_events_log_category ON public.compliance_events_log USING btree (event_category);


--
-- Name: idx_compliance_events_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_events_log_created_at ON public.compliance_events_log USING btree (created_at DESC);


--
-- Name: idx_compliance_events_log_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_events_log_user_id ON public.compliance_events_log USING btree (user_id);


--
-- Name: idx_conversations_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_space_id ON public.conversations USING btree (space_id);


--
-- Name: idx_custom_categories_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_categories_created_by ON public.custom_categories USING btree (created_by);


--
-- Name: idx_custom_categories_parent_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_categories_parent_category_id ON public.custom_categories USING btree (parent_category_id);


--
-- Name: idx_daily_checkins_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_checkins_space_id ON public.daily_checkins USING btree (space_id);


--
-- Name: idx_data_export_requests_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_data_export_requests_user_id ON public.data_export_requests USING btree (user_id);


--
-- Name: idx_data_processing_agreements_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_data_processing_agreements_user_id ON public.data_processing_agreements USING btree (user_id);


--
-- Name: idx_email_change_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_change_tokens_user_id ON public.email_change_tokens USING btree (user_id);


--
-- Name: idx_email_verification_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_verification_tokens_user_id ON public.email_verification_tokens USING btree (user_id);


--
-- Name: idx_event_attachments_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_attachments_event_id ON public.event_attachments USING btree (event_id);


--
-- Name: idx_event_attachments_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_attachments_space_id ON public.event_attachments USING btree (space_id);


--
-- Name: idx_event_attachments_uploaded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_attachments_uploaded_by ON public.event_attachments USING btree (uploaded_by);


--
-- Name: idx_event_comments_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_comments_event_id ON public.event_comments USING btree (event_id);


--
-- Name: idx_event_comments_parent_comment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_comments_parent_comment_id ON public.event_comments USING btree (parent_comment_id);


--
-- Name: idx_event_comments_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_comments_space_id ON public.event_comments USING btree (space_id);


--
-- Name: idx_event_comments_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_comments_user_id ON public.event_comments USING btree (user_id);


--
-- Name: idx_event_proposals_counter_proposal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_proposals_counter_proposal_id ON public.event_proposals USING btree (counter_proposal_id);


--
-- Name: idx_event_proposals_created_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_proposals_created_event_id ON public.event_proposals USING btree (created_event_id);


--
-- Name: idx_event_proposals_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_proposals_event_id ON public.event_proposals USING btree (event_id);


--
-- Name: idx_event_proposals_proposed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_proposals_proposed_by ON public.event_proposals USING btree (proposed_by);


--
-- Name: idx_event_proposals_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_proposals_space_id ON public.event_proposals USING btree (space_id);


--
-- Name: idx_event_templates_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_templates_created_by ON public.event_templates USING btree (created_by);


--
-- Name: idx_event_templates_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_templates_space_id ON public.event_templates USING btree (space_id);


--
-- Name: idx_events_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_assigned_to ON public.events USING btree (assigned_to);


--
-- Name: idx_events_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_created_by ON public.events USING btree (created_by);


--
-- Name: idx_events_deleted_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_deleted_by ON public.events USING btree (deleted_by);


--
-- Name: idx_events_expense_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_expense_id ON public.events USING btree (expense_id);


--
-- Name: idx_events_important_date_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_important_date_id ON public.events USING btree (important_date_id);


--
-- Name: idx_events_linked_bill_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_linked_bill_id ON public.events USING btree (linked_bill_id);


--
-- Name: idx_events_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_space_id ON public.events USING btree (space_id);


--
-- Name: idx_expense_splits_expense_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expense_splits_expense_id ON public.expense_splits USING btree (expense_id);


--
-- Name: idx_expense_splits_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expense_splits_status ON public.expense_splits USING btree (status);


--
-- Name: idx_expense_splits_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expense_splits_user_id ON public.expense_splits USING btree (user_id);


--
-- Name: idx_expense_splits_user_payer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expense_splits_user_payer ON public.expense_splits USING btree (user_id, is_payer);


--
-- Name: idx_expense_tags_tag_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expense_tags_tag_id ON public.expense_tags USING btree (tag_id);


--
-- Name: idx_expenses_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_event_id ON public.expenses USING btree (event_id);


--
-- Name: idx_expenses_line_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_line_item_id ON public.expenses USING btree (line_item_id);


--
-- Name: idx_expenses_paid_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_paid_by ON public.expenses USING btree (paid_by);


--
-- Name: idx_expenses_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_project_id ON public.expenses USING btree (project_id);


--
-- Name: idx_expenses_receipt_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_receipt_id ON public.expenses USING btree (receipt_id);


--
-- Name: idx_expenses_space_category_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_space_category_date ON public.expenses USING btree (space_id, category, date);


--
-- Name: idx_expenses_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_space_id ON public.expenses USING btree (space_id);


--
-- Name: idx_expenses_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_vendor_id ON public.expenses USING btree (vendor_id);


--
-- Name: idx_feature_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_events_created_at ON public.feature_events USING btree (created_at DESC);


--
-- Name: idx_feature_events_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_events_space_id ON public.feature_events USING btree (space_id);


--
-- Name: idx_feature_events_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_events_user_id ON public.feature_events USING btree (user_id);


--
-- Name: idx_generated_reports_generated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_reports_generated_by ON public.generated_reports USING btree (generated_by);


--
-- Name: idx_generated_reports_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_reports_space_id ON public.generated_reports USING btree (space_id);


--
-- Name: idx_generated_reports_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_reports_template_id ON public.generated_reports USING btree (template_id);


--
-- Name: idx_goal_activities_check_in_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_activities_check_in_id ON public.goal_activities USING btree (check_in_id);


--
-- Name: idx_goal_activities_goal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_activities_goal_id ON public.goal_activities USING btree (goal_id);


--
-- Name: idx_goal_activities_milestone_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_activities_milestone_id ON public.goal_activities USING btree (milestone_id);


--
-- Name: idx_goal_activities_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_activities_space_id ON public.goal_activities USING btree (space_id);


--
-- Name: idx_goal_activities_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_activities_user_id ON public.goal_activities USING btree (user_id);


--
-- Name: idx_goal_check_in_photos_check_in; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_check_in_photos_check_in ON public.goal_check_in_photos USING btree (check_in_id);


--
-- Name: idx_goal_check_in_reactions_check_in; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_check_in_reactions_check_in ON public.goal_check_in_reactions USING btree (check_in_id);


--
-- Name: idx_goal_check_in_reactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_check_in_reactions_user_id ON public.goal_check_in_reactions USING btree (user_id);


--
-- Name: idx_goal_check_in_reminders_goal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_check_in_reminders_goal ON public.goal_check_in_reminders USING btree (goal_id);


--
-- Name: idx_goal_check_in_reminders_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_check_in_reminders_pending ON public.goal_check_in_reminders USING btree (notification_sent, completed, scheduled_for) WHERE ((notification_sent = false) AND (completed = false));


--
-- Name: idx_goal_check_in_reminders_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_check_in_reminders_user ON public.goal_check_in_reminders USING btree (user_id);


--
-- Name: idx_goal_check_in_settings_goal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_check_in_settings_goal ON public.goal_check_in_settings USING btree (goal_id);


--
-- Name: idx_goal_check_in_settings_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_check_in_settings_user ON public.goal_check_in_settings USING btree (user_id);


--
-- Name: idx_goal_check_ins_goal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_check_ins_goal_id ON public.goal_check_ins USING btree (goal_id);


--
-- Name: idx_goal_check_ins_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_check_ins_user_id ON public.goal_check_ins USING btree (user_id);


--
-- Name: idx_goal_check_ins_voice_note_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_check_ins_voice_note_template_id ON public.goal_check_ins USING btree (voice_note_template_id);


--
-- Name: idx_goal_collaborators_invited_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_collaborators_invited_by ON public.goal_collaborators USING btree (invited_by);


--
-- Name: idx_goal_collaborators_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_collaborators_user_id ON public.goal_collaborators USING btree (user_id);


--
-- Name: idx_goal_comment_reactions_comment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_comment_reactions_comment_id ON public.goal_comment_reactions USING btree (comment_id);


--
-- Name: idx_goal_comment_reactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_comment_reactions_user_id ON public.goal_comment_reactions USING btree (user_id);


--
-- Name: idx_goal_comments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_comments_created_at ON public.goal_comments USING btree (created_at);


--
-- Name: idx_goal_comments_goal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_comments_goal_id ON public.goal_comments USING btree (goal_id);


--
-- Name: idx_goal_comments_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_comments_parent ON public.goal_comments USING btree (parent_comment_id);


--
-- Name: idx_goal_comments_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_comments_user_id ON public.goal_comments USING btree (user_id);


--
-- Name: idx_goal_contributions_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_contributions_created_by ON public.goal_contributions USING btree (created_by);


--
-- Name: idx_goal_contributions_expense_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_contributions_expense_id ON public.goal_contributions USING btree (expense_id);


--
-- Name: idx_goal_contributions_goal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_contributions_goal_id ON public.goal_contributions USING btree (goal_id);


--
-- Name: idx_goal_contributions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_contributions_user_id ON public.goal_contributions USING btree (user_id);


--
-- Name: idx_goal_dependencies_bypassed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_dependencies_bypassed_by ON public.goal_dependencies USING btree (bypassed_by);


--
-- Name: idx_goal_dependencies_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_dependencies_created_by ON public.goal_dependencies USING btree (created_by);


--
-- Name: idx_goal_dependencies_depends_on_goal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_dependencies_depends_on_goal_id ON public.goal_dependencies USING btree (depends_on_goal_id);


--
-- Name: idx_goal_dependencies_goal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_dependencies_goal_id ON public.goal_dependencies USING btree (goal_id);


--
-- Name: idx_goal_dependencies_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_dependencies_space_id ON public.goal_dependencies USING btree (space_id);


--
-- Name: idx_goal_mentions_comment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_mentions_comment_id ON public.goal_mentions USING btree (comment_id);


--
-- Name: idx_goal_mentions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_mentions_created_at ON public.goal_mentions USING btree (created_at);


--
-- Name: idx_goal_mentions_mentioned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_mentions_mentioned ON public.goal_mentions USING btree (mentioned_user_id);


--
-- Name: idx_goal_mentions_mentioning_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_mentions_mentioning_user_id ON public.goal_mentions USING btree (mentioning_user_id);


--
-- Name: idx_goal_milestones_goal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_milestones_goal_id ON public.goal_milestones USING btree (goal_id);


--
-- Name: idx_goal_milestones_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_milestones_space_id ON public.goal_milestones USING btree (space_id);


--
-- Name: idx_goal_nudge_tracking_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_nudge_tracking_user_id ON public.goal_nudge_tracking USING btree (user_id);


--
-- Name: idx_goal_tags_tag_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_tags_tag_id ON public.goal_tags USING btree (tag_id);


--
-- Name: idx_goal_templates_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_templates_created_by ON public.goal_templates USING btree (created_by);


--
-- Name: idx_goal_updates_goal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_updates_goal_id ON public.goal_updates USING btree (goal_id);


--
-- Name: idx_goal_updates_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goal_updates_user_id ON public.goal_updates USING btree (user_id);


--
-- Name: idx_goals_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goals_assigned_to ON public.goals USING btree (assigned_to);


--
-- Name: idx_goals_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goals_created_by ON public.goals USING btree (created_by);


--
-- Name: idx_goals_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goals_space_id ON public.goals USING btree (space_id);


--
-- Name: idx_goals_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goals_template_id ON public.goals USING btree (template_id);


--
-- Name: idx_habit_entries_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_habit_entries_user_id ON public.habit_entries USING btree (user_id);


--
-- Name: idx_important_dates_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_important_dates_created_by ON public.important_dates USING btree (created_by);


--
-- Name: idx_important_dates_linked_calendar_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_important_dates_linked_calendar_event_id ON public.important_dates USING btree (linked_calendar_event_id);


--
-- Name: idx_important_dates_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_important_dates_space_id ON public.important_dates USING btree (space_id);


--
-- Name: idx_in_app_notifications_sender_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_in_app_notifications_sender_id ON public.in_app_notifications USING btree (sender_id);


--
-- Name: idx_in_app_notifications_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_in_app_notifications_space_id ON public.in_app_notifications USING btree (space_id);


--
-- Name: idx_in_app_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_in_app_notifications_user_id ON public.in_app_notifications USING btree (user_id);


--
-- Name: idx_investor_summary_tokens_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_investor_summary_tokens_created_by ON public.investor_summary_tokens USING btree (created_by);


--
-- Name: idx_investor_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_investor_tokens_token ON public.investor_summary_tokens USING btree (token);


--
-- Name: idx_late_penalties_chore; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_late_penalties_chore ON public.late_penalties USING btree (chore_id);


--
-- Name: idx_late_penalties_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_late_penalties_created ON public.late_penalties USING btree (created_at DESC);


--
-- Name: idx_late_penalties_space; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_late_penalties_space ON public.late_penalties USING btree (space_id);


--
-- Name: idx_late_penalties_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_late_penalties_user ON public.late_penalties USING btree (user_id);


--
-- Name: idx_magic_link_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_magic_link_tokens_user_id ON public.magic_link_tokens USING btree (user_id);


--
-- Name: idx_meal_calendar_events_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meal_calendar_events_event ON public.meal_calendar_events USING btree (event_id);


--
-- Name: idx_meal_calendar_events_meal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meal_calendar_events_meal ON public.meal_calendar_events USING btree (meal_id);


--
-- Name: idx_meal_plans_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meal_plans_created_by ON public.meal_plans USING btree (created_by);


--
-- Name: idx_meal_plans_recipe_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meal_plans_recipe_id ON public.meal_plans USING btree (recipe_id);


--
-- Name: idx_meal_plans_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meal_plans_space_id ON public.meal_plans USING btree (space_id);


--
-- Name: idx_meals_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meals_assigned_to ON public.meals USING btree (assigned_to);


--
-- Name: idx_meals_recipe_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meals_recipe_id ON public.meals USING btree (recipe_id);


--
-- Name: idx_meals_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meals_space_id ON public.meals USING btree (space_id);


--
-- Name: idx_mentions_mentioned_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mentions_mentioned_user_id ON public.mentions USING btree (mentioned_user_id);


--
-- Name: idx_message_attachments_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_attachments_message_id ON public.message_attachments USING btree (message_id);


--
-- Name: idx_message_attachments_uploaded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_attachments_uploaded_by ON public.message_attachments USING btree (uploaded_by);


--
-- Name: idx_message_mentions_mentioned_by_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_mentions_mentioned_by_user_id ON public.message_mentions USING btree (mentioned_by_user_id);


--
-- Name: idx_message_mentions_mentioned_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_mentions_mentioned_user ON public.message_mentions USING btree (mentioned_user_id);


--
-- Name: idx_message_mentions_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_mentions_space_id ON public.message_mentions USING btree (space_id);


--
-- Name: idx_message_reactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_reactions_user_id ON public.message_reactions USING btree (user_id);


--
-- Name: idx_messages_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_conversation_id ON public.messages USING btree (conversation_id);


--
-- Name: idx_messages_deleted_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_deleted_by ON public.messages USING btree (deleted_by);


--
-- Name: idx_messages_parent_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_parent_message_id ON public.messages USING btree (parent_message_id);


--
-- Name: idx_messages_pinned_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_pinned_by ON public.messages USING btree (pinned_by);


--
-- Name: idx_messages_sender_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);


--
-- Name: idx_messages_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_space_id ON public.messages USING btree (space_id);


--
-- Name: idx_messages_thread_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_thread_id ON public.messages USING btree (thread_id);


--
-- Name: idx_milestone_templates_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_milestone_templates_template_id ON public.milestone_templates USING btree (template_id);


--
-- Name: idx_monetization_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_monetization_logs_user_id ON public.monetization_logs USING btree (user_id);


--
-- Name: idx_notification_interactions_notification_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_interactions_notification_id ON public.notification_interactions USING btree (notification_id) WHERE (notification_id IS NOT NULL);


--
-- Name: idx_notification_interactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_interactions_user_id ON public.notification_interactions USING btree (user_id);


--
-- Name: idx_notification_log_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_log_user_id ON public.notification_log USING btree (user_id);


--
-- Name: idx_notification_queue_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_queue_created_at ON public.notification_queue USING btree (created_at);


--
-- Name: idx_notification_queue_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_queue_pending ON public.notification_queue USING btree (status, scheduled_for) WHERE (status = 'pending'::text);


--
-- Name: idx_notification_queue_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_queue_space_id ON public.notification_queue USING btree (space_id);


--
-- Name: idx_notification_queue_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_queue_user_id ON public.notification_queue USING btree (user_id);


--
-- Name: idx_notifications_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_space_id ON public.notifications USING btree (space_id);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_nudge_history_goal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nudge_history_goal_id ON public.nudge_history USING btree (goal_id);


--
-- Name: idx_nudge_history_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nudge_history_space_id ON public.nudge_history USING btree (space_id);


--
-- Name: idx_nudge_history_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nudge_history_template_id ON public.nudge_history USING btree (template_id);


--
-- Name: idx_nudge_history_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nudge_history_user_id ON public.nudge_history USING btree (user_id);


--
-- Name: idx_nudge_settings_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nudge_settings_space_id ON public.nudge_settings USING btree (space_id);


--
-- Name: idx_partnership_balances_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partnership_balances_space_id ON public.partnership_balances USING btree (space_id);


--
-- Name: idx_partnership_balances_user1_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partnership_balances_user1_id ON public.partnership_balances USING btree (user1_id);


--
-- Name: idx_partnership_balances_user2_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partnership_balances_user2_id ON public.partnership_balances USING btree (user2_id);


--
-- Name: idx_password_reset_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);


--
-- Name: idx_point_transactions_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_point_transactions_space_id ON public.point_transactions USING btree (space_id);


--
-- Name: idx_point_transactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_point_transactions_user_id ON public.point_transactions USING btree (user_id);


--
-- Name: idx_privacy_email_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_privacy_email_notifications_user_id ON public.privacy_email_notifications USING btree (user_id);


--
-- Name: idx_privacy_preference_history_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_privacy_preference_history_user_id ON public.privacy_preference_history USING btree (user_id);


--
-- Name: idx_profiles_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_updated_at ON public.profiles USING btree (updated_at DESC);


--
-- Name: idx_project_line_items_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_line_items_project_id ON public.project_line_items USING btree (project_id);


--
-- Name: idx_project_line_items_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_line_items_vendor_id ON public.project_line_items USING btree (vendor_id);


--
-- Name: idx_project_milestones_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_milestones_project_id ON public.project_milestones USING btree (project_id);


--
-- Name: idx_project_milestones_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_milestones_space_id ON public.project_milestones USING btree (space_id);


--
-- Name: idx_project_photos_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_photos_project_id ON public.project_photos USING btree (project_id);


--
-- Name: idx_project_photos_uploaded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_photos_uploaded_by ON public.project_photos USING btree (uploaded_by);


--
-- Name: idx_projects_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_created_by ON public.projects USING btree (created_by);


--
-- Name: idx_projects_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_space_id ON public.projects USING btree (space_id);


--
-- Name: idx_proposal_votes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proposal_votes_user_id ON public.event_proposal_votes USING btree (user_id);


--
-- Name: idx_push_subscriptions_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_push_subscriptions_space_id ON public.push_subscriptions USING btree (space_id);


--
-- Name: idx_push_subscriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions USING btree (user_id);


--
-- Name: idx_push_tokens_user_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_push_tokens_user_active ON public.push_tokens USING btree (user_id) WHERE (is_active = true);


--
-- Name: idx_quick_action_usage_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quick_action_usage_space_id ON public.quick_action_usage USING btree (space_id);


--
-- Name: idx_quick_action_usage_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quick_action_usage_user_id ON public.quick_action_usage USING btree (user_id);


--
-- Name: idx_receipts_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_receipts_created_by ON public.receipts USING btree (created_by);


--
-- Name: idx_receipts_expense_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_receipts_expense_id ON public.receipts USING btree (expense_id);


--
-- Name: idx_receipts_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_receipts_space_id ON public.receipts USING btree (space_id);


--
-- Name: idx_recipes_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recipes_created_by ON public.recipes USING btree (created_by);


--
-- Name: idx_recipes_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recipes_space_id ON public.recipes USING btree (space_id);


--
-- Name: idx_recurring_expense_patterns_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recurring_expense_patterns_space_id ON public.recurring_expense_patterns USING btree (space_id);


--
-- Name: idx_recurring_goal_templates_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recurring_goal_templates_created_by ON public.recurring_goal_templates USING btree (created_by);


--
-- Name: idx_recurring_goal_templates_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recurring_goal_templates_space_id ON public.recurring_goal_templates USING btree (space_id);


--
-- Name: idx_reminder_activities_reminder_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminder_activities_reminder_id ON public.reminder_activities USING btree (reminder_id);


--
-- Name: idx_reminder_activities_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminder_activities_user_id ON public.reminder_activities USING btree (user_id);


--
-- Name: idx_reminder_attachments_reminder_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminder_attachments_reminder_id ON public.reminder_attachments USING btree (reminder_id);


--
-- Name: idx_reminder_attachments_uploaded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminder_attachments_uploaded_by ON public.reminder_attachments USING btree (uploaded_by);


--
-- Name: idx_reminder_comments_reminder_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminder_comments_reminder_id ON public.reminder_comments USING btree (reminder_id);


--
-- Name: idx_reminder_comments_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminder_comments_user_id ON public.reminder_comments USING btree (user_id);


--
-- Name: idx_reminder_notifications_goal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminder_notifications_goal_id ON public.reminder_notifications USING btree (goal_id);


--
-- Name: idx_reminder_notifications_reminder_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminder_notifications_reminder_id ON public.reminder_notifications USING btree (reminder_id);


--
-- Name: idx_reminder_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminder_notifications_user_id ON public.reminder_notifications USING btree (user_id);


--
-- Name: idx_reminder_templates_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminder_templates_created_by ON public.reminder_templates USING btree (created_by);


--
-- Name: idx_reminder_templates_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminder_templates_space_id ON public.reminder_templates USING btree (space_id);


--
-- Name: idx_reminders_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminders_assigned_to ON public.reminders USING btree (assigned_to) WHERE (assigned_to IS NOT NULL);


--
-- Name: idx_reminders_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminders_created_by ON public.reminders USING btree (created_by);


--
-- Name: idx_reminders_linked_bill_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminders_linked_bill_id ON public.reminders USING btree (linked_bill_id);


--
-- Name: idx_reminders_snoozed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminders_snoozed_by ON public.reminders USING btree (snoozed_by);


--
-- Name: idx_reminders_space_assigned_remind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminders_space_assigned_remind ON public.reminders USING btree (space_id, assigned_to, remind_at);


--
-- Name: idx_reminders_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminders_space_id ON public.reminders USING btree (space_id);


--
-- Name: idx_report_favorites_report_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_favorites_report_id ON public.report_favorites USING btree (report_id);


--
-- Name: idx_report_favorites_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_favorites_template_id ON public.report_favorites USING btree (template_id);


--
-- Name: idx_report_templates_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_templates_created_by ON public.report_templates USING btree (created_by);


--
-- Name: idx_report_templates_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_templates_space_id ON public.report_templates USING btree (space_id);


--
-- Name: idx_reward_points_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reward_points_space_id ON public.reward_points USING btree (space_id);


--
-- Name: idx_reward_redemptions_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reward_redemptions_approved_by ON public.reward_redemptions USING btree (approved_by);


--
-- Name: idx_reward_redemptions_reward_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reward_redemptions_reward_id ON public.reward_redemptions USING btree (reward_id);


--
-- Name: idx_reward_redemptions_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reward_redemptions_space_id ON public.reward_redemptions USING btree (space_id);


--
-- Name: idx_reward_redemptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reward_redemptions_user_id ON public.reward_redemptions USING btree (user_id);


--
-- Name: idx_rewards_catalog_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rewards_catalog_created_by ON public.rewards_catalog USING btree (created_by);


--
-- Name: idx_rewards_catalog_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rewards_catalog_space_id ON public.rewards_catalog USING btree (space_id);


--
-- Name: idx_settlements_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_settlements_created_by ON public.settlements USING btree (created_by);


--
-- Name: idx_settlements_from_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_settlements_from_user_id ON public.settlements USING btree (from_user_id);


--
-- Name: idx_settlements_settlement_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_settlements_settlement_date ON public.settlements USING btree (settlement_date DESC);


--
-- Name: idx_settlements_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_settlements_space_id ON public.settlements USING btree (space_id);


--
-- Name: idx_settlements_to_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_settlements_to_user_id ON public.settlements USING btree (to_user_id);


--
-- Name: idx_shopping_calendar_events_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_calendar_events_event_id ON public.shopping_calendar_events USING btree (event_id);


--
-- Name: idx_shopping_items_added_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_items_added_by ON public.shopping_items USING btree (added_by);


--
-- Name: idx_shopping_items_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_items_assigned_to ON public.shopping_items USING btree (assigned_to);


--
-- Name: idx_shopping_items_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_items_list_id ON public.shopping_items USING btree (list_id);


--
-- Name: idx_shopping_items_purchased_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_items_purchased_by ON public.shopping_items USING btree (purchased_by);


--
-- Name: idx_shopping_items_recipe_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_items_recipe_id ON public.shopping_items USING btree (recipe_id);


--
-- Name: idx_shopping_lists_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_lists_created_by ON public.shopping_lists USING btree (created_by);


--
-- Name: idx_shopping_lists_last_modified_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_lists_last_modified_by ON public.shopping_lists USING btree (last_modified_by);


--
-- Name: idx_shopping_lists_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_lists_space_id ON public.shopping_lists USING btree (space_id);


--
-- Name: idx_shopping_reminders_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_reminders_item_id ON public.shopping_reminders USING btree (item_id);


--
-- Name: idx_shopping_reminders_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_reminders_list_id ON public.shopping_reminders USING btree (list_id);


--
-- Name: idx_shopping_reminders_reminder_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_reminders_reminder_id ON public.shopping_reminders USING btree (reminder_id);


--
-- Name: idx_shopping_tasks_source_recipe_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_tasks_source_recipe_id ON public.shopping_tasks USING btree (source_recipe_id);


--
-- Name: idx_shopping_tasks_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_tasks_task_id ON public.shopping_tasks USING btree (task_id);


--
-- Name: idx_shopping_templates_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_templates_created_by ON public.shopping_templates USING btree (created_by);


--
-- Name: idx_shopping_templates_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_templates_space_id ON public.shopping_templates USING btree (space_id);


--
-- Name: idx_site_visits_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_site_visits_created_at ON public.site_visits USING btree (created_at DESC);


--
-- Name: idx_sm_activities_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sm_activities_date ON public.sm_activities USING btree (date DESC);


--
-- Name: idx_sm_activities_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sm_activities_lead_id ON public.sm_activities USING btree (lead_id);


--
-- Name: idx_sm_admin_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sm_admin_sessions_expires_at ON public.sm_admin_sessions USING btree (expires_at);


--
-- Name: idx_sm_admin_sessions_token_hash_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sm_admin_sessions_token_hash_active ON public.sm_admin_sessions USING btree (token_hash) WHERE (revoked_at IS NULL);


--
-- Name: idx_sm_contact_inquiries_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sm_contact_inquiries_created_at ON public.sm_contact_inquiries USING btree (created_at DESC);


--
-- Name: idx_sm_content_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sm_content_created_at ON public.sm_content USING btree (created_at DESC);


--
-- Name: idx_sm_content_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sm_content_platform ON public.sm_content USING btree (platform);


--
-- Name: idx_sm_content_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sm_content_status ON public.sm_content USING btree (status);


--
-- Name: idx_sm_deals_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sm_deals_created_at ON public.sm_deals USING btree (created_at DESC);


--
-- Name: idx_sm_deals_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sm_deals_lead_id ON public.sm_deals USING btree (lead_id);


--
-- Name: idx_sm_deals_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sm_deals_stage ON public.sm_deals USING btree (stage);


--
-- Name: idx_sm_invoices_portal_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sm_invoices_portal_token_hash ON public.sm_invoices USING btree (portal_token_hash) WHERE (portal_token_hash IS NOT NULL);


--
-- Name: idx_sm_invoices_stripe_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sm_invoices_stripe_invoice_id ON public.sm_invoices USING btree (stripe_invoice_id) WHERE (stripe_invoice_id IS NOT NULL);


--
-- Name: idx_sm_leads_contact_inquiry_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sm_leads_contact_inquiry_id ON public.sm_leads USING btree (contact_inquiry_id);


--
-- Name: idx_sm_leads_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sm_leads_created_at ON public.sm_leads USING btree (created_at DESC);


--
-- Name: idx_sm_leads_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sm_leads_status ON public.sm_leads USING btree (status);


--
-- Name: idx_sm_partnership_inquiries_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sm_partnership_inquiries_created_at ON public.sm_partnership_inquiries USING btree (created_at DESC);


--
-- Name: idx_sm_partnership_inquiries_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sm_partnership_inquiries_email ON public.sm_partnership_inquiries USING btree (email);


--
-- Name: idx_sm_proposals_deal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sm_proposals_deal_id ON public.sm_proposals USING btree (deal_id);


--
-- Name: idx_sm_proposals_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sm_proposals_lead_id ON public.sm_proposals USING btree (lead_id);


--
-- Name: idx_space_invitations_invited_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_space_invitations_invited_by ON public.space_invitations USING btree (invited_by);


--
-- Name: idx_space_invitations_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_space_invitations_space_id ON public.space_invitations USING btree (space_id);


--
-- Name: idx_space_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_space_members_user_id ON public.space_members USING btree (user_id);


--
-- Name: idx_spaces_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spaces_created_by ON public.spaces USING btree (created_by);


--
-- Name: idx_spaces_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spaces_user_id ON public.spaces USING btree (user_id);


--
-- Name: idx_storage_usage_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_storage_usage_space_id ON public.storage_usage USING btree (space_id);


--
-- Name: idx_storage_warnings_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_storage_warnings_space_id ON public.storage_warnings USING btree (space_id);


--
-- Name: idx_storage_warnings_user_space; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_storage_warnings_user_space ON public.storage_warnings USING btree (user_id, space_id);


--
-- Name: idx_subscription_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_events_created_at ON public.subscription_events USING btree (created_at DESC);


--
-- Name: idx_subscription_events_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_events_user_id ON public.subscription_events USING btree (user_id);


--
-- Name: idx_subscriptions_polar_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_polar_customer ON public.subscriptions USING btree (polar_customer_id);


--
-- Name: idx_subscriptions_polar_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_polar_customer_id ON public.subscriptions USING btree (polar_customer_id) WHERE (polar_customer_id IS NOT NULL);


--
-- Name: idx_subscriptions_polar_subscription; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_polar_subscription ON public.subscriptions USING btree (polar_subscription_id);


--
-- Name: idx_subscriptions_polar_subscription_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_polar_subscription_id ON public.subscriptions USING btree (polar_subscription_id) WHERE (polar_subscription_id IS NOT NULL);


--
-- Name: idx_subtasks_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subtasks_assigned_to ON public.subtasks USING btree (assigned_to);


--
-- Name: idx_subtasks_completed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subtasks_completed_by ON public.subtasks USING btree (completed_by);


--
-- Name: idx_subtasks_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subtasks_created_by ON public.subtasks USING btree (created_by);


--
-- Name: idx_subtasks_parent_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subtasks_parent_task_id ON public.subtasks USING btree (parent_task_id);


--
-- Name: idx_tags_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tags_created_by ON public.tags USING btree (created_by);


--
-- Name: idx_task_approvals_approver_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_approvals_approver_id ON public.task_approvals USING btree (approver_id);


--
-- Name: idx_task_approvals_requested_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_approvals_requested_by ON public.task_approvals USING btree (requested_by);


--
-- Name: idx_task_approvals_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_approvals_task_id ON public.task_approvals USING btree (task_id);


--
-- Name: idx_task_attachments_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_attachments_task_id ON public.task_attachments USING btree (task_id);


--
-- Name: idx_task_attachments_uploaded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_attachments_uploaded_by ON public.task_attachments USING btree (uploaded_by);


--
-- Name: idx_task_calendar_events_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_calendar_events_event_id ON public.task_calendar_events USING btree (event_id);


--
-- Name: idx_task_categories_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_categories_created_by ON public.task_categories USING btree (created_by);


--
-- Name: idx_task_comment_reactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_comment_reactions_user_id ON public.task_comment_reactions USING btree (user_id);


--
-- Name: idx_task_comments_parent_comment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_comments_parent_comment_id ON public.task_comments USING btree (parent_comment_id);


--
-- Name: idx_task_comments_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_comments_task_id ON public.task_comments USING btree (task_id);


--
-- Name: idx_task_comments_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_comments_user_id ON public.task_comments USING btree (user_id);


--
-- Name: idx_task_dependencies_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_dependencies_created_by ON public.task_dependencies USING btree (created_by);


--
-- Name: idx_task_dependencies_depends_on_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_dependencies_depends_on_task_id ON public.task_dependencies USING btree (depends_on_task_id);


--
-- Name: idx_task_reactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_reactions_user_id ON public.task_reactions USING btree (user_id);


--
-- Name: idx_task_reminders_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_reminders_created_by ON public.task_reminders USING btree (created_by);


--
-- Name: idx_task_reminders_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_reminders_task_id ON public.task_reminders USING btree (task_id);


--
-- Name: idx_task_reminders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_reminders_user_id ON public.task_reminders USING btree (user_id);


--
-- Name: idx_task_snooze_history_snoozed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_snooze_history_snoozed_by ON public.task_snooze_history USING btree (snoozed_by);


--
-- Name: idx_task_snooze_history_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_snooze_history_task_id ON public.task_snooze_history USING btree (task_id);


--
-- Name: idx_task_tags_tag_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_tags_tag_id ON public.task_tags USING btree (tag_id);


--
-- Name: idx_task_templates_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_templates_created_by ON public.task_templates USING btree (created_by);


--
-- Name: idx_task_templates_default_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_templates_default_assigned_to ON public.task_templates USING btree (default_assigned_to);


--
-- Name: idx_task_templates_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_templates_space_id ON public.task_templates USING btree (space_id);


--
-- Name: idx_task_time_entries_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_time_entries_task_id ON public.task_time_entries USING btree (task_id);


--
-- Name: idx_task_time_entries_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_time_entries_user_id ON public.task_time_entries USING btree (user_id);


--
-- Name: idx_tasks_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_approved_by ON public.tasks USING btree (approved_by);


--
-- Name: idx_tasks_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_archived ON public.tasks USING btree (archived) WHERE (archived = true);


--
-- Name: idx_tasks_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_assigned_to ON public.tasks USING btree (assigned_to);


--
-- Name: idx_tasks_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_created_by ON public.tasks USING btree (created_by);


--
-- Name: idx_tasks_parent_recurrence_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_parent_recurrence_id ON public.tasks USING btree (parent_recurrence_id);


--
-- Name: idx_tasks_snoozed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_snoozed_by ON public.tasks USING btree (snoozed_by);


--
-- Name: idx_tasks_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_space_id ON public.tasks USING btree (space_id);


--
-- Name: idx_tasks_space_priority_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_space_priority_due ON public.tasks USING btree (space_id, priority, due_date);


--
-- Name: idx_tasks_space_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_space_status ON public.tasks USING btree (space_id, status);


--
-- Name: idx_typing_indicators_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_typing_indicators_user_id ON public.typing_indicators USING btree (user_id);


--
-- Name: idx_user_achievements_badge_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_achievements_badge_id ON public.user_achievements USING btree (badge_id);


--
-- Name: idx_user_achievements_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_achievements_space_id ON public.user_achievements USING btree (space_id);


--
-- Name: idx_user_achievements_user_space; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_achievements_user_space ON public.user_achievements USING btree (user_id, space_id);


--
-- Name: idx_user_audit_log_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_audit_log_user_id ON public.user_audit_log USING btree (user_id);


--
-- Name: idx_user_feedback_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_feedback_category ON public.user_feedback USING btree (category);


--
-- Name: idx_user_feedback_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_feedback_created_at ON public.user_feedback USING btree (created_at DESC);


--
-- Name: idx_user_feedback_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_feedback_status ON public.user_feedback USING btree (status);


--
-- Name: idx_user_feedback_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_feedback_user_id ON public.user_feedback USING btree (user_id);


--
-- Name: idx_user_notification_preferences_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notification_preferences_space_id ON public.user_notification_preferences USING btree (space_id);


--
-- Name: idx_user_presence_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_presence_space_id ON public.user_presence USING btree (space_id);


--
-- Name: idx_user_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);


--
-- Name: idx_vendors_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_created_by ON public.vendors USING btree (created_by);


--
-- Name: idx_vendors_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_space_id ON public.vendors USING btree (space_id);


--
-- Name: idx_voice_transcriptions_goal_check_in_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_transcriptions_goal_check_in_id ON public.voice_transcriptions USING btree (goal_check_in_id);


--
-- Name: idx_voice_transcriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_transcriptions_user_id ON public.voice_transcriptions USING btree (user_id);


--
-- Name: idx_voice_transcriptions_voice_note_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_transcriptions_voice_note_template_id ON public.voice_transcriptions USING btree (voice_note_template_id);


--
-- Name: idx_workspace_migrations_from_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_migrations_from_space_id ON public.workspace_migrations USING btree (from_space_id);


--
-- Name: idx_workspace_migrations_to_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_migrations_to_space_id ON public.workspace_migrations USING btree (to_space_id);


--
-- Name: idx_workspace_migrations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_migrations_user ON public.workspace_migrations USING btree (user_id);


--
-- Name: project_summary _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.project_summary WITH (security_invoker='true') AS
 SELECT p.id AS project_id,
    p.space_id,
    p.name,
    p.status,
    p.priority,
    p.estimated_budget,
    p.actual_cost,
    p.budget_variance,
    p.variance_percentage,
    p.start_date,
    p.estimated_completion_date,
    p.actual_completion_date,
    count(DISTINCT pli.id) AS line_item_count,
    count(DISTINCT e.id) AS expense_count,
    count(DISTINCT pp.id) AS photo_count,
    count(DISTINCT v.id) AS vendor_count,
    array_agg(DISTINCT v.name) FILTER (WHERE (v.name IS NOT NULL)) AS vendor_names,
    p.created_by,
    p.created_at,
    p.updated_at
   FROM ((((public.projects p
     LEFT JOIN public.project_line_items pli ON ((p.id = pli.project_id)))
     LEFT JOIN public.expenses e ON ((p.id = e.project_id)))
     LEFT JOIN public.project_photos pp ON ((p.id = pp.project_id)))
     LEFT JOIN public.vendors v ON (((pli.vendor_id = v.id) OR (e.vendor_id = v.id))))
  GROUP BY p.id;


--
-- Name: vendor_spend_summary _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.vendor_spend_summary WITH (security_invoker='true') AS
 SELECT v.id AS vendor_id,
    v.space_id,
    v.name,
    v.company_name,
    v.trade,
    v.rating,
    v.is_preferred,
    count(DISTINCT e.project_id) AS project_count,
    count(DISTINCT e.id) AS expense_count,
    COALESCE(sum(e.amount), (0)::numeric) AS total_spent,
    min(e.date) AS first_transaction_date,
    max(e.date) AS last_transaction_date
   FROM (public.vendors v
     LEFT JOIN public.expenses e ON ((v.id = e.vendor_id)))
  GROUP BY v.id;


--
-- Name: achievement_badges achievement_badges_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER achievement_badges_updated_at BEFORE UPDATE ON public.achievement_badges FOR EACH ROW EXECUTE FUNCTION public.update_achievement_badges_updated_at();


--
-- Name: achievement_progress achievement_progress_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER achievement_progress_updated_at BEFORE UPDATE ON public.achievement_progress FOR EACH ROW EXECUTE FUNCTION public.update_achievement_progress_updated_at();


--
-- Name: admin_users admin_role_sync_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER admin_role_sync_trigger BEFORE UPDATE ON public.admin_users FOR EACH ROW EXECUTE FUNCTION public.sync_admin_role();


--
-- Name: ai_conversations ai_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ai_conversations_updated_at BEFORE UPDATE ON public.ai_conversations FOR EACH ROW EXECUTE FUNCTION public.update_ai_updated_at();


--
-- Name: ai_user_settings ai_user_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ai_user_settings_updated_at BEFORE UPDATE ON public.ai_user_settings FOR EACH ROW EXECUTE FUNCTION public.update_ai_updated_at();


--
-- Name: expenses auto_create_bill_event_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER auto_create_bill_event_trigger AFTER INSERT ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.auto_create_bill_calendar_event();


--
-- Name: calendar_sync_logs calculate_sync_log_duration; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER calculate_sync_log_duration BEFORE UPDATE ON public.calendar_sync_logs FOR EACH ROW EXECUTE FUNCTION public.calculate_sync_duration();


--
-- Name: goals check_milestone_completion_on_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_milestone_completion_on_update AFTER UPDATE OF current_amount ON public.goals FOR EACH ROW WHEN ((new.current_amount IS DISTINCT FROM old.current_amount)) EXECUTE FUNCTION public.check_milestone_completion();


--
-- Name: chore_rotations chore_rotations_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER chore_rotations_updated_at_trigger BEFORE UPDATE ON public.chore_rotations FOR EACH ROW EXECUTE FUNCTION public.update_chore_rotations_updated_at();


--
-- Name: comments comments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: goal_check_ins create_check_in_activity_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER create_check_in_activity_trigger AFTER INSERT ON public.goal_check_ins FOR EACH ROW EXECUTE FUNCTION public.create_check_in_activity();


--
-- Name: goals create_goal_activity_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER create_goal_activity_trigger AFTER INSERT ON public.goals FOR EACH ROW EXECUTE FUNCTION public.create_goal_activity();


--
-- Name: goals create_goal_milestones_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER create_goal_milestones_trigger AFTER INSERT ON public.goals FOR EACH ROW EXECUTE FUNCTION public.create_financial_goal_milestones();


--
-- Name: habit_entries create_habit_activity_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER create_habit_activity_trigger AFTER INSERT OR UPDATE ON public.habit_entries FOR EACH ROW EXECUTE FUNCTION public.create_habit_activity();


--
-- Name: goal_check_ins create_milestone_activity_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER create_milestone_activity_trigger AFTER INSERT OR UPDATE ON public.goal_check_ins FOR EACH ROW EXECUTE FUNCTION public.create_milestone_activity();


--
-- Name: custom_categories custom_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER custom_categories_updated_at BEFORE UPDATE ON public.custom_categories FOR EACH ROW EXECUTE FUNCTION public.update_custom_categories_updated_at();


--
-- Name: daily_usage daily_usage_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER daily_usage_updated_at BEFORE UPDATE ON public.daily_usage FOR EACH ROW EXECUTE FUNCTION public.update_daily_usage_updated_at();


--
-- Name: expenses delete_bill_event_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_bill_event_trigger BEFORE DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.delete_bill_calendar_event();


--
-- Name: meals delete_calendar_event_for_meal_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delete_calendar_event_for_meal_trigger BEFORE DELETE ON public.meals FOR EACH ROW EXECUTE FUNCTION public.delete_calendar_event_for_meal();


--
-- Name: event_comments event_comments_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER event_comments_updated_at_trigger BEFORE UPDATE ON public.event_comments FOR EACH ROW EXECUTE FUNCTION public.update_event_comments_updated_at();


--
-- Name: event_proposal_votes event_proposal_votes_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER event_proposal_votes_updated_at_trigger BEFORE UPDATE ON public.event_proposal_votes FOR EACH ROW EXECUTE FUNCTION public.update_event_proposals_updated_at();


--
-- Name: event_proposals event_proposals_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER event_proposals_updated_at_trigger BEFORE UPDATE ON public.event_proposals FOR EACH ROW EXECUTE FUNCTION public.update_event_proposals_updated_at();


--
-- Name: goal_check_ins goal_check_ins_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER goal_check_ins_updated_at BEFORE UPDATE ON public.goal_check_ins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: goal_contributions goal_contributions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER goal_contributions_updated_at BEFORE UPDATE ON public.goal_contributions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: goal_dependencies goal_dependencies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER goal_dependencies_updated_at BEFORE UPDATE ON public.goal_dependencies FOR EACH ROW EXECUTE FUNCTION public.update_goal_dependencies_updated_at();


--
-- Name: habit_entries habit_entries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER habit_entries_updated_at BEFORE UPDATE ON public.habit_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_privacy_preferences log_privacy_preference_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER log_privacy_preference_changes AFTER UPDATE ON public.user_privacy_preferences FOR EACH ROW EXECUTE FUNCTION public.log_privacy_preference_change();


--
-- Name: reminders log_reminder_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER log_reminder_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.log_reminder_change();


--
-- Name: reminder_comments log_reminder_comment_activity_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER log_reminder_comment_activity_trigger AFTER INSERT OR DELETE OR UPDATE ON public.reminder_comments FOR EACH ROW EXECUTE FUNCTION public.log_reminder_comment_activity();


--
-- Name: meal_calendar_events meal_calendar_events_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER meal_calendar_events_updated_at_trigger BEFORE UPDATE ON public.meal_calendar_events FOR EACH ROW EXECUTE FUNCTION public.update_meal_calendar_events_updated_at();


--
-- Name: project_line_items project_line_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER project_line_items_updated_at BEFORE UPDATE ON public.project_line_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_photos project_photos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER project_photos_updated_at BEFORE UPDATE ON public.project_photos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: projects projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: projects projects_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER projects_updated_at_trigger BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_projects_updated_at();


--
-- Name: receipts receipts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER receipts_updated_at BEFORE UPDATE ON public.receipts FOR EACH ROW EXECUTE FUNCTION public.update_receipts_updated_at();


--
-- Name: recurring_goal_templates recurring_goal_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER recurring_goal_templates_updated_at BEFORE UPDATE ON public.recurring_goal_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: recurring_expense_patterns recurring_patterns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER recurring_patterns_updated_at BEFORE UPDATE ON public.recurring_expense_patterns FOR EACH ROW EXECUTE FUNCTION public.update_recurring_patterns_updated_at();


--
-- Name: budgets set_budgets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_budgets_updated_at();


--
-- Name: chores set_chores_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_chores_updated_at BEFORE UPDATE ON public.chores FOR EACH ROW EXECUTE FUNCTION public.update_chores_updated_at();


--
-- Name: daily_checkins set_daily_checkins_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_daily_checkins_updated_at BEFORE UPDATE ON public.daily_checkins FOR EACH ROW EXECUTE FUNCTION public.update_daily_checkins_updated_at();


--
-- Name: event_attachments set_event_attachments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_event_attachments_updated_at BEFORE UPDATE ON public.event_attachments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: event_comments set_event_comments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_event_comments_updated_at BEFORE UPDATE ON public.event_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: event_proposal_votes set_event_proposal_votes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_event_proposal_votes_updated_at BEFORE UPDATE ON public.event_proposal_votes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: event_proposals set_event_proposals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_event_proposals_updated_at BEFORE UPDATE ON public.event_proposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expenses set_expenses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_expenses_updated_at();


--
-- Name: in_app_notifications set_in_app_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_in_app_notifications_updated_at BEFORE UPDATE ON public.in_app_notifications FOR EACH ROW EXECUTE FUNCTION public.update_in_app_notifications_updated_at();


--
-- Name: in_app_notifications set_notification_read_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_notification_read_at_trigger BEFORE UPDATE ON public.in_app_notifications FOR EACH ROW EXECUTE FUNCTION public.set_notification_read_at();


--
-- Name: projects set_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_projects_updated_at();


--
-- Name: shopping_lists set_shopping_list_shared_at_secure; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_shopping_list_shared_at_secure BEFORE UPDATE ON public.shopping_lists FOR EACH ROW EXECUTE FUNCTION public.update_shared_at_secure();


--
-- Name: spaces set_space_creator_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_space_creator_trigger BEFORE INSERT ON public.spaces FOR EACH ROW EXECUTE FUNCTION public.set_space_creator();


--
-- Name: admin_users set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.admin_users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: calendar_events set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: conversations set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: feature_usage_daily set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.feature_usage_daily FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: founding_member_counter set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.founding_member_counter FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: generated_reports set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.generated_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: goal_activities set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.goal_activities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: goal_nudge_tracking set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.goal_nudge_tracking FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: habit_analytics set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.habit_analytics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: habit_streaks set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.habit_streaks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: late_penalties set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.late_penalties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: meals set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.meals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: nudge_settings set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.nudge_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: nudge_templates set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.nudge_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: profiles set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: recurring_goal_instances set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.recurring_goal_instances FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: reminder_comments set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.reminder_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: reminder_templates set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.reminder_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: report_templates set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.report_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: shopping_templates set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.shopping_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: space_invitations set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.space_invitations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_notification_preferences set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_notification_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_presence set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_presence FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: voice_transcriptions set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.voice_transcriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: shopping_lists shopping_list_modified; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER shopping_list_modified BEFORE UPDATE ON public.shopping_lists FOR EACH ROW EXECUTE FUNCTION public.update_shopping_list_modified();


--
-- Name: shopping_tasks shopping_tasks_auto_times_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER shopping_tasks_auto_times_trigger BEFORE INSERT ON public.shopping_tasks FOR EACH ROW WHEN ((new.is_auto_created = true)) EXECUTE FUNCTION public.set_shopping_task_auto_times();


--
-- Name: sm_content sm_content_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sm_content_updated_at_trigger BEFORE UPDATE ON public.sm_content FOR EACH ROW EXECUTE FUNCTION public.update_sm_content_updated_at();


--
-- Name: sm_deals sm_deals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sm_deals_updated_at BEFORE UPDATE ON public.sm_deals FOR EACH ROW EXECUTE FUNCTION public.sm_update_updated_at();


--
-- Name: sm_leads sm_leads_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sm_leads_updated_at BEFORE UPDATE ON public.sm_leads FOR EACH ROW EXECUTE FUNCTION public.sm_update_updated_at();


--
-- Name: sm_proposals sm_proposals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sm_proposals_updated_at BEFORE UPDATE ON public.sm_proposals FOR EACH ROW EXECUTE FUNCTION public.sm_update_updated_at();


--
-- Name: subscriptions subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_subscriptions_updated_at();


--
-- Name: subtasks subtasks_completion_check_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER subtasks_completion_check_trigger AFTER INSERT OR UPDATE OF status ON public.subtasks FOR EACH ROW WHEN ((new.status = 'completed'::text)) EXECUTE FUNCTION public.check_parent_task_completion();


--
-- Name: subtasks subtasks_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER subtasks_updated_at_trigger BEFORE UPDATE ON public.subtasks FOR EACH ROW EXECUTE FUNCTION public.update_subtasks_updated_at();


--
-- Name: meals sync_meal_to_calendar_on_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_meal_to_calendar_on_insert AFTER INSERT ON public.meals FOR EACH ROW EXECUTE FUNCTION public.sync_meal_to_calendar();


--
-- Name: meals sync_meal_to_calendar_on_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_meal_to_calendar_on_update AFTER UPDATE ON public.meals FOR EACH ROW EXECUTE FUNCTION public.sync_meal_to_calendar();


--
-- Name: tags tags_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tags_updated_at BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION public.update_custom_categories_updated_at();


--
-- Name: task_approvals task_approvals_update_status_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER task_approvals_update_status_trigger AFTER INSERT OR UPDATE OF status ON public.task_approvals FOR EACH ROW EXECUTE FUNCTION public.update_task_approval_status();


--
-- Name: task_approvals task_approvals_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER task_approvals_updated_at_trigger BEFORE UPDATE ON public.task_approvals FOR EACH ROW EXECUTE FUNCTION public.update_task_approvals_updated_at();


--
-- Name: task_attachments task_attachments_type_flags_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER task_attachments_type_flags_trigger BEFORE INSERT OR UPDATE ON public.task_attachments FOR EACH ROW EXECUTE FUNCTION public.set_attachment_type_flags();


--
-- Name: task_calendar_events task_calendar_events_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER task_calendar_events_updated_at_trigger BEFORE UPDATE ON public.task_calendar_events FOR EACH ROW EXECUTE FUNCTION public.update_task_calendar_events_updated_at();


--
-- Name: task_categories task_categories_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER task_categories_updated_at_trigger BEFORE UPDATE ON public.task_categories FOR EACH ROW EXECUTE FUNCTION public.update_task_categories_updated_at();


--
-- Name: task_comments task_comments_count_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER task_comments_count_trigger AFTER INSERT OR DELETE ON public.task_comments FOR EACH ROW EXECUTE FUNCTION public.update_task_comment_count();


--
-- Name: task_comments task_comments_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER task_comments_updated_at_trigger BEFORE UPDATE ON public.task_comments FOR EACH ROW EXECUTE FUNCTION public.update_task_comments_updated_at();


--
-- Name: task_dependencies task_dependencies_circular_check_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER task_dependencies_circular_check_trigger BEFORE INSERT OR UPDATE ON public.task_dependencies FOR EACH ROW EXECUTE FUNCTION public.check_circular_dependency();


--
-- Name: task_dependencies task_dependencies_update_status_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER task_dependencies_update_status_trigger AFTER INSERT OR DELETE ON public.task_dependencies FOR EACH ROW EXECUTE FUNCTION public.update_task_blocked_status();


--
-- Name: task_reminders task_reminders_calculate_time_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER task_reminders_calculate_time_trigger BEFORE INSERT ON public.task_reminders FOR EACH ROW WHEN ((new.remind_at IS NULL)) EXECUTE FUNCTION public.calculate_reminder_time();


--
-- Name: task_reminders task_reminders_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER task_reminders_updated_at_trigger BEFORE UPDATE ON public.task_reminders FOR EACH ROW EXECUTE FUNCTION public.update_task_reminders_updated_at();


--
-- Name: task_templates task_templates_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER task_templates_updated_at_trigger BEFORE UPDATE ON public.task_templates FOR EACH ROW EXECUTE FUNCTION public.update_task_templates_updated_at();


--
-- Name: tasks tasks_activity_log_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tasks_activity_log_trigger AFTER INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.log_task_changes();


--
-- Name: tasks tasks_auto_complete_on_approval_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tasks_auto_complete_on_approval_trigger BEFORE UPDATE OF approval_status ON public.tasks FOR EACH ROW WHEN ((new.approval_status = 'approved'::text)) EXECUTE FUNCTION public.auto_complete_on_approval();


--
-- Name: tasks tasks_completion_update_blocked_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tasks_completion_update_blocked_trigger AFTER UPDATE OF status ON public.tasks FOR EACH ROW WHEN ((new.status = 'completed'::text)) EXECUTE FUNCTION public.update_blocked_tasks_on_completion();


--
-- Name: tasks tasks_handoff_tracking_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tasks_handoff_tracking_trigger AFTER UPDATE OF assigned_to ON public.tasks FOR EACH ROW WHEN ((new.assigned_to IS DISTINCT FROM old.assigned_to)) EXECUTE FUNCTION public.record_task_handoff();


--
-- Name: tasks tasks_snooze_tracking_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tasks_snooze_tracking_trigger BEFORE UPDATE OF is_snoozed ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.record_task_snooze();


--
-- Name: tasks tasks_sort_order_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tasks_sort_order_trigger BEFORE INSERT ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.assign_task_sort_order();


--
-- Name: tasks tasks_sync_to_calendar_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tasks_sync_to_calendar_trigger AFTER INSERT ON public.tasks FOR EACH ROW WHEN ((new.due_date IS NOT NULL)) EXECUTE FUNCTION public.sync_task_to_calendar();


--
-- Name: tasks tasks_update_calendar_event_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tasks_update_calendar_event_trigger AFTER UPDATE ON public.tasks FOR EACH ROW WHEN (((new.due_date IS NOT NULL) AND ((new.due_date <> old.due_date) OR (new.title <> old.title)))) EXECUTE FUNCTION public.update_calendar_event_from_task();


--
-- Name: shopping_templates template_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER template_updated BEFORE UPDATE ON public.shopping_templates FOR EACH ROW EXECUTE FUNCTION public.update_template_timestamp();


--
-- Name: task_time_entries time_entries_duration_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER time_entries_duration_trigger BEFORE INSERT OR UPDATE ON public.task_time_entries FOR EACH ROW EXECUTE FUNCTION public.calculate_time_entry_duration();


--
-- Name: task_time_entries time_entries_update_task_duration_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER time_entries_update_task_duration_trigger AFTER INSERT OR DELETE OR UPDATE ON public.task_time_entries FOR EACH ROW EXECUTE FUNCTION public.update_task_actual_duration();


--
-- Name: task_time_entries time_entries_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER time_entries_updated_at_trigger BEFORE UPDATE ON public.task_time_entries FOR EACH ROW EXECUTE FUNCTION public.update_time_entries_updated_at();


--
-- Name: shopping_items track_item_history; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER track_item_history AFTER UPDATE ON public.shopping_items FOR EACH ROW EXECUTE FUNCTION public.track_shopping_item_history();


--
-- Name: goal_check_in_reminders trg_goal_check_in_reminders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_goal_check_in_reminders_updated_at BEFORE UPDATE ON public.goal_check_in_reminders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: goal_check_in_settings trg_goal_check_in_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_goal_check_in_settings_updated_at BEFORE UPDATE ON public.goal_check_in_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: goal_comments trg_goal_comments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_goal_comments_updated_at BEFORE UPDATE ON public.goal_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: goal_milestones trg_set_milestone_space_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_milestone_space_id BEFORE INSERT ON public.goal_milestones FOR EACH ROW EXECUTE FUNCTION public.set_milestone_space_id();


--
-- Name: goals trigger_add_goal_creator; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_add_goal_creator AFTER INSERT ON public.goals FOR EACH ROW EXECUTE FUNCTION public.add_goal_creator_as_collaborator();


--
-- Name: goals trigger_assign_goal_priority_order; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_assign_goal_priority_order BEFORE INSERT ON public.goals FOR EACH ROW EXECUTE FUNCTION public.assign_goal_priority_order();


--
-- Name: bills trigger_bills_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_bills_updated_at BEFORE UPDATE ON public.bills FOR EACH ROW EXECUTE FUNCTION public.update_bills_updated_at();


--
-- Name: message_mentions trigger_create_mention_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_mention_notification AFTER INSERT ON public.message_mentions FOR EACH ROW EXECUTE FUNCTION public.create_mention_notification();


--
-- Name: comments trigger_extract_mentions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_extract_mentions AFTER INSERT OR UPDATE OF content ON public.comments FOR EACH ROW WHEN ((new.is_deleted = false)) EXECUTE FUNCTION public.extract_mentions_from_comment();


--
-- Name: goals trigger_increment_template_usage; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_increment_template_usage AFTER INSERT ON public.goals FOR EACH ROW EXECUTE FUNCTION public.increment_template_usage();


--
-- Name: comments trigger_log_comment_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_log_comment_activity AFTER INSERT OR DELETE OR UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.log_comment_activity();


--
-- Name: mentions trigger_log_mention_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_log_mention_activity AFTER INSERT ON public.mentions FOR EACH ROW EXECUTE FUNCTION public.log_mention_activity();


--
-- Name: comment_reactions trigger_log_reaction_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_log_reaction_activity AFTER INSERT ON public.comment_reactions FOR EACH ROW EXECUTE FUNCTION public.log_reaction_activity();


--
-- Name: notifications trigger_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_notifications_updated_at();


--
-- Name: events trigger_queue_calendar_sync; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_queue_calendar_sync AFTER INSERT OR DELETE OR UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.queue_calendar_sync_on_change();


--
-- Name: reward_points trigger_reward_points_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_reward_points_updated_at BEFORE UPDATE ON public.reward_points FOR EACH ROW EXECUTE FUNCTION public.update_rewards_updated_at();


--
-- Name: reward_redemptions trigger_reward_redemptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_reward_redemptions_updated_at BEFORE UPDATE ON public.reward_redemptions FOR EACH ROW EXECUTE FUNCTION public.update_rewards_updated_at();


--
-- Name: rewards_catalog trigger_rewards_catalog_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_rewards_catalog_updated_at BEFORE UPDATE ON public.rewards_catalog FOR EACH ROW EXECUTE FUNCTION public.update_rewards_updated_at();


--
-- Name: bills trigger_set_initial_next_due_date; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_initial_next_due_date BEFORE INSERT ON public.bills FOR EACH ROW EXECUTE FUNCTION public.set_initial_next_due_date();


--
-- Name: messages trigger_set_pinned_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_pinned_at BEFORE UPDATE ON public.messages FOR EACH ROW WHEN ((old.is_pinned IS DISTINCT FROM new.is_pinned)) EXECUTE FUNCTION public.set_pinned_at();


--
-- Name: messages trigger_update_conversation_last_message; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_conversation_last_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();


--
-- Name: goal_contributions trigger_update_goal_amount_on_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_goal_amount_on_delete AFTER DELETE ON public.goal_contributions FOR EACH ROW EXECUTE FUNCTION public.update_goal_current_amount();


--
-- Name: goal_contributions trigger_update_goal_amount_on_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_goal_amount_on_insert AFTER INSERT ON public.goal_contributions FOR EACH ROW EXECUTE FUNCTION public.update_goal_current_amount();


--
-- Name: goal_contributions trigger_update_goal_amount_on_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_goal_amount_on_update AFTER UPDATE ON public.goal_contributions FOR EACH ROW EXECUTE FUNCTION public.update_goal_current_amount();


--
-- Name: important_dates trigger_update_important_dates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_important_dates_updated_at BEFORE UPDATE ON public.important_dates FOR EACH ROW EXECUTE FUNCTION public.update_important_dates_updated_at();


--
-- Name: expenses trigger_update_line_item_cost_on_expense_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_line_item_cost_on_expense_delete AFTER DELETE ON public.expenses FOR EACH ROW WHEN ((old.line_item_id IS NOT NULL)) EXECUTE FUNCTION public.update_line_item_actual_cost();


--
-- Name: expenses trigger_update_line_item_cost_on_expense_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_line_item_cost_on_expense_insert AFTER INSERT ON public.expenses FOR EACH ROW WHEN ((new.line_item_id IS NOT NULL)) EXECUTE FUNCTION public.update_line_item_actual_cost();


--
-- Name: expenses trigger_update_line_item_cost_on_expense_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_line_item_cost_on_expense_update AFTER UPDATE ON public.expenses FOR EACH ROW WHEN (((new.line_item_id IS NOT NULL) OR (old.line_item_id IS NOT NULL))) EXECUTE FUNCTION public.update_line_item_actual_cost();


--
-- Name: expenses trigger_update_project_cost_on_expense_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_project_cost_on_expense_delete AFTER DELETE ON public.expenses FOR EACH ROW WHEN ((old.project_id IS NOT NULL)) EXECUTE FUNCTION public.update_project_actual_cost();


--
-- Name: expenses trigger_update_project_cost_on_expense_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_project_cost_on_expense_insert AFTER INSERT ON public.expenses FOR EACH ROW WHEN ((new.project_id IS NOT NULL)) EXECUTE FUNCTION public.update_project_actual_cost();


--
-- Name: expenses trigger_update_project_cost_on_expense_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_project_cost_on_expense_update AFTER UPDATE ON public.expenses FOR EACH ROW WHEN (((new.project_id IS NOT NULL) OR (old.project_id IS NOT NULL))) EXECUTE FUNCTION public.update_project_actual_cost();


--
-- Name: messages trigger_update_thread_reply_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_thread_reply_count AFTER INSERT OR DELETE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_thread_reply_count();


--
-- Name: user_feedback trigger_user_feedback_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_user_feedback_updated_at BEFORE UPDATE ON public.user_feedback FOR EACH ROW EXECUTE FUNCTION public.update_user_feedback_updated_at();


--
-- Name: account_deletion_requests update_account_deletion_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_account_deletion_requests_updated_at BEFORE UPDATE ON public.account_deletion_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expenses update_bill_event_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bill_event_trigger AFTER UPDATE ON public.expenses FOR EACH ROW WHEN (((old.description IS DISTINCT FROM new.description) OR (old.amount IS DISTINCT FROM new.amount) OR (old.date IS DISTINCT FROM new.date) OR (old.recurring_frequency IS DISTINCT FROM new.recurring_frequency) OR (old.is_recurring IS DISTINCT FROM new.is_recurring) OR (old.recurring IS DISTINCT FROM new.recurring))) EXECUTE FUNCTION public.update_bill_calendar_event();


--
-- Name: budget_categories update_budget_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_budget_categories_updated_at BEFORE UPDATE ON public.budget_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: budget_templates update_budget_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_budget_templates_updated_at BEFORE UPDATE ON public.budget_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: calendar_connections update_calendar_connections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_calendar_connections_updated_at BEFORE UPDATE ON public.calendar_connections FOR EACH ROW EXECUTE FUNCTION public.update_calendar_updated_at();


--
-- Name: meals update_calendar_event_from_meal_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_calendar_event_from_meal_trigger AFTER UPDATE ON public.meals FOR EACH ROW EXECUTE FUNCTION public.update_calendar_event_from_meal();


--
-- Name: calendar_event_mappings update_calendar_event_mappings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_calendar_event_mappings_updated_at BEFORE UPDATE ON public.calendar_event_mappings FOR EACH ROW EXECUTE FUNCTION public.update_calendar_updated_at();


--
-- Name: calendar_sync_conflicts update_calendar_sync_conflicts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_calendar_sync_conflicts_updated_at BEFORE UPDATE ON public.calendar_sync_conflicts FOR EACH ROW EXECUTE FUNCTION public.update_calendar_updated_at();


--
-- Name: calendar_sync_queue update_calendar_sync_queue_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_calendar_sync_queue_updated_at BEFORE UPDATE ON public.calendar_sync_queue FOR EACH ROW EXECUTE FUNCTION public.update_calendar_updated_at();


--
-- Name: calendar_webhook_subscriptions update_calendar_webhook_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_calendar_webhook_subscriptions_updated_at BEFORE UPDATE ON public.calendar_webhook_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_calendar_updated_at();


--
-- Name: ccpa_opt_out_status update_ccpa_opt_out_status_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ccpa_opt_out_status_updated_at BEFORE UPDATE ON public.ccpa_opt_out_status FOR EACH ROW EXECUTE FUNCTION public.update_ccpa_opt_out_updated_at();


--
-- Name: chores update_chores_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_chores_updated_at BEFORE UPDATE ON public.chores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: daily_checkins update_daily_checkins_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_daily_checkins_updated_at BEFORE UPDATE ON public.daily_checkins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: data_export_requests update_data_export_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_data_export_requests_updated_at BEFORE UPDATE ON public.data_export_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: event_templates update_event_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_event_templates_updated_at BEFORE UPDATE ON public.event_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: events update_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expenses update_expenses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: goal_collaborators update_goal_collaborators_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_goal_collaborators_updated_at BEFORE UPDATE ON public.goal_collaborators FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: goals update_goal_dependencies; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_goal_dependencies AFTER UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.update_goal_dependency_status();


--
-- Name: goal_milestones update_goal_milestones_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_goal_milestones_updated_at BEFORE UPDATE ON public.goal_milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: goal_templates update_goal_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_goal_templates_updated_at BEFORE UPDATE ON public.goal_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: goals update_goals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: habit_entries update_habit_streak_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_habit_streak_trigger AFTER INSERT OR UPDATE ON public.habit_entries FOR EACH ROW EXECUTE FUNCTION public.update_habit_streak();


--
-- Name: meal_plans update_meal_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON public.meal_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: messages update_messages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notification_queue update_notification_queue_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notification_queue_updated_at BEFORE UPDATE ON public.notification_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_milestones update_project_milestones_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_milestones_updated_at BEFORE UPDATE ON public.project_milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: push_tokens update_push_tokens_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_push_tokens_updated_at BEFORE UPDATE ON public.push_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: recipes update_recipes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reminder_attachments update_reminder_attachments_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reminder_attachments_timestamp BEFORE UPDATE ON public.reminder_attachments FOR EACH ROW EXECUTE FUNCTION public.update_reminder_attachments_updated_at();


--
-- Name: reminder_comments update_reminder_comment_timestamp_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reminder_comment_timestamp_trigger BEFORE UPDATE ON public.reminder_comments FOR EACH ROW EXECUTE FUNCTION public.update_reminder_comment_timestamp();


--
-- Name: reminder_templates update_reminder_template_timestamp_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reminder_template_timestamp_trigger BEFORE UPDATE ON public.reminder_templates FOR EACH ROW EXECUTE FUNCTION public.update_reminder_template_timestamp();


--
-- Name: reminders update_reminders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shopping_items update_shopping_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shopping_items_updated_at BEFORE UPDATE ON public.shopping_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shopping_lists update_shopping_lists_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shopping_lists_updated_at BEFORE UPDATE ON public.shopping_lists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: spaces update_spaces_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON public.spaces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: task_stats update_task_stats_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_task_stats_updated_at_trigger BEFORE UPDATE ON public.task_stats FOR EACH ROW EXECUTE FUNCTION public.update_task_stats_updated_at();


--
-- Name: tasks update_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_privacy_preferences update_user_privacy_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_privacy_preferences_updated_at BEFORE UPDATE ON public.user_privacy_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vendors vendors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: account_deletion_audit_log account_deletion_audit_log_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_deletion_audit_log
    ADD CONSTRAINT account_deletion_audit_log_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES auth.users(id);


--
-- Name: account_deletion_requests account_deletion_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_deletion_requests
    ADD CONSTRAINT account_deletion_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: achievement_progress achievement_progress_badge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievement_progress
    ADD CONSTRAINT achievement_progress_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.achievement_badges(id) ON DELETE CASCADE;


--
-- Name: achievement_progress achievement_progress_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievement_progress
    ADD CONSTRAINT achievement_progress_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: achievement_progress achievement_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievement_progress
    ADD CONSTRAINT achievement_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: activity_logs activity_logs_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: admin_audit_log admin_audit_log_admin_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log
    ADD CONSTRAINT admin_audit_log_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: admin_goals admin_goals_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_goals
    ADD CONSTRAINT admin_goals_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id);


--
-- Name: admin_users admin_users_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id);


--
-- Name: admin_users admin_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ai_conversations ai_conversations_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: ai_conversations ai_conversations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ai_messages ai_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.ai_conversations(id) ON DELETE CASCADE;


--
-- Name: ai_usage_daily ai_usage_daily_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_daily
    ADD CONSTRAINT ai_usage_daily_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: ai_usage_daily ai_usage_daily_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_daily
    ADD CONSTRAINT ai_usage_daily_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ai_user_settings ai_user_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_user_settings
    ADD CONSTRAINT ai_user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: availability_blocks availability_blocks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_blocks
    ADD CONSTRAINT availability_blocks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: bills bills_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: bills bills_linked_calendar_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_linked_calendar_event_id_fkey FOREIGN KEY (linked_calendar_event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: bills bills_linked_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_linked_expense_id_fkey FOREIGN KEY (linked_expense_id) REFERENCES public.expenses(id) ON DELETE SET NULL;


--
-- Name: bills bills_linked_reminder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_linked_reminder_id_fkey FOREIGN KEY (linked_reminder_id) REFERENCES public.reminders(id) ON DELETE SET NULL;


--
-- Name: bills bills_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: budget_categories budget_categories_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_categories
    ADD CONSTRAINT budget_categories_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: budget_goal_links budget_goal_links_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_goal_links
    ADD CONSTRAINT budget_goal_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: budget_goal_links budget_goal_links_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_goal_links
    ADD CONSTRAINT budget_goal_links_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;


--
-- Name: budget_goal_links budget_goal_links_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_goal_links
    ADD CONSTRAINT budget_goal_links_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: budget_template_categories budget_template_categories_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_template_categories
    ADD CONSTRAINT budget_template_categories_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.budget_templates(id) ON DELETE CASCADE;


--
-- Name: budgets budgets_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: calendar_connections calendar_connections_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_connections
    ADD CONSTRAINT calendar_connections_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: calendar_connections calendar_connections_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_connections
    ADD CONSTRAINT calendar_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: calendar_event_mappings calendar_event_mappings_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_event_mappings
    ADD CONSTRAINT calendar_event_mappings_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.calendar_connections(id) ON DELETE CASCADE;


--
-- Name: calendar_event_mappings calendar_event_mappings_rowan_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_event_mappings
    ADD CONSTRAINT calendar_event_mappings_rowan_event_id_fkey FOREIGN KEY (rowan_event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: calendar_events calendar_events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: calendar_events calendar_events_important_date_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_important_date_id_fkey FOREIGN KEY (important_date_id) REFERENCES public.important_dates(id) ON DELETE CASCADE;


--
-- Name: calendar_events calendar_events_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: calendar_sync_conflicts calendar_sync_conflicts_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_sync_conflicts
    ADD CONSTRAINT calendar_sync_conflicts_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.calendar_connections(id) ON DELETE CASCADE;


--
-- Name: calendar_sync_conflicts calendar_sync_conflicts_mapping_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_sync_conflicts
    ADD CONSTRAINT calendar_sync_conflicts_mapping_id_fkey FOREIGN KEY (mapping_id) REFERENCES public.calendar_event_mappings(id) ON DELETE CASCADE;


--
-- Name: calendar_sync_conflicts calendar_sync_conflicts_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_sync_conflicts
    ADD CONSTRAINT calendar_sync_conflicts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id);


--
-- Name: calendar_sync_logs calendar_sync_logs_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_sync_logs
    ADD CONSTRAINT calendar_sync_logs_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.calendar_connections(id) ON DELETE CASCADE;


--
-- Name: calendar_sync_queue calendar_sync_queue_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_sync_queue
    ADD CONSTRAINT calendar_sync_queue_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.calendar_connections(id) ON DELETE CASCADE;


--
-- Name: calendar_sync_queue calendar_sync_queue_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_sync_queue
    ADD CONSTRAINT calendar_sync_queue_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: calendar_sync_queue calendar_sync_queue_mapping_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_sync_queue
    ADD CONSTRAINT calendar_sync_queue_mapping_id_fkey FOREIGN KEY (mapping_id) REFERENCES public.calendar_event_mappings(id) ON DELETE SET NULL;


--
-- Name: calendar_sync_state calendar_sync_state_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_sync_state
    ADD CONSTRAINT calendar_sync_state_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.calendar_connections(id) ON DELETE CASCADE;


--
-- Name: calendar_webhook_subscriptions calendar_webhook_subscriptions_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_webhook_subscriptions
    ADD CONSTRAINT calendar_webhook_subscriptions_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.calendar_connections(id) ON DELETE CASCADE;


--
-- Name: ccpa_opt_out_status ccpa_opt_out_status_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ccpa_opt_out_status
    ADD CONSTRAINT ccpa_opt_out_status_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: checkin_reactions checkin_reactions_checkin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkin_reactions
    ADD CONSTRAINT checkin_reactions_checkin_id_fkey FOREIGN KEY (checkin_id) REFERENCES public.daily_checkins(id) ON DELETE CASCADE;


--
-- Name: checkin_reactions checkin_reactions_from_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkin_reactions
    ADD CONSTRAINT checkin_reactions_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: chore_calendar_events chore_calendar_events_chore_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chore_calendar_events
    ADD CONSTRAINT chore_calendar_events_chore_id_fkey FOREIGN KEY (chore_id) REFERENCES public.chores(id) ON DELETE CASCADE;


--
-- Name: chore_calendar_events chore_calendar_events_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chore_calendar_events
    ADD CONSTRAINT chore_calendar_events_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: chore_rotations chore_rotations_chore_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chore_rotations
    ADD CONSTRAINT chore_rotations_chore_id_fkey FOREIGN KEY (chore_id) REFERENCES public.chores(id) ON DELETE CASCADE;


--
-- Name: chore_rotations chore_rotations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chore_rotations
    ADD CONSTRAINT chore_rotations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chore_rotations chore_rotations_last_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chore_rotations
    ADD CONSTRAINT chore_rotations_last_assigned_to_fkey FOREIGN KEY (last_assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: chores chores_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chores
    ADD CONSTRAINT chores_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: chores chores_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chores
    ADD CONSTRAINT chores_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: chores chores_rotation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chores
    ADD CONSTRAINT chores_rotation_id_fkey FOREIGN KEY (rotation_id) REFERENCES public.chore_rotations(id) ON DELETE SET NULL;


--
-- Name: chores chores_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chores
    ADD CONSTRAINT chores_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: comment_reactions comment_reactions_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_reactions
    ADD CONSTRAINT comment_reactions_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: comment_reactions comment_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_reactions
    ADD CONSTRAINT comment_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: comments comments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: comments comments_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: comments comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: comments comments_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: compliance_events_log compliance_events_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_events_log
    ADD CONSTRAINT compliance_events_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: custom_categories custom_categories_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_categories
    ADD CONSTRAINT custom_categories_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: custom_categories custom_categories_parent_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_categories
    ADD CONSTRAINT custom_categories_parent_category_id_fkey FOREIGN KEY (parent_category_id) REFERENCES public.custom_categories(id) ON DELETE SET NULL;


--
-- Name: custom_categories custom_categories_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_categories
    ADD CONSTRAINT custom_categories_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: daily_checkins daily_checkins_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_checkins
    ADD CONSTRAINT daily_checkins_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: daily_checkins daily_checkins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_checkins
    ADD CONSTRAINT daily_checkins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: daily_usage daily_usage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_usage
    ADD CONSTRAINT daily_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: data_export_requests data_export_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_export_requests
    ADD CONSTRAINT data_export_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: data_processing_agreements data_processing_agreements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_processing_agreements
    ADD CONSTRAINT data_processing_agreements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: email_change_tokens email_change_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_change_tokens
    ADD CONSTRAINT email_change_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: email_verification_tokens email_verification_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: event_attachments event_attachments_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_attachments
    ADD CONSTRAINT event_attachments_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_attachments event_attachments_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_attachments
    ADD CONSTRAINT event_attachments_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: event_attachments event_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_attachments
    ADD CONSTRAINT event_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);


--
-- Name: event_comments event_comments_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_comments
    ADD CONSTRAINT event_comments_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_comments event_comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_comments
    ADD CONSTRAINT event_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.event_comments(id) ON DELETE CASCADE;


--
-- Name: event_comments event_comments_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_comments
    ADD CONSTRAINT event_comments_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: event_comments event_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_comments
    ADD CONSTRAINT event_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: event_proposal_votes event_proposal_votes_proposal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_proposal_votes
    ADD CONSTRAINT event_proposal_votes_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.event_proposals(id) ON DELETE CASCADE;


--
-- Name: event_proposal_votes event_proposal_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_proposal_votes
    ADD CONSTRAINT event_proposal_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: event_proposals event_proposals_counter_proposal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_proposals
    ADD CONSTRAINT event_proposals_counter_proposal_id_fkey FOREIGN KEY (counter_proposal_id) REFERENCES public.event_proposals(id);


--
-- Name: event_proposals event_proposals_created_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_proposals
    ADD CONSTRAINT event_proposals_created_event_id_fkey FOREIGN KEY (created_event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: event_proposals event_proposals_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_proposals
    ADD CONSTRAINT event_proposals_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_proposals event_proposals_proposed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_proposals
    ADD CONSTRAINT event_proposals_proposed_by_fkey FOREIGN KEY (proposed_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: event_proposals event_proposals_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_proposals
    ADD CONSTRAINT event_proposals_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: event_templates event_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_templates
    ADD CONSTRAINT event_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: event_templates event_templates_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_templates
    ADD CONSTRAINT event_templates_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: events events_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: events events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: events events_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id);


--
-- Name: events events_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE;


--
-- Name: events events_important_date_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_important_date_id_fkey FOREIGN KEY (important_date_id) REFERENCES public.important_dates(id) ON DELETE CASCADE;


--
-- Name: events events_linked_bill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_linked_bill_id_fkey FOREIGN KEY (linked_bill_id) REFERENCES public.bills(id) ON DELETE CASCADE;


--
-- Name: events events_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: expense_splits expense_splits_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_splits
    ADD CONSTRAINT expense_splits_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE;


--
-- Name: expense_splits expense_splits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_splits
    ADD CONSTRAINT expense_splits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: expense_tags expense_tags_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_tags
    ADD CONSTRAINT expense_tags_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE;


--
-- Name: expense_tags expense_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_tags
    ADD CONSTRAINT expense_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_line_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_line_item_id_fkey FOREIGN KEY (line_item_id) REFERENCES public.project_line_items(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_paid_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_paid_by_fkey FOREIGN KEY (paid_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.receipts(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL;


--
-- Name: feature_events feature_events_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_events
    ADD CONSTRAINT feature_events_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE SET NULL;


--
-- Name: feature_events feature_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_events
    ADD CONSTRAINT feature_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: late_penalties fk_late_penalties_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.late_penalties
    ADD CONSTRAINT fk_late_penalties_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: generated_reports generated_reports_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_reports
    ADD CONSTRAINT generated_reports_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: generated_reports generated_reports_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_reports
    ADD CONSTRAINT generated_reports_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: generated_reports generated_reports_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_reports
    ADD CONSTRAINT generated_reports_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.report_templates(id) ON DELETE CASCADE;


--
-- Name: goal_activities goal_activities_check_in_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_activities
    ADD CONSTRAINT goal_activities_check_in_id_fkey FOREIGN KEY (check_in_id) REFERENCES public.goal_check_ins(id) ON DELETE CASCADE;


--
-- Name: goal_activities goal_activities_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_activities
    ADD CONSTRAINT goal_activities_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;


--
-- Name: goal_activities goal_activities_milestone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_activities
    ADD CONSTRAINT goal_activities_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES public.goal_milestones(id) ON DELETE CASCADE;


--
-- Name: goal_activities goal_activities_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_activities
    ADD CONSTRAINT goal_activities_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: goal_activities goal_activities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_activities
    ADD CONSTRAINT goal_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: goal_check_in_photos goal_check_in_photos_check_in_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_check_in_photos
    ADD CONSTRAINT goal_check_in_photos_check_in_id_fkey FOREIGN KEY (check_in_id) REFERENCES public.goal_check_ins(id) ON DELETE CASCADE;


--
-- Name: goal_check_in_reactions goal_check_in_reactions_check_in_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_check_in_reactions
    ADD CONSTRAINT goal_check_in_reactions_check_in_id_fkey FOREIGN KEY (check_in_id) REFERENCES public.goal_check_ins(id) ON DELETE CASCADE;


--
-- Name: goal_check_in_reactions goal_check_in_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_check_in_reactions
    ADD CONSTRAINT goal_check_in_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: goal_check_in_reminders goal_check_in_reminders_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_check_in_reminders
    ADD CONSTRAINT goal_check_in_reminders_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;


--
-- Name: goal_check_in_reminders goal_check_in_reminders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_check_in_reminders
    ADD CONSTRAINT goal_check_in_reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: goal_check_in_settings goal_check_in_settings_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_check_in_settings
    ADD CONSTRAINT goal_check_in_settings_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;


--
-- Name: goal_check_in_settings goal_check_in_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_check_in_settings
    ADD CONSTRAINT goal_check_in_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: goal_check_ins goal_check_ins_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_check_ins
    ADD CONSTRAINT goal_check_ins_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;


--
-- Name: goal_check_ins goal_check_ins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_check_ins
    ADD CONSTRAINT goal_check_ins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: goal_collaborators goal_collaborators_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_collaborators
    ADD CONSTRAINT goal_collaborators_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;


--
-- Name: goal_collaborators goal_collaborators_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_collaborators
    ADD CONSTRAINT goal_collaborators_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: goal_collaborators goal_collaborators_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_collaborators
    ADD CONSTRAINT goal_collaborators_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: goal_comment_reactions goal_comment_reactions_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_comment_reactions
    ADD CONSTRAINT goal_comment_reactions_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.goal_comments(id) ON DELETE CASCADE;


--
-- Name: goal_comment_reactions goal_comment_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_comment_reactions
    ADD CONSTRAINT goal_comment_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: goal_comments goal_comments_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_comments
    ADD CONSTRAINT goal_comments_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;


--
-- Name: goal_comments goal_comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_comments
    ADD CONSTRAINT goal_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.goal_comments(id) ON DELETE CASCADE;


--
-- Name: goal_comments goal_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_comments
    ADD CONSTRAINT goal_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: goal_contributions goal_contributions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_contributions
    ADD CONSTRAINT goal_contributions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: goal_contributions goal_contributions_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_contributions
    ADD CONSTRAINT goal_contributions_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE SET NULL;


--
-- Name: goal_contributions goal_contributions_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_contributions
    ADD CONSTRAINT goal_contributions_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;


--
-- Name: goal_contributions goal_contributions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_contributions
    ADD CONSTRAINT goal_contributions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: goal_dependencies goal_dependencies_bypassed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_dependencies
    ADD CONSTRAINT goal_dependencies_bypassed_by_fkey FOREIGN KEY (bypassed_by) REFERENCES auth.users(id);


--
-- Name: goal_dependencies goal_dependencies_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_dependencies
    ADD CONSTRAINT goal_dependencies_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: goal_dependencies goal_dependencies_depends_on_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_dependencies
    ADD CONSTRAINT goal_dependencies_depends_on_goal_id_fkey FOREIGN KEY (depends_on_goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;


--
-- Name: goal_dependencies goal_dependencies_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_dependencies
    ADD CONSTRAINT goal_dependencies_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;


--
-- Name: goal_dependencies goal_dependencies_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_dependencies
    ADD CONSTRAINT goal_dependencies_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: goal_mentions goal_mentions_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_mentions
    ADD CONSTRAINT goal_mentions_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.goal_comments(id) ON DELETE CASCADE;


--
-- Name: goal_mentions goal_mentions_mentioned_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_mentions
    ADD CONSTRAINT goal_mentions_mentioned_user_id_fkey FOREIGN KEY (mentioned_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: goal_mentions goal_mentions_mentioning_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_mentions
    ADD CONSTRAINT goal_mentions_mentioning_user_id_fkey FOREIGN KEY (mentioning_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: goal_milestones goal_milestones_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_milestones
    ADD CONSTRAINT goal_milestones_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;


--
-- Name: goal_milestones goal_milestones_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_milestones
    ADD CONSTRAINT goal_milestones_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: goal_nudge_tracking goal_nudge_tracking_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_nudge_tracking
    ADD CONSTRAINT goal_nudge_tracking_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;


--
-- Name: goal_nudge_tracking goal_nudge_tracking_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_nudge_tracking
    ADD CONSTRAINT goal_nudge_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: goal_tags goal_tags_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_tags
    ADD CONSTRAINT goal_tags_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;


--
-- Name: goal_tags goal_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_tags
    ADD CONSTRAINT goal_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: goal_templates goal_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_templates
    ADD CONSTRAINT goal_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: goal_updates goal_updates_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_updates
    ADD CONSTRAINT goal_updates_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;


--
-- Name: goal_updates goal_updates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_updates
    ADD CONSTRAINT goal_updates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: goals goals_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: goals goals_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: goals goals_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: goals goals_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.goal_templates(id) ON DELETE SET NULL;


--
-- Name: habit_entries habit_entries_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_entries
    ADD CONSTRAINT habit_entries_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.recurring_goal_templates(id) ON DELETE CASCADE;


--
-- Name: habit_entries habit_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_entries
    ADD CONSTRAINT habit_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: important_dates important_dates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.important_dates
    ADD CONSTRAINT important_dates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: important_dates important_dates_linked_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.important_dates
    ADD CONSTRAINT important_dates_linked_event_id_fkey FOREIGN KEY (linked_calendar_event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: important_dates important_dates_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.important_dates
    ADD CONSTRAINT important_dates_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: in_app_notifications in_app_notifications_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.in_app_notifications
    ADD CONSTRAINT in_app_notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: in_app_notifications in_app_notifications_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.in_app_notifications
    ADD CONSTRAINT in_app_notifications_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE SET NULL;


--
-- Name: in_app_notifications in_app_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.in_app_notifications
    ADD CONSTRAINT in_app_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: investor_summary_tokens investor_summary_tokens_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investor_summary_tokens
    ADD CONSTRAINT investor_summary_tokens_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: late_penalties late_penalties_chore_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.late_penalties
    ADD CONSTRAINT late_penalties_chore_id_fkey FOREIGN KEY (chore_id) REFERENCES public.chores(id) ON DELETE CASCADE;


--
-- Name: late_penalties late_penalties_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.late_penalties
    ADD CONSTRAINT late_penalties_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: magic_link_tokens magic_link_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_link_tokens
    ADD CONSTRAINT magic_link_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: meal_calendar_events meal_calendar_events_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_calendar_events
    ADD CONSTRAINT meal_calendar_events_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: meal_calendar_events meal_calendar_events_meal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_calendar_events
    ADD CONSTRAINT meal_calendar_events_meal_id_fkey FOREIGN KEY (meal_id) REFERENCES public.meals(id) ON DELETE CASCADE;


--
-- Name: meal_plans meal_plans_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_plans
    ADD CONSTRAINT meal_plans_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: meal_plans meal_plans_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_plans
    ADD CONSTRAINT meal_plans_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE SET NULL;


--
-- Name: meal_plans meal_plans_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_plans
    ADD CONSTRAINT meal_plans_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: meals meals_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meals
    ADD CONSTRAINT meals_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: meals meals_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meals
    ADD CONSTRAINT meals_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE SET NULL;


--
-- Name: meals meals_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meals
    ADD CONSTRAINT meals_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: mentions mentions_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentions
    ADD CONSTRAINT mentions_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: mentions mentions_mentioned_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentions
    ADD CONSTRAINT mentions_mentioned_user_id_fkey FOREIGN KEY (mentioned_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: message_attachments message_attachments_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: message_attachments message_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: message_mentions message_mentions_mentioned_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_mentions
    ADD CONSTRAINT message_mentions_mentioned_by_user_id_fkey FOREIGN KEY (mentioned_by_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: message_mentions message_mentions_mentioned_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_mentions
    ADD CONSTRAINT message_mentions_mentioned_user_id_fkey FOREIGN KEY (mentioned_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: message_mentions message_mentions_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_mentions
    ADD CONSTRAINT message_mentions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: message_mentions message_mentions_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_mentions
    ADD CONSTRAINT message_mentions_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: message_reactions message_reactions_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: message_reactions message_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: messages messages_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id);


--
-- Name: messages messages_parent_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_parent_message_id_fkey FOREIGN KEY (parent_message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: messages messages_pinned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pinned_by_fkey FOREIGN KEY (pinned_by) REFERENCES auth.users(id);


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: messages messages_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: messages messages_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: milestone_templates milestone_templates_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_templates
    ADD CONSTRAINT milestone_templates_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.goal_templates(id) ON DELETE CASCADE;


--
-- Name: monetization_logs monetization_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monetization_logs
    ADD CONSTRAINT monetization_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: notification_interactions notification_interactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_interactions
    ADD CONSTRAINT notification_interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notification_log notification_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_log
    ADD CONSTRAINT notification_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notification_queue notification_queue_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_queue
    ADD CONSTRAINT notification_queue_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE SET NULL;


--
-- Name: notification_queue notification_queue_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_queue
    ADD CONSTRAINT notification_queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: nudge_history nudge_history_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nudge_history
    ADD CONSTRAINT nudge_history_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;


--
-- Name: nudge_history nudge_history_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nudge_history
    ADD CONSTRAINT nudge_history_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: nudge_history nudge_history_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nudge_history
    ADD CONSTRAINT nudge_history_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.nudge_templates(id) ON DELETE SET NULL;


--
-- Name: nudge_history nudge_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nudge_history
    ADD CONSTRAINT nudge_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: nudge_settings nudge_settings_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nudge_settings
    ADD CONSTRAINT nudge_settings_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: nudge_settings nudge_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nudge_settings
    ADD CONSTRAINT nudge_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: partnership_balances partnership_balances_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partnership_balances
    ADD CONSTRAINT partnership_balances_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: partnership_balances partnership_balances_user1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partnership_balances
    ADD CONSTRAINT partnership_balances_user1_id_fkey FOREIGN KEY (user1_id) REFERENCES auth.users(id);


--
-- Name: partnership_balances partnership_balances_user2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partnership_balances
    ADD CONSTRAINT partnership_balances_user2_id_fkey FOREIGN KEY (user2_id) REFERENCES auth.users(id);


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: point_transactions point_transactions_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_transactions
    ADD CONSTRAINT point_transactions_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: point_transactions point_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_transactions
    ADD CONSTRAINT point_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: privacy_email_notifications privacy_email_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_email_notifications
    ADD CONSTRAINT privacy_email_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: privacy_preference_history privacy_preference_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_preference_history
    ADD CONSTRAINT privacy_preference_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: project_line_items project_line_items_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_line_items
    ADD CONSTRAINT project_line_items_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_line_items project_line_items_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_line_items
    ADD CONSTRAINT project_line_items_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL;


--
-- Name: project_milestones project_milestones_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT project_milestones_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_milestones project_milestones_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT project_milestones_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: project_photos project_photos_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_photos
    ADD CONSTRAINT project_photos_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_photos project_photos_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_photos
    ADD CONSTRAINT project_photos_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: projects projects_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: push_tokens push_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_tokens
    ADD CONSTRAINT push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: quick_action_usage quick_action_usage_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quick_action_usage
    ADD CONSTRAINT quick_action_usage_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: quick_action_usage quick_action_usage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quick_action_usage
    ADD CONSTRAINT quick_action_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: receipts receipts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: receipts receipts_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE SET NULL;


--
-- Name: receipts receipts_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: recipes recipes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: recipes recipes_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: recurring_expense_patterns recurring_expense_patterns_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_expense_patterns
    ADD CONSTRAINT recurring_expense_patterns_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: recurring_goal_templates recurring_goal_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_goal_templates
    ADD CONSTRAINT recurring_goal_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: recurring_goal_templates recurring_goal_templates_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_goal_templates
    ADD CONSTRAINT recurring_goal_templates_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: reminder_activities reminder_activities_reminder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_activities
    ADD CONSTRAINT reminder_activities_reminder_id_fkey FOREIGN KEY (reminder_id) REFERENCES public.reminders(id) ON DELETE CASCADE;


--
-- Name: reminder_activities reminder_activities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_activities
    ADD CONSTRAINT reminder_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: reminder_activities reminder_activity_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_activities
    ADD CONSTRAINT reminder_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reminder_attachments reminder_attachments_reminder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_attachments
    ADD CONSTRAINT reminder_attachments_reminder_id_fkey FOREIGN KEY (reminder_id) REFERENCES public.reminders(id) ON DELETE CASCADE;


--
-- Name: reminder_attachments reminder_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_attachments
    ADD CONSTRAINT reminder_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reminder_comments reminder_comments_reminder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_comments
    ADD CONSTRAINT reminder_comments_reminder_id_fkey FOREIGN KEY (reminder_id) REFERENCES public.reminders(id) ON DELETE CASCADE;


--
-- Name: reminder_comments reminder_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_comments
    ADD CONSTRAINT reminder_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reminder_notifications reminder_notifications_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_notifications
    ADD CONSTRAINT reminder_notifications_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;


--
-- Name: reminder_notifications reminder_notifications_reminder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_notifications
    ADD CONSTRAINT reminder_notifications_reminder_id_fkey FOREIGN KEY (reminder_id) REFERENCES public.reminders(id) ON DELETE CASCADE;


--
-- Name: reminder_notifications reminder_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_notifications
    ADD CONSTRAINT reminder_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reminder_templates reminder_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_templates
    ADD CONSTRAINT reminder_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reminder_templates reminder_templates_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_templates
    ADD CONSTRAINT reminder_templates_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: reminders reminders_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reminders reminders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reminders reminders_linked_bill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_linked_bill_id_fkey FOREIGN KEY (linked_bill_id) REFERENCES public.bills(id) ON DELETE CASCADE;


--
-- Name: reminders reminders_snoozed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_snoozed_by_fkey FOREIGN KEY (snoozed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reminders reminders_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: report_favorites report_favorites_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_favorites
    ADD CONSTRAINT report_favorites_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.generated_reports(id) ON DELETE CASCADE;


--
-- Name: report_favorites report_favorites_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_favorites
    ADD CONSTRAINT report_favorites_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.report_templates(id) ON DELETE CASCADE;


--
-- Name: report_favorites report_favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_favorites
    ADD CONSTRAINT report_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: report_templates report_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: report_templates report_templates_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: reward_points reward_points_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_points
    ADD CONSTRAINT reward_points_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: reward_points reward_points_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_points
    ADD CONSTRAINT reward_points_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reward_redemptions reward_redemptions_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_redemptions
    ADD CONSTRAINT reward_redemptions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: reward_redemptions reward_redemptions_reward_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_redemptions
    ADD CONSTRAINT reward_redemptions_reward_id_fkey FOREIGN KEY (reward_id) REFERENCES public.rewards_catalog(id) ON DELETE CASCADE;


--
-- Name: reward_redemptions reward_redemptions_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_redemptions
    ADD CONSTRAINT reward_redemptions_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: reward_redemptions reward_redemptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_redemptions
    ADD CONSTRAINT reward_redemptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: rewards_catalog rewards_catalog_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rewards_catalog
    ADD CONSTRAINT rewards_catalog_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: rewards_catalog rewards_catalog_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rewards_catalog
    ADD CONSTRAINT rewards_catalog_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: settlements settlements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: settlements settlements_from_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: settlements settlements_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: settlements settlements_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: shopping_calendar_events shopping_calendar_events_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_calendar_events
    ADD CONSTRAINT shopping_calendar_events_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: shopping_calendar_events shopping_calendar_events_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_calendar_events
    ADD CONSTRAINT shopping_calendar_events_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.shopping_lists(id) ON DELETE CASCADE;


--
-- Name: shopping_items shopping_items_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_items
    ADD CONSTRAINT shopping_items_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: shopping_items shopping_items_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_items
    ADD CONSTRAINT shopping_items_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: shopping_items shopping_items_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_items
    ADD CONSTRAINT shopping_items_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.shopping_lists(id) ON DELETE CASCADE;


--
-- Name: shopping_items shopping_items_purchased_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_items
    ADD CONSTRAINT shopping_items_purchased_by_fkey FOREIGN KEY (purchased_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: shopping_items shopping_items_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_items
    ADD CONSTRAINT shopping_items_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE SET NULL;


--
-- Name: shopping_lists shopping_lists_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_lists
    ADD CONSTRAINT shopping_lists_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: shopping_lists shopping_lists_last_modified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_lists
    ADD CONSTRAINT shopping_lists_last_modified_by_fkey FOREIGN KEY (last_modified_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: shopping_lists shopping_lists_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_lists
    ADD CONSTRAINT shopping_lists_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: shopping_reminders shopping_reminders_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_reminders
    ADD CONSTRAINT shopping_reminders_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.shopping_items(id) ON DELETE CASCADE;


--
-- Name: shopping_reminders shopping_reminders_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_reminders
    ADD CONSTRAINT shopping_reminders_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.shopping_lists(id) ON DELETE CASCADE;


--
-- Name: shopping_reminders shopping_reminders_reminder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_reminders
    ADD CONSTRAINT shopping_reminders_reminder_id_fkey FOREIGN KEY (reminder_id) REFERENCES public.reminders(id) ON DELETE CASCADE;


--
-- Name: shopping_tasks shopping_tasks_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_tasks
    ADD CONSTRAINT shopping_tasks_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.shopping_lists(id) ON DELETE CASCADE;


--
-- Name: shopping_tasks shopping_tasks_source_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_tasks
    ADD CONSTRAINT shopping_tasks_source_recipe_id_fkey FOREIGN KEY (source_recipe_id) REFERENCES public.recipes(id) ON DELETE SET NULL;


--
-- Name: shopping_tasks shopping_tasks_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_tasks
    ADD CONSTRAINT shopping_tasks_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: shopping_templates shopping_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_templates
    ADD CONSTRAINT shopping_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: shopping_templates shopping_templates_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_templates
    ADD CONSTRAINT shopping_templates_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: sm_activities sm_activities_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sm_activities
    ADD CONSTRAINT sm_activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.sm_leads(id) ON DELETE CASCADE;


--
-- Name: sm_deals sm_deals_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sm_deals
    ADD CONSTRAINT sm_deals_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.sm_invoices(id) ON DELETE SET NULL;


--
-- Name: sm_deals sm_deals_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sm_deals
    ADD CONSTRAINT sm_deals_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.sm_leads(id) ON DELETE CASCADE;


--
-- Name: sm_invoice_items sm_invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sm_invoice_items
    ADD CONSTRAINT sm_invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.sm_invoices(id) ON DELETE CASCADE;


--
-- Name: sm_invoice_items sm_invoice_items_service_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sm_invoice_items
    ADD CONSTRAINT sm_invoice_items_service_template_id_fkey FOREIGN KEY (service_template_id) REFERENCES public.sm_service_templates(id);


--
-- Name: sm_invoices sm_invoices_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sm_invoices
    ADD CONSTRAINT sm_invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.sm_clients(id);


--
-- Name: sm_leads sm_leads_contact_inquiry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sm_leads
    ADD CONSTRAINT sm_leads_contact_inquiry_id_fkey FOREIGN KEY (contact_inquiry_id) REFERENCES public.sm_contact_inquiries(id) ON DELETE SET NULL;


--
-- Name: sm_proposals sm_proposals_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sm_proposals
    ADD CONSTRAINT sm_proposals_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.sm_deals(id) ON DELETE CASCADE;


--
-- Name: sm_proposals sm_proposals_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sm_proposals
    ADD CONSTRAINT sm_proposals_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.sm_leads(id) ON DELETE CASCADE;


--
-- Name: space_invitations space_invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.space_invitations
    ADD CONSTRAINT space_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: space_invitations space_invitations_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.space_invitations
    ADD CONSTRAINT space_invitations_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: space_members space_members_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.space_members
    ADD CONSTRAINT space_members_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: space_members space_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.space_members
    ADD CONSTRAINT space_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: spaces spaces_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spaces
    ADD CONSTRAINT spaces_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: spaces spaces_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spaces
    ADD CONSTRAINT spaces_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: storage_usage storage_usage_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_usage
    ADD CONSTRAINT storage_usage_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: storage_warnings storage_warnings_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_warnings
    ADD CONSTRAINT storage_warnings_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: storage_warnings storage_warnings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_warnings
    ADD CONSTRAINT storage_warnings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: subscription_events subscription_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_events
    ADD CONSTRAINT subscription_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: subtasks subtasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subtasks
    ADD CONSTRAINT subtasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: subtasks subtasks_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subtasks
    ADD CONSTRAINT subtasks_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: subtasks subtasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subtasks
    ADD CONSTRAINT subtasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: subtasks subtasks_parent_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subtasks
    ADD CONSTRAINT subtasks_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: tags tags_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tags tags_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: task_approvals task_approvals_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_approvals
    ADD CONSTRAINT task_approvals_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_approvals task_approvals_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_approvals
    ADD CONSTRAINT task_approvals_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_approvals task_approvals_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_approvals
    ADD CONSTRAINT task_approvals_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_attachments task_attachments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_attachments task_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_calendar_events task_calendar_events_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_calendar_events
    ADD CONSTRAINT task_calendar_events_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: task_calendar_events task_calendar_events_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_calendar_events
    ADD CONSTRAINT task_calendar_events_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_categories task_categories_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_categories
    ADD CONSTRAINT task_categories_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_categories task_categories_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_categories
    ADD CONSTRAINT task_categories_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: task_comment_reactions task_comment_reactions_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comment_reactions
    ADD CONSTRAINT task_comment_reactions_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.task_comments(id) ON DELETE CASCADE;


--
-- Name: task_comment_reactions task_comment_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comment_reactions
    ADD CONSTRAINT task_comment_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_comments task_comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.task_comments(id) ON DELETE CASCADE;


--
-- Name: task_comments task_comments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_comments task_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_dependencies task_dependencies_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_dependencies
    ADD CONSTRAINT task_dependencies_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_dependencies task_dependencies_depends_on_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_dependencies
    ADD CONSTRAINT task_dependencies_depends_on_task_id_fkey FOREIGN KEY (depends_on_task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_dependencies task_dependencies_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_dependencies
    ADD CONSTRAINT task_dependencies_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_reactions task_reactions_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_reactions
    ADD CONSTRAINT task_reactions_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_reactions task_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_reactions
    ADD CONSTRAINT task_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_reminders task_reminders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_reminders
    ADD CONSTRAINT task_reminders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_reminders task_reminders_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_reminders
    ADD CONSTRAINT task_reminders_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_reminders task_reminders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_reminders
    ADD CONSTRAINT task_reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_snooze_history task_snooze_history_snoozed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_snooze_history
    ADD CONSTRAINT task_snooze_history_snoozed_by_fkey FOREIGN KEY (snoozed_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_snooze_history task_snooze_history_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_snooze_history
    ADD CONSTRAINT task_snooze_history_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_stats task_stats_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_stats
    ADD CONSTRAINT task_stats_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: task_tags task_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_tags
    ADD CONSTRAINT task_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: task_tags task_tags_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_tags
    ADD CONSTRAINT task_tags_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_templates task_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_templates
    ADD CONSTRAINT task_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_templates task_templates_default_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_templates
    ADD CONSTRAINT task_templates_default_assigned_to_fkey FOREIGN KEY (default_assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: task_templates task_templates_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_templates
    ADD CONSTRAINT task_templates_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: task_time_entries task_time_entries_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_time_entries
    ADD CONSTRAINT task_time_entries_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_time_entries task_time_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_time_entries
    ADD CONSTRAINT task_time_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_parent_recurrence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_parent_recurrence_id_fkey FOREIGN KEY (parent_recurrence_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_snoozed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_snoozed_by_fkey FOREIGN KEY (snoozed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: typing_indicators typing_indicators_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_indicators
    ADD CONSTRAINT typing_indicators_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: typing_indicators typing_indicators_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_indicators
    ADD CONSTRAINT typing_indicators_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_badge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.achievement_badges(id) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_audit_log user_audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_audit_log
    ADD CONSTRAINT user_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_feedback user_feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_feedback
    ADD CONSTRAINT user_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_notification_preferences user_notification_preferences_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: user_notification_preferences user_notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_presence user_presence_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_presence
    ADD CONSTRAINT user_presence_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: user_presence user_presence_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_presence
    ADD CONSTRAINT user_presence_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_privacy_preferences user_privacy_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_privacy_preferences
    ADD CONSTRAINT user_privacy_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: vendors vendors_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: vendors vendors_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: voice_transcriptions voice_transcriptions_goal_check_in_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_transcriptions
    ADD CONSTRAINT voice_transcriptions_goal_check_in_id_fkey FOREIGN KEY (goal_check_in_id) REFERENCES public.goal_check_ins(id) ON DELETE CASCADE;


--
-- Name: voice_transcriptions voice_transcriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_transcriptions
    ADD CONSTRAINT voice_transcriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: workspace_migrations workspace_migrations_from_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_migrations
    ADD CONSTRAINT workspace_migrations_from_space_id_fkey FOREIGN KEY (from_space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: workspace_migrations workspace_migrations_to_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_migrations
    ADD CONSTRAINT workspace_migrations_to_space_id_fkey FOREIGN KEY (to_space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: workspace_migrations workspace_migrations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_migrations
    ADD CONSTRAINT workspace_migrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reminder_activities Activity logs are immutable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Activity logs are immutable" ON public.reminder_activities FOR UPDATE USING (false);


--
-- Name: reminder_activities Activity logs cannot be deleted; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Activity logs cannot be deleted" ON public.reminder_activities FOR DELETE USING (false);


--
-- Name: feature_usage_daily Admin only access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin only access" ON public.feature_usage_daily USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (admin_users.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (admin_users.is_active = true)))));


--
-- Name: launch_notifications Admin only access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin only access" ON public.launch_notifications USING (false);


--
-- Name: feature_events Admin read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin read access" ON public.feature_events FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (admin_users.is_active = true)))));


--
-- Name: investor_summary_tokens Admin users can manage tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin users can manage tokens" ON public.investor_summary_tokens USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: admin_audit_log Admins can read audit log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read audit log" ON public.admin_audit_log FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (admin_users.is_active = true)))));


--
-- Name: late_penalties Admins can update penalties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update penalties" ON public.late_penalties FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.space_members
  WHERE ((space_members.space_id = late_penalties.space_id) AND (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (space_members.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));


--
-- Name: monetization_logs Admins can view all monetization logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all monetization logs" ON public.monetization_logs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.email = (( SELECT users.email
           FROM auth.users
          WHERE (users.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))::text) AND (admin_users.is_active = true)))));


--
-- Name: sm_contact_inquiries Allow service role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow service role full access" ON public.sm_contact_inquiries USING ((( SELECT auth.role() AS role) = 'service_role'::text)) WITH CHECK ((( SELECT auth.role() AS role) = 'service_role'::text));


--
-- Name: sm_partnership_inquiries Allow service role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow service role full access" ON public.sm_partnership_inquiries USING ((( SELECT auth.role() AS role) = 'service_role'::text)) WITH CHECK ((( SELECT auth.role() AS role) = 'service_role'::text));


--
-- Name: mentions Anyone can create mentions when commenting; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create mentions when commenting" ON public.mentions FOR INSERT WITH CHECK ((comment_id IN ( SELECT comments.id
   FROM public.comments
  WHERE (comments.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: founding_member_counter Anyone can read founding member counter; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read founding member counter" ON public.founding_member_counter FOR SELECT TO anon, authenticated USING (true);


--
-- Name: achievement_badges Anyone can view active badges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active badges" ON public.achievement_badges FOR SELECT USING ((is_active = true));


--
-- Name: nudge_templates Anyone can view active nudge templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active nudge templates" ON public.nudge_templates FOR SELECT USING ((is_active = true));


--
-- Name: budget_templates Anyone can view budget templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view budget templates" ON public.budget_templates FOR SELECT USING ((is_active = true));


--
-- Name: budget_template_categories Anyone can view template categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view template categories" ON public.budget_template_categories FOR SELECT USING ((template_id IN ( SELECT budget_templates.id
   FROM public.budget_templates
  WHERE (budget_templates.is_active = true))));


--
-- Name: admin_audit_log Authenticated can insert audit log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can insert audit log" ON public.admin_audit_log FOR INSERT TO authenticated WITH CHECK (((admin_user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (admin_users.is_active = true))))));


--
-- Name: monetization_logs Authenticated can insert logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can insert logs" ON public.monetization_logs FOR INSERT TO authenticated WITH CHECK ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));


--
-- Name: spaces Authenticated users can create spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create spaces" ON public.spaces FOR INSERT WITH CHECK ((( SELECT ( SELECT auth.uid() AS uid) AS uid) IS NOT NULL));


--
-- Name: in_app_notifications Authenticated users can receive notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can receive notifications" ON public.in_app_notifications FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: goal_collaborators Goal creators can add collaborators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Goal creators can add collaborators" ON public.goal_collaborators FOR INSERT WITH CHECK ((goal_id IN ( SELECT goals.id
   FROM public.goals
  WHERE (goals.created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: goal_collaborators Goal creators can update collaborators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Goal creators can update collaborators" ON public.goal_collaborators FOR UPDATE USING ((goal_id IN ( SELECT goals.id
   FROM public.goals
  WHERE (goals.created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: goal_templates Public templates are viewable by all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public templates are viewable by all" ON public.goal_templates FOR SELECT USING (((is_public = true) OR (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: nudge_history Service can insert nudge history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can insert nudge history" ON public.nudge_history FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: user_privacy_preferences Service can insert privacy preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can insert privacy preferences" ON public.user_privacy_preferences FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: aws_course_memory Service role access to aws_course_memory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role access to aws_course_memory" ON public.aws_course_memory TO service_role USING (true) WITH CHECK (true);


--
-- Name: email_change_tokens Service role access to email_change_tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role access to email_change_tokens" ON public.email_change_tokens TO service_role USING (true) WITH CHECK (true);


--
-- Name: email_verification_tokens Service role access to email_verification_tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role access to email_verification_tokens" ON public.email_verification_tokens TO service_role USING (true) WITH CHECK (true);


--
-- Name: sm_content Service role access to sm_content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role access to sm_content" ON public.sm_content TO service_role USING (true) WITH CHECK (true);


--
-- Name: ccpa_audit_log Service role and users can view CCPA logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role and users can view CCPA logs" ON public.ccpa_audit_log FOR SELECT USING (((CURRENT_USER = 'service_role'::name) OR (user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: ccpa_audit_log Service role can delete CCPA logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can delete CCPA logs" ON public.ccpa_audit_log FOR DELETE USING ((CURRENT_USER = 'service_role'::name));


--
-- Name: ccpa_audit_log Service role can insert CCPA logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert CCPA logs" ON public.ccpa_audit_log FOR INSERT WITH CHECK ((CURRENT_USER = 'service_role'::name));


--
-- Name: admin_audit_log Service role can insert audit log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert audit log" ON public.admin_audit_log FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: late_penalties Service role can insert penalties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert penalties" ON public.late_penalties FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: account_deletion_audit_log Service role can manage audit log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage audit log" ON public.account_deletion_audit_log TO service_role USING (true) WITH CHECK (true);


--
-- Name: daily_usage Service role can manage daily usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage daily usage" ON public.daily_usage TO service_role USING (true) WITH CHECK (true);


--
-- Name: deleted_accounts Service role can manage deleted accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage deleted accounts" ON public.deleted_accounts TO service_role USING (true) WITH CHECK (true);


--
-- Name: founding_member_counter Service role can manage founding member counter; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage founding member counter" ON public.founding_member_counter TO service_role USING (true) WITH CHECK (true);


--
-- Name: subscription_events Service role can manage subscription events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage subscription events" ON public.subscription_events TO service_role USING (true) WITH CHECK (true);


--
-- Name: subscriptions Service role can manage subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions TO service_role USING (true) WITH CHECK (true);


--
-- Name: ccpa_audit_log Service role can update CCPA logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can update CCPA logs" ON public.ccpa_audit_log FOR UPDATE USING ((CURRENT_USER = 'service_role'::name));


--
-- Name: sm_clients Service role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access" ON public.sm_clients USING ((( SELECT auth.role() AS role) = 'service_role'::text)) WITH CHECK ((( SELECT auth.role() AS role) = 'service_role'::text));


--
-- Name: sm_invoice_items Service role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access" ON public.sm_invoice_items USING ((( SELECT auth.role() AS role) = 'service_role'::text)) WITH CHECK ((( SELECT auth.role() AS role) = 'service_role'::text));


--
-- Name: sm_invoices Service role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access" ON public.sm_invoices USING ((( SELECT auth.role() AS role) = 'service_role'::text)) WITH CHECK ((( SELECT auth.role() AS role) = 'service_role'::text));


--
-- Name: sm_service_templates Service role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access" ON public.sm_service_templates USING ((( SELECT auth.role() AS role) = 'service_role'::text)) WITH CHECK ((( SELECT auth.role() AS role) = 'service_role'::text));


--
-- Name: user_feedback Service role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access" ON public.user_feedback AS RESTRICTIVE USING ((( SELECT auth.role() AS role) = 'service_role'::text)) WITH CHECK ((( SELECT auth.role() AS role) = 'service_role'::text));


--
-- Name: calendar_connections Service role full access calendar_connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access calendar_connections" ON public.calendar_connections TO service_role USING (true) WITH CHECK (true);


--
-- Name: calendar_event_mappings Service role full access event_mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access event_mappings" ON public.calendar_event_mappings TO service_role USING (true) WITH CHECK (true);


--
-- Name: calendar_sync_conflicts Service role full access sync_conflicts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access sync_conflicts" ON public.calendar_sync_conflicts TO service_role USING (true) WITH CHECK (true);


--
-- Name: calendar_sync_logs Service role full access sync_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access sync_logs" ON public.calendar_sync_logs TO service_role USING (true) WITH CHECK (true);


--
-- Name: calendar_sync_queue Service role full access sync_queue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access sync_queue" ON public.calendar_sync_queue TO service_role USING (true) WITH CHECK (true);


--
-- Name: calendar_webhook_subscriptions Service role full access webhook_subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access webhook_subscriptions" ON public.calendar_webhook_subscriptions TO service_role USING (true) WITH CHECK (true);


--
-- Name: site_visits Service role only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role only" ON public.site_visits USING ((( SELECT auth.role() AS role) = 'service_role'::text));


--
-- Name: sm_activities Service role only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role only" ON public.sm_activities USING ((( SELECT auth.role() AS role) = 'service_role'::text));


--
-- Name: sm_deals Service role only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role only" ON public.sm_deals USING ((( SELECT auth.role() AS role) = 'service_role'::text));


--
-- Name: sm_leads Service role only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role only" ON public.sm_leads USING ((( SELECT auth.role() AS role) = 'service_role'::text));


--
-- Name: sm_proposals Service role only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role only" ON public.sm_proposals USING ((( SELECT auth.role() AS role) = 'service_role'::text));


--
-- Name: project_milestones Space members can access project milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Space members can access project milestones" ON public.project_milestones USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: reminder_attachments Space members can create attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Space members can create attachments" ON public.reminder_attachments FOR INSERT WITH CHECK (((uploaded_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (reminder_id IN ( SELECT reminders.id
   FROM public.reminders
  WHERE (reminders.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))));


--
-- Name: bills Space members can create bills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Space members can create bills" ON public.bills FOR INSERT WITH CHECK (((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) AND (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: recurring_goal_templates Space members can create templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Space members can create templates" ON public.recurring_goal_templates FOR INSERT WITH CHECK (((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) AND (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: bills Space members can delete bills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Space members can delete bills" ON public.bills FOR DELETE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: point_transactions Space members can insert transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Space members can insert transactions" ON public.point_transactions FOR INSERT WITH CHECK ((space_id IN ( SELECT public.get_user_space_ids(( SELECT ( SELECT auth.uid() AS uid) AS uid)) AS get_user_space_ids)));


--
-- Name: rewards_catalog Space members can manage rewards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Space members can manage rewards" ON public.rewards_catalog USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: bills Space members can update bills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Space members can update bills" ON public.bills FOR UPDATE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: reward_redemptions Space members can update redemptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Space members can update redemptions" ON public.reward_redemptions FOR UPDATE USING ((space_id IN ( SELECT public.get_user_space_ids(( SELECT ( SELECT auth.uid() AS uid) AS uid)) AS get_user_space_ids)));


--
-- Name: reminder_attachments Space members can view attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Space members can view attachments" ON public.reminder_attachments FOR SELECT USING ((reminder_id IN ( SELECT reminders.id
   FROM public.reminders
  WHERE (reminders.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: bills Space members can view bills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Space members can view bills" ON public.bills FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: recurring_goal_templates Space members can view templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Space members can view templates" ON public.recurring_goal_templates FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: reminder_notifications System can create notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can create notifications" ON public.reminder_notifications FOR INSERT WITH CHECK ((user_id IS NOT NULL));


--
-- Name: recurring_goal_templates Template owners can delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Template owners can delete" ON public.recurring_goal_templates FOR DELETE USING (((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) AND (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: recurring_goal_templates Template owners can update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Template owners can update" ON public.recurring_goal_templates FOR UPDATE USING (((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) AND (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: goal_contributions Users can add goal contributions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add goal contributions" ON public.goal_contributions FOR INSERT WITH CHECK (((goal_id IN ( SELECT g.id
   FROM public.goals g
  WHERE ((g.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) AND ((g.visibility = 'private'::text) OR ((g.visibility = 'shared'::text) AND ((g.created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (g.id IN ( SELECT goal_collaborators.goal_id
           FROM public.goal_collaborators
          WHERE ((goal_collaborators.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (goal_collaborators.role = ANY (ARRAY['contributor'::text, 'owner'::text]))))))))))) AND (user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: comment_reactions Users can add reactions in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add reactions in their spaces" ON public.comment_reactions FOR INSERT WITH CHECK (((comment_id IN ( SELECT comments.id
   FROM public.comments
  WHERE (comments.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))) AND (user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: message_reactions Users can add reactions to messages in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add reactions to messages in their space" ON public.message_reactions FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM ((public.messages
     JOIN public.conversations ON ((conversations.id = messages.conversation_id)))
     JOIN public.space_members ON ((space_members.space_id = conversations.space_id)))
  WHERE ((messages.id = message_reactions.message_id) AND (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))) AND (user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: expense_tags Users can add tags to expenses in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add tags to expenses in their spaces" ON public.expense_tags FOR INSERT WITH CHECK ((expense_id IN ( SELECT expenses.id
   FROM (public.expenses
     JOIN public.space_members ON ((expenses.space_id = space_members.space_id)))
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: goal_tags Users can add tags to goals in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add tags to goals in their spaces" ON public.goal_tags FOR INSERT WITH CHECK ((goal_id IN ( SELECT goals.id
   FROM (public.goals
     JOIN public.space_members ON ((goals.space_id = space_members.space_id)))
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: task_tags Users can add tags to tasks in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add tags to tasks in their spaces" ON public.task_tags FOR INSERT WITH CHECK ((task_id IN ( SELECT tasks.id
   FROM (public.tasks
     JOIN public.space_members ON ((tasks.space_id = space_members.space_id)))
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: user_achievements Users can create achievements in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create achievements in their spaces" ON public.user_achievements FOR INSERT WITH CHECK (((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));


--
-- Name: activity_logs Users can create activity logs in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create activity logs in their spaces" ON public.activity_logs FOR INSERT WITH CHECK ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: budgets Users can create budgets in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create budgets in their space" ON public.budgets FOR INSERT WITH CHECK ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: calendar_connections Users can create calendar connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create calendar connections" ON public.calendar_connections FOR INSERT WITH CHECK (((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) AND (user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: chores Users can create chores in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create chores in their space" ON public.chores FOR INSERT WITH CHECK ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: event_comments Users can create comments in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create comments in their space" ON public.event_comments FOR INSERT WITH CHECK (((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) AND (user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: comments Users can create comments in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create comments in their spaces" ON public.comments FOR INSERT WITH CHECK (((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) AND (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: reminder_comments Users can create comments in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create comments in their spaces" ON public.reminder_comments FOR INSERT WITH CHECK (((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (reminder_id IN ( SELECT r.id
   FROM (public.reminders r
     JOIN public.space_members sm ON ((sm.space_id = r.space_id)))
  WHERE (sm.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));


--
-- Name: conversations Users can create conversations in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create conversations in their space" ON public.conversations FOR INSERT WITH CHECK ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: goal_dependencies Users can create dependencies in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create dependencies in their spaces" ON public.goal_dependencies FOR INSERT WITH CHECK ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: expenses Users can create expenses in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create expenses in their space" ON public.expenses FOR INSERT WITH CHECK ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: goal_activities Users can create goal activities in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create goal activities in their spaces" ON public.goal_activities FOR INSERT WITH CHECK (((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) AND (user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: goals Users can create goals in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create goals in their space" ON public.goals FOR INSERT WITH CHECK ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: meals Users can create meals in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create meals in their space" ON public.meals FOR INSERT WITH CHECK ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: message_mentions Users can create mentions in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create mentions in their spaces" ON public.message_mentions FOR INSERT WITH CHECK ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: messages Users can create messages in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create messages in their space" ON public.messages FOR INSERT WITH CHECK (((conversation_id IN ( SELECT conversations.id
   FROM public.conversations
  WHERE (conversations.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))) AND (sender_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: goal_milestones Users can create milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create milestones" ON public.goal_milestones FOR INSERT WITH CHECK ((goal_id IN ( SELECT goals.id
   FROM public.goals
  WHERE ((goals.created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (goals.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))));


--
-- Name: account_deletion_requests Users can create own deletion requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own deletion requests" ON public.account_deletion_requests FOR INSERT WITH CHECK ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));


--
-- Name: data_export_requests Users can create own export requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own export requests" ON public.data_export_requests FOR INSERT WITH CHECK ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));


--
-- Name: projects Users can create projects in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create projects in their spaces" ON public.projects FOR INSERT WITH CHECK (((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) AND (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: event_proposals Users can create proposals in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create proposals in their space" ON public.event_proposals FOR INSERT WITH CHECK (((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) AND (proposed_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: receipts Users can create receipts in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create receipts in their spaces" ON public.receipts FOR INSERT WITH CHECK (((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) AND (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: recipes Users can create recipes in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create recipes in their space" ON public.recipes FOR INSERT WITH CHECK ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: reward_redemptions Users can create redemptions in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create redemptions in their spaces" ON public.reward_redemptions FOR INSERT WITH CHECK (((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (space_id IN ( SELECT public.get_user_space_ids(( SELECT ( SELECT auth.uid() AS uid) AS uid)) AS get_user_space_ids))));


--
-- Name: generated_reports Users can create reports for their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create reports for their spaces" ON public.generated_reports FOR INSERT WITH CHECK (((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) AND (generated_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: task_stats Users can create task_stats in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create task_stats in their space" ON public.task_stats FOR INSERT WITH CHECK ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: report_templates Users can create templates for their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create templates for their spaces" ON public.report_templates FOR INSERT WITH CHECK (((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) AND (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: event_templates Users can create templates in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create templates in their space" ON public.event_templates FOR INSERT WITH CHECK (((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) AND (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: shopping_templates Users can create templates in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create templates in their space" ON public.shopping_templates FOR INSERT WITH CHECK ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: reminder_templates Users can create templates in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create templates in their spaces" ON public.reminder_templates FOR INSERT WITH CHECK (((created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (is_system_template = false) AND (space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));


--
-- Name: workspace_migrations Users can create their migrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their migrations" ON public.workspace_migrations FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: ai_conversations Users can create their own AI conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own AI conversations" ON public.ai_conversations FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: ai_user_settings Users can create their own AI settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own AI settings" ON public.ai_user_settings FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: availability_blocks Users can create their own availability blocks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own availability blocks" ON public.availability_blocks FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: daily_checkins Users can create their own check-ins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own check-ins" ON public.daily_checkins FOR INSERT WITH CHECK (((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));


--
-- Name: nudge_settings Users can create their own nudge settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own nudge settings" ON public.nudge_settings FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: goal_templates Users can create their own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own templates" ON public.goal_templates FOR INSERT WITH CHECK ((created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: budget_categories Users can delete budget categories in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete budget categories in their spaces" ON public.budget_categories FOR DELETE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: budgets Users can delete budgets in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete budgets in their space" ON public.budgets FOR DELETE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: chores Users can delete chores in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete chores in their space" ON public.chores FOR DELETE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: goal_collaborators Users can delete collaborators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete collaborators" ON public.goal_collaborators FOR DELETE USING (((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (goal_id IN ( SELECT goals.id
   FROM public.goals
  WHERE (goals.created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));


--
-- Name: conversations Users can delete conversations in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete conversations in their space" ON public.conversations FOR DELETE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: custom_categories Users can delete custom categories in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete custom categories in their spaces" ON public.custom_categories FOR DELETE TO authenticated USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: goal_dependencies Users can delete dependencies in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete dependencies in their spaces" ON public.goal_dependencies FOR DELETE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: calendar_event_mappings Users can delete event mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete event mappings" ON public.calendar_event_mappings FOR DELETE USING ((connection_id IN ( SELECT cc.id
   FROM (public.calendar_connections cc
     JOIN public.space_members sm ON ((cc.space_id = sm.space_id)))
  WHERE (sm.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: expenses Users can delete expenses in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete expenses in their space" ON public.expenses FOR DELETE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: goals Users can delete goals in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete goals in their space" ON public.goals FOR DELETE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: meals Users can delete meals in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete meals in their space" ON public.meals FOR DELETE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: message_mentions Users can delete mentions they created; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete mentions they created" ON public.message_mentions FOR DELETE USING ((mentioned_by_user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: ai_messages Users can delete messages in their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete messages in their own conversations" ON public.ai_messages FOR DELETE USING ((conversation_id IN ( SELECT ai_conversations.id
   FROM public.ai_conversations
  WHERE (ai_conversations.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: goal_milestones Users can delete milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete milestones" ON public.goal_milestones FOR DELETE USING ((goal_id IN ( SELECT goals.id
   FROM public.goals
  WHERE ((goals.created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (goals.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))));


--
-- Name: reminder_attachments Users can delete own attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own attachments" ON public.reminder_attachments FOR DELETE USING ((uploaded_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: calendar_connections Users can delete own calendar connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own calendar connections" ON public.calendar_connections FOR DELETE USING (((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) AND (user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: goal_contributions Users can delete own contributions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own contributions" ON public.goal_contributions FOR DELETE TO authenticated USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: in_app_notifications Users can delete own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own notifications" ON public.in_app_notifications FOR DELETE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: notifications Users can delete own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: push_subscriptions Users can delete own push subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own push subscriptions" ON public.push_subscriptions FOR DELETE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: checkin_reactions Users can delete own reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own reactions" ON public.checkin_reactions FOR DELETE USING ((from_user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: voice_transcriptions Users can delete own voice transcriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own voice transcriptions" ON public.voice_transcriptions FOR DELETE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: recurring_expense_patterns Users can delete patterns in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete patterns in their spaces" ON public.recurring_expense_patterns FOR DELETE TO authenticated USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: receipts Users can delete receipts in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete receipts in their spaces" ON public.receipts FOR DELETE TO authenticated USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: recipes Users can delete recipes in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete recipes in their space" ON public.recipes FOR DELETE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: tags Users can delete tags in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete tags in their spaces" ON public.tags FOR DELETE TO authenticated USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: task_stats Users can delete task_stats in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete task_stats in their space" ON public.task_stats FOR DELETE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: shopping_templates Users can delete templates in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete templates in their space" ON public.shopping_templates FOR DELETE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: reminder_notifications Users can delete their notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their notifications" ON public.reminder_notifications FOR DELETE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: ai_conversations Users can delete their own AI conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own AI conversations" ON public.ai_conversations FOR DELETE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: ai_usage_daily Users can delete their own AI usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own AI usage" ON public.ai_usage_daily FOR DELETE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: event_attachments Users can delete their own attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own attachments" ON public.event_attachments FOR DELETE USING ((uploaded_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: message_attachments Users can delete their own attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own attachments" ON public.message_attachments FOR DELETE USING ((uploaded_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: availability_blocks Users can delete their own availability blocks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own availability blocks" ON public.availability_blocks FOR DELETE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: daily_checkins Users can delete their own check-ins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own check-ins" ON public.daily_checkins FOR DELETE USING (((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));


--
-- Name: comments Users can delete their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own comments" ON public.comments FOR DELETE TO authenticated USING ((created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: event_comments Users can delete their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own comments" ON public.event_comments FOR DELETE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: reminder_comments Users can delete their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own comments" ON public.reminder_comments FOR DELETE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: deleted_accounts Users can delete their own deletion records (cancel); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own deletion records (cancel)" ON public.deleted_accounts FOR DELETE USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));


--
-- Name: messages Users can delete their own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own messages" ON public.messages FOR DELETE USING (((sender_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (conversation_id IN ( SELECT conversations.id
   FROM public.conversations
  WHERE (conversations.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))));


--
-- Name: nudge_settings Users can delete their own nudge settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own nudge settings" ON public.nudge_settings FOR DELETE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: user_notification_preferences Users can delete their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own preferences" ON public.user_notification_preferences FOR DELETE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: projects Users can delete their own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own projects" ON public.projects FOR DELETE TO authenticated USING ((created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: event_proposals Users can delete their own proposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own proposals" ON public.event_proposals FOR DELETE USING ((proposed_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: message_reactions Users can delete their own reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own reactions" ON public.message_reactions FOR DELETE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: generated_reports Users can delete their own reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own reports" ON public.generated_reports FOR DELETE USING (((generated_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));


--
-- Name: user_sessions Users can delete their own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own sessions" ON public.user_sessions FOR DELETE USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));


--
-- Name: event_templates Users can delete their own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own templates" ON public.event_templates FOR DELETE USING (((created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));


--
-- Name: goal_templates Users can delete their own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own templates" ON public.goal_templates FOR DELETE USING ((created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: reminder_templates Users can delete their own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own templates" ON public.reminder_templates FOR DELETE USING (((created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (is_system_template = false)));


--
-- Name: report_templates Users can delete their own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own templates" ON public.report_templates FOR DELETE USING (((created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));


--
-- Name: typing_indicators Users can delete their own typing indicators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own typing indicators" ON public.typing_indicators FOR DELETE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: event_proposal_votes Users can delete their own votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own votes" ON public.event_proposal_votes FOR DELETE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: reminder_activities Users can insert activities for reminders in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert activities for reminders in their space" ON public.reminder_activities FOR INSERT WITH CHECK (((reminder_id IN ( SELECT r.id
   FROM (public.reminders r
     JOIN public.space_members sm ON ((sm.space_id = r.space_id)))
  WHERE (sm.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) AND (user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: budget_categories Users can insert budget categories in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert budget categories in their spaces" ON public.budget_categories FOR INSERT WITH CHECK ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: custom_categories Users can insert custom categories in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert custom categories in their spaces" ON public.custom_categories FOR INSERT WITH CHECK ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: calendar_event_mappings Users can insert event mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert event mappings" ON public.calendar_event_mappings FOR INSERT WITH CHECK ((connection_id IN ( SELECT cc.id
   FROM (public.calendar_connections cc
     JOIN public.space_members sm ON ((cc.space_id = sm.space_id)))
  WHERE (sm.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: ai_messages Users can insert messages in their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert messages in their own conversations" ON public.ai_messages FOR INSERT WITH CHECK ((conversation_id IN ( SELECT ai_conversations.id
   FROM public.ai_conversations
  WHERE (ai_conversations.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: user_audit_log Users can insert own audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own audit logs" ON public.user_audit_log FOR INSERT TO authenticated WITH CHECK ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));


--
-- Name: daily_usage Users can insert own daily usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own daily usage" ON public.daily_usage FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: feature_events Users can insert own events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own events" ON public.feature_events FOR INSERT WITH CHECK (((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR (user_id IS NULL)));


--
-- Name: user_feedback Users can insert own feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own feedback" ON public.user_feedback FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_privacy_preferences Users can insert own privacy preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own privacy preferences" ON public.user_privacy_preferences FOR INSERT WITH CHECK ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = id));


--
-- Name: push_subscriptions Users can insert own push subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own push subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: voice_transcriptions Users can insert own voice transcriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own voice transcriptions" ON public.voice_transcriptions FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: recurring_expense_patterns Users can insert patterns in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert patterns in their spaces" ON public.recurring_expense_patterns FOR INSERT WITH CHECK ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: calendar_sync_logs Users can insert sync logs for their connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert sync logs for their connections" ON public.calendar_sync_logs FOR INSERT WITH CHECK ((connection_id IN ( SELECT cc.id
   FROM (public.calendar_connections cc
     JOIN public.space_members sm ON ((cc.space_id = sm.space_id)))
  WHERE (sm.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: calendar_sync_queue Users can insert sync queue items for their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert sync queue items for their spaces" ON public.calendar_sync_queue FOR INSERT WITH CHECK ((connection_id IN ( SELECT cc.id
   FROM public.calendar_connections cc
  WHERE (cc.space_id IN ( SELECT sm.space_id
           FROM public.space_members sm
          WHERE (sm.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: tags Users can insert tags in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert tags in their spaces" ON public.tags FOR INSERT WITH CHECK ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: ai_usage_daily Users can insert their own AI usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own AI usage" ON public.ai_usage_daily FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: deleted_accounts Users can insert their own deletion records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own deletion records" ON public.deleted_accounts FOR INSERT WITH CHECK ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));


--
-- Name: nudge_history Users can insert their own nudge history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own nudge history" ON public.nudge_history FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: user_notification_preferences Users can insert their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own preferences" ON public.user_notification_preferences FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: user_sessions Users can insert their own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own sessions" ON public.user_sessions FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: typing_indicators Users can insert typing indicators in their conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert typing indicators in their conversations" ON public.typing_indicators FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM (public.conversations
     JOIN public.space_members ON ((space_members.space_id = conversations.space_id)))
  WHERE ((conversations.id = typing_indicators.conversation_id) AND (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))) AND (user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: shopping_calendar_events Users can manage calendar links in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage calendar links in their space" ON public.shopping_calendar_events USING ((list_id IN ( SELECT shopping_lists.id
   FROM public.shopping_lists
  WHERE (shopping_lists.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: recurring_goal_instances Users can manage instances for their templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage instances for their templates" ON public.recurring_goal_instances USING ((template_id IN ( SELECT recurring_goal_templates.id
   FROM public.recurring_goal_templates
  WHERE (recurring_goal_templates.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: project_line_items Users can manage line items for their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage line items for their projects" ON public.project_line_items TO authenticated USING ((project_id IN ( SELECT projects.id
   FROM public.projects
  WHERE (projects.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: milestone_templates Users can manage milestones for their templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage milestones for their templates" ON public.milestone_templates USING ((template_id IN ( SELECT goal_templates.id
   FROM public.goal_templates
  WHERE (goal_templates.created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: push_tokens Users can manage own push tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own push tokens" ON public.push_tokens USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: project_photos Users can manage photos for their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage photos for their projects" ON public.project_photos TO authenticated USING ((project_id IN ( SELECT projects.id
   FROM public.projects
  WHERE (projects.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: shopping_reminders Users can manage reminder links in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage reminder links in their space" ON public.shopping_reminders USING (COALESCE((list_id IN ( SELECT shopping_lists.id
   FROM public.shopping_lists
  WHERE (shopping_lists.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))), (item_id IN ( SELECT shopping_items.id
   FROM public.shopping_items
  WHERE (shopping_items.list_id IN ( SELECT shopping_lists.id
           FROM public.shopping_lists
          WHERE (shopping_lists.space_id IN ( SELECT space_members.space_id
                   FROM public.space_members
                  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))))));


--
-- Name: shopping_tasks Users can manage task links in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage task links in their space" ON public.shopping_tasks USING ((list_id IN ( SELECT shopping_lists.id
   FROM public.shopping_lists
  WHERE (shopping_lists.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: ccpa_opt_out_status Users can manage their own CCPA opt-out status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own CCPA opt-out status" ON public.ccpa_opt_out_status USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));


--
-- Name: report_favorites Users can manage their own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own favorites" ON public.report_favorites USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: goal_nudge_tracking Users can manage their own goal nudge tracking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own goal nudge tracking" ON public.goal_nudge_tracking USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: habit_entries Users can manage their own habit entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own habit entries" ON public.habit_entries USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))) WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: habit_streaks Users can manage their own habit streaks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own habit streaks" ON public.habit_streaks USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))) WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: partnership_balances Users can manage their space balances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their space balances" ON public.partnership_balances USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: vendors Users can manage vendors in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage vendors in their spaces" ON public.vendors TO authenticated USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: achievement_progress Users can modify their progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can modify their progress" ON public.achievement_progress FOR UPDATE USING (((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));


--
-- Name: checkin_reactions Users can react to partner check-ins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can react to partner check-ins" ON public.checkin_reactions FOR INSERT WITH CHECK (((from_user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (checkin_id IN ( SELECT daily_checkins.id
   FROM public.daily_checkins
  WHERE ((daily_checkins.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) AND (daily_checkins.user_id <> ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: user_feedback Users can read own feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own feedback" ON public.user_feedback FOR SELECT USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: profiles Users can read own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = id));


--
-- Name: expense_tags Users can remove tags from expenses in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove tags from expenses in their spaces" ON public.expense_tags FOR DELETE TO authenticated USING ((expense_id IN ( SELECT expenses.id
   FROM (public.expenses
     JOIN public.space_members ON ((expenses.space_id = space_members.space_id)))
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: goal_tags Users can remove tags from goals in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove tags from goals in their spaces" ON public.goal_tags FOR DELETE TO authenticated USING ((goal_id IN ( SELECT goals.id
   FROM (public.goals
     JOIN public.space_members ON ((goals.space_id = space_members.space_id)))
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: task_tags Users can remove tags from tasks in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove tags from tasks in their spaces" ON public.task_tags FOR DELETE TO authenticated USING ((task_id IN ( SELECT tasks.id
   FROM (public.tasks
     JOIN public.space_members ON ((tasks.space_id = space_members.space_id)))
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: comment_reactions Users can remove their own reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove their own reactions" ON public.comment_reactions FOR DELETE TO authenticated USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: budget_categories Users can update budget categories in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update budget categories in their spaces" ON public.budget_categories FOR UPDATE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: budgets Users can update budgets in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update budgets in their space" ON public.budgets FOR UPDATE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: chores Users can update chores in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update chores in their space" ON public.chores FOR UPDATE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: conversations Users can update conversations in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update conversations in their space" ON public.conversations FOR UPDATE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: custom_categories Users can update custom categories in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update custom categories in their spaces" ON public.custom_categories FOR UPDATE TO authenticated USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: goal_dependencies Users can update dependencies in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update dependencies in their spaces" ON public.goal_dependencies FOR UPDATE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: calendar_event_mappings Users can update event mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update event mappings" ON public.calendar_event_mappings FOR UPDATE USING ((connection_id IN ( SELECT cc.id
   FROM (public.calendar_connections cc
     JOIN public.space_members sm ON ((cc.space_id = sm.space_id)))
  WHERE (sm.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: expenses Users can update expenses in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update expenses in their space" ON public.expenses FOR UPDATE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: goals Users can update goals in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update goals in their space" ON public.goals FOR UPDATE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: meals Users can update meals in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update meals in their space" ON public.meals FOR UPDATE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: ai_messages Users can update messages in their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update messages in their own conversations" ON public.ai_messages FOR UPDATE USING ((conversation_id IN ( SELECT ai_conversations.id
   FROM public.ai_conversations
  WHERE (ai_conversations.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: messages Users can update messages in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update messages in their space" ON public.messages FOR UPDATE USING ((conversation_id IN ( SELECT c.id
   FROM public.conversations c
  WHERE (c.space_id IN ( SELECT sm.space_id
           FROM public.space_members sm
          WHERE (sm.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))) WITH CHECK ((conversation_id IN ( SELECT c.id
   FROM public.conversations c
  WHERE (c.space_id IN ( SELECT sm.space_id
           FROM public.space_members sm
          WHERE (sm.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: goal_milestones Users can update milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update milestones" ON public.goal_milestones FOR UPDATE USING ((goal_id IN ( SELECT goals.id
   FROM public.goals
  WHERE ((goals.created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (goals.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))));


--
-- Name: calendar_connections Users can update own calendar connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own calendar connections" ON public.calendar_connections FOR UPDATE USING (((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) AND (user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: goal_contributions Users can update own contributions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own contributions" ON public.goal_contributions FOR UPDATE TO authenticated USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: daily_usage Users can update own daily usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own daily usage" ON public.daily_usage FOR UPDATE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: account_deletion_requests Users can update own deletion requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own deletion requests" ON public.account_deletion_requests FOR UPDATE USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));


--
-- Name: in_app_notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notifications" ON public.in_app_notifications FOR UPDATE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: user_privacy_preferences Users can update own privacy preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own privacy preferences" ON public.user_privacy_preferences FOR UPDATE USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = id));


--
-- Name: push_subscriptions Users can update own push subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own push subscriptions" ON public.push_subscriptions FOR UPDATE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: voice_transcriptions Users can update own voice transcriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own voice transcriptions" ON public.voice_transcriptions FOR UPDATE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: recurring_expense_patterns Users can update patterns in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update patterns in their spaces" ON public.recurring_expense_patterns FOR UPDATE TO authenticated USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: projects Users can update projects in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update projects in their spaces" ON public.projects FOR UPDATE TO authenticated USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: receipts Users can update receipts in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update receipts in their spaces" ON public.receipts FOR UPDATE TO authenticated USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: recipes Users can update recipes in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update recipes in their space" ON public.recipes FOR UPDATE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: calendar_sync_conflicts Users can update sync conflicts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update sync conflicts" ON public.calendar_sync_conflicts FOR UPDATE USING ((connection_id IN ( SELECT calendar_connections.id
   FROM public.calendar_connections
  WHERE (calendar_connections.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: calendar_sync_logs Users can update sync logs for their connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update sync logs for their connections" ON public.calendar_sync_logs FOR UPDATE USING ((connection_id IN ( SELECT cc.id
   FROM (public.calendar_connections cc
     JOIN public.space_members sm ON ((cc.space_id = sm.space_id)))
  WHERE (sm.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: calendar_sync_queue Users can update sync queue items for their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update sync queue items for their spaces" ON public.calendar_sync_queue FOR UPDATE USING ((connection_id IN ( SELECT cc.id
   FROM public.calendar_connections cc
  WHERE (cc.space_id IN ( SELECT sm.space_id
           FROM public.space_members sm
          WHERE (sm.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: tags Users can update tags in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update tags in their spaces" ON public.tags FOR UPDATE TO authenticated USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: task_stats Users can update task_stats in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update task_stats in their space" ON public.task_stats FOR UPDATE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: shopping_templates Users can update templates in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update templates in their space" ON public.shopping_templates FOR UPDATE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: reminder_notifications Users can update their notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their notifications" ON public.reminder_notifications FOR UPDATE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: ai_conversations Users can update their own AI conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own AI conversations" ON public.ai_conversations FOR UPDATE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: ai_user_settings Users can update their own AI settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own AI settings" ON public.ai_user_settings FOR UPDATE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: ai_usage_daily Users can update their own AI usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own AI usage" ON public.ai_usage_daily FOR UPDATE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: goal_activities Users can update their own activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own activities" ON public.goal_activities FOR UPDATE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: availability_blocks Users can update their own availability blocks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own availability blocks" ON public.availability_blocks FOR UPDATE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))) WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: daily_checkins Users can update their own check-ins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own check-ins" ON public.daily_checkins FOR UPDATE USING (((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));


--
-- Name: comments Users can update their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own comments" ON public.comments FOR UPDATE TO authenticated USING ((created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: event_comments Users can update their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own comments" ON public.event_comments FOR UPDATE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))) WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: reminder_comments Users can update their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own comments" ON public.reminder_comments FOR UPDATE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))) WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: mentions Users can update their own mention read status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own mention read status" ON public.mentions FOR UPDATE TO authenticated USING ((mentioned_user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: message_mentions Users can update their own mentions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own mentions" ON public.message_mentions FOR UPDATE USING ((mentioned_user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: nudge_history Users can update their own nudge history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own nudge history" ON public.nudge_history FOR UPDATE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: nudge_settings Users can update their own nudge settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own nudge settings" ON public.nudge_settings FOR UPDATE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: user_notification_preferences Users can update their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own preferences" ON public.user_notification_preferences FOR UPDATE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: event_proposals Users can update their own proposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own proposals" ON public.event_proposals FOR UPDATE USING ((proposed_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid))) WITH CHECK ((proposed_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: generated_reports Users can update their own reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own reports" ON public.generated_reports FOR UPDATE USING (((generated_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));


--
-- Name: user_sessions Users can update their own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own sessions" ON public.user_sessions FOR UPDATE USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));


--
-- Name: event_templates Users can update their own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own templates" ON public.event_templates FOR UPDATE USING (((created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));


--
-- Name: goal_templates Users can update their own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own templates" ON public.goal_templates FOR UPDATE USING ((created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: reminder_templates Users can update their own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own templates" ON public.reminder_templates FOR UPDATE USING (((created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (is_system_template = false))) WITH CHECK (((created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (is_system_template = false)));


--
-- Name: report_templates Users can update their own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own templates" ON public.report_templates FOR UPDATE USING (((created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));


--
-- Name: typing_indicators Users can update their own typing indicators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own typing indicators" ON public.typing_indicators FOR UPDATE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))) WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: event_proposal_votes Users can update their own votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own votes" ON public.event_proposal_votes FOR UPDATE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))) WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: spaces Users can update their personal space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their personal space" ON public.spaces FOR UPDATE USING (((is_personal = true) AND (user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: achievement_progress Users can update their progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their progress" ON public.achievement_progress FOR INSERT WITH CHECK (((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));


--
-- Name: event_attachments Users can upload attachments to events in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can upload attachments to events in their space" ON public.event_attachments FOR INSERT WITH CHECK (((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) AND (uploaded_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: message_attachments Users can upload attachments to their messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can upload attachments to their messages" ON public.message_attachments FOR INSERT WITH CHECK (((uploaded_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (EXISTS ( SELECT 1
   FROM ((public.messages
     JOIN public.conversations ON ((conversations.id = messages.conversation_id)))
     JOIN public.space_members ON ((space_members.space_id = conversations.space_id)))
  WHERE ((messages.id = message_attachments.message_id) AND (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: user_achievements Users can view achievements in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view achievements in their spaces" ON public.user_achievements FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: reminder_activities Users can view activities for reminders in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view activities for reminders in their space" ON public.reminder_activities FOR SELECT USING ((reminder_id IN ( SELECT r.id
   FROM (public.reminders r
     JOIN public.space_members sm ON ((sm.space_id = r.space_id)))
  WHERE (sm.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: activity_logs Users can view activity logs in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view activity logs in their spaces" ON public.activity_logs FOR SELECT TO authenticated USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: event_attachments Users can view attachments in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view attachments in their space" ON public.event_attachments FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: message_attachments Users can view attachments in their space conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view attachments in their space conversations" ON public.message_attachments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((public.messages
     JOIN public.conversations ON ((conversations.id = messages.conversation_id)))
     JOIN public.space_members ON ((space_members.space_id = conversations.space_id)))
  WHERE ((messages.id = message_attachments.message_id) AND (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));


--
-- Name: budget_categories Users can view budget categories in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view budget categories in their spaces" ON public.budget_categories FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: budgets Users can view budgets in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view budgets in their space" ON public.budgets FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: daily_checkins Users can view check-ins in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view check-ins in their space" ON public.daily_checkins FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: chores Users can view chores in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view chores in their space" ON public.chores FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: goal_collaborators Users can view collaborators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view collaborators" ON public.goal_collaborators FOR SELECT USING (((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (goal_id IN ( SELECT goals.id
   FROM public.goals
  WHERE (goals.created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));


--
-- Name: event_comments Users can view comments in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view comments in their space" ON public.event_comments FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: comments Users can view comments in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view comments in their spaces" ON public.comments FOR SELECT TO authenticated USING (((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) AND (is_deleted = false)));


--
-- Name: reminder_comments Users can view comments in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view comments in their spaces" ON public.reminder_comments FOR SELECT USING ((reminder_id IN ( SELECT r.id
   FROM (public.reminders r
     JOIN public.space_members sm ON ((sm.space_id = r.space_id)))
  WHERE (sm.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: conversations Users can view conversations in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view conversations in their space" ON public.conversations FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: custom_categories Users can view custom categories from their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view custom categories from their spaces" ON public.custom_categories FOR SELECT TO authenticated USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: goal_dependencies Users can view dependencies in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view dependencies in their spaces" ON public.goal_dependencies FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: calendar_event_mappings Users can view event mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view event mappings" ON public.calendar_event_mappings FOR SELECT USING ((connection_id IN ( SELECT calendar_connections.id
   FROM public.calendar_connections
  WHERE (calendar_connections.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: expense_tags Users can view expense tags from their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view expense tags from their spaces" ON public.expense_tags FOR SELECT TO authenticated USING ((expense_id IN ( SELECT expenses.id
   FROM (public.expenses
     JOIN public.space_members ON ((expenses.space_id = space_members.space_id)))
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: expenses Users can view expenses in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view expenses in their space" ON public.expenses FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: goal_activities Users can view goal activities in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view goal activities in their spaces" ON public.goal_activities FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: goal_contributions Users can view goal contributions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view goal contributions" ON public.goal_contributions FOR SELECT TO authenticated USING ((goal_id IN ( SELECT g.id
   FROM public.goals g
  WHERE (((g.visibility = 'private'::text) AND (g.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))) OR ((g.visibility = 'shared'::text) AND ((g.created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (g.id IN ( SELECT goal_collaborators.goal_id
           FROM public.goal_collaborators
          WHERE (goal_collaborators.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) OR (g.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))))));


--
-- Name: goal_tags Users can view goal tags from their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view goal tags from their spaces" ON public.goal_tags FOR SELECT TO authenticated USING ((goal_id IN ( SELECT goals.id
   FROM (public.goals
     JOIN public.space_members ON ((goals.space_id = space_members.space_id)))
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: goals Users can view goals in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view goals in their space" ON public.goals FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: meals Users can view meals in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view meals in their space" ON public.meals FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: mentions Users can view mentions in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view mentions in their spaces" ON public.mentions FOR SELECT TO authenticated USING ((comment_id IN ( SELECT comments.id
   FROM public.comments
  WHERE (comments.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: message_mentions Users can view mentions in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view mentions in their spaces" ON public.message_mentions FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: ai_messages Users can view messages in their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages in their own conversations" ON public.ai_messages FOR SELECT USING ((conversation_id IN ( SELECT ai_conversations.id
   FROM public.ai_conversations
  WHERE (ai_conversations.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: messages Users can view messages in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages in their space" ON public.messages FOR SELECT USING ((conversation_id IN ( SELECT conversations.id
   FROM public.conversations
  WHERE (conversations.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: goal_milestones Users can view milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view milestones" ON public.goal_milestones FOR SELECT USING ((goal_id IN ( SELECT goals.id
   FROM public.goals
  WHERE ((goals.created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (goals.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))));


--
-- Name: calendar_connections Users can view own calendar connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own calendar connections" ON public.calendar_connections FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: daily_usage Users can view own daily usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own daily usage" ON public.daily_usage FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: account_deletion_requests Users can view own deletion requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own deletion requests" ON public.account_deletion_requests FOR SELECT USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));


--
-- Name: privacy_email_notifications Users can view own email notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own email notifications" ON public.privacy_email_notifications FOR SELECT USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));


--
-- Name: data_export_requests Users can view own export requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own export requests" ON public.data_export_requests FOR SELECT USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));


--
-- Name: notification_log Users can view own notification logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notification logs" ON public.notification_log FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: in_app_notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notifications" ON public.in_app_notifications FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: privacy_preference_history Users can view own privacy history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own privacy history" ON public.privacy_preference_history FOR SELECT USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));


--
-- Name: user_privacy_preferences Users can view own privacy preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own privacy preferences" ON public.user_privacy_preferences FOR SELECT USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));


--
-- Name: push_subscriptions Users can view own push subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own push subscriptions" ON public.push_subscriptions FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: subscriptions Users can view own subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: subscription_events Users can view own subscription events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own subscription events" ON public.subscription_events FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: calendar_sync_queue Users can view own sync queue items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own sync queue items" ON public.calendar_sync_queue FOR SELECT USING ((connection_id IN ( SELECT calendar_connections.id
   FROM public.calendar_connections
  WHERE (calendar_connections.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: voice_transcriptions Users can view own voice transcriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own voice transcriptions" ON public.voice_transcriptions FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: recurring_expense_patterns Users can view patterns from their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view patterns from their spaces" ON public.recurring_expense_patterns FOR SELECT TO authenticated USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: late_penalties Users can view penalties in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view penalties in their space" ON public.late_penalties FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.space_members
  WHERE ((space_members.space_id = late_penalties.space_id) AND (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));


--
-- Name: projects Users can view projects in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view projects in their spaces" ON public.projects FOR SELECT TO authenticated USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: event_proposals Users can view proposals in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view proposals in their space" ON public.event_proposals FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: checkin_reactions Users can view reactions in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view reactions in their space" ON public.checkin_reactions FOR SELECT USING ((checkin_id IN ( SELECT daily_checkins.id
   FROM public.daily_checkins
  WHERE (daily_checkins.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: message_reactions Users can view reactions in their space conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view reactions in their space conversations" ON public.message_reactions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((public.messages
     JOIN public.conversations ON ((conversations.id = messages.conversation_id)))
     JOIN public.space_members ON ((space_members.space_id = conversations.space_id)))
  WHERE ((messages.id = message_reactions.message_id) AND (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));


--
-- Name: comment_reactions Users can view reactions in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view reactions in their spaces" ON public.comment_reactions FOR SELECT TO authenticated USING ((comment_id IN ( SELECT comments.id
   FROM public.comments
  WHERE (comments.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: receipts Users can view receipts from their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view receipts from their spaces" ON public.receipts FOR SELECT TO authenticated USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: recipes Users can view recipes in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view recipes in their space" ON public.recipes FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: reward_redemptions Users can view redemptions in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view redemptions in their spaces" ON public.reward_redemptions FOR SELECT USING ((space_id IN ( SELECT public.get_user_space_ids(( SELECT ( SELECT auth.uid() AS uid) AS uid)) AS get_user_space_ids)));


--
-- Name: generated_reports Users can view reports from their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view reports from their spaces" ON public.generated_reports FOR SELECT USING (((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) OR ((is_shared = true) AND (share_token IS NOT NULL))));


--
-- Name: reminder_templates Users can view space and system templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view space and system templates" ON public.reminder_templates FOR SELECT USING (((is_system_template = true) OR (space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));


--
-- Name: calendar_sync_conflicts Users can view sync conflicts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view sync conflicts" ON public.calendar_sync_conflicts FOR SELECT USING ((connection_id IN ( SELECT calendar_connections.id
   FROM public.calendar_connections
  WHERE (calendar_connections.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: calendar_sync_logs Users can view sync logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view sync logs" ON public.calendar_sync_logs FOR SELECT USING ((connection_id IN ( SELECT calendar_connections.id
   FROM public.calendar_connections
  WHERE (calendar_connections.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: report_templates Users can view system and space templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view system and space templates" ON public.report_templates FOR SELECT USING (((is_system = true) OR (space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));


--
-- Name: tags Users can view tags from their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view tags from their spaces" ON public.tags FOR SELECT TO authenticated USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: task_tags Users can view task tags from their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view task tags from their spaces" ON public.task_tags FOR SELECT TO authenticated USING ((task_id IN ( SELECT tasks.id
   FROM (public.tasks
     JOIN public.space_members ON ((tasks.space_id = space_members.space_id)))
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: task_stats Users can view task_stats in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view task_stats in their space" ON public.task_stats FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: event_templates Users can view templates in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view templates in their space" ON public.event_templates FOR SELECT USING (((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) OR (is_system_template = true)));


--
-- Name: shopping_templates Users can view templates in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view templates in their space" ON public.shopping_templates FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: workspace_migrations Users can view their migrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their migrations" ON public.workspace_migrations FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: ai_conversations Users can view their own AI conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own AI conversations" ON public.ai_conversations FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: ai_user_settings Users can view their own AI settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own AI settings" ON public.ai_user_settings FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: ai_usage_daily Users can view their own AI usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own AI usage" ON public.ai_usage_daily FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: user_audit_log Users can view their own audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own audit logs" ON public.user_audit_log FOR SELECT USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));


--
-- Name: availability_blocks Users can view their own availability blocks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own availability blocks" ON public.availability_blocks FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: deleted_accounts Users can view their own deletion records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own deletion records" ON public.deleted_accounts FOR SELECT USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));


--
-- Name: habit_analytics Users can view their own habit analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own habit analytics" ON public.habit_analytics FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: magic_link_tokens Users can view their own magic link tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own magic link tokens" ON public.magic_link_tokens FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: nudge_history Users can view their own nudge history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own nudge history" ON public.nudge_history FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: nudge_settings Users can view their own nudge settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own nudge settings" ON public.nudge_settings FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: user_notification_preferences Users can view their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own preferences" ON public.user_notification_preferences FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: password_reset_tokens Users can view their own reset tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own reset tokens" ON public.password_reset_tokens FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: user_sessions Users can view their own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own sessions" ON public.user_sessions FOR SELECT USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id));


--
-- Name: achievement_progress Users can view their progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their progress" ON public.achievement_progress FOR SELECT USING (((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));


--
-- Name: reminder_notifications Users can view their reminder notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their reminder notifications" ON public.reminder_notifications FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: point_transactions Users can view transactions in their spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view transactions in their spaces" ON public.point_transactions FOR SELECT USING ((space_id IN ( SELECT public.get_user_space_ids(( SELECT ( SELECT auth.uid() AS uid) AS uid)) AS get_user_space_ids)));


--
-- Name: typing_indicators Users can view typing indicators in their space conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view typing indicators in their space conversations" ON public.typing_indicators FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.conversations
     JOIN public.space_members ON ((space_members.space_id = conversations.space_id)))
  WHERE ((conversations.id = typing_indicators.conversation_id) AND (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));


--
-- Name: event_proposal_votes Users can view votes on proposals in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view votes on proposals in their space" ON public.event_proposal_votes FOR SELECT USING ((proposal_id IN ( SELECT event_proposals.id
   FROM public.event_proposals
  WHERE (event_proposals.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: calendar_webhook_subscriptions Users can view webhook subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view webhook subscriptions" ON public.calendar_webhook_subscriptions FOR SELECT USING ((connection_id IN ( SELECT calendar_connections.id
   FROM public.calendar_connections
  WHERE (calendar_connections.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: event_proposal_votes Users can vote on proposals in their space; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can vote on proposals in their space" ON public.event_proposal_votes FOR INSERT WITH CHECK (((proposal_id IN ( SELECT event_proposals.id
   FROM public.event_proposals
  WHERE (event_proposals.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))) AND (user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: account_deletion_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.account_deletion_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: account_deletion_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: achievement_badges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.achievement_badges ENABLE ROW LEVEL SECURITY;

--
-- Name: achievement_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.achievement_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_goals admin_goals_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_goals_delete ON public.admin_goals FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text)) AND (admin_users.is_active = true)))));


--
-- Name: admin_goals admin_goals_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_goals_insert ON public.admin_goals FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text)) AND (admin_users.is_active = true)))));


--
-- Name: admin_goals admin_goals_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_goals_select ON public.admin_goals FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text)) AND (admin_users.is_active = true)))));


--
-- Name: admin_goals admin_goals_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_goals_update ON public.admin_goals FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text)) AND (admin_users.is_active = true)))));


--
-- Name: admin_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_users admin_users_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_users_delete ON public.admin_users FOR DELETE USING (public.check_is_admin());


--
-- Name: admin_users admin_users_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_users_insert ON public.admin_users FOR INSERT WITH CHECK (public.check_is_admin());


--
-- Name: admin_users admin_users_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_users_select ON public.admin_users FOR SELECT USING ((public.check_is_admin() OR (((( SELECT auth.jwt() AS jwt) ->> 'email'::text) = email) AND (is_active = true))));


--
-- Name: admin_users admin_users_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_users_update ON public.admin_users FOR UPDATE USING ((public.check_is_admin() OR (((( SELECT auth.jwt() AS jwt) ->> 'email'::text) = email) AND (is_active = true))));


--
-- Name: ai_conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_usage_daily; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_user_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_user_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: availability_blocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.availability_blocks ENABLE ROW LEVEL SECURITY;

--
-- Name: aws_course_memory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.aws_course_memory ENABLE ROW LEVEL SECURITY;

--
-- Name: bills; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

--
-- Name: budget_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: budget_goal_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.budget_goal_links ENABLE ROW LEVEL SECURITY;

--
-- Name: budget_goal_links budget_goal_links_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_goal_links_delete ON public.budget_goal_links FOR DELETE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: budget_goal_links budget_goal_links_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_goal_links_insert ON public.budget_goal_links FOR INSERT WITH CHECK ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: budget_goal_links budget_goal_links_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_goal_links_select ON public.budget_goal_links FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: budget_goal_links budget_goal_links_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_goal_links_update ON public.budget_goal_links FOR UPDATE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: budget_template_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.budget_template_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: budget_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.budget_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: budgets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_connections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_event_mappings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_event_mappings ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_events calendar_events_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY calendar_events_delete ON public.calendar_events FOR DELETE USING (((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) AND (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: calendar_events calendar_events_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY calendar_events_insert ON public.calendar_events FOR INSERT WITH CHECK (((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))) AND (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: calendar_events calendar_events_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY calendar_events_select ON public.calendar_events FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: calendar_events calendar_events_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY calendar_events_update ON public.calendar_events FOR UPDATE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: calendar_sync_conflicts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_sync_conflicts ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_sync_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_sync_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_sync_queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_sync_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_sync_state; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_sync_state ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_sync_state calendar_sync_state_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY calendar_sync_state_delete ON public.calendar_sync_state FOR DELETE USING ((connection_id IN ( SELECT calendar_connections.id
   FROM public.calendar_connections
  WHERE (calendar_connections.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: calendar_sync_state calendar_sync_state_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY calendar_sync_state_insert ON public.calendar_sync_state FOR INSERT WITH CHECK ((connection_id IN ( SELECT calendar_connections.id
   FROM public.calendar_connections
  WHERE (calendar_connections.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: calendar_sync_state calendar_sync_state_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY calendar_sync_state_select ON public.calendar_sync_state FOR SELECT USING ((connection_id IN ( SELECT calendar_connections.id
   FROM public.calendar_connections
  WHERE (calendar_connections.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: calendar_sync_state calendar_sync_state_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY calendar_sync_state_update ON public.calendar_sync_state FOR UPDATE USING ((connection_id IN ( SELECT calendar_connections.id
   FROM public.calendar_connections
  WHERE (calendar_connections.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: calendar_webhook_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_webhook_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: ccpa_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ccpa_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: ccpa_opt_out_status; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ccpa_opt_out_status ENABLE ROW LEVEL SECURITY;

--
-- Name: checkin_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.checkin_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: chore_calendar_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chore_calendar_events ENABLE ROW LEVEL SECURITY;

--
-- Name: chore_calendar_events chore_calendar_events_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chore_calendar_events_delete ON public.chore_calendar_events FOR DELETE USING ((chore_id IN ( SELECT chores.id
   FROM public.chores
  WHERE (chores.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: chore_calendar_events chore_calendar_events_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chore_calendar_events_insert ON public.chore_calendar_events FOR INSERT WITH CHECK ((chore_id IN ( SELECT chores.id
   FROM public.chores
  WHERE (chores.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: chore_calendar_events chore_calendar_events_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chore_calendar_events_select ON public.chore_calendar_events FOR SELECT USING ((chore_id IN ( SELECT chores.id
   FROM public.chores
  WHERE (chores.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: chore_rotations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chore_rotations ENABLE ROW LEVEL SECURITY;

--
-- Name: chore_rotations chore_rotations_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chore_rotations_delete ON public.chore_rotations FOR DELETE TO authenticated USING ((chore_id IN ( SELECT chores.id
   FROM public.chores
  WHERE (chores.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: chore_rotations chore_rotations_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chore_rotations_insert ON public.chore_rotations FOR INSERT WITH CHECK ((chore_id IN ( SELECT chores.id
   FROM public.chores
  WHERE (chores.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: chore_rotations chore_rotations_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chore_rotations_select ON public.chore_rotations FOR SELECT TO authenticated USING ((chore_id IN ( SELECT chores.id
   FROM public.chores
  WHERE (chores.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: chore_rotations chore_rotations_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chore_rotations_update ON public.chore_rotations FOR UPDATE TO authenticated USING ((chore_id IN ( SELECT chores.id
   FROM public.chores
  WHERE (chores.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: chores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chores ENABLE ROW LEVEL SECURITY;

--
-- Name: comment_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

--
-- Name: compliance_events_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.compliance_events_log ENABLE ROW LEVEL SECURITY;

--
-- Name: compliance_events_log compliance_events_log_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY compliance_events_log_insert ON public.compliance_events_log FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: compliance_events_log compliance_events_log_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY compliance_events_log_select ON public.compliance_events_log FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_checkins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: data_export_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: data_processing_agreements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.data_processing_agreements ENABLE ROW LEVEL SECURITY;

--
-- Name: data_processing_agreements data_processing_agreements_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY data_processing_agreements_insert ON public.data_processing_agreements FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: data_processing_agreements data_processing_agreements_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY data_processing_agreements_select ON public.data_processing_agreements FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: data_processing_agreements data_processing_agreements_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY data_processing_agreements_update ON public.data_processing_agreements FOR UPDATE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: deleted_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deleted_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: email_change_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_change_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: email_verification_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: event_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: event_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: event_proposal_votes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_proposal_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: event_proposals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_proposals ENABLE ROW LEVEL SECURITY;

--
-- Name: event_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: events events_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY events_delete ON public.events FOR DELETE USING (public.user_has_space_access(space_id));


--
-- Name: events events_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY events_insert ON public.events FOR INSERT WITH CHECK (public.user_has_space_access(space_id));


--
-- Name: events events_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY events_select ON public.events FOR SELECT USING (public.user_has_space_access(space_id));


--
-- Name: events events_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY events_update ON public.events FOR UPDATE USING (public.user_has_space_access(space_id));


--
-- Name: expense_splits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;

--
-- Name: expense_splits expense_splits_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expense_splits_delete ON public.expense_splits FOR DELETE USING ((expense_id IN ( SELECT expenses.id
   FROM public.expenses
  WHERE (expenses.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: expense_splits expense_splits_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expense_splits_insert ON public.expense_splits FOR INSERT WITH CHECK ((expense_id IN ( SELECT expenses.id
   FROM public.expenses
  WHERE (expenses.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: expense_splits expense_splits_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expense_splits_select ON public.expense_splits FOR SELECT USING ((expense_id IN ( SELECT expenses.id
   FROM public.expenses
  WHERE (expenses.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: expense_splits expense_splits_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expense_splits_update ON public.expense_splits FOR UPDATE USING ((expense_id IN ( SELECT expenses.id
   FROM public.expenses
  WHERE (expenses.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: expense_tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expense_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feature_events ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_usage_daily; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feature_usage_daily ENABLE ROW LEVEL SECURITY;

--
-- Name: founding_member_counter; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.founding_member_counter ENABLE ROW LEVEL SECURITY;

--
-- Name: generated_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: goal_activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goal_activities ENABLE ROW LEVEL SECURITY;

--
-- Name: goal_check_in_photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goal_check_in_photos ENABLE ROW LEVEL SECURITY;

--
-- Name: goal_check_in_photos goal_check_in_photos_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_check_in_photos_delete ON public.goal_check_in_photos FOR DELETE USING ((check_in_id IN ( SELECT goal_check_ins.id
   FROM public.goal_check_ins
  WHERE (goal_check_ins.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: goal_check_in_photos goal_check_in_photos_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_check_in_photos_insert ON public.goal_check_in_photos FOR INSERT WITH CHECK ((check_in_id IN ( SELECT goal_check_ins.id
   FROM public.goal_check_ins
  WHERE (goal_check_ins.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: goal_check_in_photos goal_check_in_photos_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_check_in_photos_select ON public.goal_check_in_photos FOR SELECT USING ((check_in_id IN ( SELECT goal_check_ins.id
   FROM public.goal_check_ins
  WHERE (goal_check_ins.goal_id IN ( SELECT goals.id
           FROM public.goals
          WHERE (goals.space_id IN ( SELECT space_members.space_id
                   FROM public.space_members
                  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))))));


--
-- Name: goal_check_in_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goal_check_in_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: goal_check_in_reactions goal_check_in_reactions_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_check_in_reactions_delete ON public.goal_check_in_reactions FOR DELETE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: goal_check_in_reactions goal_check_in_reactions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_check_in_reactions_insert ON public.goal_check_in_reactions FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: goal_check_in_reactions goal_check_in_reactions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_check_in_reactions_select ON public.goal_check_in_reactions FOR SELECT USING ((check_in_id IN ( SELECT goal_check_ins.id
   FROM public.goal_check_ins
  WHERE (goal_check_ins.goal_id IN ( SELECT goals.id
           FROM public.goals
          WHERE (goals.space_id IN ( SELECT space_members.space_id
                   FROM public.space_members
                  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))))));


--
-- Name: goal_check_in_reminders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goal_check_in_reminders ENABLE ROW LEVEL SECURITY;

--
-- Name: goal_check_in_reminders goal_check_in_reminders_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_check_in_reminders_delete ON public.goal_check_in_reminders FOR DELETE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: goal_check_in_reminders goal_check_in_reminders_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_check_in_reminders_insert ON public.goal_check_in_reminders FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: goal_check_in_reminders goal_check_in_reminders_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_check_in_reminders_select ON public.goal_check_in_reminders FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: goal_check_in_reminders goal_check_in_reminders_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_check_in_reminders_update ON public.goal_check_in_reminders FOR UPDATE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: goal_check_in_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goal_check_in_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: goal_check_in_settings goal_check_in_settings_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_check_in_settings_insert ON public.goal_check_in_settings FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: goal_check_in_settings goal_check_in_settings_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_check_in_settings_select ON public.goal_check_in_settings FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: goal_check_in_settings goal_check_in_settings_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_check_in_settings_update ON public.goal_check_in_settings FOR UPDATE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: goal_check_ins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goal_check_ins ENABLE ROW LEVEL SECURITY;

--
-- Name: goal_check_ins goal_check_ins_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_check_ins_delete_policy ON public.goal_check_ins FOR DELETE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: goal_check_ins goal_check_ins_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_check_ins_insert_policy ON public.goal_check_ins FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: goal_check_ins goal_check_ins_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_check_ins_select_policy ON public.goal_check_ins FOR SELECT USING (((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (EXISTS ( SELECT 1
   FROM public.goals g,
    public.space_members sm
  WHERE ((g.id = goal_check_ins.goal_id) AND (g.space_id = sm.space_id) AND (sm.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: goal_check_ins goal_check_ins_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_check_ins_update_policy ON public.goal_check_ins FOR UPDATE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: goal_collaborators; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goal_collaborators ENABLE ROW LEVEL SECURITY;

--
-- Name: goal_comment_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goal_comment_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: goal_comment_reactions goal_comment_reactions_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_comment_reactions_delete ON public.goal_comment_reactions FOR DELETE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: goal_comment_reactions goal_comment_reactions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_comment_reactions_insert ON public.goal_comment_reactions FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: goal_comment_reactions goal_comment_reactions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_comment_reactions_select ON public.goal_comment_reactions FOR SELECT USING ((comment_id IN ( SELECT goal_comments.id
   FROM public.goal_comments
  WHERE (goal_comments.goal_id IN ( SELECT goals.id
           FROM public.goals
          WHERE (goals.space_id IN ( SELECT space_members.space_id
                   FROM public.space_members
                  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))))));


--
-- Name: goal_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goal_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: goal_comments goal_comments_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_comments_delete ON public.goal_comments FOR DELETE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: goal_comments goal_comments_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_comments_insert ON public.goal_comments FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: goal_comments goal_comments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_comments_select ON public.goal_comments FOR SELECT USING ((goal_id IN ( SELECT goals.id
   FROM public.goals
  WHERE (goals.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: goal_comments goal_comments_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_comments_update ON public.goal_comments FOR UPDATE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: goal_contributions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;

--
-- Name: goal_dependencies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goal_dependencies ENABLE ROW LEVEL SECURITY;

--
-- Name: goal_mentions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goal_mentions ENABLE ROW LEVEL SECURITY;

--
-- Name: goal_mentions goal_mentions_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_mentions_delete ON public.goal_mentions FOR DELETE USING ((mentioning_user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: goal_mentions goal_mentions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_mentions_insert ON public.goal_mentions FOR INSERT WITH CHECK ((mentioning_user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: goal_mentions goal_mentions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_mentions_select ON public.goal_mentions FOR SELECT USING ((comment_id IN ( SELECT goal_comments.id
   FROM public.goal_comments
  WHERE (goal_comments.goal_id IN ( SELECT goals.id
           FROM public.goals
          WHERE (goals.space_id IN ( SELECT space_members.space_id
                   FROM public.space_members
                  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))))));


--
-- Name: goal_mentions goal_mentions_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_mentions_update ON public.goal_mentions FOR UPDATE USING ((mentioning_user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: goal_milestones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;

--
-- Name: goal_nudge_tracking; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goal_nudge_tracking ENABLE ROW LEVEL SECURITY;

--
-- Name: goal_tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goal_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: goal_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goal_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: goal_updates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goal_updates ENABLE ROW LEVEL SECURITY;

--
-- Name: goal_updates goal_updates_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_updates_delete ON public.goal_updates FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.goals g
  WHERE ((g.id = goal_updates.goal_id) AND public.user_has_space_access(g.space_id)))));


--
-- Name: goal_updates goal_updates_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_updates_insert ON public.goal_updates FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.goals g
  WHERE ((g.id = goal_updates.goal_id) AND public.user_has_space_access(g.space_id)))));


--
-- Name: goal_updates goal_updates_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goal_updates_select ON public.goal_updates FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.goals g
  WHERE ((g.id = goal_updates.goal_id) AND public.user_has_space_access(g.space_id)))));


--
-- Name: goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

--
-- Name: habit_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.habit_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: habit_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.habit_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: habit_streaks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.habit_streaks ENABLE ROW LEVEL SECURITY;

--
-- Name: important_dates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.important_dates ENABLE ROW LEVEL SECURITY;

--
-- Name: important_dates important_dates_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY important_dates_delete_policy ON public.important_dates FOR DELETE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: important_dates important_dates_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY important_dates_insert_policy ON public.important_dates FOR INSERT WITH CHECK ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: important_dates important_dates_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY important_dates_select_policy ON public.important_dates FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: important_dates important_dates_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY important_dates_update_policy ON public.important_dates FOR UPDATE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: in_app_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: investor_summary_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.investor_summary_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: late_penalties; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.late_penalties ENABLE ROW LEVEL SECURITY;

--
-- Name: launch_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.launch_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: magic_link_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.magic_link_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: meal_calendar_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meal_calendar_events ENABLE ROW LEVEL SECURITY;

--
-- Name: meal_calendar_events meal_calendar_events_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY meal_calendar_events_access ON public.meal_calendar_events USING ((meal_id IN ( SELECT m.id
   FROM (public.meals m
     JOIN public.space_members sm ON ((m.space_id = sm.space_id)))
  WHERE (sm.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: meal_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: meal_plans meal_plans_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY meal_plans_delete ON public.meal_plans FOR DELETE USING (public.user_has_space_access(space_id));


--
-- Name: meal_plans meal_plans_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY meal_plans_insert ON public.meal_plans FOR INSERT WITH CHECK (public.user_has_space_access(space_id));


--
-- Name: meal_plans meal_plans_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY meal_plans_select ON public.meal_plans FOR SELECT USING (public.user_has_space_access(space_id));


--
-- Name: meal_plans meal_plans_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY meal_plans_update ON public.meal_plans FOR UPDATE USING (public.user_has_space_access(space_id));


--
-- Name: meals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

--
-- Name: mentions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

--
-- Name: message_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: message_mentions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.message_mentions ENABLE ROW LEVEL SECURITY;

--
-- Name: message_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: milestone_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.milestone_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: monetization_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.monetization_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_interactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_interactions ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_interactions notification_interactions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_interactions_insert ON public.notification_interactions FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: notification_interactions notification_interactions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_interactions_select ON public.notification_interactions FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: notification_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_queue notification_queue_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_queue_delete ON public.notification_queue FOR DELETE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: notification_queue notification_queue_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_queue_insert ON public.notification_queue FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: notification_queue notification_queue_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_queue_select ON public.notification_queue FOR SELECT USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: notification_queue notification_queue_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_queue_update ON public.notification_queue FOR UPDATE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: nudge_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nudge_history ENABLE ROW LEVEL SECURITY;

--
-- Name: nudge_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nudge_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: nudge_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nudge_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: partnership_balances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partnership_balances ENABLE ROW LEVEL SECURITY;

--
-- Name: password_reset_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: point_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: privacy_email_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.privacy_email_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: privacy_preference_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.privacy_preference_history ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: project_line_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_line_items ENABLE ROW LEVEL SECURITY;

--
-- Name: project_milestones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

--
-- Name: project_photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_photos ENABLE ROW LEVEL SECURITY;

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: push_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: quick_action_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quick_action_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: quick_action_usage quick_action_usage_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quick_action_usage_delete ON public.quick_action_usage FOR DELETE TO authenticated USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: quick_action_usage quick_action_usage_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quick_action_usage_insert ON public.quick_action_usage FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: quick_action_usage quick_action_usage_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quick_action_usage_select ON public.quick_action_usage FOR SELECT TO authenticated USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: quick_action_usage quick_action_usage_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quick_action_usage_update ON public.quick_action_usage FOR UPDATE TO authenticated USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: receipts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

--
-- Name: recipes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

--
-- Name: recurring_expense_patterns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recurring_expense_patterns ENABLE ROW LEVEL SECURITY;

--
-- Name: recurring_goal_instances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recurring_goal_instances ENABLE ROW LEVEL SECURITY;

--
-- Name: recurring_goal_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recurring_goal_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: reminder_activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reminder_activities ENABLE ROW LEVEL SECURITY;

--
-- Name: reminder_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reminder_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: reminder_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reminder_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: reminder_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reminder_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: reminder_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reminder_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: reminders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

--
-- Name: reminders reminders_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reminders_delete ON public.reminders FOR DELETE USING (public.user_has_space_access(space_id));


--
-- Name: reminders reminders_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reminders_insert ON public.reminders FOR INSERT WITH CHECK (public.user_has_space_access(space_id));


--
-- Name: reminders reminders_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reminders_select ON public.reminders FOR SELECT USING (public.user_has_space_access(space_id));


--
-- Name: reminders reminders_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reminders_update ON public.reminders FOR UPDATE USING (public.user_has_space_access(space_id));


--
-- Name: report_favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.report_favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: report_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: reward_points; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reward_points ENABLE ROW LEVEL SECURITY;

--
-- Name: reward_points reward_points_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reward_points_delete ON public.reward_points FOR DELETE USING ((space_id IN ( SELECT public.get_user_space_ids(( SELECT ( SELECT auth.uid() AS uid) AS uid)) AS get_user_space_ids)));


--
-- Name: reward_points reward_points_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reward_points_insert ON public.reward_points FOR INSERT WITH CHECK ((space_id IN ( SELECT public.get_user_space_ids(( SELECT ( SELECT auth.uid() AS uid) AS uid)) AS get_user_space_ids)));


--
-- Name: reward_points reward_points_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reward_points_select ON public.reward_points FOR SELECT USING ((space_id IN ( SELECT public.get_user_space_ids(( SELECT ( SELECT auth.uid() AS uid) AS uid)) AS get_user_space_ids)));


--
-- Name: reward_points reward_points_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reward_points_update ON public.reward_points FOR UPDATE USING ((space_id IN ( SELECT public.get_user_space_ids(( SELECT ( SELECT auth.uid() AS uid) AS uid)) AS get_user_space_ids)));


--
-- Name: reward_redemptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

--
-- Name: rewards_catalog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rewards_catalog ENABLE ROW LEVEL SECURITY;

--
-- Name: chore_rotations service_role_bypass_chore_rotations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_bypass_chore_rotations ON public.chore_rotations TO service_role USING (true) WITH CHECK (true);


--
-- Name: quick_action_usage service_role_bypass_quick_action_usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_bypass_quick_action_usage ON public.quick_action_usage TO service_role USING (true) WITH CHECK (true);


--
-- Name: subtasks service_role_bypass_subtasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_bypass_subtasks ON public.subtasks TO service_role USING (true) WITH CHECK (true);


--
-- Name: task_approvals service_role_bypass_task_approvals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_bypass_task_approvals ON public.task_approvals TO service_role USING (true) WITH CHECK (true);


--
-- Name: task_attachments service_role_bypass_task_attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_bypass_task_attachments ON public.task_attachments TO service_role USING (true) WITH CHECK (true);


--
-- Name: task_calendar_events service_role_bypass_task_calendar_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_bypass_task_calendar_events ON public.task_calendar_events TO service_role USING (true) WITH CHECK (true);


--
-- Name: task_categories service_role_bypass_task_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_bypass_task_categories ON public.task_categories TO service_role USING (true) WITH CHECK (true);


--
-- Name: task_comment_reactions service_role_bypass_task_comment_reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_bypass_task_comment_reactions ON public.task_comment_reactions TO service_role USING (true) WITH CHECK (true);


--
-- Name: task_comments service_role_bypass_task_comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_bypass_task_comments ON public.task_comments TO service_role USING (true) WITH CHECK (true);


--
-- Name: task_dependencies service_role_bypass_task_dependencies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_bypass_task_dependencies ON public.task_dependencies TO service_role USING (true) WITH CHECK (true);


--
-- Name: task_reactions service_role_bypass_task_reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_bypass_task_reactions ON public.task_reactions TO service_role USING (true) WITH CHECK (true);


--
-- Name: task_reminders service_role_bypass_task_reminders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_bypass_task_reminders ON public.task_reminders TO service_role USING (true) WITH CHECK (true);


--
-- Name: task_snooze_history service_role_bypass_task_snooze_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_bypass_task_snooze_history ON public.task_snooze_history TO service_role USING (true) WITH CHECK (true);


--
-- Name: task_templates service_role_bypass_task_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_bypass_task_templates ON public.task_templates TO service_role USING (true) WITH CHECK (true);


--
-- Name: task_time_entries service_role_bypass_task_time_entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_bypass_task_time_entries ON public.task_time_entries TO service_role USING (true) WITH CHECK (true);


--
-- Name: settlements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

--
-- Name: settlements settlements_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY settlements_delete ON public.settlements FOR DELETE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: settlements settlements_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY settlements_insert ON public.settlements FOR INSERT WITH CHECK ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: settlements settlements_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY settlements_select ON public.settlements FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: settlements settlements_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY settlements_update ON public.settlements FOR UPDATE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: shopping_calendar_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shopping_calendar_events ENABLE ROW LEVEL SECURITY;

--
-- Name: shopping_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;

--
-- Name: shopping_items shopping_items_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shopping_items_delete ON public.shopping_items FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.shopping_lists sl
  WHERE ((sl.id = shopping_items.list_id) AND public.user_has_space_access(sl.space_id)))));


--
-- Name: shopping_items shopping_items_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shopping_items_insert ON public.shopping_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shopping_lists sl
  WHERE ((sl.id = shopping_items.list_id) AND public.user_has_space_access(sl.space_id)))));


--
-- Name: shopping_items shopping_items_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shopping_items_select ON public.shopping_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.shopping_lists sl
  WHERE ((sl.id = shopping_items.list_id) AND public.user_has_space_access(sl.space_id)))));


--
-- Name: shopping_items shopping_items_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shopping_items_update ON public.shopping_items FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.shopping_lists sl
  WHERE ((sl.id = shopping_items.list_id) AND public.user_has_space_access(sl.space_id)))));


--
-- Name: shopping_lists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;

--
-- Name: shopping_lists shopping_lists_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shopping_lists_delete ON public.shopping_lists FOR DELETE USING (public.user_has_space_access(space_id));


--
-- Name: shopping_lists shopping_lists_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shopping_lists_insert ON public.shopping_lists FOR INSERT WITH CHECK (public.user_has_space_access(space_id));


--
-- Name: shopping_lists shopping_lists_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shopping_lists_select ON public.shopping_lists FOR SELECT USING (public.user_has_space_access(space_id));


--
-- Name: shopping_lists shopping_lists_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shopping_lists_update ON public.shopping_lists FOR UPDATE USING (public.user_has_space_access(space_id));


--
-- Name: shopping_reminders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shopping_reminders ENABLE ROW LEVEL SECURITY;

--
-- Name: shopping_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shopping_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: shopping_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shopping_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: site_visits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

--
-- Name: sm_activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sm_activities ENABLE ROW LEVEL SECURITY;

--
-- Name: sm_admin_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sm_admin_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sm_clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sm_clients ENABLE ROW LEVEL SECURITY;

--
-- Name: sm_contact_inquiries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sm_contact_inquiries ENABLE ROW LEVEL SECURITY;

--
-- Name: sm_content; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sm_content ENABLE ROW LEVEL SECURITY;

--
-- Name: sm_deals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sm_deals ENABLE ROW LEVEL SECURITY;

--
-- Name: sm_invoice_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sm_invoice_items ENABLE ROW LEVEL SECURITY;

--
-- Name: sm_invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sm_invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: sm_leads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sm_leads ENABLE ROW LEVEL SECURITY;

--
-- Name: sm_partnership_inquiries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sm_partnership_inquiries ENABLE ROW LEVEL SECURITY;

--
-- Name: sm_proposals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sm_proposals ENABLE ROW LEVEL SECURITY;

--
-- Name: sm_service_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sm_service_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: space_invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.space_invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: space_invitations space_invitations_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY space_invitations_delete ON public.space_invitations FOR DELETE USING (public.user_has_space_access(space_id));


--
-- Name: space_invitations space_invitations_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY space_invitations_insert ON public.space_invitations FOR INSERT WITH CHECK (public.user_has_space_access(space_id));


--
-- Name: space_invitations space_invitations_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY space_invitations_select ON public.space_invitations FOR SELECT USING (public.user_has_space_access(space_id));


--
-- Name: space_invitations space_invitations_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY space_invitations_update ON public.space_invitations FOR UPDATE USING (public.user_has_space_access(space_id));


--
-- Name: space_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.space_members ENABLE ROW LEVEL SECURITY;

--
-- Name: space_members space_members_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY space_members_delete ON public.space_members FOR DELETE USING ((public.check_space_membership(space_id, ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (EXISTS ( SELECT 1
   FROM public.space_members sm
  WHERE ((sm.space_id = space_members.space_id) AND (sm.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (sm.role = 'owner'::text))))));


--
-- Name: space_members space_members_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY space_members_insert ON public.space_members FOR INSERT WITH CHECK (((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND ((NOT (EXISTS ( SELECT 1
   FROM public.space_members sm
  WHERE (sm.space_id = space_members.space_id)))) OR (EXISTS ( SELECT 1
   FROM public.space_members sm
  WHERE ((sm.space_id = space_members.space_id) AND (sm.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (sm.role = ANY (ARRAY['owner'::text, 'admin'::text]))))))));


--
-- Name: space_members space_members_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY space_members_select ON public.space_members FOR SELECT USING ((space_id IN ( SELECT public.get_user_space_ids(( SELECT ( SELECT auth.uid() AS uid) AS uid)) AS get_user_space_ids)));


--
-- Name: space_members space_members_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY space_members_update ON public.space_members FOR UPDATE USING ((space_id IN ( SELECT sm.space_id
   FROM public.space_members sm
  WHERE (sm.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: spaces; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;

--
-- Name: spaces spaces_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY spaces_delete ON public.spaces FOR DELETE USING (public.user_has_space_access(id));


--
-- Name: spaces spaces_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY spaces_select ON public.spaces FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.space_members
  WHERE ((space_members.space_id = spaces.id) AND (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))) OR ((created_at > (now() - '00:00:10'::interval)) AND (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: storage_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.storage_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: storage_usage storage_usage_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY storage_usage_insert ON public.storage_usage FOR INSERT WITH CHECK ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: storage_usage storage_usage_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY storage_usage_select ON public.storage_usage FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: storage_usage storage_usage_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY storage_usage_update ON public.storage_usage FOR UPDATE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: storage_warnings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.storage_warnings ENABLE ROW LEVEL SECURITY;

--
-- Name: storage_warnings storage_warnings_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY storage_warnings_delete ON public.storage_warnings FOR DELETE USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: storage_warnings storage_warnings_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY storage_warnings_insert ON public.storage_warnings FOR INSERT WITH CHECK ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: storage_warnings storage_warnings_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY storage_warnings_select ON public.storage_warnings FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: subscription_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: subtasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

--
-- Name: subtasks subtasks_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subtasks_delete ON public.subtasks FOR DELETE TO authenticated USING ((parent_task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: subtasks subtasks_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subtasks_insert ON public.subtasks FOR INSERT WITH CHECK ((parent_task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: subtasks subtasks_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subtasks_select ON public.subtasks FOR SELECT TO authenticated USING ((parent_task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: subtasks subtasks_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subtasks_update ON public.subtasks FOR UPDATE TO authenticated USING ((parent_task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

--
-- Name: task_approvals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_approvals ENABLE ROW LEVEL SECURITY;

--
-- Name: task_approvals task_approvals_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_approvals_delete ON public.task_approvals FOR DELETE TO authenticated USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_approvals task_approvals_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_approvals_insert ON public.task_approvals FOR INSERT WITH CHECK ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_approvals task_approvals_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_approvals_select ON public.task_approvals FOR SELECT TO authenticated USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_approvals task_approvals_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_approvals_update ON public.task_approvals FOR UPDATE TO authenticated USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: task_attachments task_attachments_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_attachments_delete ON public.task_attachments FOR DELETE TO authenticated USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_attachments task_attachments_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_attachments_insert ON public.task_attachments FOR INSERT WITH CHECK ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_attachments task_attachments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_attachments_select ON public.task_attachments FOR SELECT TO authenticated USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_attachments task_attachments_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_attachments_update ON public.task_attachments FOR UPDATE TO authenticated USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_calendar_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_calendar_events ENABLE ROW LEVEL SECURITY;

--
-- Name: task_calendar_events task_calendar_events_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_calendar_events_delete ON public.task_calendar_events FOR DELETE TO authenticated USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_calendar_events task_calendar_events_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_calendar_events_insert ON public.task_calendar_events FOR INSERT WITH CHECK ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_calendar_events task_calendar_events_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_calendar_events_select ON public.task_calendar_events FOR SELECT TO authenticated USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_calendar_events task_calendar_events_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_calendar_events_update ON public.task_calendar_events FOR UPDATE TO authenticated USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: task_categories task_categories_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_categories_delete ON public.task_categories FOR DELETE TO authenticated USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: task_categories task_categories_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_categories_insert ON public.task_categories FOR INSERT WITH CHECK ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: task_categories task_categories_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_categories_select ON public.task_categories FOR SELECT TO authenticated USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: task_categories task_categories_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_categories_update ON public.task_categories FOR UPDATE TO authenticated USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: task_comment_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_comment_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: task_comment_reactions task_comment_reactions_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_comment_reactions_delete ON public.task_comment_reactions FOR DELETE TO authenticated USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: task_comment_reactions task_comment_reactions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_comment_reactions_insert ON public.task_comment_reactions FOR INSERT WITH CHECK (((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (comment_id IN ( SELECT tc.id
   FROM (public.task_comments tc
     JOIN public.tasks t ON ((tc.task_id = t.id)))
  WHERE (t.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))));


--
-- Name: task_comment_reactions task_comment_reactions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_comment_reactions_select ON public.task_comment_reactions FOR SELECT TO authenticated USING ((comment_id IN ( SELECT tc.id
   FROM (public.task_comments tc
     JOIN public.tasks t ON ((tc.task_id = t.id)))
  WHERE (t.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: task_comments task_comments_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_comments_delete ON public.task_comments FOR DELETE TO authenticated USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: task_comments task_comments_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_comments_insert ON public.task_comments FOR INSERT WITH CHECK ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_comments task_comments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_comments_select ON public.task_comments FOR SELECT TO authenticated USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_comments task_comments_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_comments_update ON public.task_comments FOR UPDATE TO authenticated USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: task_dependencies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

--
-- Name: task_dependencies task_dependencies_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_dependencies_delete ON public.task_dependencies FOR DELETE TO authenticated USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_dependencies task_dependencies_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_dependencies_insert ON public.task_dependencies FOR INSERT WITH CHECK ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_dependencies task_dependencies_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_dependencies_select ON public.task_dependencies FOR SELECT TO authenticated USING (((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))) OR (depends_on_task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))));


--
-- Name: task_dependencies task_dependencies_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_dependencies_update ON public.task_dependencies FOR UPDATE TO authenticated USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: task_reactions task_reactions_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_reactions_delete ON public.task_reactions FOR DELETE TO authenticated USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: task_reactions task_reactions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_reactions_insert ON public.task_reactions FOR INSERT WITH CHECK (((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))));


--
-- Name: task_reactions task_reactions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_reactions_select ON public.task_reactions FOR SELECT TO authenticated USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_reminders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_reminders ENABLE ROW LEVEL SECURITY;

--
-- Name: task_reminders task_reminders_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_reminders_delete ON public.task_reminders FOR DELETE TO authenticated USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_reminders task_reminders_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_reminders_insert ON public.task_reminders FOR INSERT WITH CHECK ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_reminders task_reminders_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_reminders_select ON public.task_reminders FOR SELECT TO authenticated USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_reminders task_reminders_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_reminders_update ON public.task_reminders FOR UPDATE TO authenticated USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_snooze_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_snooze_history ENABLE ROW LEVEL SECURITY;

--
-- Name: task_snooze_history task_snooze_history_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_snooze_history_delete ON public.task_snooze_history FOR DELETE TO authenticated USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_snooze_history task_snooze_history_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_snooze_history_insert ON public.task_snooze_history FOR INSERT WITH CHECK ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_snooze_history task_snooze_history_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_snooze_history_select ON public.task_snooze_history FOR SELECT TO authenticated USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_snooze_history task_snooze_history_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_snooze_history_update ON public.task_snooze_history FOR UPDATE TO authenticated USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: task_tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: task_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: task_templates task_templates_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_templates_delete ON public.task_templates FOR DELETE TO authenticated USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: task_templates task_templates_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_templates_insert ON public.task_templates FOR INSERT WITH CHECK ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: task_templates task_templates_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_templates_select ON public.task_templates FOR SELECT TO authenticated USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: task_templates task_templates_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_templates_update ON public.task_templates FOR UPDATE TO authenticated USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: task_time_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_time_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: task_time_entries task_time_entries_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_time_entries_delete ON public.task_time_entries FOR DELETE TO authenticated USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_time_entries task_time_entries_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_time_entries_insert ON public.task_time_entries FOR INSERT WITH CHECK ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_time_entries task_time_entries_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_time_entries_select ON public.task_time_entries FOR SELECT TO authenticated USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: task_time_entries task_time_entries_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_time_entries_update ON public.task_time_entries FOR UPDATE TO authenticated USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.space_id IN ( SELECT space_members.space_id
           FROM public.space_members
          WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));


--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks tasks_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tasks_delete ON public.tasks FOR DELETE USING (public.user_has_space_access(space_id));


--
-- Name: tasks tasks_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tasks_insert ON public.tasks FOR INSERT WITH CHECK (public.user_has_space_access(space_id));


--
-- Name: tasks tasks_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tasks_select ON public.tasks FOR SELECT USING (public.user_has_space_access(space_id));


--
-- Name: tasks tasks_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tasks_update ON public.tasks FOR UPDATE USING (public.user_has_space_access(space_id));


--
-- Name: typing_indicators; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

--
-- Name: user_achievements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

--
-- Name: user_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: user_feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: user_notification_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_presence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

--
-- Name: user_presence user_presence_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_presence_insert ON public.user_presence FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: user_presence user_presence_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_presence_select ON public.user_presence FOR SELECT USING ((space_id IN ( SELECT space_members.space_id
   FROM public.space_members
  WHERE (space_members.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));


--
-- Name: user_presence user_presence_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_presence_update ON public.user_presence FOR UPDATE USING ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));


--
-- Name: user_privacy_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_privacy_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_insert_own ON public.users FOR INSERT WITH CHECK (((( SELECT ( SELECT auth.uid() AS uid) AS uid) = id) OR (( SELECT ( SELECT auth.uid() AS uid) AS uid) IS NULL)));


--
-- Name: users users_select_no_circular_dependency; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_no_circular_dependency ON public.users FOR SELECT USING (public.can_access_user_profile(id));


--
-- Name: users users_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update_own ON public.users FOR UPDATE USING ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = id)) WITH CHECK ((( SELECT ( SELECT auth.uid() AS uid) AS uid) = id));


--
-- Name: vendors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

--
-- Name: voice_transcriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.voice_transcriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_migrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspace_migrations ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--



-- =============================================================================
-- Custom triggers on auth.users (extracted separately because pg_dump
-- --schema=public skips them — the lesson from PR #387's first attempt)
-- =============================================================================

Found 3 custom triggers on auth.users:

-- Trigger: on_auth_user_created
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger: on_auth_user_created_learn
CREATE TRIGGER on_auth_user_created_learn AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_learn_user();

-- Trigger: on_auth_user_created_provision
CREATE TRIGGER on_auth_user_created_provision AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION provision_new_user();

