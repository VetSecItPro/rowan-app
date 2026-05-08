


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'Function search_path security fixed on 2025-11-28';



CREATE TYPE "public"."activity_type" AS ENUM (
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


ALTER TYPE "public"."activity_type" OWNER TO "postgres";


CREATE TYPE "public"."calendar_provider" AS ENUM (
    'google',
    'apple',
    'cozi'
);


ALTER TYPE "public"."calendar_provider" OWNER TO "postgres";


CREATE TYPE "public"."commentable_type" AS ENUM (
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


ALTER TYPE "public"."commentable_type" OWNER TO "postgres";


CREATE TYPE "public"."presence_status" AS ENUM (
    'online',
    'offline'
);


ALTER TYPE "public"."presence_status" OWNER TO "postgres";


CREATE TYPE "public"."project_priority" AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


ALTER TYPE "public"."project_priority" OWNER TO "postgres";


CREATE TYPE "public"."project_status" AS ENUM (
    'planning',
    'in-progress',
    'on-hold',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."project_status" OWNER TO "postgres";


CREATE TYPE "public"."queue_operation" AS ENUM (
    'create',
    'update',
    'delete'
);


ALTER TYPE "public"."queue_operation" OWNER TO "postgres";


CREATE TYPE "public"."queue_status" AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
);


ALTER TYPE "public"."queue_status" OWNER TO "postgres";


CREATE TYPE "public"."recurrence_frequency" AS ENUM (
    'daily',
    'weekly',
    'bi-weekly',
    'monthly',
    'bi-monthly',
    'quarterly',
    'semi-annual',
    'annual'
);


ALTER TYPE "public"."recurrence_frequency" OWNER TO "postgres";


CREATE TYPE "public"."resolution_status" AS ENUM (
    'detected',
    'resolved',
    'failed'
);


ALTER TYPE "public"."resolution_status" OWNER TO "postgres";


CREATE TYPE "public"."resolution_strategy" AS ENUM (
    'external_wins',
    'rowan_wins',
    'merge',
    'manual_review'
);


ALTER TYPE "public"."resolution_strategy" OWNER TO "postgres";


CREATE TYPE "public"."sync_direction_type" AS ENUM (
    'bidirectional',
    'inbound_only',
    'outbound_only'
);


ALTER TYPE "public"."sync_direction_type" OWNER TO "postgres";


CREATE TYPE "public"."sync_log_status" AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'failed',
    'partial'
);


ALTER TYPE "public"."sync_log_status" OWNER TO "postgres";


CREATE TYPE "public"."sync_status_type" AS ENUM (
    'active',
    'syncing',
    'error',
    'token_expired',
    'disconnected'
);


ALTER TYPE "public"."sync_status_type" OWNER TO "postgres";


CREATE TYPE "public"."sync_type" AS ENUM (
    'full',
    'incremental',
    'manual',
    'webhook_triggered'
);


ALTER TYPE "public"."sync_type" OWNER TO "postgres";


CREATE TYPE "public"."winning_source" AS ENUM (
    'external',
    'rowan',
    'merged',
    'manual'
);


ALTER TYPE "public"."winning_source" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_goal_creator_as_collaborator"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."add_goal_creator_as_collaborator"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."adjust_for_quiet_hours"("p_user_id" "uuid", "p_space_id" "uuid", "p_scheduled_time" timestamp with time zone) RETURNS timestamp with time zone
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."adjust_for_quiet_hours"("p_user_id" "uuid", "p_space_id" "uuid", "p_scheduled_time" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."adjust_for_quiet_hours"("p_user_id" "uuid", "p_space_id" "uuid", "p_scheduled_time" timestamp with time zone) IS 'Adjusts scheduled delivery time if it falls within quiet hours';



CREATE OR REPLACE FUNCTION "public"."aggregate_feature_usage_daily"("target_date" "date" DEFAULT (CURRENT_DATE - '1 day'::interval)) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."aggregate_feature_usage_daily"("target_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_budget_template"("p_space_id" "uuid", "p_template_id" "uuid", "p_monthly_income" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- SECURITY CHECK: Verify the calling user is a member of the space
  IF NOT EXISTS (
    SELECT 1 FROM space_members
    WHERE space_id = p_space_id
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: User is not a member of this space';
  END IF;

  -- Validate template exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM budget_templates
    WHERE id = p_template_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid template: Template does not exist or is not active';
  END IF;

  -- Validate monthly income is positive and reasonable
  IF p_monthly_income <= 0 OR p_monthly_income > 10000000 THEN
    RAISE EXCEPTION 'Invalid income: Must be between 0 and 10,000,000';
  END IF;

  -- Delete existing budget categories for this space
  -- RLS is bypassed by SECURITY DEFINER, but we've already validated membership above
  DELETE FROM budget_categories WHERE space_id = p_space_id;

  -- Create new budget categories based on template
  INSERT INTO budget_categories (space_id, category_name, allocated_amount, icon, color)
  SELECT
    p_space_id,
    category_name,
    ROUND((p_monthly_income * percentage / 100), 2),
    icon,
    color
  FROM budget_template_categories
  WHERE template_id = p_template_id
  ORDER BY sort_order;

  -- Update the main budget amount if exists
  UPDATE budgets
  SET monthly_budget = p_monthly_income,
      updated_at = NOW()
  WHERE space_id = p_space_id;

  -- Insert budget if it doesn't exist
  -- Only insert if user is a member (already verified above)
  INSERT INTO budgets (space_id, monthly_budget, created_by)
  SELECT p_space_id, p_monthly_income, auth.uid()
  WHERE NOT EXISTS (
    SELECT 1 FROM budgets WHERE space_id = p_space_id
  );
END;
$$;


ALTER FUNCTION "public"."apply_budget_template"("p_space_id" "uuid", "p_template_id" "uuid", "p_monthly_income" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."apply_budget_template"("p_space_id" "uuid", "p_template_id" "uuid", "p_monthly_income" numeric) IS 'Applies a budget template to a space based on monthly income.
Validates user is a space member before making changes.
Security: DEFINER mode with explicit space membership validation.';



CREATE OR REPLACE FUNCTION "public"."assign_goal_priority_order"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."assign_goal_priority_order"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_task_sort_order"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  max_order INTEGER;
BEGIN
  IF NEW.sort_order = 0 OR NEW.sort_order IS NULL THEN
    -- Remove FOR UPDATE - can't use it with MAX()
    -- SECURITY DEFINER bypasses RLS so we don't need row locking
    SELECT COALESCE(MAX(sort_order), 0) + 1
    INTO max_order
    FROM public.tasks
    WHERE space_id = NEW.space_id;

    NEW.sort_order = max_order;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."assign_task_sort_order"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_archive_old_events"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events') THEN
    UPDATE calendar_events
    SET archived = TRUE, archived_at = NOW()
    WHERE end_time < NOW() - INTERVAL '90 days'
      AND archived = FALSE;
  END IF;
END;
$$;


ALTER FUNCTION "public"."auto_archive_old_events"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_archive_old_events"() IS 'Automatically archives calendar events older than 90 days. Run monthly via cron job.';



CREATE OR REPLACE FUNCTION "public"."auto_archive_old_tasks"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    UPDATE tasks
    SET archived = TRUE, archived_at = NOW()
    WHERE completed = TRUE
      AND completed_at < NOW() - INTERVAL '90 days'
      AND archived = FALSE;
  END IF;
END;
$$;


ALTER FUNCTION "public"."auto_archive_old_tasks"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_archive_old_tasks"() IS 'Automatically archives completed tasks older than 90 days. Run monthly via cron job.';



CREATE OR REPLACE FUNCTION "public"."auto_complete_on_approval"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."auto_complete_on_approval"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_complete_shopping_tasks"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."auto_complete_shopping_tasks"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_create_bill_calendar_event"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only create event for recurring expenses
  IF (NEW.is_recurring = TRUE OR NEW.recurring = TRUE) AND NEW.event_id IS NULL THEN
    PERFORM create_bill_calendar_event(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_create_bill_calendar_event"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_generate_habit_instances"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  template_record recurring_goal_templates%ROWTYPE;
  total_generated INTEGER := 0;
BEGIN
  -- Generate instances for all active habit templates
  FOR template_record IN
    SELECT * FROM recurring_goal_templates
    WHERE is_active = true AND is_habit = true
  LOOP
    total_generated := total_generated + generate_recurring_instances(template_record.id);
  END LOOP;

  RETURN total_generated;
END;
$$;


ALTER FUNCTION "public"."auto_generate_habit_instances"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_unsnooze_expired_tasks"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."auto_unsnooze_expired_tasks"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_expense_splits"("p_expense_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_expense RECORD;
  v_space_id UUID;
  v_users UUID[];
  v_user1_id UUID;
  v_user2_id UUID;
  v_amount DECIMAL(10, 2);
  v_split_type TEXT;
  v_user1_amount DECIMAL(10, 2);
  v_user2_amount DECIMAL(10, 2);
  v_user1_income DECIMAL(12, 2);
  v_user2_income DECIMAL(12, 2);
  v_total_income DECIMAL(12, 2);
BEGIN
  -- Get expense details
  SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id;

  IF NOT FOUND OR v_expense.is_split = false THEN
    RETURN;
  END IF;

  v_space_id := v_expense.space_id;
  v_amount := v_expense.amount;
  v_split_type := v_expense.split_type;

  -- Get the two users in the space
  SELECT ARRAY_AGG(user_id) INTO v_users
  FROM space_members
  WHERE space_id = v_space_id
  LIMIT 2;

  IF ARRAY_LENGTH(v_users, 1) < 2 THEN
    RETURN; -- Need at least 2 users to split
  END IF;

  v_user1_id := v_users[1];
  v_user2_id := v_users[2];

  -- Calculate split amounts based on type
  CASE v_split_type
    WHEN 'equal' THEN
      v_user1_amount := v_amount / 2;
      v_user2_amount := v_amount / 2;

    WHEN 'percentage' THEN
      v_user1_amount := (v_amount * COALESCE(v_expense.split_percentage_user1, 50)) / 100;
      v_user2_amount := (v_amount * COALESCE(v_expense.split_percentage_user2, 50)) / 100;

    WHEN 'fixed' THEN
      v_user1_amount := COALESCE(v_expense.split_amount_user1, v_amount / 2);
      v_user2_amount := COALESCE(v_expense.split_amount_user2, v_amount / 2);

    WHEN 'income-based' THEN
      -- Get incomes from partnership_balances
      SELECT user1_income, user2_income INTO v_user1_income, v_user2_income
      FROM partnership_balances pb
      INNER JOIN spaces s ON pb.space_id = s.id
      WHERE s.id = v_space_id
      LIMIT 1;

      IF v_user1_income IS NOT NULL AND v_user2_income IS NOT NULL THEN
        v_total_income := v_user1_income + v_user2_income;
        IF v_total_income > 0 THEN
          v_user1_amount := (v_amount * v_user1_income) / v_total_income;
          v_user2_amount := (v_amount * v_user2_income) / v_total_income;
        ELSE
          -- Fallback to equal split if no income data
          v_user1_amount := v_amount / 2;
          v_user2_amount := v_amount / 2;
        END IF;
      ELSE
        -- Fallback to equal split if no income data
        v_user1_amount := v_amount / 2;
        v_user2_amount := v_amount / 2;
      END IF;

    ELSE
      -- Default to equal split
      v_user1_amount := v_amount / 2;
      v_user2_amount := v_amount / 2;
  END CASE;

  -- Delete existing splits for this expense
  DELETE FROM expense_splits WHERE expense_id = p_expense_id;

  -- Create new splits
  INSERT INTO expense_splits (expense_id, user_id, amount_owed, percentage, is_payer)
  VALUES
    (p_expense_id, v_user1_id, v_user1_amount, (v_user1_amount / v_amount) * 100, v_expense.paid_by = v_user1_id),
    (p_expense_id, v_user2_id, v_user2_amount, (v_user2_amount / v_amount) * 100, v_expense.paid_by = v_user2_id);

  -- Update amount_paid for the payer
  IF v_expense.paid_by IS NOT NULL THEN
    UPDATE expense_splits
    SET amount_paid = amount_owed, status = 'settled'
    WHERE expense_id = p_expense_id AND user_id = v_expense.paid_by;
  END IF;

END;
$$;


ALTER FUNCTION "public"."calculate_expense_splits"("p_expense_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_goal_completion_date"("p_goal_id" "uuid") RETURNS "date"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."calculate_goal_completion_date"("p_goal_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_late_penalty"("p_due_date" timestamp with time zone, "p_completion_date" timestamp with time zone, "p_grace_period_hours" integer, "p_base_penalty" integer, "p_progressive" boolean DEFAULT true, "p_multiplier" numeric DEFAULT 1.5, "p_max_penalty" integer DEFAULT 50) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_deadline TIMESTAMPTZ;
  v_days_late INTEGER;
  v_penalty INTEGER;
BEGIN
  -- Calculate deadline (due_date + grace period)
  v_deadline := p_due_date + (p_grace_period_hours || ' hours')::INTERVAL;

  -- If completed before deadline, no penalty
  IF p_completion_date <= v_deadline THEN
    RETURN 0;
  END IF;

  -- Calculate days late (rounded up)
  v_days_late := CEIL(EXTRACT(EPOCH FROM (p_completion_date - v_deadline)) / 86400);

  -- Calculate penalty
  IF p_progressive THEN
    -- Progressive: base * multiplier^(days-1), capped
    v_penalty := LEAST(
      CEIL(p_base_penalty * POWER(p_multiplier, v_days_late - 1)),
      p_max_penalty
    );
  ELSE
    -- Flat: base * days, capped
    v_penalty := LEAST(p_base_penalty * v_days_late, p_max_penalty);
  END IF;

  RETURN v_penalty;
END;
$$;


ALTER FUNCTION "public"."calculate_late_penalty"("p_due_date" timestamp with time zone, "p_completion_date" timestamp with time zone, "p_grace_period_hours" integer, "p_base_penalty" integer, "p_progressive" boolean, "p_multiplier" numeric, "p_max_penalty" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_next_checkin_date"("frequency" "text", "day_of_week" integer DEFAULT NULL::integer, "day_of_month" integer DEFAULT NULL::integer, "reminder_time" "text" DEFAULT '09:00'::"text", "from_date" timestamp with time zone DEFAULT "now"()) RETURNS timestamp with time zone
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  next_date TIMESTAMP WITH TIME ZONE;
  current_time TIME;
  target_time TIME;
BEGIN
  -- Parse reminder time
  target_time := reminder_time::TIME;

  CASE frequency
    WHEN 'daily' THEN
      -- For daily: next occurrence at the specified time
      next_date := DATE_TRUNC('day', from_date) + target_time;

      -- If we've already passed today's time, move to tomorrow
      IF next_date <= from_date THEN
        next_date := next_date + INTERVAL '1 day';
      END IF;

    WHEN 'weekly' THEN
      -- For weekly: next occurrence on the specified day of week
      IF day_of_week IS NULL THEN
        RAISE EXCEPTION 'day_of_week is required for weekly frequency';
      END IF;

      -- Calculate days until target day of week (0=Sunday, 6=Saturday)
      next_date := DATE_TRUNC('day', from_date) + target_time;
      next_date := next_date + (
        (day_of_week - EXTRACT(DOW FROM next_date)::INTEGER + 7) % 7
      ) * INTERVAL '1 day';

      -- If we've already passed this week's time, move to next week
      IF next_date <= from_date THEN
        next_date := next_date + INTERVAL '7 days';
      END IF;

    WHEN 'biweekly' THEN
      -- For bi-weekly: same as weekly but add 14 days instead of 7
      IF day_of_week IS NULL THEN
        RAISE EXCEPTION 'day_of_week is required for biweekly frequency';
      END IF;

      next_date := DATE_TRUNC('day', from_date) + target_time;
      next_date := next_date + (
        (day_of_week - EXTRACT(DOW FROM next_date)::INTEGER + 7) % 7
      ) * INTERVAL '1 day';

      -- If we've already passed this period's time, move to next period
      IF next_date <= from_date THEN
        next_date := next_date + INTERVAL '14 days';
      END IF;

    WHEN 'monthly' THEN
      -- For monthly: next occurrence on the specified day of month
      IF day_of_month IS NULL THEN
        RAISE EXCEPTION 'day_of_month is required for monthly frequency';
      END IF;

      -- Start with current month
      next_date := DATE_TRUNC('month', from_date) +
                  (LEAST(day_of_month, EXTRACT(DAY FROM DATE_TRUNC('month', from_date) + INTERVAL '1 month' - INTERVAL '1 day')) - 1) * INTERVAL '1 day' +
                  target_time;

      -- If we've already passed this month's time, move to next month
      IF next_date <= from_date THEN
        next_date := DATE_TRUNC('month', from_date) + INTERVAL '1 month' +
                    (LEAST(day_of_month, EXTRACT(DAY FROM DATE_TRUNC('month', from_date) + INTERVAL '2 months' - INTERVAL '1 day')) - 1) * INTERVAL '1 day' +
                    target_time;
      END IF;

    ELSE
      RAISE EXCEPTION 'Invalid frequency: %. Must be daily, weekly, biweekly, or monthly', frequency;
  END CASE;

  RETURN next_date;
END;
$$;


ALTER FUNCTION "public"."calculate_next_checkin_date"("frequency" "text", "day_of_week" integer, "day_of_month" integer, "reminder_time" "text", "from_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_next_delivery_time"("p_frequency" "text", "p_base_time" timestamp with time zone DEFAULT "now"()) RETURNS timestamp with time zone
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."calculate_next_delivery_time"("p_frequency" "text", "p_base_time" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_next_delivery_time"("p_frequency" "text", "p_base_time" timestamp with time zone) IS 'Calculates next delivery time based on notification frequency (instant/hourly/daily)';



CREATE OR REPLACE FUNCTION "public"."calculate_next_due_date"("current_due_date" "date", "bill_frequency" "text") RETURNS "date"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."calculate_next_due_date"("current_due_date" "date", "bill_frequency" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_next_occurrence"("recurrence_type" "text", "recurrence_pattern" "jsonb", "from_date" "date" DEFAULT CURRENT_DATE) RETURNS "date"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  next_date DATE;
  pattern JSONB;
BEGIN
  pattern := recurrence_pattern;

  CASE recurrence_type
    WHEN 'daily' THEN
      -- Daily recurrence: every N days
      next_date := from_date + INTERVAL '1 day' * COALESCE((pattern->>'interval')::INTEGER, 1);

    WHEN 'weekly' THEN
      -- Weekly recurrence: specific days of week
      DECLARE
        days_of_week INTEGER[];
        target_day INTEGER;
        days_ahead INTEGER;
        found BOOLEAN := FALSE;
      BEGIN
        -- Get array of days (0=Sunday, 6=Saturday)
        SELECT ARRAY(SELECT jsonb_array_elements_text(pattern->'days_of_week')::INTEGER) INTO days_of_week;

        -- Find next occurrence
        FOR i IN 0..13 LOOP -- Check up to 2 weeks ahead
          target_day := EXTRACT(DOW FROM from_date + i)::INTEGER;
          IF target_day = ANY(days_of_week) AND (from_date + i) > from_date THEN
            next_date := from_date + i;
            found := TRUE;
            EXIT;
          END IF;
        END LOOP;

        IF NOT found THEN
          next_date := from_date + 7; -- Fallback to next week
        END IF;
      END;

    WHEN 'monthly' THEN
      -- Monthly recurrence: specific day of month
      DECLARE
        target_day INTEGER;
      BEGIN
        target_day := COALESCE((pattern->>'day_of_month')::INTEGER, EXTRACT(DAY FROM from_date)::INTEGER);

        -- Try current month first
        next_date := DATE_TRUNC('month', from_date) + INTERVAL '1 month' - INTERVAL '1 day';
        next_date := DATE_TRUNC('month', next_date) + (target_day - 1) * INTERVAL '1 day';

        -- If that's in the past or today, move to next month
        IF next_date <= from_date THEN
          next_date := DATE_TRUNC('month', from_date) + INTERVAL '1 month';
          next_date := next_date + (target_day - 1) * INTERVAL '1 day';
        END IF;
      END;

    WHEN 'custom' THEN
      -- Custom recurrence pattern
      next_date := from_date + INTERVAL '1 day'; -- Fallback

    ELSE
      next_date := from_date + INTERVAL '1 day';
  END CASE;

  RETURN next_date;
END;
$$;


ALTER FUNCTION "public"."calculate_next_occurrence"("recurrence_type" "text", "recurrence_pattern" "jsonb", "from_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_reminder_time"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."calculate_reminder_time"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_space_storage"("p_space_id" "uuid") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_total_bytes BIGINT;
  v_file_count INTEGER;
BEGIN
  -- Calculate from Supabase Storage
  -- This is a placeholder - actual implementation will query storage.objects
  SELECT
    COALESCE(SUM(metadata->>'size')::BIGINT, 0),
    COUNT(*)
  INTO v_total_bytes, v_file_count
  FROM storage.objects
  WHERE bucket_id = 'space-files'
    AND (metadata->>'space_id')::UUID = p_space_id;

  -- Upsert into storage_usage
  INSERT INTO storage_usage (space_id, total_bytes, file_count, last_calculated_at)
  VALUES (p_space_id, v_total_bytes, v_file_count, NOW())
  ON CONFLICT (space_id)
  DO UPDATE SET
    total_bytes = EXCLUDED.total_bytes,
    file_count = EXCLUDED.file_count,
    last_calculated_at = EXCLUDED.last_calculated_at,
    updated_at = NOW();

  RETURN v_total_bytes;
END;
$$;


ALTER FUNCTION "public"."calculate_space_storage"("p_space_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_space_storage"("p_space_id" "uuid") IS 'Calculates and updates total storage used by a space';



CREATE OR REPLACE FUNCTION "public"."calculate_sync_duration"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    NEW.duration_ms := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_sync_duration"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_sync_priority"("p_event_id" "uuid", "p_operation" "public"."queue_operation") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."calculate_sync_priority"("p_event_id" "uuid", "p_operation" "public"."queue_operation") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_time_entry_duration"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.end_time IS NOT NULL THEN
    NEW.duration = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_time_entry_duration"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_user_profile"("target_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Fast path: always allow access to own profile
  -- This prevents circular dependency during authentication
  IF auth.uid() = target_user_id THEN
    RETURN TRUE;
  END IF;

  -- Secondary path: check if users share any spaces
  -- This only runs for cross-user profile access
  RETURN EXISTS (
    SELECT 1
    FROM space_members sm1
    JOIN space_members sm2 ON sm1.space_id = sm2.space_id
    WHERE sm1.user_id = auth.uid()
      AND sm2.user_id = target_user_id
  );
END;
$$;


ALTER FUNCTION "public"."can_access_user_profile"("target_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_access_user_profile"("target_user_id" "uuid") IS 'Function to check user profile access with guaranteed evaluation order. Fast path for own profile prevents circular dependency during authentication.';



CREATE OR REPLACE FUNCTION "public"."check_and_award_badges"("p_user_id" "uuid", "p_space_id" "uuid", "p_trigger_type" "text" DEFAULT 'goal_completed'::"text") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."check_and_award_badges"("p_user_id" "uuid", "p_space_id" "uuid", "p_trigger_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_and_award_badges"("p_user_id" "uuid", "p_space_id" "uuid", "p_trigger_type" "text") IS 'Evaluates badge criteria and awards eligible badges to users';



CREATE OR REPLACE FUNCTION "public"."check_calendar_index_health"() RETURNS TABLE("table_name" "text", "index_name" "text", "index_size" "text", "index_scans" bigint, "last_used" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname || '.' || tablename AS table_name,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan AS index_scans,
    stats_reset AS last_used
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
    AND tablename IN (
      'calendar_connections',
      'calendar_event_mappings',
      'calendar_sync_logs',
      'calendar_sync_conflicts',
      'calendar_webhook_subscriptions'
    )
  ORDER BY tablename, indexname;
END;
$$;


ALTER FUNCTION "public"."check_calendar_index_health"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_calendar_index_health"() IS 'Checks index usage statistics for calendar tables';



CREATE OR REPLACE FUNCTION "public"."check_circular_dependency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."check_circular_dependency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_goal_circular_dependency"("p_goal_id" "uuid", "p_depends_on_goal_id" "uuid", "p_space_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."check_goal_circular_dependency"("p_goal_id" "uuid", "p_depends_on_goal_id" "uuid", "p_space_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_goal_circular_dependency"("p_goal_id" "uuid", "p_depends_on_goal_id" "uuid", "p_space_id" "uuid") IS 'Detects circular dependencies to prevent infinite loops';



CREATE OR REPLACE FUNCTION "public"."check_is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND au.is_active = true
  )
$$;


ALTER FUNCTION "public"."check_is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_meal_plan_task_uniqueness"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."check_meal_plan_task_uniqueness"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_milestone_completion"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."check_milestone_completion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_parent_task_completion"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."check_parent_task_completion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_space_membership"("p_space_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM space_members
    WHERE space_id = p_space_id AND user_id = p_user_id
  );
$$;


ALTER FUNCTION "public"."check_space_membership"("p_space_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_storage_quota"("p_space_id" "uuid", "p_file_size_bytes" bigint) RETURNS TABLE("allowed" boolean, "current_bytes" bigint, "limit_bytes" bigint, "available_bytes" bigint, "percentage_used" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_bytes BIGINT;
  v_limit_gb NUMERIC;
  v_limit_bytes BIGINT;
  v_tier TEXT;
BEGIN
  -- Get current usage
  SELECT COALESCE(total_bytes, 0)
  INTO v_current_bytes
  FROM storage_usage
  WHERE space_id = p_space_id;

  -- Get space's subscription tier storage limit
  SELECT
    COALESCE(s.tier, 'free')
  INTO v_tier
  FROM spaces sp
  LEFT JOIN subscriptions s ON s.user_id = sp.owner_id AND s.status = 'active'
  WHERE sp.id = p_space_id;

  -- Convert tier to GB limit
  v_limit_gb := CASE v_tier
    WHEN 'free' THEN 0.5
    WHEN 'pro' THEN 5
    WHEN 'family' THEN 15
    ELSE 0.5
  END;

  -- Convert to bytes
  v_limit_bytes := (v_limit_gb * 1024 * 1024 * 1024)::BIGINT;

  -- Return check results
  RETURN QUERY SELECT
    (v_current_bytes + p_file_size_bytes) <= v_limit_bytes as allowed,
    v_current_bytes as current_bytes,
    v_limit_bytes as limit_bytes,
    v_limit_bytes - v_current_bytes as available_bytes,
    ROUND((v_current_bytes::NUMERIC / v_limit_bytes::NUMERIC) * 100, 2) as percentage_used;
END;
$$;


ALTER FUNCTION "public"."check_storage_quota"("p_space_id" "uuid", "p_file_size_bytes" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_storage_quota"("p_space_id" "uuid", "p_file_size_bytes" bigint) IS 'Checks if a space has enough quota for a file upload';



CREATE OR REPLACE FUNCTION "public"."claim_founding_member_number"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  claimed_number INTEGER;
BEGIN
  -- Lock the counter row and increment if under limit
  UPDATE founding_member_counter
  SET
    current_count = current_count + 1,
    updated_at = NOW()
  WHERE id = 1 AND current_count < max_count
  RETURNING current_count INTO claimed_number;

  RETURN claimed_number;
END;
$$;


ALTER FUNCTION "public"."claim_founding_member_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_all_audit_logs"() RETURNS TABLE("log_table" "text", "deleted_rows" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 'account_deletion_audit_log'::text, cleanup_account_deletion_audit_log()
  UNION ALL
  SELECT 'ccpa_audit_log'::text, cleanup_ccpa_audit_log()
  UNION ALL
  SELECT 'user_audit_log'::text, cleanup_user_audit_log();
END;
$$;


ALTER FUNCTION "public"."cleanup_all_audit_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_completed_queue_items"() RETURNS integer
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."cleanup_completed_queue_items"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_completed_queue_items"() IS 'Deletes completed queue items older than 7 days';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_sessions"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM user_sessions
  WHERE expires_at < NOW()
    OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '7 days');
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_shopping_tasks"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."cleanup_expired_shopping_tasks"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_audit_logs"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM user_audit_log
  WHERE created_at < NOW() - INTERVAL '2 years';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_audit_logs"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_audit_logs"() IS 'Deletes audit logs older than 2 years. Run via cron job monthly.';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_feature_events"("retention_days" integer DEFAULT 30) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."cleanup_old_feature_events"("retention_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_notifications"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notification_queue
  WHERE status IN ('sent', 'failed')
  AND created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_notifications"("days_to_keep" integer DEFAULT 30) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."cleanup_old_notifications"("days_to_keep" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_quick_action_usage"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM quick_action_usage
  WHERE used_at < NOW() - INTERVAL '90 days';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_quick_action_usage"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_reports"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."cleanup_old_reports"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_sync_logs"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM calendar_sync_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_sync_logs"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_sync_logs"() IS 'Call from cron to delete logs older than 90 days';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_typing_indicators"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM typing_indicators
  WHERE last_typed_at < NOW() - INTERVAL '10 seconds';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_typing_indicators"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_bill_calendar_event"("p_expense_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."create_bill_calendar_event"("p_expense_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_checkin_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  goal_record goals%ROWTYPE;
BEGIN
  -- Get the associated goal
  SELECT * INTO goal_record FROM goals WHERE id = NEW.goal_id;

  -- Create activity for new check-in
  IF TG_OP = 'INSERT' THEN
    INSERT INTO goal_activities (
      space_id,
      goal_id,
      check_in_id,
      user_id,
      activity_type,
      title,
      description,
      entity_title,
      entity_type,
      activity_data
    ) VALUES (
      goal_record.space_id,
      NEW.goal_id,
      NEW.id,
      NEW.user_id,
      'check_in_created',
      'Added check-in',
      format('Check-in added for "%s"', goal_record.title),
      goal_record.title,
      'check_in',
      jsonb_build_object(
        'goal_title', goal_record.title,
        'progress_percentage', NEW.progress_percentage,
        'mood', NEW.mood,
        'need_help', NEW.need_help_from_partner,
        'has_notes', CASE WHEN NEW.notes IS NOT NULL AND NEW.notes != '' THEN true ELSE false END,
        'has_voice_note', CASE WHEN NEW.voice_note_url IS NOT NULL THEN true ELSE false END
      )
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_checkin_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_checkin_reaction_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  checkin_record goal_check_ins%ROWTYPE;
  goal_record goals%ROWTYPE;
BEGIN
  -- Get the check-in and goal information
  SELECT * INTO checkin_record FROM goal_check_ins WHERE id = NEW.check_in_id;
  SELECT * INTO goal_record FROM goals WHERE id = checkin_record.goal_id;

  -- Create activity for reaction (but not for every single reaction to avoid spam)
  -- Only create activity for the first few reactions of each type
  IF TG_OP = 'INSERT' THEN
    -- Count existing reactions of this emoji for this check-in
    DECLARE
      reaction_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO reaction_count
      FROM goal_check_in_reactions
      WHERE check_in_id = NEW.check_in_id AND emoji = NEW.emoji;

      -- Only create activity for first reaction of each emoji type to avoid spam
      IF reaction_count <= 1 THEN
        INSERT INTO goal_activities (
          space_id,
          goal_id,
          check_in_id,
          user_id,
          activity_type,
          title,
          description,
          entity_title,
          entity_type,
          activity_data
        ) VALUES (
          goal_record.space_id,
          checkin_record.goal_id,
          NEW.check_in_id,
          NEW.user_id,
          'check_in_updated',
          'Reacted to check-in',
          format('Added %s reaction to check-in for "%s"', NEW.emoji, goal_record.title),
          goal_record.title,
          'check_in_reaction',
          jsonb_build_object(
            'goal_title', goal_record.title,
            'emoji', NEW.emoji,
            'reaction_type', 'add'
          )
        );
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_checkin_reaction_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_notification_preferences"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."create_default_notification_preferences"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_privacy_preferences"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."create_default_privacy_preferences"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_financial_goal_milestones"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."create_financial_goal_milestones"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_goal_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Handle goal creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO goal_activities (
      space_id,
      goal_id,
      user_id,
      activity_type,
      title,
      description,
      entity_title,
      entity_type,
      activity_data
    ) VALUES (
      NEW.space_id,
      NEW.id,
      NEW.created_by,
      'goal_created',
      'Created goal',
      'A new goal was created',
      NEW.title,
      'goal',
      jsonb_build_object(
        'goal_title', NEW.title,
        'goal_category', NEW.category,
        'target_date', NEW.target_date
      )
    );
    RETURN NEW;
  END IF;

  -- Handle goal completion
  IF TG_OP = 'UPDATE' THEN
    -- Check if goal was just completed
    IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
      INSERT INTO goal_activities (
        space_id,
        goal_id,
        user_id,
        activity_type,
        title,
        description,
        entity_title,
        entity_type,
        activity_data
      ) VALUES (
        NEW.space_id,
        NEW.id,
        auth.uid(), -- User who completed it
        'goal_completed',
        'Completed goal',
        'Goal was marked as completed',
        NEW.title,
        'goal',
        jsonb_build_object(
          'goal_title', NEW.title,
          'completion_date', NEW.completed_at,
          'progress', NEW.progress
        )
      );
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."create_goal_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_in_app_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_content" "text", "p_partnership_id" "uuid" DEFAULT NULL::"uuid", "p_priority" "text" DEFAULT 'normal'::"text", "p_space_id" "uuid" DEFAULT NULL::"uuid", "p_space_name" "text" DEFAULT NULL::"text", "p_related_item_id" "uuid" DEFAULT NULL::"uuid", "p_related_item_type" "text" DEFAULT NULL::"text", "p_action_url" "text" DEFAULT NULL::"text", "p_emoji" "text" DEFAULT NULL::"text", "p_sender_id" "uuid" DEFAULT NULL::"uuid", "p_sender_name" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."create_in_app_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_content" "text", "p_partnership_id" "uuid", "p_priority" "text", "p_space_id" "uuid", "p_space_name" "text", "p_related_item_id" "uuid", "p_related_item_type" "text", "p_action_url" "text", "p_emoji" "text", "p_sender_id" "uuid", "p_sender_name" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_mention_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."create_mention_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_milestone_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  goal_record goals%ROWTYPE;
BEGIN
  -- Get the associated goal
  SELECT * INTO goal_record FROM goals WHERE id = NEW.goal_id;

  -- Handle milestone completion
  IF TG_OP = 'UPDATE' AND OLD.completed = FALSE AND NEW.completed = TRUE THEN
    INSERT INTO goal_activities (
      space_id,
      goal_id,
      milestone_id,
      user_id,
      activity_type,
      title,
      description,
      entity_title,
      entity_type,
      activity_data
    ) VALUES (
      goal_record.space_id,
      NEW.goal_id,
      NEW.id,
      auth.uid(),
      'milestone_completed',
      'Completed milestone',
      format('Milestone "%s" was completed', NEW.title),
      NEW.title,
      'milestone',
      jsonb_build_object(
        'milestone_title', NEW.title,
        'goal_title', goal_record.title,
        'completion_date', NEW.completed_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_milestone_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."create_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_voice_transcription_entry"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only create transcription entry if voice note URL exists
  IF NEW.voice_note_url IS NOT NULL AND NEW.voice_note_url != '' THEN
    -- Insert placeholder transcription entry that can be updated later
    INSERT INTO voice_transcriptions (
      user_id,
      goal_check_in_id,
      transcription,
      confidence,
      duration
    ) VALUES (
      NEW.user_id,
      NEW.id,
      '', -- Will be updated when transcription is complete
      0.0,
      COALESCE(NEW.voice_note_duration, 0)
    );

    -- Increment template usage if template was used
    IF NEW.voice_note_template_id IS NOT NULL THEN
      PERFORM increment_template_usage(NEW.voice_note_template_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_voice_transcription_entry"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."current_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."days_overdue"("p_due_date" timestamp with time zone, "p_grace_period_hours" integer DEFAULT 2) RETURNS integer
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."days_overdue"("p_due_date" timestamp with time zone, "p_grace_period_hours" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."deactivate_webhook"("p_webhook_id" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE calendar_webhook_subscriptions
  SET is_active = FALSE
  WHERE webhook_id = p_webhook_id;
END;
$$;


ALTER FUNCTION "public"."deactivate_webhook"("p_webhook_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_bill_calendar_event"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- If expense has an associated event, delete it
  IF OLD.event_id IS NOT NULL THEN
    DELETE FROM events WHERE id = OLD.event_id;
  END IF;

  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."delete_bill_calendar_event"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_calendar_event_for_meal"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  DELETE FROM events WHERE id IN (
    SELECT event_id FROM meal_calendar_events WHERE meal_id = OLD.id
  );
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."delete_calendar_event_for_meal"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_oauth_tokens"("p_connection_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'vault'
    AS $$
DECLARE
  v_access_token_name TEXT;
  v_refresh_token_name TEXT;
BEGIN
  v_access_token_name := 'calendar_' || p_connection_id::TEXT || '_access_token';
  v_refresh_token_name := 'calendar_' || p_connection_id::TEXT || '_refresh_token';

  -- Delete both tokens
  DELETE FROM vault.secrets WHERE name IN (v_access_token_name, v_refresh_token_name);
END;
$$;


ALTER FUNCTION "public"."delete_oauth_tokens"("p_connection_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_oauth_tokens"("p_connection_id" "uuid") IS 'Removes all OAuth tokens for a connection from vault';



CREATE OR REPLACE FUNCTION "public"."extract_mentions_from_comment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."extract_mentions_from_comment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fix_orphaned_users"() RETURNS TABLE("user_id" "uuid", "action" "text", "space_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  orphan RECORD;
  new_space_id UUID;
  space_name_to_use TEXT;
BEGIN
  -- Find users without any space membership
  FOR orphan IN
    SELECT u.id, u.name, u.email
    FROM public.users u
    LEFT JOIN space_members sm ON sm.user_id = u.id
    WHERE sm.user_id IS NULL
  LOOP
    -- Get space name from auth metadata if available
    space_name_to_use := COALESCE(
      (
        SELECT raw_user_meta_data->>'space_name'
        FROM auth.users
        WHERE id = orphan.id
      ),
      orphan.name || '''s Space'
    );

    -- Create space
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

    -- Add membership
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

    -- Return result
    user_id := orphan.id;
    action := 'Created workspace';
    space_id := new_space_id;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;


ALTER FUNCTION "public"."fix_orphaned_users"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fix_orphaned_users"() IS 'Utility function to fix any existing orphaned users (users without space membership). Run with service_role permissions.';



CREATE OR REPLACE FUNCTION "public"."generate_recurring_instances"("template_id_param" "uuid", "until_date" "date" DEFAULT (CURRENT_DATE + '30 days'::interval)) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  template_record recurring_goal_templates%ROWTYPE;
  cur_date DATE; -- renamed from `current_date` (reserved keyword in newer Postgres)
  next_date DATE;
  instances_created INTEGER := 0;
  instance_exists BOOLEAN;
BEGIN
  -- Get template details
  SELECT * INTO template_record FROM recurring_goal_templates WHERE id = template_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found: %', template_id_param;
  END IF;

  cur_date := GREATEST(template_record.start_date, CURRENT_DATE);

  -- Generate instances until the target date
  WHILE cur_date <= until_date AND (template_record.end_date IS NULL OR cur_date <= template_record.end_date) LOOP
    -- Check if instance already exists
    SELECT EXISTS(
      SELECT 1 FROM recurring_goal_instances
      WHERE template_id = template_id_param AND period_start = cur_date
    ) INTO instance_exists;

    IF NOT instance_exists THEN
      -- Create new instance
      INSERT INTO recurring_goal_instances (
        template_id,
        period_start,
        period_end,
        target_value,
        status
      ) VALUES (
        template_id_param,
        cur_date,
        cur_date, -- For habits, start and end are the same day
        template_record.target_value,
        'pending'
      );

      instances_created := instances_created + 1;
    END IF;

    -- Calculate next occurrence
    next_date := calculate_next_occurrence(
      template_record.recurrence_type,
      template_record.recurrence_pattern,
      cur_date
    );

    -- Prevent infinite loops
    IF next_date <= cur_date THEN
      next_date := cur_date + INTERVAL '1 day';
    END IF;

    cur_date := next_date;
  END LOOP;

  RETURN instances_created;
END;
$$;


ALTER FUNCTION "public"."generate_recurring_instances"("template_id_param" "uuid", "until_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_secure_share_token"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
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


ALTER FUNCTION "public"."generate_secure_share_token"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_secure_share_token"() IS 'Generates cryptographically secure 256-bit URL-safe tokens for shopping list sharing. Uses extensions.gen_random_bytes (pgcrypto) — schema-qualified for cross-environment portability.';



CREATE OR REPLACE FUNCTION "public"."get_active_launch_subscribers"() RETURNS integer
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT COUNT(*)::INTEGER
  FROM launch_notifications
  WHERE subscribed = TRUE AND unsubscribed_at IS NULL;
$$;


ALTER FUNCTION "public"."get_active_launch_subscribers"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_active_launch_subscribers"() IS 'Returns count of active launch notification subscribers';



CREATE OR REPLACE FUNCTION "public"."get_admin_permissions"("user_email" "text") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(permissions, '{}'::jsonb)
  FROM admin_users
  WHERE email = user_email
  AND is_active = TRUE;
$$;


ALTER FUNCTION "public"."get_admin_permissions"("user_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_admin_permissions"("user_email" "text") IS 'Returns JSON permissions for an admin user';



CREATE OR REPLACE FUNCTION "public"."get_analytics_range"("start_date" "date", "end_date" "date") RETURNS TABLE("date" "date", "new_users" integer, "active_users" integer, "beta_requests" integer, "launch_signups" integer, "feature_usage" "jsonb")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_analytics_range"("start_date" "date", "end_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_analytics_range"("start_date" "date", "end_date" "date") IS 'Returns analytics data for date range';



CREATE OR REPLACE FUNCTION "public"."get_conversations_with_unread"("space_id_param" "uuid", "user_id_param" "uuid") RETURNS TABLE("id" "uuid", "space_id" "uuid", "title" "text", "conversation_type" "text", "last_message_preview" "text", "last_message_at" timestamp with time zone, "is_archived" boolean, "avatar_url" "text", "description" "text", "participants" "jsonb", "unread_count" bigint, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_conversations_with_unread"("space_id_param" "uuid", "user_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_daily_usage_count"("p_user_id" "uuid", "p_usage_type" "text") RETURNS integer
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $_$
DECLARE
  v_count INTEGER;
BEGIN
  -- Validate usage type
  IF p_usage_type NOT IN ('tasks_created', 'messages_sent', 'quick_actions_used', 'shopping_list_updates') THEN
    RAISE EXCEPTION 'Invalid usage type: %', p_usage_type;
  END IF;

  -- Get count for today
  EXECUTE format(
    'SELECT COALESCE(%I, 0) FROM public.daily_usage WHERE user_id = $1 AND date = CURRENT_DATE',
    p_usage_type
  )
  INTO v_count
  USING p_user_id;

  RETURN COALESCE(v_count, 0);
END;
$_$;


ALTER FUNCTION "public"."get_daily_usage_count"("p_user_id" "uuid", "p_usage_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_daily_usage_count"("p_user_id" "uuid", "p_usage_type" "text") IS 'Returns current daily usage count for specific usage type';



CREATE OR REPLACE FUNCTION "public"."get_dashboard_summary"("p_space_id" "uuid", "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_result JSONB := '{}'::JSONB;
    v_today DATE := CURRENT_DATE;
    v_week_start TIMESTAMPTZ := date_trunc('week', CURRENT_TIMESTAMP);
    v_month_start TIMESTAMPTZ := date_trunc('month', CURRENT_TIMESTAMP);
BEGIN
    -- Verify user has access to space
    IF NOT EXISTS (
        SELECT 1 FROM space_members
        WHERE space_id = p_space_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'User does not have access to this space';
    END IF;

    -- Tasks stats
    v_result := jsonb_set(v_result, '{tasks}', (
        SELECT jsonb_build_object(
            'total', COUNT(*),
            'pending', COUNT(*) FILTER (WHERE status = 'pending'),
            'inProgress', COUNT(*) FILTER (WHERE status = 'in_progress'),
            'completed', COUNT(*) FILTER (WHERE status = 'completed'),
            'dueToday', COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date::DATE = v_today AND status != 'completed'),
            'overdue', COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date::DATE < v_today AND status != 'completed'),
            'highPriority', COUNT(*) FILTER (WHERE priority = 'high' AND status != 'completed'),
            'assignedToMe', COUNT(*) FILTER (WHERE assigned_to = p_user_id AND status != 'completed'),
            'trend', 0
        )
        FROM tasks
        WHERE space_id = p_space_id
    ), true);

    -- Recent tasks (top 3 incomplete, sorted by due date)
    v_result := jsonb_set(v_result, '{recentTasks}', COALESCE(
        (SELECT jsonb_agg(row_to_json(t))
        FROM (
            SELECT id, title, due_date, priority
            FROM tasks
            WHERE space_id = p_space_id AND status != 'completed'
            ORDER BY
                CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
                due_date ASC
            LIMIT 3
        ) t),
        '[]'::JSONB
    ), true);

    -- Chores stats
    v_result := jsonb_set(v_result, '{chores}', (
        SELECT jsonb_build_object(
            'total', COUNT(*),
            'pending', COUNT(*) FILTER (WHERE status = 'pending'),
            'dueToday', COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date::DATE = v_today AND status != 'completed'),
            'overdue', COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date::DATE < v_today AND status != 'completed'),
            'assignedToMe', COUNT(*) FILTER (WHERE assigned_to = p_user_id AND status != 'completed'),
            'assignedToPartner', COUNT(*) FILTER (WHERE assigned_to != p_user_id AND status != 'completed'),
            'completedThisWeek', COUNT(*) FILTER (WHERE status = 'completed' AND completed_at >= v_week_start),
            'trend', 0
        )
        FROM chores
        WHERE space_id = p_space_id
    ), true);

    -- Recent chores (top 3 incomplete)
    v_result := jsonb_set(v_result, '{recentChores}', COALESCE(
        (SELECT jsonb_agg(row_to_json(c))
        FROM (
            SELECT id, title, due_date
            FROM chores
            WHERE space_id = p_space_id AND status != 'completed'
            ORDER BY
                CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
                due_date ASC
            LIMIT 3
        ) c),
        '[]'::JSONB
    ), true);

    -- Events stats
    v_result := jsonb_set(v_result, '{events}', (
        SELECT jsonb_build_object(
            'total', COUNT(*),
            'today', COUNT(*) FILTER (WHERE start_time::DATE = v_today),
            'thisWeek', COUNT(*) FILTER (WHERE start_time >= v_week_start AND start_time < v_week_start + INTERVAL '7 days'),
            'upcoming', COUNT(*) FILTER (WHERE start_time > NOW()),
            'personal', COUNT(*) FILTER (WHERE is_shared = false),
            'shared', COUNT(*) FILTER (WHERE is_shared = true),
            'trend', 0
        )
        FROM calendar_events
        WHERE space_id = p_space_id
    ), true);

    -- Next event
    v_result := jsonb_set(v_result, '{nextEvent}', (
        SELECT row_to_json(e)
        FROM (
            SELECT title, start_time
            FROM calendar_events
            WHERE space_id = p_space_id AND start_time > NOW()
            ORDER BY start_time ASC
            LIMIT 1
        ) e
    ), true);

    -- Reminders stats
    v_result := jsonb_set(v_result, '{reminders}', (
        SELECT jsonb_build_object(
            'total', COUNT(*),
            'active', COUNT(*) FILTER (WHERE status = 'active'),
            'completed', COUNT(*) FILTER (WHERE status = 'completed'),
            'overdue', COUNT(*) FILTER (WHERE reminder_time < NOW() AND status = 'active'),
            'dueToday', COUNT(*) FILTER (WHERE reminder_time::DATE = v_today AND status = 'active'),
            'trend', 0
        )
        FROM reminders
        WHERE space_id = p_space_id
    ), true);

    -- Next reminder
    v_result := jsonb_set(v_result, '{nextReminder}', (
        SELECT row_to_json(r)
        FROM (
            SELECT title, reminder_time
            FROM reminders
            WHERE space_id = p_space_id AND status = 'active' AND reminder_time > NOW()
            ORDER BY reminder_time ASC
            LIMIT 1
        ) r
    ), true);

    -- Messages stats
    v_result := jsonb_set(v_result, '{messages}', (
        SELECT jsonb_build_object(
            'total', COUNT(*),
            'today', COUNT(*) FILTER (WHERE created_at::DATE = v_today),
            'trend', 0
        )
        FROM messages
        WHERE space_id = p_space_id
    ), true);

    -- Message stats (separate key for unread + conversations)
    v_result := jsonb_set(v_result, '{messageStats}', (
        SELECT jsonb_build_object(
            'unread', COUNT(*) FILTER (WHERE NOT is_read),
            'conversations', COUNT(DISTINCT conversation_id)
        )
        FROM messages
        WHERE space_id = p_space_id
    ), true);

    -- Last message
    v_result := jsonb_set(v_result, '{lastMessage}', (
        SELECT row_to_json(m)
        FROM (
            SELECT content, sender_id, created_at
            FROM messages
            WHERE space_id = p_space_id
            ORDER BY created_at DESC
            LIMIT 1
        ) m
    ), true);

    -- Shopping lists stats
    v_result := jsonb_set(v_result, '{shopping}', (
        SELECT jsonb_build_object(
            'totalLists', COUNT(*),
            'activeLists', COUNT(*) FILTER (WHERE is_completed = false),
            'urgentList', NULL::TEXT
        )
        FROM shopping_lists
        WHERE space_id = p_space_id
    ), true);

    -- Shopping items stats (separate key)
    v_result := jsonb_set(v_result, '{shoppingItems}', (
        SELECT jsonb_build_object(
            'totalItems', COUNT(*),
            'checkedToday', COUNT(*) FILTER (WHERE is_checked = true AND checked_at IS NOT NULL AND checked_at::DATE = v_today),
            'uncheckedItems', COUNT(*) FILTER (WHERE is_checked = false),
            'checkedThisWeek', COUNT(*) FILTER (WHERE is_checked = true AND checked_at >= v_week_start)
        )
        FROM shopping_list_items sli
        INNER JOIN shopping_lists sl ON sli.shopping_list_id = sl.id
        WHERE sl.space_id = p_space_id
    ), true);

    -- Meals stats
    v_result := jsonb_set(v_result, '{meals}', (
        SELECT jsonb_build_object(
            'thisWeek', COUNT(*) FILTER (WHERE scheduled_date >= v_week_start AND scheduled_date < v_week_start + INTERVAL '7 days'),
            'mealsToday', COUNT(*) FILTER (WHERE scheduled_date::DATE = v_today),
            'trend', 0
        )
        FROM meals
        WHERE space_id = p_space_id
    ), true);

    -- Saved recipes count
    v_result := jsonb_set(v_result, '{savedRecipes}', (
        SELECT to_jsonb(COUNT(DISTINCT id))
        FROM recipes
        WHERE space_id = p_space_id
    ), true);

    -- Next meal
    v_result := jsonb_set(v_result, '{nextMeal}', (
        SELECT row_to_json(m)
        FROM (
            SELECT
                COALESCE(r.name, meal_type) as recipe_name,
                meal_type,
                scheduled_date
            FROM meals
            LEFT JOIN recipes r ON meals.recipe_id = r.id
            WHERE meals.space_id = p_space_id AND scheduled_date > NOW()
            ORDER BY scheduled_date ASC
            LIMIT 1
        ) m
    ), true);

    -- Budget stats
    v_result := jsonb_set(v_result, '{budget}', (
        SELECT jsonb_build_object(
            'monthlyBudget', COALESCE(SUM(amount) FILTER (WHERE period = 'monthly'), 0),
            'pendingBills', (SELECT COUNT(*) FROM bills WHERE space_id = p_space_id AND status = 'pending')
        )
        FROM budgets
        WHERE space_id = p_space_id
    ), true);

    -- Expenses stats
    v_result := jsonb_set(v_result, '{expenses}', (
        SELECT jsonb_build_object(
            'spentThisMonth', COALESCE(SUM(amount), 0)
        )
        FROM expenses
        WHERE space_id = p_space_id AND expense_date >= v_month_start
    ), true);

    -- Projects stats
    v_result := jsonb_set(v_result, '{projects}', (
        SELECT jsonb_build_object(
            'total', COUNT(*),
            'planning', COUNT(*) FILTER (WHERE status = 'planning'),
            'inProgress', COUNT(*) FILTER (WHERE status = 'in_progress'),
            'completed', COUNT(*) FILTER (WHERE status = 'completed'),
            'onHold', COUNT(*) FILTER (WHERE status = 'on_hold'),
            'totalBudget', COALESCE(SUM(budget), 0),
            'totalExpenses', COALESCE(SUM(expenses), 0),
            'trend', 0
        )
        FROM projects
        WHERE space_id = p_space_id
    ), true);

    -- Goals stats
    v_result := jsonb_set(v_result, '{goals}', (
        SELECT jsonb_build_object(
            'total', COUNT(*),
            'active', COUNT(*) FILTER (WHERE status = 'active'),
            'completed', COUNT(*) FILTER (WHERE status = 'completed'),
            'overallProgress', ROUND(COALESCE(AVG(progress), 0), 1),
            'trend', 0
        )
        FROM goals
        WHERE space_id = p_space_id
    ), true);

    -- Top goal by progress
    v_result := jsonb_set(v_result, '{topGoal}', (
        SELECT row_to_json(g)
        FROM (
            SELECT title, progress
            FROM goals
            WHERE space_id = p_space_id
            ORDER BY progress DESC
            LIMIT 1
        ) g
    ), true);

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_dashboard_summary"("p_space_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_dashboard_summary"("p_space_id" "uuid", "p_user_id" "uuid") IS 'Optimized dashboard summary aggregation - replaces 18+ individual queries with single RPC call. Fixed date casting issues.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."calendar_webhook_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "connection_id" "uuid" NOT NULL,
    "provider" "public"."calendar_provider" DEFAULT 'google'::"public"."calendar_provider" NOT NULL,
    "webhook_id" "text" NOT NULL,
    "webhook_url" "text" NOT NULL,
    "webhook_secret" "text" NOT NULL,
    "resource_id" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "events_received" integer DEFAULT 0 NOT NULL,
    "last_event_at" timestamp with time zone,
    "renewal_attempted_at" timestamp with time zone,
    "renewal_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."calendar_webhook_subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."calendar_webhook_subscriptions" IS 'Manages Google Calendar webhook push notification subscriptions';



COMMENT ON COLUMN "public"."calendar_webhook_subscriptions"."webhook_id" IS 'Our generated channel ID (UUID) sent to Google';



COMMENT ON COLUMN "public"."calendar_webhook_subscriptions"."webhook_secret" IS 'Secret for HMAC signature verification';



COMMENT ON COLUMN "public"."calendar_webhook_subscriptions"."resource_id" IS 'Google-generated resource identifier';



CREATE OR REPLACE FUNCTION "public"."get_expiring_webhooks"("hours_ahead" integer DEFAULT 24) RETURNS SETOF "public"."calendar_webhook_subscriptions"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_expiring_webhooks"("hours_ahead" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_expiring_webhooks"("hours_ahead" integer) IS 'Returns webhooks expiring within specified hours (for renewal cron)';



CREATE OR REPLACE FUNCTION "public"."get_feature_usage_summary"("days_back" integer DEFAULT 7) RETURNS TABLE("feature" "text", "total_page_views" bigint, "total_unique_users" bigint, "total_actions" bigint, "avg_daily_users" numeric, "trend_percent" numeric)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_feature_usage_summary"("days_back" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_founding_member_spots_remaining"() RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT max_count - current_count FROM founding_member_counter WHERE id = 1;
$$;


ALTER FUNCTION "public"."get_founding_member_spots_remaining"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_goal_dependency_tree"("p_goal_id" "uuid") RETURNS TABLE("goal_id" "uuid", "goal_title" "text", "depends_on_goal_id" "uuid", "depends_on_title" "text", "dependency_type" "text", "completion_threshold" integer, "status" "text", "depth" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_goal_dependency_tree"("p_goal_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_goal_dependency_tree"("p_goal_id" "uuid") IS 'Returns the complete dependency tree for a goal, including nested dependencies';



CREATE OR REPLACE FUNCTION "public"."get_meal_time"("meal_type" "text") RETURNS time without time zone
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_meal_time"("meal_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_rotation_user"("rotation_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_next_rotation_user"("rotation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_or_create_daily_analytics"("target_date" "date" DEFAULT CURRENT_DATE) RETURNS "uuid"
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
  INSERT INTO daily_analytics (date)
  VALUES (target_date)
  ON CONFLICT (date) DO NOTHING
  RETURNING id;

  SELECT id FROM daily_analytics WHERE date = target_date;
$$;


ALTER FUNCTION "public"."get_or_create_daily_analytics"("target_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_or_create_daily_analytics"("target_date" "date") IS 'Gets or creates analytics record for specified date';



CREATE OR REPLACE FUNCTION "public"."get_pending_reminders"() RETURNS TABLE("reminder_id" "uuid", "task_id" "uuid", "user_id" "uuid", "task_title" "text", "task_description" "text", "reminder_type" "text", "remind_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_pending_reminders"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."calendar_sync_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "connection_id" "uuid" NOT NULL,
    "mapping_id" "uuid",
    "operation" "public"."queue_operation" NOT NULL,
    "priority" integer DEFAULT 5 NOT NULL,
    "status" "public"."queue_status" DEFAULT 'pending'::"public"."queue_status" NOT NULL,
    "event_snapshot" "jsonb",
    "retry_count" integer DEFAULT 0 NOT NULL,
    "max_retries" integer DEFAULT 3 NOT NULL,
    "last_error" "text",
    "next_retry_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone
);


ALTER TABLE "public"."calendar_sync_queue" OWNER TO "postgres";


COMMENT ON TABLE "public"."calendar_sync_queue" IS 'Queue for outbound calendar sync operations (Rowan → External)';



COMMENT ON COLUMN "public"."calendar_sync_queue"."priority" IS '1-10: 1=urgent (event within 1hr), 5=normal, 7=background';



COMMENT ON COLUMN "public"."calendar_sync_queue"."event_snapshot" IS 'JSONB snapshot of event data for delete operations';



CREATE OR REPLACE FUNCTION "public"."get_pending_sync_queue_items"("p_limit" integer DEFAULT 10) RETURNS SETOF "public"."calendar_sync_queue"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."get_pending_sync_queue_items"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recent_milestone_celebrations"("p_space_id" "uuid", "p_days" integer DEFAULT 7) RETURNS TABLE("milestone_id" "uuid", "goal_id" "uuid", "goal_title" "text", "milestone_title" "text", "milestone_description" "text", "completed_at" timestamp with time zone, "percentage_reached" numeric)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_recent_milestone_celebrations"("p_space_id" "uuid", "p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_reminder_comment_count"("p_reminder_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COUNT(*)::INTEGER
  FROM reminder_comments
  WHERE reminder_id = p_reminder_id;
$$;


ALTER FUNCTION "public"."get_reminder_comment_count"("p_reminder_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_reminder_comment_count"("p_reminder_id" "uuid") IS 'Returns the total number of comments for a given reminder';



CREATE OR REPLACE FUNCTION "public"."get_smart_nudges"("p_user_id" "uuid", "p_space_id" "uuid", "p_limit" integer DEFAULT 10) RETURNS TABLE("nudge_id" "uuid", "goal_id" "uuid", "goal_title" "text", "template_name" "text", "category" "text", "title" "text", "message" "text", "action_text" "text", "icon" "text", "priority" integer, "days_since_activity" integer, "days_until_deadline" integer, "should_send" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_smart_nudges"("p_user_id" "uuid", "p_space_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_task_stats"("p_space_id" "uuid") RETURNS json
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_task_stats"("p_space_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unread_mentions"("p_user_id" "uuid") RETURNS TABLE("mention_id" "uuid", "reminder_id" "uuid", "reminder_title" "text", "mentioning_user_name" "text", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_unread_mentions"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_unread_mentions"("p_user_id" "uuid") IS 'Returns recent mentions for a user';



CREATE OR REPLACE FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_upcoming_bills"("p_space_id" "uuid", "p_days_ahead" integer DEFAULT 30) RETURNS TABLE("event_id" "uuid", "expense_id" "uuid", "title" "text", "amount" numeric, "due_date" timestamp with time zone, "category" "text", "payment_method" "text", "days_until_due" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_upcoming_bills"("p_space_id" "uuid", "p_days_ahead" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_subscription_tier"("p_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_tier TEXT;
BEGIN
  SELECT tier INTO v_tier
  FROM public.subscriptions
  WHERE user_id = p_user_id
    AND status = 'active';

  -- Default to 'free' if no subscription found
  RETURN COALESCE(v_tier, 'free');
END;
$$;


ALTER FUNCTION "public"."get_user_subscription_tier"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_subscription_tier"("p_user_id" "uuid") IS 'Returns user subscription tier (free, pro, family)';



CREATE OR REPLACE FUNCTION "public"."get_yesterday_metrics"() RETURNS TABLE("new_users" integer, "active_users" integer, "beta_requests" integer, "launch_signups" integer, "total_beta_users" bigint, "total_launch_signups" bigint)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_yesterday_metrics"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_yesterday_metrics"() IS 'Returns yesterday''s metrics for daily digest email';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_workspace_provisioning"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_space_id UUID;
  space_name_to_use TEXT;
BEGIN
  -- Check if user already has a space membership (prevents duplicate workspace creation)
  IF EXISTS (SELECT 1 FROM space_members WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Determine space name: use metadata from auth if available, else default
  -- The space name should have been set by the signup flow in user metadata
  space_name_to_use := COALESCE(
    (
      SELECT raw_user_meta_data->>'space_name'
      FROM auth.users
      WHERE id = NEW.id
    ),
    NEW.name || '''s Space'
  );

  -- Create personal workspace for the new user
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

  -- Add user as owner of the space
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

  -- Log the successful workspace provisioning
  RAISE LOG 'Auto-provisioned workspace % for user %', new_space_id, NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    -- The signup API will handle retry logic
    RAISE LOG 'Failed to auto-provision workspace for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user_workspace_provisioning"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user_workspace_provisioning"() IS 'Automatically provisions a personal workspace when a new user is created. This ensures atomic workspace creation and prevents orphaned users during signup.';



CREATE OR REPLACE FUNCTION "public"."handle_token_expiry"("p_connection_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE calendar_connections
  SET sync_status = 'token_expired'
  WHERE id = p_connection_id;
END;
$$;


ALTER FUNCTION "public"."handle_token_expiry"("p_connection_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_token_expiry"("p_connection_id" "uuid") IS 'Marks connection as token_expired when token expires';



CREATE OR REPLACE FUNCTION "public"."has_admin_role"("user_email" "text", "required_role" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = user_email
    AND role = required_role
    AND is_active = TRUE
  );
$$;


ALTER FUNCTION "public"."has_admin_role"("user_email" "text", "required_role" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_admin_role"("user_email" "text", "required_role" "text") IS 'Checks if admin has specific role level';



CREATE OR REPLACE FUNCTION "public"."increment_beta_requests"("target_date" "date" DEFAULT CURRENT_DATE) RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
  INSERT INTO daily_analytics (date, beta_requests)
  VALUES (target_date, 1)
  ON CONFLICT (date) DO UPDATE
  SET beta_requests = daily_analytics.beta_requests + 1;
$$;


ALTER FUNCTION "public"."increment_beta_requests"("target_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."increment_beta_requests"("target_date" "date") IS 'Increments beta request count for specified date';



CREATE OR REPLACE FUNCTION "public"."increment_daily_usage"("p_user_id" "uuid", "p_usage_type" "text", "p_amount" integer DEFAULT 1) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."increment_daily_usage"("p_user_id" "uuid", "p_usage_type" "text", "p_amount" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_template_usage"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."increment_template_usage"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_template_usage"("template_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE voice_note_templates
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = template_id;
END;
$$;


ALTER FUNCTION "public"."increment_template_usage"("template_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_usage_count"("p_user_id" "uuid", "p_usage_type" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
BEGIN
  -- Validate usage type
  IF p_usage_type NOT IN ('tasks_created', 'messages_sent', 'quick_actions_used', 'shopping_list_updates') THEN
    RAISE EXCEPTION 'Invalid usage type: %', p_usage_type;
  END IF;

  -- Insert or update atomically (handles concurrent requests)
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


ALTER FUNCTION "public"."increment_usage_count"("p_user_id" "uuid", "p_usage_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."increment_usage_count"("p_user_id" "uuid", "p_usage_type" "text") IS 'Atomically increments daily usage counter';



CREATE OR REPLACE FUNCTION "public"."increment_webhook_event_count"("p_webhook_id" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE calendar_webhook_subscriptions
  SET
    events_received = events_received + 1,
    last_event_at = NOW()
  WHERE webhook_id = p_webhook_id;
END;
$$;


ALTER FUNCTION "public"."increment_webhook_event_count"("p_webhook_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."initialize_subscription"("p_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_subscription_id UUID;
BEGIN
  -- Create free tier subscription for new user
  INSERT INTO public.subscriptions (
    user_id,
    tier,
    status,
    period,
    subscription_started_at
  )
  VALUES (
    p_user_id,
    'free',
    'active',
    'monthly',
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING -- Skip if already exists
  RETURNING id INTO v_subscription_id;

  RETURN v_subscription_id;
END;
$$;


ALTER FUNCTION "public"."initialize_subscription"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."initialize_subscription"("p_user_id" "uuid") IS 'Creates initial free tier subscription for new user';



CREATE OR REPLACE FUNCTION "public"."initialize_user_privacy_preferences"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Create default privacy preferences when user signs up
  INSERT INTO user_privacy_preferences (user_id, ccpa_do_not_sell)
  VALUES (NEW.id, TRUE) -- Default to Do Not Sell
  ON CONFLICT (user_id) DO NOTHING;

  -- Create default CCPA preference
  INSERT INTO ccpa_do_not_sell (user_id, do_not_sell, current_status)
  VALUES (NEW.id, TRUE, 'opted_out')
  ON CONFLICT (user_id) DO NOTHING;

  -- Log signup event
  INSERT INTO compliance_events_log (user_id, event_type, event_category, description)
  VALUES (NEW.id, 'account_created', 'general_privacy', 'User account created with default privacy preferences');

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."initialize_user_privacy_preferences"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("user_email" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = user_email
    AND is_active = TRUE
  );
$$;


ALTER FUNCTION "public"."is_admin"("user_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_admin"("user_email" "text") IS 'Checks if email belongs to an active admin user';



CREATE OR REPLACE FUNCTION "public"."is_chore_overdue"("p_due_date" timestamp with time zone, "p_grace_period_hours" integer DEFAULT 2) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF p_due_date IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN NOW() > (p_due_date + (p_grace_period_hours || ' hours')::INTERVAL);
END;
$$;


ALTER FUNCTION "public"."is_chore_overdue"("p_due_date" timestamp with time zone, "p_grace_period_hours" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_in_quiet_hours"("p_user_id" "uuid", "p_space_id" "uuid" DEFAULT NULL::"uuid", "p_check_time" timestamp with time zone DEFAULT "now"()) RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."is_in_quiet_hours"("p_user_id" "uuid", "p_space_id" "uuid", "p_check_time" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_in_quiet_hours"("p_user_id" "uuid", "p_space_id" "uuid", "p_check_time" timestamp with time zone) IS 'Checks if a given time falls within user quiet hours';



CREATE OR REPLACE FUNCTION "public"."is_token_expired"("p_connection_id" "uuid", "p_buffer_minutes" integer DEFAULT 5) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT token_expires_at INTO v_expires_at
  FROM calendar_connections
  WHERE id = p_connection_id;

  IF v_expires_at IS NULL THEN
    RETURN FALSE; -- No expiry set (e.g., Apple with app-specific password)
  END IF;

  RETURN v_expires_at <= NOW() + (p_buffer_minutes || ' minutes')::INTERVAL;
END;
$$;


ALTER FUNCTION "public"."is_token_expired"("p_connection_id" "uuid", "p_buffer_minutes" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_token_expired"("p_connection_id" "uuid", "p_buffer_minutes" integer) IS 'Checks if token is expired or expiring within buffer minutes';



CREATE OR REPLACE FUNCTION "public"."is_within_geofence"("p_lat" numeric, "p_lng" numeric, "p_center_lat" numeric, "p_center_lng" numeric, "p_radius_meters" integer) RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  distance_meters FLOAT;
BEGIN
  -- Haversine formula for distance calculation
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


ALTER FUNCTION "public"."is_within_geofence"("p_lat" numeric, "p_lng" numeric, "p_center_lat" numeric, "p_center_lng" numeric, "p_radius_meters" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lock_event_for_sync"("p_event_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."lock_event_for_sync"("p_event_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."lock_event_for_sync"("p_event_id" "uuid") IS 'Atomically locks event for sync, returns TRUE if successful';



CREATE OR REPLACE FUNCTION "public"."log_comment_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."log_comment_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_compliance_event"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Log to compliance_events_log when certain tables are updated
  IF TG_TABLE_NAME = 'ccpa_do_not_sell' THEN
    IF NEW.do_not_sell = TRUE AND OLD.do_not_sell = FALSE THEN
      INSERT INTO compliance_events_log (user_id, event_type, event_category, description)
      VALUES (NEW.user_id, 'do_not_sell_opted_out', 'ccpa', 'User opted out of data selling');
    ELSIF NEW.do_not_sell = FALSE AND OLD.do_not_sell = TRUE THEN
      INSERT INTO compliance_events_log (user_id, event_type, event_category, description)
      VALUES (NEW.user_id, 'do_not_sell_opted_in', 'ccpa', 'User opted back in to data selling');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_compliance_event"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_mention_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."log_mention_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_privacy_preference_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."log_privacy_preference_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_reaction_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."log_reaction_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_reminder_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  action_type TEXT;
  change_metadata JSONB := '{}'::JSONB;
BEGIN
  -- Determine action type based on operation
  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
    change_metadata := jsonb_build_object(
      'title', NEW.title,
      'category', NEW.category,
      'priority', NEW.priority
    );

  ELSIF TG_OP = 'UPDATE' THEN
    -- Detect specific field changes
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

    ELSIF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      IF NEW.assigned_to IS NULL THEN
        action_type := 'unassigned';
        change_metadata := jsonb_build_object('previous_assignee', OLD.assigned_to);
      ELSE
        action_type := 'assigned';
        change_metadata := jsonb_build_object('assignee', NEW.assigned_to);
      END IF;

    ELSIF OLD.priority != NEW.priority THEN
      action_type := 'priority_changed';
      change_metadata := jsonb_build_object(
        'old_priority', OLD.priority,
        'new_priority', NEW.priority
      );

    ELSIF OLD.category != NEW.category THEN
      action_type := 'category_changed';
      change_metadata := jsonb_build_object(
        'old_category', OLD.category,
        'new_category', NEW.category
      );

    ELSE
      action_type := 'updated';
      change_metadata := jsonb_build_object(
        'fields_changed', ARRAY(
          SELECT key FROM jsonb_each(to_jsonb(NEW))
          WHERE to_jsonb(NEW)->>key IS DISTINCT FROM to_jsonb(OLD)->>key
        )
      );
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    -- SKIP DELETE LOGGING to prevent race condition with CASCADE DELETE
    -- When a reminder is deleted, CASCADE DELETE removes reminder_activities first,
    -- then this trigger tries to INSERT, causing foreign key constraint violations.
    -- Since the reminder is being deleted anyway, activity logs are not needed.
    RETURN OLD;
  END IF;

  -- Insert activity log (for INSERT and UPDATE only)
  INSERT INTO reminder_activities (reminder_id, user_id, action, metadata)
  VALUES (NEW.id, auth.uid(), action_type, change_metadata);

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_reminder_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_reminder_comment_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."log_reminder_comment_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_task_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."log_task_changes"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_task_changes"() IS 'Logs task changes. DELETE events are not logged to prevent foreign key constraint violations with CASCADE deletion.';



CREATE OR REPLACE FUNCTION "public"."mark_all_notifications_read"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."mark_all_notifications_read"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_bills_overdue"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE bills
  SET status = 'overdue'
  WHERE status = 'scheduled'
    AND due_date < CURRENT_DATE;
END;
$$;


ALTER FUNCTION "public"."mark_bills_overdue"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_checkin_reminder_completed"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Mark any pending reminders as completed for this goal/user
  UPDATE goal_check_in_reminders
  SET
    completed = TRUE,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE goal_id = NEW.goal_id
    AND user_id = NEW.user_id
    AND completed = FALSE
    AND scheduled_for <= NOW() + INTERVAL '1 day'; -- Within 1 day of scheduled time

  -- Schedule the next reminder if auto_schedule is enabled
  DECLARE
    auto_schedule_enabled BOOLEAN;
  BEGIN
    SELECT auto_schedule INTO auto_schedule_enabled
    FROM goal_check_in_settings
    WHERE goal_id = NEW.goal_id AND user_id = NEW.user_id;

    IF auto_schedule_enabled = TRUE THEN
      PERFORM schedule_next_checkin_reminder(NEW.goal_id, NEW.user_id);
    END IF;
  END;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."mark_checkin_reminder_completed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_inactive_users_offline"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE user_presence
  SET status = 'offline', updated_at = NOW()
  WHERE status = 'online'
    AND last_activity < NOW() - INTERVAL '5 minutes';
END;
$$;


ALTER FUNCTION "public"."mark_inactive_users_offline"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_queue_item_completed"("p_queue_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."mark_queue_item_completed"("p_queue_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_queue_item_failed"("p_queue_id" "uuid", "p_error_message" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_retry_count INTEGER;
  v_max_retries INTEGER;
  v_next_retry TIMESTAMPTZ;
BEGIN
  -- Get current retry count
  SELECT retry_count, max_retries INTO v_retry_count, v_max_retries
  FROM calendar_sync_queue
  WHERE id = p_queue_id;

  -- Calculate next retry time (exponential backoff)
  IF v_retry_count = 0 THEN
    v_next_retry := NOW() + INTERVAL '1 minute';
  ELSIF v_retry_count = 1 THEN
    v_next_retry := NOW() + INTERVAL '5 minutes';
  ELSE
    v_next_retry := NOW() + INTERVAL '15 minutes';
  END IF;

  -- Update queue item
  UPDATE calendar_sync_queue
  SET
    status = 'failed',
    retry_count = retry_count + 1,
    last_error = p_error_message,
    next_retry_at = CASE WHEN retry_count + 1 < v_max_retries THEN v_next_retry ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_queue_id;
END;
$$;


ALTER FUNCTION "public"."mark_queue_item_failed"("p_queue_id" "uuid", "p_error_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_queue_item_processing"("p_queue_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE calendar_sync_queue
  SET status = 'processing', updated_at = NOW()
  WHERE id = p_queue_id;
END;
$$;


ALTER FUNCTION "public"."mark_queue_item_processing"("p_queue_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_reminder_sent"("reminder_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE task_reminders
  SET
    is_sent = TRUE,
    sent_at = NOW()
  WHERE id = reminder_id;
END;
$$;


ALTER FUNCTION "public"."mark_reminder_sent"("reminder_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."meal_event_title"("p_meal_type" "text", "p_meal_name" "text", "p_recipe_name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN meal_type_emoji(p_meal_type) || ' ' ||
    INITCAP(p_meal_type) || ': ' ||
    COALESCE(NULLIF(p_meal_name, ''), p_recipe_name, 'Untitled meal');
END;
$$;


ALTER FUNCTION "public"."meal_event_title"("p_meal_type" "text", "p_meal_name" "text", "p_recipe_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."meal_type_default_time"("p_meal_type" "text") RETURNS interval
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."meal_type_default_time"("p_meal_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."meal_type_duration"("p_meal_type" "text") RETURNS interval
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."meal_type_duration"("p_meal_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."meal_type_emoji"("p_meal_type" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."meal_type_emoji"("p_meal_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_chore_rotations"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."process_chore_rotations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."provision_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
    -- ========================================================================
    -- STEP 1: Extract metadata from auth user
    -- ========================================================================
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

    -- ========================================================================
    -- STEP 2: Create public.users record
    -- ========================================================================
    INSERT INTO public.users (
        id,
        email,
        name,
        color_theme,
        timezone,
        show_tasks_on_calendar,
        calendar_task_filter,
        default_reminder_offset,
        privacy_settings,
        show_chores_on_calendar,
        calendar_chore_filter,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        v_name,
        v_color_theme,
        'America/New_York',
        true,
        '{"categories": [], "priorities": []}'::jsonb,
        '1_day_before',
        '{"analytics": true, "readReceipts": true, "activityStatus": true, "profileVisibility": true}'::jsonb,
        true,
        '{"categories": [], "frequencies": []}'::jsonb,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(users.name, EXCLUDED.name),
        color_theme = COALESCE(users.color_theme, EXCLUDED.color_theme),
        updated_at = NOW();

    -- ========================================================================
    -- STEP 3: Create public.profiles record (for compatibility)
    -- ========================================================================
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        name,
        timezone,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        v_name,
        v_name,
        'America/New_York',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
        name = COALESCE(profiles.name, EXCLUDED.name),
        updated_at = NOW();

    -- ========================================================================
    -- STEP 4: Handle space creation or joining
    -- ========================================================================
    IF v_invite_token IS NOT NULL AND v_invite_token != '' THEN
        -- User is joining an existing space via invitation
        SELECT * INTO v_invitation
        FROM public.space_invitations
        WHERE token = v_invite_token
          AND status = 'pending'
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1;

        IF v_invitation.id IS NOT NULL THEN
            v_space_id := v_invitation.space_id;

            -- Mark invitation as accepted
            UPDATE public.space_invitations
            SET status = 'accepted',
                updated_at = NOW()
            WHERE id = v_invitation.id;

            -- Add user as member (not owner)
            INSERT INTO public.space_members (space_id, user_id, role, joined_at)
            VALUES (v_space_id, NEW.id, COALESCE(v_invitation.role, 'member'), NOW())
            ON CONFLICT (space_id, user_id) DO NOTHING;
        ELSE
            -- Invalid or expired invitation - create a new space instead
            INSERT INTO public.spaces (name, is_personal, auto_created, user_id, created_by, created_at, updated_at)
            VALUES (v_space_name, true, true, NEW.id, NEW.id, NOW(), NOW())
            RETURNING id INTO v_space_id;

            INSERT INTO public.space_members (space_id, user_id, role, joined_at)
            VALUES (v_space_id, NEW.id, 'owner', NOW());
        END IF;
    ELSE
        -- Create a new personal space for the user
        INSERT INTO public.spaces (name, is_personal, auto_created, user_id, created_by, created_at, updated_at)
        VALUES (v_space_name, true, true, NEW.id, NEW.id, NOW(), NOW())
        RETURNING id INTO v_space_id;

        INSERT INTO public.space_members (space_id, user_id, role, joined_at)
        VALUES (v_space_id, NEW.id, 'owner', NOW());
    END IF;

    -- ========================================================================
    -- STEP 5: Create subscription with 14-day Pro trial
    -- ========================================================================
    INSERT INTO public.subscriptions (
        user_id,
        tier,
        status,
        period,
        trial_started_at,
        trial_ends_at,
        subscription_started_at,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        'pro',
        'active',
        'monthly',
        NOW(),
        NOW() + INTERVAL '14 days',
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        updated_at = NOW();

    RAISE LOG 'provision_new_user: Successfully provisioned user % with space % (14-day Pro trial)', NEW.id, v_space_id;
    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the auth user creation
    RAISE WARNING 'provision_new_user error for user %: % (SQLSTATE: %)',
        NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."provision_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."queue_calendar_sync_on_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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
  ELSE -- UPDATE
    v_operation := 'update';
    v_event_snapshot := NULL;
  END IF;

  -- Don't queue if event is currently locked for sync (prevents loops)
  IF (TG_OP = 'UPDATE' AND NEW.sync_locked = TRUE) OR
     (TG_OP = 'INSERT' AND NEW.sync_locked = TRUE) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Don't queue if this change came from external sync
  IF (TG_OP = 'UPDATE' AND OLD.last_external_sync IS NOT NULL AND
      NEW.last_external_sync = OLD.last_external_sync AND
      NEW.updated_at > OLD.last_external_sync) OR
     (TG_OP = 'UPDATE' AND NEW.last_external_sync > OLD.updated_at) THEN
    -- This change was from external sync, don't sync back
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
    ON CONFLICT DO NOTHING; -- Prevent duplicate queue entries

    RAISE LOG 'Queued % operation for event % to provider % (priority: %)',
      v_operation, COALESCE(NEW.id, OLD.id), v_connection.provider, v_priority;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."queue_calendar_sync_on_change"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."queue_calendar_sync_on_change"() IS 'Queues outbound sync when Rowan event is created/updated/deleted';



CREATE OR REPLACE FUNCTION "public"."record_admin_login"("user_email" "text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  UPDATE admin_users
  SET
    last_login = NOW(),
    login_count = login_count + 1
  WHERE email = user_email
  AND is_active = TRUE
  RETURNING TRUE;
$$;


ALTER FUNCTION "public"."record_admin_login"("user_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."record_admin_login"("user_email" "text") IS 'Records admin login timestamp and increments count';



CREATE OR REPLACE FUNCTION "public"."record_feature_event"("p_user_id" "uuid", "p_space_id" "uuid", "p_feature" "text", "p_action" "text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_device_type" "text" DEFAULT NULL::"text", "p_browser" "text" DEFAULT NULL::"text", "p_os" "text" DEFAULT NULL::"text", "p_session_id" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_id UUID;
  effective_user_id UUID;
BEGIN
  IF auth.role() = 'service_role' THEN
    effective_user_id := p_user_id;
  ELSE
    effective_user_id := auth.uid();
    IF effective_user_id IS NULL THEN
      RAISE EXCEPTION 'Not authenticated';
    END IF;
    IF p_user_id IS NOT NULL AND p_user_id <> effective_user_id THEN
      RAISE EXCEPTION 'User ID mismatch';
    END IF;
  END IF;

  IF p_space_id IS NOT NULL AND auth.role() <> 'service_role' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM space_members
      WHERE user_id = effective_user_id
        AND space_id = p_space_id
    ) THEN
      RAISE EXCEPTION 'User is not a member of this space';
    END IF;
  END IF;

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
    effective_user_id,
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


ALTER FUNCTION "public"."record_feature_event"("p_user_id" "uuid", "p_space_id" "uuid", "p_feature" "text", "p_action" "text", "p_metadata" "jsonb", "p_device_type" "text", "p_browser" "text", "p_os" "text", "p_session_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_subscription_event"("p_user_id" "uuid", "p_event_type" "text", "p_from_tier" "text" DEFAULT NULL::"text", "p_to_tier" "text" DEFAULT NULL::"text", "p_trigger_source" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."record_subscription_event"("p_user_id" "uuid", "p_event_type" "text", "p_from_tier" "text", "p_to_tier" "text", "p_trigger_source" "text", "p_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."record_subscription_event"("p_user_id" "uuid", "p_event_type" "text", "p_from_tier" "text", "p_to_tier" "text", "p_trigger_source" "text", "p_metadata" "jsonb") IS 'Records subscription event for analytics';



CREATE OR REPLACE FUNCTION "public"."record_task_handoff"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."record_task_handoff"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_task_snooze"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."record_task_snooze"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_quick_action_stats"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW quick_action_stats;
END;
$$;


ALTER FUNCTION "public"."refresh_quick_action_stats"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."calendar_sync_conflicts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mapping_id" "uuid" NOT NULL,
    "connection_id" "uuid" NOT NULL,
    "detected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    "resolution_status" "public"."resolution_status" DEFAULT 'detected'::"public"."resolution_status" NOT NULL,
    "rowan_version" "jsonb" NOT NULL,
    "external_version" "jsonb" NOT NULL,
    "winning_source" "public"."winning_source",
    "resolution_strategy" "public"."resolution_strategy" DEFAULT 'external_wins'::"public"."resolution_strategy" NOT NULL,
    "resolved_by" "uuid",
    "resolution_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."calendar_sync_conflicts" OWNER TO "postgres";


COMMENT ON TABLE "public"."calendar_sync_conflicts" IS 'Tracks calendar sync conflicts and their resolution history';



COMMENT ON COLUMN "public"."calendar_sync_conflicts"."rowan_version" IS 'JSONB snapshot of Rowan event at time of conflict';



COMMENT ON COLUMN "public"."calendar_sync_conflicts"."external_version" IS 'JSONB snapshot of external event at time of conflict';



CREATE OR REPLACE FUNCTION "public"."resolve_calendar_conflict"("conflict_id" "uuid", "p_winning_source" "public"."winning_source", "p_resolved_by" "uuid" DEFAULT NULL::"uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "public"."calendar_sync_conflicts"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."resolve_calendar_conflict"("conflict_id" "uuid", "p_winning_source" "public"."winning_source", "p_resolved_by" "uuid", "p_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."resolve_calendar_conflict"("conflict_id" "uuid", "p_winning_source" "public"."winning_source", "p_resolved_by" "uuid", "p_notes" "text") IS 'Helper function to mark a conflict as resolved and update mapping';



CREATE OR REPLACE FUNCTION "public"."schedule_next_checkin_reminder"("p_goal_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  settings_record goal_check_in_settings%ROWTYPE;
  next_checkin_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get the user's check-in settings for this goal
  SELECT * INTO settings_record
  FROM goal_check_in_settings
  WHERE goal_id = p_goal_id AND user_id = p_user_id;

  -- If no settings found, skip scheduling
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calculate next check-in date
  next_checkin_date := calculate_next_checkin_date(
    settings_record.frequency,
    settings_record.day_of_week,
    settings_record.day_of_month,
    settings_record.reminder_time
  );

  -- Insert the reminder
  INSERT INTO goal_check_in_reminders (
    goal_id,
    user_id,
    scheduled_for
  ) VALUES (
    p_goal_id,
    p_user_id,
    next_checkin_date
  );
END;
$$;


ALTER FUNCTION "public"."schedule_next_checkin_reminder"("p_goal_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_voice_transcriptions"("p_user_id" "uuid", "p_query" "text", "p_limit" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "transcription" "text", "confidence" numeric, "language" character varying, "duration" integer, "keywords" "jsonb", "goal_check_in_id" "uuid", "created_at" timestamp with time zone, "rank" real)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    vt.id,
    vt.transcription,
    vt.confidence,
    vt.language,
    vt.duration,
    vt.keywords,
    vt.goal_check_in_id,
    vt.created_at,
    ts_rank(to_tsvector('english', vt.transcription), plainto_tsquery('english', p_query)) as rank
  FROM voice_transcriptions vt
  WHERE vt.user_id = p_user_id
    AND to_tsvector('english', vt.transcription) @@ plainto_tsquery('english', p_query)
  ORDER BY rank DESC, vt.created_at DESC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."search_voice_transcriptions"("p_user_id" "uuid", "p_query" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_attachment_type_flags"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Set flags based on MIME type
  NEW.is_image = NEW.file_type LIKE 'image/%';
  NEW.is_document = NEW.file_type IN ('application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain');
  NEW.is_video = NEW.file_type LIKE 'video/%';

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_attachment_type_flags"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_initial_next_due_date"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Set next_due_date based on frequency
  IF NEW.frequency != 'one-time' THEN
    NEW.next_due_date := calculate_next_due_date(NEW.due_date, NEW.frequency);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_initial_next_due_date"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_notification_read_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."set_notification_read_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_pinned_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."set_pinned_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_shopping_task_auto_times"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."set_shopping_task_auto_times"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_space_creator"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_space_creator"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."should_send_notification"("p_user_id" "uuid", "p_space_id" "uuid", "p_notification_type" "text", "p_channel" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_prefs user_notification_preferences;
  v_current_time TIME;
BEGIN
  -- Get user preferences
  SELECT * INTO v_prefs
  FROM user_notification_preferences
  WHERE user_id = p_user_id AND space_id = p_space_id;

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


ALTER FUNCTION "public"."should_send_notification"("p_user_id" "uuid", "p_space_id" "uuid", "p_notification_type" "text", "p_channel" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."should_send_notification"("p_user_id" "uuid", "p_space_id" "uuid", "p_notification_type" "text", "p_channel" "text") IS 'Checks user preferences and quiet hours to determine if notification should be sent';



CREATE OR REPLACE FUNCTION "public"."sync_chore_to_calendar"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_event_id UUID;
BEGIN
  -- If chore has due_date, calendar_sync is enabled, and no existing sync record
  IF NEW.due_date IS NOT NULL AND NEW.calendar_sync = TRUE THEN
    -- Check if sync record already exists
    IF NOT EXISTS (SELECT 1 FROM chore_calendar_events WHERE chore_id = NEW.id) THEN
      -- Create calendar event
      INSERT INTO events (
        space_id,
        title,
        description,
        event_type,
        start_time,
        end_time,
        category,
        status,
        is_recurring,
        assigned_to,
        created_by
      )
      VALUES (
        NEW.space_id,
        '🧹 ' || NEW.title,
        NEW.description,
        'chore',
        NEW.due_date::TIMESTAMPTZ,
        (NEW.due_date::TIMESTAMPTZ + INTERVAL '2 hours'),
        'personal',
        'not-started',
        (NEW.frequency != 'once'),
        NEW.assigned_to,
        NEW.created_by
      )
      RETURNING id INTO new_event_id;

      -- Create sync record
      INSERT INTO chore_calendar_events (chore_id, event_id, is_synced, sync_enabled)
      VALUES (NEW.id, new_event_id, TRUE, TRUE);
    END IF;
  -- If calendar_sync is disabled, remove any existing calendar events
  ELSIF NEW.calendar_sync = FALSE THEN
    -- Delete linked calendar events
    DELETE FROM events WHERE id IN (
      SELECT event_id FROM chore_calendar_events WHERE chore_id = NEW.id
    );
    -- Delete sync records
    DELETE FROM chore_calendar_events WHERE chore_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_chore_to_calendar"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_meal_to_calendar"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."sync_meal_to_calendar"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_task_primary_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."sync_task_primary_assignment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_task_to_calendar"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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
  FROM public.users
  WHERE id = NEW.created_by;

  IF user_wants_sync THEN
    -- Create calendar event
    INSERT INTO public.events (
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
      '📋 ' || NEW.title,
      COALESCE(NEW.description, 'Task from Tasks page'),
      'task',
      NEW.due_date::TIMESTAMPTZ,
      (NEW.due_date::TIMESTAMPTZ + INTERVAL '1 hour'),
      NEW.assigned_to,
      NEW.created_by
    )
    RETURNING id INTO new_event_id;

    -- Create sync record
    INSERT INTO public.task_calendar_events (task_id, event_id, is_synced, sync_enabled)
    VALUES (NEW.id, new_event_id, TRUE, TRUE);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_task_to_calendar"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_task_to_calendar"() IS 'Trigger function to create calendar events for tasks with due dates. SECURITY DEFINER bypasses RLS to prevent query optimization issues.';



CREATE OR REPLACE FUNCTION "public"."test_handle_new_user"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."test_handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_shopping_item_history"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."track_shopping_item_history"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_calculate_splits"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.is_split = true THEN
    PERFORM calculate_expense_splits(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_calculate_splits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_schedule_checkin_reminders"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Remove any existing pending reminders for this goal/user
  DELETE FROM goal_check_in_reminders
  WHERE goal_id = NEW.goal_id
    AND user_id = NEW.user_id
    AND completed = FALSE
    AND notification_sent = FALSE;

  -- Schedule next reminder if auto_schedule is enabled
  IF NEW.auto_schedule = TRUE THEN
    PERFORM schedule_next_checkin_reminder(NEW.goal_id, NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_schedule_checkin_reminders"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unlock_all_sync_locked_events"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Unlock events locked for more than 5 minutes (likely failed sync)
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


ALTER FUNCTION "public"."unlock_all_sync_locked_events"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."unlock_all_sync_locked_events"() IS 'Recovery: unlocks events locked for >5 minutes (failed syncs)';



CREATE OR REPLACE FUNCTION "public"."unlock_event_after_sync"("p_event_id" "uuid", "p_mark_synced" boolean DEFAULT true) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE events
  SET
    sync_locked = FALSE,
    last_external_sync = CASE WHEN p_mark_synced THEN NOW() ELSE last_external_sync END
  WHERE id = p_event_id;
END;
$$;


ALTER FUNCTION "public"."unlock_event_after_sync"("p_event_id" "uuid", "p_mark_synced" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."unlock_event_after_sync"("p_event_id" "uuid", "p_mark_synced" boolean) IS 'Unlocks event after sync and optionally updates last_external_sync';



CREATE OR REPLACE FUNCTION "public"."unsubscribe_launch_notification"("email_address" "text") RETURNS boolean
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
  UPDATE launch_notifications
  SET subscribed = FALSE, unsubscribed_at = NOW()
  WHERE email = email_address AND subscribed = TRUE
  RETURNING TRUE;
$$;


ALTER FUNCTION "public"."unsubscribe_launch_notification"("email_address" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."unsubscribe_launch_notification"("email_address" "text") IS 'Unsubscribes an email from launch notifications (GDPR compliance)';



CREATE OR REPLACE FUNCTION "public"."update_achievement_badges_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_achievement_badges_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_achievement_progress_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_achievement_progress_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_bill_calendar_event"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."update_bill_calendar_event"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_bills_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_bills_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_blocked_tasks_on_completion"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."update_blocked_tasks_on_completion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_budgets_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_budgets_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_calendar_event_from_chore"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- If chore is updated and has calendar sync enabled
  IF NEW.calendar_sync = TRUE AND NEW.due_date IS NOT NULL THEN
    -- Update existing calendar event
    UPDATE events SET
      title = '🧹 ' || NEW.title,
      description = NEW.description,
      start_time = NEW.due_date::TIMESTAMPTZ,
      end_time = (NEW.due_date::TIMESTAMPTZ + INTERVAL '2 hours'),
      updated_at = NOW()
    WHERE id = (
      SELECT event_id FROM chore_calendar_events WHERE chore_id = NEW.id LIMIT 1
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_calendar_event_from_chore"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_calendar_event_from_meal"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."update_calendar_event_from_meal"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_calendar_event_from_task"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."update_calendar_event_from_task"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_calendar_table_statistics"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  ANALYZE calendar_connections;
  ANALYZE calendar_event_mappings;
  ANALYZE calendar_sync_logs;
  ANALYZE calendar_sync_conflicts;
  ANALYZE calendar_webhook_subscriptions;

  RAISE NOTICE 'Calendar table statistics updated successfully';
END;
$$;


ALTER FUNCTION "public"."update_calendar_table_statistics"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_calendar_table_statistics"() IS 'Updates statistics for calendar tables to optimize query planning';



CREATE OR REPLACE FUNCTION "public"."update_ccpa_opt_out_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_ccpa_opt_out_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_chore_calendar_events_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_chore_calendar_events_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_chore_rotations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_chore_rotations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_chores_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_chores_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_comment_reaction_counts"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  reaction_counts JSONB;
BEGIN
  -- Calculate new reaction counts for the comment
  SELECT jsonb_object_agg(emoji, count)
  INTO reaction_counts
  FROM (
    SELECT emoji, COUNT(*) as count
    FROM goal_comment_reactions
    WHERE comment_id = COALESCE(NEW.comment_id, OLD.comment_id)
    GROUP BY emoji
  ) sub;

  -- Update the comment with new reaction counts
  UPDATE goal_comments
  SET reaction_counts = COALESCE(reaction_counts, '{}'::jsonb)
  WHERE id = COALESCE(NEW.comment_id, OLD.comment_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."update_comment_reaction_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_last_message"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."update_conversation_last_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_custom_categories_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_custom_categories_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_daily_active_users"("user_count" integer, "target_date" "date" DEFAULT CURRENT_DATE) RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
  INSERT INTO daily_analytics (date, active_users)
  VALUES (target_date, user_count)
  ON CONFLICT (date) DO UPDATE
  SET active_users = GREATEST(daily_analytics.active_users, user_count);
$$;


ALTER FUNCTION "public"."update_daily_active_users"("user_count" integer, "target_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_daily_active_users"("user_count" integer, "target_date" "date") IS 'Updates active user count (takes maximum)';



CREATE OR REPLACE FUNCTION "public"."update_daily_checkins_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_daily_checkins_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_daily_usage_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_daily_usage_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_event_comments_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_event_comments_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_event_proposals_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_event_proposals_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_expenses_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_expenses_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_goal_current_amount"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."update_goal_current_amount"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_goal_dependencies_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_goal_dependencies_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_goal_dependency_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."update_goal_dependency_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_goal_progress_from_checkin"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Update goal progress when new check-in is created
  IF TG_OP = 'INSERT' THEN
    UPDATE goals
    SET
      progress = NEW.progress_percentage,
      updated_at = NOW()
    WHERE id = NEW.goal_id;

    RETURN NEW;
  END IF;

  -- Update goal progress when check-in is updated
  IF TG_OP = 'UPDATE' THEN
    UPDATE goals
    SET
      progress = NEW.progress_percentage,
      updated_at = NOW()
    WHERE id = NEW.goal_id;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_goal_progress_from_checkin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_habit_streaks"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_streak INTEGER := 0;
  longest_streak INTEGER := 0;
  streak_start DATE;
  check_date DATE;
  streak_broken BOOLEAN := FALSE;
BEGIN
  -- Only process if this is a completion or the completion status changed
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.completed != NEW.completed) THEN

    -- Calculate current streak by going backwards from today
    check_date := CURRENT_DATE;
    WHILE true LOOP
      -- Check if habit was completed on this date
      IF EXISTS(
        SELECT 1 FROM habit_entries
        WHERE template_id = NEW.template_id
          AND user_id = NEW.user_id
          AND entry_date = check_date
          AND completed = true
      ) THEN
        IF current_streak = 0 THEN
          streak_start := check_date;
        END IF;
        current_streak := current_streak + 1;
        check_date := check_date - INTERVAL '1 day';
      ELSE
        EXIT; -- Streak broken
      END IF;

      -- Prevent infinite loops
      IF check_date < (CURRENT_DATE - INTERVAL '365 days') THEN
        EXIT;
      END IF;
    END LOOP;

    -- Get longest streak (this is a simplified calculation)
    SELECT COALESCE(MAX(streak_count), 0) INTO longest_streak
    FROM habit_streaks
    WHERE template_id = NEW.template_id
      AND user_id = NEW.user_id
      AND streak_type = 'longest';

    -- Update longest streak if current is longer
    IF current_streak > longest_streak THEN
      longest_streak := current_streak;
    END IF;

    -- Upsert current streak
    INSERT INTO habit_streaks (
      template_id, user_id, streak_type, streak_count, start_date, is_active
    ) VALUES (
      NEW.template_id, NEW.user_id, 'current', current_streak,
      CASE WHEN current_streak > 0 THEN streak_start ELSE NULL END,
      current_streak > 0
    )
    ON CONFLICT (template_id, user_id, streak_type)
    DO UPDATE SET
      streak_count = current_streak,
      start_date = CASE WHEN current_streak > 0 THEN streak_start ELSE NULL END,
      is_active = current_streak > 0,
      updated_at = NOW();

    -- Upsert longest streak
    INSERT INTO habit_streaks (
      template_id, user_id, streak_type, streak_count, start_date, is_active
    ) VALUES (
      NEW.template_id, NEW.user_id, 'longest', longest_streak, streak_start, false
    )
    ON CONFLICT (template_id, user_id, streak_type)
    DO UPDATE SET
      streak_count = GREATEST(habit_streaks.streak_count, longest_streak),
      updated_at = NOW();

  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_habit_streaks"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_in_app_notifications_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_in_app_notifications_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_line_item_actual_cost"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."update_line_item_actual_cost"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_meal_calendar_events_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_meal_calendar_events_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_notification_queue_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_notification_queue_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_notifications_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_notifications_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_partnership_balance_on_settlement"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_partnership_id UUID;
BEGIN
  -- Get partnership_id from space
  SELECT s.partnership_id INTO v_partnership_id
  FROM spaces s
  WHERE s.id = NEW.space_id;

  -- Update or create partnership balance
  INSERT INTO partnership_balances (partnership_id, space_id, user1_id, user2_id, balance)
  VALUES (
    v_partnership_id,
    NEW.space_id,
    NEW.from_user_id,
    NEW.to_user_id,
    -NEW.amount -- Negative because from_user paid to_user
  )
  ON CONFLICT (partnership_id, space_id)
  DO UPDATE SET
    balance = partnership_balances.balance - NEW.amount,
    last_calculated_at = NOW();

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_partnership_balance_on_settlement"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_project_actual_cost"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."update_project_actual_cost"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_projects_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_projects_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_receipts_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_receipts_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_recurring_patterns_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_recurring_patterns_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_reminder_attachments_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_reminder_attachments_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_reminder_comment_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_reminder_comment_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_reminder_template_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_reminder_template_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_rewards_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_rewards_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_shared_at_secure"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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
    -- Optionally regenerate token or keep existing one
    -- NEW.share_token = generate_secure_share_token();
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_shared_at_secure"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_shared_at_secure"() IS 'Trigger function that generates secure tokens when lists are made public';



CREATE OR REPLACE FUNCTION "public"."update_shopping_list_modified"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."update_shopping_list_modified"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_subscriptions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_subscriptions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_subtasks_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_subtasks_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_task_actual_duration"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."update_task_actual_duration"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_task_approval_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."update_task_approval_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_task_approvals_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status != OLD.status AND NEW.status != 'pending' THEN
    NEW.reviewed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_task_approvals_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_task_blocked_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."update_task_blocked_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_task_calendar_events_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_task_calendar_events_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_task_categories_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_task_categories_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_task_comment_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."update_task_comment_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_task_comments_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."update_task_comments_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_task_handoff_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE tasks
  SET handoff_count = handoff_count + 1
  WHERE id = NEW.task_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_task_handoff_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_task_reminders_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_task_reminders_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_task_stats_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_task_stats_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_task_templates_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_task_templates_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_template_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_template_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_thread_reply_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."update_thread_reply_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_time_entries_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_time_entries_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_token_expiry"("p_connection_id" "uuid", "p_expires_in_seconds" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE calendar_connections
  SET
    token_expires_at = NOW() + (p_expires_in_seconds || ' seconds')::INTERVAL,
    sync_status = 'active'
  WHERE id = p_connection_id;
END;
$$;


ALTER FUNCTION "public"."update_token_expiry"("p_connection_id" "uuid", "p_expires_in_seconds" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_token_expiry"("p_connection_id" "uuid", "p_expires_in_seconds" integer) IS 'Updates token expiry timestamp after refresh';



CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_feedback_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_feedback_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_space_access"("p_space_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  -- Use check_space_membership function which bypasses RLS
  SELECT check_space_membership(p_space_id, auth.uid());
$$;


ALTER FUNCTION "public"."user_has_space_access"("p_space_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_calendar_rls_enabled"() RETURNS TABLE("table_name" "text", "rls_enabled" boolean, "policy_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.tablename::TEXT,
    t.rowsecurity,
    COUNT(p.policyname)
  FROM pg_tables t
  LEFT JOIN pg_policies p ON p.tablename = t.tablename
  WHERE t.schemaname = 'public'
    AND t.tablename IN (
      'calendar_connections',
      'calendar_event_mappings',
      'calendar_sync_logs',
      'calendar_sync_conflicts',
      'calendar_webhook_subscriptions'
    )
  GROUP BY t.tablename, t.rowsecurity
  ORDER BY t.tablename;
END;
$$;


ALTER FUNCTION "public"."verify_calendar_rls_enabled"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."verify_calendar_rls_enabled"() IS 'Verifies RLS is enabled on all calendar tables and counts policies';



CREATE TABLE IF NOT EXISTS "public"."account_deletion_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "action_details" "jsonb" DEFAULT '{}'::"jsonb",
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "account_deletion_audit_log_action_check" CHECK (("action" = ANY (ARRAY['initiated'::"text", 'cancelled'::"text", 'permanent'::"text", 'email_sent'::"text"])))
);


ALTER TABLE "public"."account_deletion_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."account_deletion_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "scheduled_deletion_date" timestamp with time zone NOT NULL,
    "reminder_sent_7_days" boolean DEFAULT false,
    "reminder_sent_1_day" boolean DEFAULT false,
    "deletion_completed" boolean DEFAULT false,
    "cancelled_at" timestamp with time zone,
    "cancellation_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."account_deletion_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."account_deletion_requests" IS 'Tracks account deletion requests with 30-day grace period';



CREATE TABLE IF NOT EXISTS "public"."achievement_badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "category" "text" NOT NULL,
    "icon" "text" NOT NULL,
    "color" "text" DEFAULT 'indigo'::"text" NOT NULL,
    "criteria" "jsonb" NOT NULL,
    "points" integer DEFAULT 10,
    "rarity" "text" DEFAULT 'common'::"text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "is_secret" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "achievement_badges_category_check" CHECK (("category" = ANY (ARRAY['goals'::"text", 'milestones'::"text", 'streaks'::"text", 'social'::"text", 'special'::"text", 'seasonal'::"text"]))),
    CONSTRAINT "achievement_badges_points_check" CHECK (("points" >= 0)),
    CONSTRAINT "achievement_badges_rarity_check" CHECK (("rarity" = ANY (ARRAY['common'::"text", 'uncommon'::"text", 'rare'::"text", 'epic'::"text", 'legendary'::"text"])))
);


ALTER TABLE "public"."achievement_badges" OWNER TO "postgres";


COMMENT ON TABLE "public"."achievement_badges" IS 'Defines all available achievement badges in the system';



COMMENT ON COLUMN "public"."achievement_badges"."criteria" IS 'JSON object defining the requirements to earn this badge';



COMMENT ON COLUMN "public"."achievement_badges"."is_secret" IS 'Hidden badges that users don''t see until they earn them';



CREATE TABLE IF NOT EXISTS "public"."achievement_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "space_id" "uuid" NOT NULL,
    "badge_id" "uuid" NOT NULL,
    "current_progress" integer DEFAULT 0,
    "target_progress" integer NOT NULL,
    "progress_data" "jsonb" DEFAULT '{}'::"jsonb",
    "last_updated" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."achievement_progress" OWNER TO "postgres";


COMMENT ON TABLE "public"."achievement_progress" IS 'Tracks user progress toward earning badges';



CREATE TABLE IF NOT EXISTS "public"."activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid",
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "resource_type" "text",
    "resource_id" "uuid",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."activity_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "activity_type" "public"."activity_type" NOT NULL,
    "entity_type" "public"."commentable_type" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "description" "text",
    "metadata" "jsonb",
    "is_system" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."activity_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."activity_logs" IS 'Comprehensive audit trail of all user actions';



COMMENT ON COLUMN "public"."activity_logs"."metadata" IS 'JSON object with additional context (old_value, new_value, etc.)';



CREATE TABLE IF NOT EXISTS "public"."admin_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "target_resource" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'admin'::"text",
    "permissions" "jsonb" DEFAULT '{}'::"jsonb",
    "last_login" timestamp with time zone,
    "login_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    CONSTRAINT "admin_users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_users" IS 'Secure admin users for admin dashboard access';



COMMENT ON COLUMN "public"."admin_users"."email" IS 'Admin email address (unique) - currently admin@example.com';



COMMENT ON COLUMN "public"."admin_users"."role" IS 'Admin role: admin, super_admin, or viewer';



COMMENT ON COLUMN "public"."admin_users"."permissions" IS 'JSON object defining specific permissions and access levels';



COMMENT ON COLUMN "public"."admin_users"."last_login" IS 'Timestamp of most recent login for security monitoring';



COMMENT ON COLUMN "public"."admin_users"."login_count" IS 'Total number of logins for usage analytics';



COMMENT ON COLUMN "public"."admin_users"."is_active" IS 'Whether admin account is active (for disabling access)';



CREATE TABLE IF NOT EXISTS "public"."ai_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "space_id" "uuid" NOT NULL,
    "title" "text",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_message_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "message_count" integer DEFAULT 0 NOT NULL,
    "summary" "text",
    "model_used" "text" DEFAULT 'gemini-2.0-flash'::"text" NOT NULL,
    "total_input_tokens" integer DEFAULT 0 NOT NULL,
    "total_output_tokens" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ai_conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "input_type" "text" DEFAULT 'text'::"text" NOT NULL,
    "tool_calls_json" "jsonb",
    "tool_results_json" "jsonb",
    "input_tokens" integer DEFAULT 0 NOT NULL,
    "output_tokens" integer DEFAULT 0 NOT NULL,
    "model_used" "text",
    "latency_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "feedback" "text",
    "feedback_text" "text",
    CONSTRAINT "ai_messages_feedback_check" CHECK (("feedback" = ANY (ARRAY['positive'::"text", 'negative'::"text", NULL::"text"]))),
    CONSTRAINT "ai_messages_input_type_check" CHECK (("input_type" = ANY (ARRAY['text'::"text", 'voice'::"text"]))),
    CONSTRAINT "ai_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."ai_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_usage_daily" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "space_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "input_tokens" integer DEFAULT 0 NOT NULL,
    "output_tokens" integer DEFAULT 0 NOT NULL,
    "voice_seconds" integer DEFAULT 0 NOT NULL,
    "conversation_count" integer DEFAULT 0 NOT NULL,
    "tool_calls_count" integer DEFAULT 0 NOT NULL,
    "feature_source" "text" DEFAULT 'chat'::"text" NOT NULL,
    "estimated_cost_usd" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ai_usage_daily" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_user_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "ai_enabled" boolean DEFAULT true NOT NULL,
    "voice_enabled" boolean DEFAULT true NOT NULL,
    "proactive_suggestions" boolean DEFAULT true NOT NULL,
    "morning_briefing" boolean DEFAULT false NOT NULL,
    "preferred_voice_lang" "text" DEFAULT 'en'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ai_onboarding_seen" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."ai_user_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."availability_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "day_of_week" integer NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "block_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "availability_blocks_block_type_check" CHECK (("block_type" = ANY (ARRAY['work'::"text", 'sleep'::"text", 'busy'::"text", 'available'::"text"]))),
    CONSTRAINT "availability_blocks_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6)))
);


ALTER TABLE "public"."availability_blocks" OWNER TO "postgres";


COMMENT ON TABLE "public"."availability_blocks" IS 'Recurring availability patterns (e.g., work hours)';



CREATE TABLE IF NOT EXISTS "public"."bills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "category" "text",
    "payee" "text",
    "notes" "text",
    "due_date" "date" NOT NULL,
    "frequency" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "auto_pay" boolean DEFAULT false,
    "last_paid_date" "date",
    "next_due_date" "date",
    "linked_expense_id" "uuid",
    "linked_calendar_event_id" "uuid",
    "reminder_enabled" boolean DEFAULT true,
    "reminder_days_before" integer DEFAULT 3,
    "last_reminder_sent_at" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "linked_reminder_id" "uuid",
    CONSTRAINT "bills_frequency_check" CHECK (("frequency" = ANY (ARRAY['one-time'::"text", 'weekly'::"text", 'bi-weekly'::"text", 'monthly'::"text", 'quarterly'::"text", 'semi-annual'::"text", 'annual'::"text"]))),
    CONSTRAINT "bills_reminder_days_before_check" CHECK ((("reminder_days_before" >= 0) AND ("reminder_days_before" <= 30))),
    CONSTRAINT "bills_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'paid'::"text", 'overdue'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."bills" OWNER TO "postgres";


COMMENT ON TABLE "public"."bills" IS 'Tracks recurring and one-time bills with payment status and reminders';



COMMENT ON COLUMN "public"."bills"."frequency" IS 'How often the bill recurs: one-time, weekly, bi-weekly, monthly, quarterly, semi-annual, annual';



COMMENT ON COLUMN "public"."bills"."status" IS 'Current payment status: scheduled (upcoming), paid, overdue, cancelled';



COMMENT ON COLUMN "public"."bills"."next_due_date" IS 'Automatically calculated next due date for recurring bills';



COMMENT ON COLUMN "public"."bills"."linked_expense_id" IS 'Links to expense record when bill is paid';



COMMENT ON COLUMN "public"."bills"."linked_calendar_event_id" IS 'Foreign key to the auto-created calendar event for this bill.';



COMMENT ON COLUMN "public"."bills"."linked_reminder_id" IS 'Foreign key to the auto-created reminder for this bill.';



CREATE TABLE IF NOT EXISTS "public"."budget_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "category_name" "text" NOT NULL,
    "allocated_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "spent_amount" numeric(10,2) DEFAULT 0,
    "icon" "text",
    "color" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."budget_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."budget_categories" IS 'Stores budget allocations by category for each space';



CREATE TABLE IF NOT EXISTS "public"."budget_template_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "category_name" "text" NOT NULL,
    "percentage" numeric(5,2) NOT NULL,
    "icon" "text",
    "color" "text",
    "description" "text",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."budget_template_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."budget_template_categories" IS 'Category breakdowns for budget templates (percentages)';



CREATE TABLE IF NOT EXISTS "public"."budget_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "household_type" "text" NOT NULL,
    "icon" "text" DEFAULT '📊'::"text",
    "recommended_income_min" integer,
    "recommended_income_max" integer,
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."budget_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."budget_templates" IS 'Pre-built budget templates for different household types';



CREATE TABLE IF NOT EXISTS "public"."budgets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "monthly_budget" numeric(10,2) DEFAULT 0 NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "threshold_50_enabled" boolean DEFAULT true,
    "threshold_75_enabled" boolean DEFAULT true,
    "threshold_90_enabled" boolean DEFAULT true,
    "notifications_enabled" boolean DEFAULT true,
    "notification_preferences" "jsonb" DEFAULT '{"push": true, "email": true, "toast": true}'::"jsonb",
    "last_alert_sent_at" timestamp with time zone,
    "last_alert_threshold" integer
);


ALTER TABLE "public"."budgets" OWNER TO "postgres";


COMMENT ON TABLE "public"."budgets" IS 'Stores monthly budgets for each space. One budget per space.';



COMMENT ON COLUMN "public"."budgets"."space_id" IS 'Foreign key to spaces table (one budget per space)';



COMMENT ON COLUMN "public"."budgets"."monthly_budget" IS 'Monthly budget amount in dollars';



COMMENT ON COLUMN "public"."budgets"."threshold_50_enabled" IS 'Enable alert when 50% of budget is spent';



COMMENT ON COLUMN "public"."budgets"."threshold_75_enabled" IS 'Enable alert when 75% of budget is spent';



COMMENT ON COLUMN "public"."budgets"."threshold_90_enabled" IS 'Enable alert when 90% of budget is spent';



COMMENT ON COLUMN "public"."budgets"."notifications_enabled" IS 'Master toggle for all budget notifications';



COMMENT ON COLUMN "public"."budgets"."notification_preferences" IS 'JSON object with notification channel preferences: {email, push, toast}';



COMMENT ON COLUMN "public"."budgets"."last_alert_sent_at" IS 'Timestamp of last alert sent (prevents duplicate alerts)';



COMMENT ON COLUMN "public"."budgets"."last_alert_threshold" IS 'Which threshold (50, 75, 90) triggered the last alert';



CREATE TABLE IF NOT EXISTS "public"."calendar_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "space_id" "uuid" NOT NULL,
    "provider" "public"."calendar_provider" NOT NULL,
    "provider_account_id" "text",
    "provider_calendar_id" "text",
    "access_token_vault_id" "uuid",
    "refresh_token_vault_id" "uuid",
    "token_expires_at" timestamp with time zone,
    "sync_direction" "public"."sync_direction_type" DEFAULT 'bidirectional'::"public"."sync_direction_type" NOT NULL,
    "sync_status" "public"."sync_status_type" DEFAULT 'active'::"public"."sync_status_type" NOT NULL,
    "sync_token" "text",
    "last_sync_at" timestamp with time zone,
    "next_sync_at" timestamp with time zone,
    "webhook_channel_id" "text",
    "webhook_resource_id" "text",
    "webhook_expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "provider_config" "jsonb"
);


ALTER TABLE "public"."calendar_connections" OWNER TO "postgres";


COMMENT ON TABLE "public"."calendar_connections" IS 'Stores calendar provider OAuth connections with encrypted token references';



COMMENT ON COLUMN "public"."calendar_connections"."access_token_vault_id" IS 'Reference to encrypted access token in vault.secrets';



COMMENT ON COLUMN "public"."calendar_connections"."refresh_token_vault_id" IS 'Reference to encrypted refresh token in vault.secrets';



COMMENT ON COLUMN "public"."calendar_connections"."sync_token" IS 'Provider-specific token for incremental sync (Google: nextSyncToken, CalDAV: ctag)';



COMMENT ON COLUMN "public"."calendar_connections"."webhook_channel_id" IS 'Google Calendar push notification channel ID';



COMMENT ON COLUMN "public"."calendar_connections"."provider_config" IS 'Per-provider configuration blob (e.g. ICSFeedConfig for ICS/Cozi: feed URL, last_etag, last_modified). Nullable for providers that do not need extra config.';



CREATE TABLE IF NOT EXISTS "public"."calendar_event_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rowan_event_id" "uuid" NOT NULL,
    "connection_id" "uuid" NOT NULL,
    "external_event_id" "text" NOT NULL,
    "external_calendar_id" "text" NOT NULL,
    "sync_direction" "public"."sync_direction_type" DEFAULT 'bidirectional'::"public"."sync_direction_type" NOT NULL,
    "rowan_etag" "text",
    "external_etag" "text",
    "last_synced_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "has_conflict" boolean DEFAULT false NOT NULL,
    "conflict_detected_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."calendar_event_mappings" OWNER TO "postgres";


COMMENT ON TABLE "public"."calendar_event_mappings" IS 'Maps Rowan events to external calendar events for bidirectional sync';



COMMENT ON COLUMN "public"."calendar_event_mappings"."rowan_etag" IS 'Rowan event version hash for detecting local changes';



COMMENT ON COLUMN "public"."calendar_event_mappings"."external_etag" IS 'External event ETag/version for detecting remote changes';



COMMENT ON COLUMN "public"."calendar_event_mappings"."has_conflict" IS 'TRUE when both Rowan and external event were modified';



CREATE TABLE IF NOT EXISTS "public"."calendar_sync_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "connection_id" "uuid" NOT NULL,
    "sync_type" "public"."sync_type" NOT NULL,
    "sync_direction" "public"."sync_direction_type" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "status" "public"."sync_log_status" DEFAULT 'pending'::"public"."sync_log_status" NOT NULL,
    "events_created" integer DEFAULT 0 NOT NULL,
    "events_updated" integer DEFAULT 0 NOT NULL,
    "events_deleted" integer DEFAULT 0 NOT NULL,
    "conflicts_detected" integer DEFAULT 0 NOT NULL,
    "error_code" "text",
    "error_message" "text",
    "error_details" "jsonb",
    "triggered_by" "text",
    "duration_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."calendar_sync_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."calendar_sync_logs" IS 'Audit trail for calendar sync operations (90-day retention)';



COMMENT ON COLUMN "public"."calendar_sync_logs"."triggered_by" IS 'What initiated this sync: cron, webhook, user, database_trigger';



COMMENT ON COLUMN "public"."calendar_sync_logs"."duration_ms" IS 'Sync duration in milliseconds (auto-calculated)';



CREATE TABLE IF NOT EXISTS "public"."calendar_sync_map" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rowan_event_id" "uuid" NOT NULL,
    "external_event_id" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "synced_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."calendar_sync_map" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ccpa_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "action_details" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ccpa_audit_log_action_check" CHECK (("action" = ANY (ARRAY['opt_out_enabled'::"text", 'opt_out_disabled'::"text", 'data_request'::"text", 'california_resident_verified'::"text"])))
);


ALTER TABLE "public"."ccpa_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ccpa_do_not_sell" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "do_not_sell" boolean DEFAULT false NOT NULL,
    "opted_out_at" timestamp with time zone,
    "opted_out_method" "text",
    "opted_out_ip_address" "text",
    "opted_in_at" timestamp with time zone,
    "opted_in_method" "text",
    "current_status" "text" DEFAULT 'opted_in'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ccpa_do_not_sell" OWNER TO "postgres";


COMMENT ON TABLE "public"."ccpa_do_not_sell" IS 'CCPA: Do Not Sell My Personal Information preferences';



CREATE TABLE IF NOT EXISTS "public"."ccpa_opt_out_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "opted_out" boolean DEFAULT false NOT NULL,
    "opt_out_date" timestamp with time zone,
    "ip_address" "inet",
    "user_agent" "text",
    "california_resident" boolean,
    "verification_method" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ccpa_opt_out_status_verification_method_check" CHECK (("verification_method" = ANY (ARRAY['geolocation'::"text", 'user_declaration'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."ccpa_opt_out_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checkin_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "checkin_id" "uuid" NOT NULL,
    "from_user_id" "uuid" NOT NULL,
    "reaction_type" "text" NOT NULL,
    "message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "checkin_reactions_reaction_type_check" CHECK (("reaction_type" = ANY (ARRAY['heart'::"text", 'hug'::"text", 'strength'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."checkin_reactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."checkin_reactions" IS 'Stores reactions/validations that partners send to each other on daily check-ins';



COMMENT ON COLUMN "public"."checkin_reactions"."reaction_type" IS 'Type of reaction: heart (support), hug (comfort), strength (encouragement), custom (with message)';



COMMENT ON COLUMN "public"."checkin_reactions"."message" IS 'Optional custom message with the reaction';



CREATE TABLE IF NOT EXISTS "public"."chore_calendar_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chore_id" "uuid" NOT NULL,
    "event_id" "uuid",
    "is_synced" boolean DEFAULT false,
    "sync_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."chore_calendar_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."chore_calendar_events" IS 'Sync records between chores and calendar events';



CREATE TABLE IF NOT EXISTS "public"."chore_rotations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chore_id" "uuid" NOT NULL,
    "rotation_name" "text" NOT NULL,
    "rotation_type" "text" DEFAULT 'round_robin'::"text",
    "user_order" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "current_index" integer DEFAULT 0,
    "rotation_frequency" "text" DEFAULT 'weekly'::"text",
    "next_rotation_date" "date" NOT NULL,
    "last_rotation_date" "date",
    "last_assigned_to" "uuid",
    "is_active" boolean DEFAULT true,
    "skip_on_absence" boolean DEFAULT false,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chore_rotations_rotation_frequency_check" CHECK (("rotation_frequency" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'biweekly'::"text", 'monthly'::"text"]))),
    CONSTRAINT "chore_rotations_rotation_type_check" CHECK (("rotation_type" = ANY (ARRAY['round_robin'::"text", 'random'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."chore_rotations" OWNER TO "postgres";


COMMENT ON TABLE "public"."chore_rotations" IS 'Automatic rotation system for fair chore distribution';



COMMENT ON COLUMN "public"."chore_rotations"."rotation_type" IS 'round_robin = sequential, random = random selection';



COMMENT ON COLUMN "public"."chore_rotations"."user_order" IS 'JSONB array of user_ids in rotation order';



COMMENT ON COLUMN "public"."chore_rotations"."current_index" IS 'Current position in round_robin rotation';



COMMENT ON COLUMN "public"."chore_rotations"."skip_on_absence" IS 'Skip user if marked as absent/unavailable';



CREATE TABLE IF NOT EXISTS "public"."chores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "frequency" "text",
    "assigned_to" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "due_date" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "completion_percentage" integer DEFAULT 0,
    "notes" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "has_rotation" boolean DEFAULT false,
    "rotation_id" "uuid",
    "sort_order" integer DEFAULT 0,
    "calendar_sync" boolean DEFAULT false,
    "point_value" integer DEFAULT 10 NOT NULL,
    "bonus_multiplier" numeric(3,2) DEFAULT 1.0,
    "late_penalty_enabled" boolean DEFAULT false,
    "late_penalty_points" integer DEFAULT 5,
    "grace_period_hours" integer DEFAULT 2,
    "penalty_applied_at" timestamp with time zone,
    "penalty_points_deducted" integer DEFAULT 0,
    CONSTRAINT "chores_bonus_multiplier_check" CHECK ((("bonus_multiplier" >= (0)::numeric) AND ("bonus_multiplier" <= (5)::numeric))),
    CONSTRAINT "chores_completion_percentage_check" CHECK ((("completion_percentage" >= 0) AND ("completion_percentage" <= 100))),
    CONSTRAINT "chores_frequency_check" CHECK (("frequency" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'biweekly'::"text", 'monthly'::"text", 'once'::"text"]))),
    CONSTRAINT "chores_point_value_check" CHECK (("point_value" >= 0)),
    CONSTRAINT "chores_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in-progress'::"text", 'blocked'::"text", 'on-hold'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."chores" OWNER TO "postgres";


COMMENT ON TABLE "public"."chores" IS 'Household chores and tasks tracking';



COMMENT ON COLUMN "public"."chores"."frequency" IS 'Frequency of the chore: daily, weekly, biweekly, monthly, or once';



COMMENT ON COLUMN "public"."chores"."notes" IS 'Additional notes for the chore';



COMMENT ON COLUMN "public"."chores"."status" IS 'Status of the chore: pending, in-progress, blocked, completed, or on-hold';



COMMENT ON COLUMN "public"."chores"."sort_order" IS 'Custom ordering for drag-and-drop reordering (0-based index)';



COMMENT ON COLUMN "public"."chores"."calendar_sync" IS 'Whether this chore should sync to calendar as events';



COMMENT ON COLUMN "public"."chores"."point_value" IS 'Points awarded when this chore is completed';



COMMENT ON COLUMN "public"."chores"."bonus_multiplier" IS 'Multiplier for streak bonuses (default 1.0)';



COMMENT ON COLUMN "public"."chores"."late_penalty_enabled" IS 'Whether late penalties apply to this chore';



COMMENT ON COLUMN "public"."chores"."late_penalty_points" IS 'Points to deduct per day late (default 5)';



COMMENT ON COLUMN "public"."chores"."grace_period_hours" IS 'Hours after due_date before penalty applies (default 2)';



COMMENT ON COLUMN "public"."chores"."penalty_applied_at" IS 'When penalty was last applied';



COMMENT ON COLUMN "public"."chores"."penalty_points_deducted" IS 'Total penalty points deducted for this instance';



CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "commentable_type" "public"."commentable_type" NOT NULL,
    "commentable_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "parent_comment_id" "uuid",
    "thread_depth" integer DEFAULT 0,
    "created_by" "uuid" NOT NULL,
    "edited_at" timestamp with time zone,
    "is_edited" boolean DEFAULT false,
    "is_pinned" boolean DEFAULT false,
    "is_deleted" boolean DEFAULT false,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "comments_content_check" CHECK (("length"("content") > 0)),
    CONSTRAINT "comments_thread_depth_check" CHECK ((("thread_depth" >= 0) AND ("thread_depth" <= 5)))
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


COMMENT ON TABLE "public"."comments" IS 'Polymorphic comments system for all entities with threading support';



COMMENT ON COLUMN "public"."comments"."commentable_type" IS 'Type of entity being commented on';



COMMENT ON COLUMN "public"."comments"."commentable_id" IS 'ID of entity being commented on';



COMMENT ON COLUMN "public"."comments"."thread_depth" IS 'Nesting level for threaded replies (max 5)';



COMMENT ON COLUMN "public"."comments"."is_pinned" IS 'Whether comment is pinned to top';



CREATE OR REPLACE VIEW "public"."comment_counts" WITH ("security_invoker"='true') AS
 SELECT "commentable_type",
    "commentable_id",
    "count"(*) AS "comment_count",
    "count"(DISTINCT "created_by") AS "unique_commenters",
    "max"("created_at") AS "last_comment_at"
   FROM "public"."comments"
  WHERE ("is_deleted" = false)
  GROUP BY "commentable_type", "commentable_id";


ALTER VIEW "public"."comment_counts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comment_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "comment_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "emoji" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."comment_reactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."comment_reactions" IS 'Emoji reactions to comments (like Slack/Discord)';



CREATE TABLE IF NOT EXISTS "public"."compliance_events_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_category" "text" NOT NULL,
    "description" "text",
    "metadata" "jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."compliance_events_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."compliance_events_log" IS 'Audit log of all compliance-related events';



CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid",
    "title" "text",
    "participants" "jsonb" DEFAULT '[]'::"jsonb",
    "unread_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "conversation_type" "text" DEFAULT 'direct'::"text",
    "last_message_preview" "text",
    "last_message_at" timestamp with time zone,
    "is_archived" boolean DEFAULT false,
    "avatar_url" "text",
    "description" "text",
    CONSTRAINT "conversations_conversation_type_check" CHECK (("conversation_type" = ANY (ARRAY['direct'::"text", 'group'::"text", 'general'::"text"])))
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."conversations"."conversation_type" IS 'Type of conversation: direct (1-on-1), group (multiple users), or general (space-wide)';



COMMENT ON COLUMN "public"."conversations"."last_message_preview" IS 'Preview text of the last message (first 100 chars)';



COMMENT ON COLUMN "public"."conversations"."last_message_at" IS 'Timestamp of the last message for sorting';



COMMENT ON COLUMN "public"."conversations"."is_archived" IS 'Whether the conversation is archived';



COMMENT ON COLUMN "public"."conversations"."avatar_url" IS 'Optional avatar/icon URL for the conversation';



COMMENT ON COLUMN "public"."conversations"."description" IS 'Optional description for group conversations';



CREATE TABLE IF NOT EXISTS "public"."custom_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "color" "text" DEFAULT '#6366f1'::"text",
    "parent_category_id" "uuid",
    "monthly_budget" numeric(10,2),
    "is_active" boolean DEFAULT true,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."custom_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."custom_categories" IS 'User-defined expense categories with icons and colors';



COMMENT ON COLUMN "public"."custom_categories"."icon" IS 'Lucide icon name for visual representation';



COMMENT ON COLUMN "public"."custom_categories"."parent_category_id" IS 'For creating subcategories (hierarchical structure)';



COMMENT ON COLUMN "public"."custom_categories"."monthly_budget" IS 'Optional budget allocation for this category';



CREATE TABLE IF NOT EXISTS "public"."daily_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "new_users" integer DEFAULT 0,
    "active_users" integer DEFAULT 0,
    "beta_requests" integer DEFAULT 0,
    "launch_signups" integer DEFAULT 0,
    "feature_usage" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."daily_analytics" OWNER TO "postgres";


COMMENT ON TABLE "public"."daily_analytics" IS 'Daily aggregated metrics for admin dashboard and email digest';



COMMENT ON COLUMN "public"."daily_analytics"."date" IS 'Date for the analytics (unique, one record per day)';



COMMENT ON COLUMN "public"."daily_analytics"."new_users" IS 'Number of new user registrations on this date';



COMMENT ON COLUMN "public"."daily_analytics"."active_users" IS 'Number of users who had active sessions on this date';



COMMENT ON COLUMN "public"."daily_analytics"."beta_requests" IS 'Number of beta access requests on this date';



COMMENT ON COLUMN "public"."daily_analytics"."launch_signups" IS 'Number of launch notification signups on this date';



COMMENT ON COLUMN "public"."daily_analytics"."feature_usage" IS 'JSON object tracking usage of different app features';



CREATE TABLE IF NOT EXISTS "public"."daily_checkins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "space_id" "uuid",
    "date" "date" NOT NULL,
    "mood" "text",
    "highlights" "text",
    "challenges" "text",
    "gratitude" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "note" "text",
    "energy_level" smallint,
    CONSTRAINT "daily_checkins_energy_level_check" CHECK ((("energy_level" IS NULL) OR (("energy_level" >= 1) AND ("energy_level" <= 5))))
);


ALTER TABLE "public"."daily_checkins" OWNER TO "postgres";


COMMENT ON COLUMN "public"."daily_checkins"."highlights" IS 'Quick wins or positive moments from the day (shown for great/good moods)';



COMMENT ON COLUMN "public"."daily_checkins"."challenges" IS 'Difficulties or struggles from the day (shown for meh/rough moods)';



COMMENT ON COLUMN "public"."daily_checkins"."gratitude" IS 'What the user is grateful for today (optional gratitude prompt)';



COMMENT ON COLUMN "public"."daily_checkins"."energy_level" IS 'Self-reported energy on a 1-5 scale (1=exhausted, 5=energized). NULL when user skipped the energy question.';



CREATE TABLE IF NOT EXISTS "public"."daily_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "tasks_created" integer DEFAULT 0 NOT NULL,
    "messages_sent" integer DEFAULT 0 NOT NULL,
    "quick_actions_used" integer DEFAULT 0 NOT NULL,
    "shopping_list_updates" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."daily_usage" OWNER TO "postgres";


COMMENT ON TABLE "public"."daily_usage" IS 'Daily usage tracking for free tier rate limiting';



CREATE TABLE IF NOT EXISTS "public"."data_export_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "export_format" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "file_url" "text",
    "file_size_bytes" bigint,
    "expires_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "data_export_requests_export_format_check" CHECK (("export_format" = ANY (ARRAY['json'::"text", 'csv'::"text", 'pdf'::"text"]))),
    CONSTRAINT "data_export_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."data_export_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."data_export_requests" IS 'Tracks data export requests for GDPR Article 20 compliance';



CREATE TABLE IF NOT EXISTS "public"."data_processing_agreements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "agreement_type" "text" NOT NULL,
    "agreement_version" "text" NOT NULL,
    "legal_basis" "text" NOT NULL,
    "consented" boolean DEFAULT false NOT NULL,
    "consent_date" timestamp with time zone,
    "consent_method" "text",
    "consent_ip_address" "text",
    "consent_user_agent" "text",
    "withdrawn" boolean DEFAULT false,
    "withdrawal_date" timestamp with time zone,
    "withdrawal_reason" "text",
    "processing_purposes" "text"[],
    "data_categories" "text"[],
    "retention_period" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."data_processing_agreements" OWNER TO "postgres";


COMMENT ON TABLE "public"."data_processing_agreements" IS 'GDPR Article 28: Data Processing Agreements and consent tracking';



CREATE TABLE IF NOT EXISTS "public"."deleted_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "deletion_requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "permanent_deletion_at" timestamp with time zone NOT NULL,
    "partnership_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."deleted_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" integer,
    "mime_type" "text",
    "storage_path" "text" NOT NULL,
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "space_id" "uuid" NOT NULL,
    "file_type" "text",
    "file_url" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_attachments" OWNER TO "postgres";


COMMENT ON TABLE "public"."event_attachments" IS 'Stores file attachments for calendar events';



CREATE TABLE IF NOT EXISTS "public"."event_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "changed_by" "uuid",
    "changes" "jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "event_audit_log_action_check" CHECK (("action" = ANY (ARRAY['created'::"text", 'updated'::"text", 'deleted'::"text", 'status_changed'::"text"])))
);


ALTER TABLE "public"."event_audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."event_audit_log" IS 'Audit trail for all calendar operations';



CREATE TABLE IF NOT EXISTS "public"."event_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "mentions" "uuid"[],
    "parent_comment_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "space_id" "uuid" NOT NULL,
    "edited" boolean DEFAULT false
);


ALTER TABLE "public"."event_comments" OWNER TO "postgres";


COMMENT ON TABLE "public"."event_comments" IS 'Stores comments and discussions on calendar events with @mention support';



CREATE TABLE IF NOT EXISTS "public"."event_note_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "note_id" "uuid" NOT NULL,
    "version" integer NOT NULL,
    "content" "text",
    "edited_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_note_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "content" "text",
    "last_edited_by" "uuid",
    "version" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_notes" OWNER TO "postgres";


COMMENT ON TABLE "public"."event_notes" IS 'Collaborative markdown notes for events';



CREATE TABLE IF NOT EXISTS "public"."event_proposal_votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "proposal_id" "uuid" NOT NULL,
    "time_slot_index" integer NOT NULL,
    "user_id" "uuid" NOT NULL,
    "vote" "text" NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "event_proposal_votes_vote_check" CHECK (("vote" = ANY (ARRAY['available'::"text", 'unavailable'::"text", 'preferred'::"text"])))
);


ALTER TABLE "public"."event_proposal_votes" OWNER TO "postgres";


COMMENT ON TABLE "public"."event_proposal_votes" IS 'Stores votes/responses to event proposals';



CREATE TABLE IF NOT EXISTS "public"."event_proposals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "space_id" "uuid" NOT NULL,
    "proposed_by" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "time_slots" "jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "counter_proposal_id" "uuid",
    "approved_slot_index" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_event_id" "uuid",
    "category" "text",
    "expires_at" timestamp with time zone,
    "location" "text",
    CONSTRAINT "event_proposals_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'countered'::"text"])))
);


ALTER TABLE "public"."event_proposals" OWNER TO "postgres";


COMMENT ON TABLE "public"."event_proposals" IS 'Stores event scheduling proposals with multiple time slot options';



CREATE TABLE IF NOT EXISTS "public"."event_reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "remind_before_minutes" integer NOT NULL,
    "reminder_type" "text" NOT NULL,
    "custom_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "event_reminders_reminder_type_check" CHECK (("reminder_type" = ANY (ARRAY['email'::"text", 'push'::"text", 'sms'::"text", 'in_app'::"text"])))
);


ALTER TABLE "public"."event_reminders" OWNER TO "postgres";


COMMENT ON TABLE "public"."event_reminders" IS 'Multiple reminder options per event';



CREATE TABLE IF NOT EXISTS "public"."event_share_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."event_share_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "category" character varying(50) DEFAULT 'personal'::character varying NOT NULL,
    "icon" character varying(10),
    "is_system_template" boolean DEFAULT false,
    "default_duration" integer,
    "default_location" character varying(255),
    "default_attendees" "uuid"[],
    "default_reminders" "jsonb",
    "default_color" character varying(50),
    "default_recurrence" "jsonb",
    "use_count" integer DEFAULT 0,
    "last_used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "event_type" "text",
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone,
    "location" "text",
    "is_recurring" boolean DEFAULT false,
    "recurrence_pattern" "text",
    "assigned_to" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'not-started'::"text",
    "category" "text" DEFAULT 'personal'::"text",
    "custom_color" "text",
    "timezone" "text" DEFAULT 'UTC'::"text",
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "expense_id" "uuid",
    "external_source" "public"."calendar_provider",
    "sync_locked" boolean DEFAULT false NOT NULL,
    "last_external_sync" timestamp with time zone,
    "linked_bill_id" "uuid",
    "show_countdown" boolean DEFAULT false NOT NULL,
    "countdown_label" "text",
    CONSTRAINT "events_category_check" CHECK (("category" = ANY (ARRAY['work'::"text", 'personal'::"text", 'family'::"text", 'health'::"text", 'social'::"text"]))),
    CONSTRAINT "events_status_check" CHECK (("status" = ANY (ARRAY['not-started'::"text", 'in-progress'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


COMMENT ON COLUMN "public"."events"."category" IS 'Event category: work, personal, family, health, social';



COMMENT ON COLUMN "public"."events"."custom_color" IS 'Custom hex color for calendar display (e.g., #FF5733)';



COMMENT ON COLUMN "public"."events"."timezone" IS 'Event timezone (e.g., America/New_York)';



COMMENT ON COLUMN "public"."events"."deleted_at" IS 'Soft delete timestamp (30-day retention)';



COMMENT ON COLUMN "public"."events"."external_source" IS 'Which provider this event originated from (google, apple, cozi), NULL if created in Rowan';



COMMENT ON COLUMN "public"."events"."sync_locked" IS 'TRUE when sync is in progress to prevent concurrent modifications';



COMMENT ON COLUMN "public"."events"."last_external_sync" IS 'Timestamp of last successful sync with external calendar';



COMMENT ON COLUMN "public"."events"."linked_bill_id" IS 'Foreign key to bills table. Bills auto-create calendar events on their due date.';



COMMENT ON COLUMN "public"."events"."show_countdown" IS 'When TRUE, this event renders as a countdown widget on the dashboard via CountdownWidget. Most events have FALSE; user opts in per-event.';



COMMENT ON COLUMN "public"."events"."countdown_label" IS 'Optional custom label for the countdown widget (e.g., "Birthday!", "Vacation!"). NULL means use the event title as fallback.';



CREATE TABLE IF NOT EXISTS "public"."expense_splits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expense_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount_owed" numeric(10,2) NOT NULL,
    "amount_paid" numeric(10,2) DEFAULT 0,
    "percentage" numeric(5,2),
    "is_payer" boolean DEFAULT false,
    "status" "text" DEFAULT 'pending'::"text",
    "settled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "expense_splits_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'partially-paid'::"text", 'settled'::"text"])))
);


ALTER TABLE "public"."expense_splits" OWNER TO "postgres";


COMMENT ON TABLE "public"."expense_splits" IS 'Detailed split breakdown for each user on a shared expense';



CREATE TABLE IF NOT EXISTS "public"."expense_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expense_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."expense_tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."expense_tags" IS 'Junction table linking expenses to tags (many-to-many)';



CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid",
    "title" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "category" "text",
    "date" "date" NOT NULL,
    "paid_by" "uuid",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "due_date" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "recurring" boolean DEFAULT false,
    "created_by" "uuid",
    "project_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "payment_method" "text",
    "receipt_id" "uuid",
    "ownership" "text" DEFAULT 'shared'::"text",
    "split_type" "text" DEFAULT 'equal'::"text",
    "split_percentage_user1" numeric(5,2),
    "split_percentage_user2" numeric(5,2),
    "split_amount_user1" numeric(10,2),
    "split_amount_user2" numeric(10,2),
    "is_split" boolean DEFAULT false,
    "vendor_id" "uuid",
    "line_item_id" "uuid",
    "event_id" "uuid",
    "recurring_frequency" "text",
    "is_recurring" boolean DEFAULT false,
    "archived" boolean DEFAULT false,
    "archived_at" timestamp with time zone,
    CONSTRAINT "expenses_ownership_check" CHECK (("ownership" = ANY (ARRAY['shared'::"text", 'yours'::"text", 'theirs'::"text"]))),
    CONSTRAINT "expenses_split_type_check" CHECK (("split_type" = ANY (ARRAY['equal'::"text", 'percentage'::"text", 'fixed'::"text", 'income-based'::"text"]))),
    CONSTRAINT "expenses_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'overdue'::"text"])))
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


COMMENT ON COLUMN "public"."expenses"."due_date" IS 'Due date for the expense (when it needs to be paid)';



COMMENT ON COLUMN "public"."expenses"."paid_at" IS 'Timestamp when expense was marked as paid';



COMMENT ON COLUMN "public"."expenses"."recurring" IS 'Whether this is a recurring expense';



COMMENT ON COLUMN "public"."expenses"."created_by" IS 'User who created this expense';



COMMENT ON COLUMN "public"."expenses"."status" IS 'Expense status: pending, paid, or overdue';



COMMENT ON COLUMN "public"."expenses"."payment_method" IS 'How the expense was/will be paid';



COMMENT ON COLUMN "public"."expenses"."ownership" IS 'Who owns this expense: shared, yours, or theirs';



COMMENT ON COLUMN "public"."expenses"."split_type" IS 'How to split: equal, percentage, fixed, or income-based';



COMMENT ON COLUMN "public"."expenses"."is_split" IS 'Whether this expense should be split between partners';



COMMENT ON COLUMN "public"."expenses"."archived" IS 'Whether this expense has been archived for data minimization';



CREATE TABLE IF NOT EXISTS "public"."external_calendar_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "access_token" "text",
    "refresh_token" "text",
    "connected_at" timestamp with time zone DEFAULT "now"(),
    "last_sync_at" timestamp with time zone,
    CONSTRAINT "external_calendar_connections_provider_check" CHECK (("provider" = ANY (ARRAY['google'::"text", 'apple'::"text", 'outlook'::"text"])))
);


ALTER TABLE "public"."external_calendar_connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "space_id" "uuid",
    "feature" "text" NOT NULL,
    "action" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "device_type" "text",
    "browser" "text",
    "os" "text",
    "session_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."feature_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."feature_events" IS 'Raw feature usage events for analytics';



COMMENT ON COLUMN "public"."feature_events"."feature" IS 'Feature name: tasks, calendar, shopping, meals, etc.';



COMMENT ON COLUMN "public"."feature_events"."action" IS 'Action type: page_view, create, update, delete, complete';



COMMENT ON COLUMN "public"."feature_events"."device_type" IS 'Device type: mobile, desktop, tablet';



COMMENT ON COLUMN "public"."feature_events"."session_id" IS 'Client-generated session identifier';



CREATE TABLE IF NOT EXISTS "public"."feature_usage_daily" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "feature" "text" NOT NULL,
    "page_views" integer DEFAULT 0,
    "unique_users" integer DEFAULT 0,
    "actions_create" integer DEFAULT 0,
    "actions_update" integer DEFAULT 0,
    "actions_delete" integer DEFAULT 0,
    "actions_complete" integer DEFAULT 0,
    "total_actions" integer DEFAULT 0,
    "avg_session_duration_seconds" integer DEFAULT 0,
    "device_mobile" integer DEFAULT 0,
    "device_desktop" integer DEFAULT 0,
    "device_tablet" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."feature_usage_daily" OWNER TO "postgres";


COMMENT ON TABLE "public"."feature_usage_daily" IS 'Daily aggregated feature usage metrics';



CREATE TABLE IF NOT EXISTS "public"."founding_member_counter" (
    "id" integer DEFAULT 1 NOT NULL,
    "current_count" integer DEFAULT 0 NOT NULL,
    "max_count" integer DEFAULT 1000 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "founding_member_counter_id_check" CHECK (("id" = 1))
);


ALTER TABLE "public"."founding_member_counter" OWNER TO "postgres";


COMMENT ON TABLE "public"."founding_member_counter" IS 'Tracks the count of founding members (first 1000 paid subscribers who lock in their price forever)';



CREATE TABLE IF NOT EXISTS "public"."generated_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid",
    "space_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "report_type" "text" NOT NULL,
    "date_range_start" "date" NOT NULL,
    "date_range_end" "date" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "charts_config" "jsonb" DEFAULT '{}'::"jsonb",
    "summary_stats" "jsonb" DEFAULT '{}'::"jsonb",
    "pdf_url" "text",
    "pdf_size" integer,
    "file_path" "text",
    "generated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "generated_by" "uuid" NOT NULL,
    "generation_time_ms" integer,
    "status" "text" DEFAULT 'generated'::"text",
    "is_shared" boolean DEFAULT false,
    "share_token" "text",
    "shared_until" timestamp with time zone,
    "view_count" integer DEFAULT 0,
    "download_count" integer DEFAULT 0,
    "last_viewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."generated_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goal_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "goal_id" "uuid",
    "milestone_id" "uuid",
    "check_in_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "activity_type" "text" NOT NULL,
    "activity_data" "jsonb" DEFAULT '{}'::"jsonb",
    "title" "text" NOT NULL,
    "description" "text",
    "entity_title" "text",
    "entity_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "goal_activities_activity_type_check" CHECK (("activity_type" = ANY (ARRAY['goal_created'::"text", 'goal_updated'::"text", 'goal_completed'::"text", 'goal_deleted'::"text", 'milestone_created'::"text", 'milestone_completed'::"text", 'milestone_updated'::"text", 'milestone_deleted'::"text", 'check_in_created'::"text", 'check_in_updated'::"text", 'goal_shared'::"text", 'goal_collaborated'::"text", 'goal_commented'::"text"])))
);


ALTER TABLE "public"."goal_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goal_check_in_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "check_in_id" "uuid" NOT NULL,
    "photo_url" "text" NOT NULL,
    "caption" "text",
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."goal_check_in_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goal_check_in_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "check_in_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "emoji" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."goal_check_in_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goal_check_in_reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "scheduled_for" timestamp with time zone NOT NULL,
    "notification_sent" boolean DEFAULT false,
    "notification_sent_at" timestamp with time zone,
    "completed" boolean DEFAULT false,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."goal_check_in_reminders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goal_check_in_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "frequency" "text" DEFAULT 'weekly'::"text" NOT NULL,
    "day_of_week" integer,
    "day_of_month" integer,
    "reminder_time" time without time zone DEFAULT '09:00:00'::time without time zone,
    "enable_reminders" boolean DEFAULT true,
    "enable_voice_notes" boolean DEFAULT true,
    "enable_photos" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "auto_schedule" boolean DEFAULT false,
    "reminder_days_before" integer DEFAULT 0,
    CONSTRAINT "goal_check_in_settings_day_of_month_check" CHECK ((("day_of_month" >= 1) AND ("day_of_month" <= 31))),
    CONSTRAINT "goal_check_in_settings_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6))),
    CONSTRAINT "goal_check_in_settings_frequency_check" CHECK (("frequency" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'biweekly'::"text", 'monthly'::"text"])))
);


ALTER TABLE "public"."goal_check_in_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goal_check_ins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "progress_percentage" integer NOT NULL,
    "mood" "text" NOT NULL,
    "notes" "text",
    "blockers" "text",
    "need_help_from_partner" boolean DEFAULT false,
    "voice_note_url" "text",
    "voice_note_duration" integer,
    "check_in_type" "text" DEFAULT 'manual'::"text",
    "scheduled_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "voice_note_category" character varying(50) DEFAULT 'general'::character varying,
    "voice_note_template_id" "uuid",
    "voice_note_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "goal_check_ins_check_in_type_check" CHECK (("check_in_type" = ANY (ARRAY['manual'::"text", 'scheduled'::"text", 'reminder'::"text"]))),
    CONSTRAINT "goal_check_ins_mood_check" CHECK (("mood" = ANY (ARRAY['great'::"text", 'okay'::"text", 'struggling'::"text"]))),
    CONSTRAINT "goal_check_ins_progress_percentage_check" CHECK ((("progress_percentage" >= 0) AND ("progress_percentage" <= 100)))
);


ALTER TABLE "public"."goal_check_ins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goal_collaborators" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "invited_by" "uuid",
    "invited_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "goal_collaborators_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'contributor'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."goal_collaborators" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goal_comment_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "comment_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "emoji" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."goal_comment_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goal_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "parent_comment_id" "uuid",
    "content" "text" NOT NULL,
    "content_type" "text" DEFAULT 'text'::"text",
    "reaction_counts" "jsonb" DEFAULT '{}'::"jsonb",
    "is_edited" boolean DEFAULT false,
    "edited_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "goal_comments_content_type_check" CHECK (("content_type" = ANY (ARRAY['text'::"text", 'markdown'::"text"])))
);


ALTER TABLE "public"."goal_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goal_contributions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "contribution_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "description" "text",
    "payment_method" "text",
    "expense_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "goal_contributions_amount_check" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "public"."goal_contributions" OWNER TO "postgres";


COMMENT ON TABLE "public"."goal_contributions" IS 'Financial contribution ledger for tracking deposits toward savings goals';



COMMENT ON COLUMN "public"."goal_contributions"."amount" IS 'Contribution amount in dollars';



COMMENT ON COLUMN "public"."goal_contributions"."payment_method" IS 'How the contribution was made';



COMMENT ON COLUMN "public"."goal_contributions"."expense_id" IS 'Link to expense if contribution came from expense categorization';



CREATE TABLE IF NOT EXISTS "public"."goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "category" "text",
    "target_date" "date",
    "status" "text" DEFAULT 'active'::"text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "progress" integer DEFAULT 0,
    "visibility" "text" DEFAULT 'private'::"text",
    "template_id" "uuid",
    "priority_order" integer DEFAULT 0,
    "priority" "text" DEFAULT 'none'::"text",
    "is_pinned" boolean DEFAULT false,
    "target_amount" numeric(12,2),
    "current_amount" numeric(12,2) DEFAULT 0,
    "is_financial" boolean DEFAULT false,
    "assigned_to" "uuid",
    CONSTRAINT "goals_priority_check" CHECK (("priority" = ANY (ARRAY['none'::"text", 'p1'::"text", 'p2'::"text", 'p3'::"text", 'p4'::"text"]))),
    CONSTRAINT "goals_progress_check" CHECK ((("progress" >= 0) AND ("progress" <= 100))),
    CONSTRAINT "goals_visibility_check" CHECK (("visibility" = ANY (ARRAY['private'::"text", 'shared'::"text"])))
);


ALTER TABLE "public"."goals" OWNER TO "postgres";


COMMENT ON COLUMN "public"."goals"."target_date" IS 'Target date to reach the goal';



COMMENT ON COLUMN "public"."goals"."target_amount" IS 'Financial goal target amount';



COMMENT ON COLUMN "public"."goals"."current_amount" IS 'Current amount contributed (auto-calculated from contributions)';



COMMENT ON COLUMN "public"."goals"."is_financial" IS 'Whether this is a financial savings goal';



COMMENT ON COLUMN "public"."goals"."assigned_to" IS 'User assigned to work on this goal (simple single-member assignment)';



CREATE OR REPLACE VIEW "public"."goal_contribution_stats" WITH ("security_invoker"='true') AS
 SELECT "gc"."goal_id",
    "count"("gc"."id") AS "contribution_count",
    "count"(DISTINCT "gc"."user_id") AS "contributor_count",
    "sum"("gc"."amount") AS "total_contributed",
    "avg"("gc"."amount") AS "avg_contribution",
    "min"("gc"."contribution_date") AS "first_contribution_date",
    "max"("gc"."contribution_date") AS "last_contribution_date",
    "g"."target_amount",
    "g"."current_amount",
    "g"."target_date",
        CASE
            WHEN ("g"."target_amount" > (0)::numeric) THEN "round"((("g"."current_amount" / "g"."target_amount") * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS "completion_percentage",
        CASE
            WHEN ("g"."target_amount" > "g"."current_amount") THEN ("g"."target_amount" - "g"."current_amount")
            ELSE (0)::numeric
        END AS "amount_remaining"
   FROM ("public"."goal_contributions" "gc"
     JOIN "public"."goals" "g" ON (("gc"."goal_id" = "g"."id")))
  GROUP BY "gc"."goal_id", "g"."target_amount", "g"."current_amount", "g"."target_date";


ALTER VIEW "public"."goal_contribution_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goal_dependencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "depends_on_goal_id" "uuid" NOT NULL,
    "dependency_type" "text" NOT NULL,
    "completion_threshold" integer DEFAULT 100,
    "auto_unlock" boolean DEFAULT true,
    "unlock_delay_days" integer DEFAULT 0,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "satisfied_at" timestamp with time zone,
    "bypassed_at" timestamp with time zone,
    "bypassed_by" "uuid",
    "bypass_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "goal_dependencies_completion_threshold_check" CHECK ((("completion_threshold" >= 0) AND ("completion_threshold" <= 100))),
    CONSTRAINT "goal_dependencies_dependency_type_check" CHECK (("dependency_type" = ANY (ARRAY['prerequisite'::"text", 'trigger'::"text", 'blocking'::"text"]))),
    CONSTRAINT "goal_dependencies_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'satisfied'::"text", 'bypassed'::"text"]))),
    CONSTRAINT "goal_dependencies_unlock_delay_days_check" CHECK (("unlock_delay_days" >= 0)),
    CONSTRAINT "no_self_dependency" CHECK (("goal_id" <> "depends_on_goal_id")),
    CONSTRAINT "valid_threshold" CHECK (((("dependency_type" = 'prerequisite'::"text") AND ("completion_threshold" > 0)) OR ("dependency_type" <> 'prerequisite'::"text")))
);


ALTER TABLE "public"."goal_dependencies" OWNER TO "postgres";


COMMENT ON TABLE "public"."goal_dependencies" IS 'Manages dependencies between goals, allowing prerequisite and trigger relationships';



COMMENT ON COLUMN "public"."goal_dependencies"."dependency_type" IS 'Type of dependency: prerequisite (must complete before), trigger (starts when completed), blocking (prevents start)';



COMMENT ON COLUMN "public"."goal_dependencies"."completion_threshold" IS 'Percentage completion required to satisfy dependency (for prerequisites)';



COMMENT ON COLUMN "public"."goal_dependencies"."auto_unlock" IS 'Whether to automatically unlock dependent goal when satisfied';



COMMENT ON COLUMN "public"."goal_dependencies"."unlock_delay_days" IS 'Days to wait before auto-unlocking after dependency is satisfied';



CREATE TABLE IF NOT EXISTS "public"."goal_mentions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "comment_id" "uuid" NOT NULL,
    "mentioned_user_id" "uuid" NOT NULL,
    "mentioning_user_id" "uuid" NOT NULL,
    "is_read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."goal_mentions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goal_milestones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "goal_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "target_date" "date",
    "completed" boolean DEFAULT false,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "type" "text" DEFAULT 'date'::"text",
    "target_value" numeric,
    "current_value" numeric DEFAULT 0,
    CONSTRAINT "goal_milestones_type_check" CHECK (("type" = ANY (ARRAY['percentage'::"text", 'money'::"text", 'count'::"text", 'date'::"text"])))
);


ALTER TABLE "public"."goal_milestones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goal_nudge_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "last_nudge_sent_at" timestamp with time zone,
    "last_activity_at" timestamp with time zone,
    "nudge_count" integer DEFAULT 0,
    "is_snoozed" boolean DEFAULT false,
    "snoozed_until" timestamp with time zone,
    "custom_nudge_enabled" boolean DEFAULT true,
    "custom_nudge_frequency_days" integer,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."goal_nudge_tracking" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goal_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."goal_tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."goal_tags" IS 'Junction table linking goals to tags (many-to-many)';



CREATE TABLE IF NOT EXISTS "public"."goal_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "category" "text" NOT NULL,
    "icon" "text",
    "target_days" integer,
    "is_public" boolean DEFAULT true,
    "created_by" "uuid",
    "usage_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "goal_templates_category_check" CHECK (("category" = ANY (ARRAY['financial'::"text", 'health'::"text", 'home'::"text", 'relationship'::"text", 'career'::"text", 'personal'::"text", 'education'::"text", 'family'::"text"])))
);


ALTER TABLE "public"."goal_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goal_updates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "goal_id" "uuid",
    "user_id" "uuid",
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."goal_updates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."habit_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "period_type" character varying(50) NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "total_days" integer DEFAULT 0,
    "completed_days" integer DEFAULT 0,
    "completion_rate" numeric(5,2) DEFAULT 0,
    "average_value" numeric(10,2) DEFAULT 0,
    "total_value" numeric(10,2) DEFAULT 0,
    "best_streak" integer DEFAULT 0,
    "current_streak" integer DEFAULT 0,
    "trend_direction" character varying(20),
    "trend_percentage" numeric(5,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."habit_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."habit_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "entry_date" "date" NOT NULL,
    "completed" boolean DEFAULT false,
    "completion_value" numeric(10,2) DEFAULT 0,
    "notes" "text",
    "mood" character varying(50),
    "completed_at" timestamp with time zone,
    "reminder_sent" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."habit_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."habit_streaks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "streak_type" character varying(50) NOT NULL,
    "streak_count" integer DEFAULT 0,
    "start_date" "date",
    "end_date" "date",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."habit_streaks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."in_app_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "partnership_id" "uuid",
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "read_at" timestamp with time zone,
    "space_id" "uuid",
    "space_name" "text",
    "related_item_id" "uuid",
    "related_item_type" "text",
    "action_url" "text",
    "emoji" "text",
    "sender_id" "uuid",
    "sender_name" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "in_app_notifications_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "in_app_notifications_type_check" CHECK (("type" = ANY (ARRAY['task'::"text", 'event'::"text", 'message'::"text", 'shopping'::"text", 'meal'::"text", 'reminder'::"text", 'milestone'::"text", 'goal_update'::"text", 'expense'::"text", 'bill_due'::"text", 'space_invite'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."in_app_notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."in_app_notifications" IS 'Comprehensive in-app notifications for all notification types across the platform';



COMMENT ON COLUMN "public"."in_app_notifications"."type" IS 'Type of notification: task, event, message, shopping, meal, reminder, milestone, goal_update, expense, bill_due, space_invite, system';



COMMENT ON COLUMN "public"."in_app_notifications"."priority" IS 'Priority level: low, normal, high, urgent';



COMMENT ON COLUMN "public"."in_app_notifications"."related_item_id" IS 'ID of the related item (task_id, event_id, etc.)';



COMMENT ON COLUMN "public"."in_app_notifications"."related_item_type" IS 'Type of the related item (task, event, etc.)';



COMMENT ON COLUMN "public"."in_app_notifications"."action_url" IS 'URL to navigate when notification is clicked';



COMMENT ON COLUMN "public"."in_app_notifications"."metadata" IS 'Additional context data as JSON';



CREATE TABLE IF NOT EXISTS "public"."late_penalties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "chore_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "points_deducted" integer NOT NULL,
    "days_late" integer DEFAULT 1 NOT NULL,
    "due_date" timestamp with time zone NOT NULL,
    "completion_date" timestamp with time zone,
    "penalty_type" "text" NOT NULL,
    "is_forgiven" boolean DEFAULT false,
    "forgiven_by" "uuid",
    "forgiven_at" timestamp with time zone,
    "forgiven_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "late_penalties_penalty_type_check" CHECK (("penalty_type" = ANY (ARRAY['daily_accrual'::"text", 'completion_late'::"text", 'manual'::"text"])))
);


ALTER TABLE "public"."late_penalties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."launch_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "source" "text" DEFAULT 'homepage'::"text",
    "referrer" "text",
    "ip_address" "text",
    "user_agent" "text",
    "subscribed" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "unsubscribed_at" timestamp with time zone,
    CONSTRAINT "launch_notifications_source_check" CHECK (("source" = ANY (ARRAY['homepage'::"text", 'features'::"text", 'beta-modal'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."launch_notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."launch_notifications" IS 'Email addresses collected for production launch notifications';



COMMENT ON COLUMN "public"."launch_notifications"."name" IS 'Full name provided by the user';



COMMENT ON COLUMN "public"."launch_notifications"."email" IS 'Email address (unique) for launch notifications';



COMMENT ON COLUMN "public"."launch_notifications"."source" IS 'Where the signup came from: homepage, features, beta-modal, other';



COMMENT ON COLUMN "public"."launch_notifications"."referrer" IS 'HTTP referrer header for traffic source analysis';



COMMENT ON COLUMN "public"."launch_notifications"."ip_address" IS 'IP address for geographic analytics and duplicate detection';



COMMENT ON COLUMN "public"."launch_notifications"."user_agent" IS 'Browser user agent for device/platform analytics';



COMMENT ON COLUMN "public"."launch_notifications"."subscribed" IS 'Whether user is still subscribed (for GDPR compliance)';



COMMENT ON COLUMN "public"."launch_notifications"."unsubscribed_at" IS 'Timestamp when user unsubscribed (if applicable)';



CREATE TABLE IF NOT EXISTS "public"."meal_calendar_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "meal_id" "uuid" NOT NULL,
    "event_id" "uuid",
    "is_synced" boolean DEFAULT false,
    "sync_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."meal_calendar_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."meal_calendar_events" IS 'Sync records linking meals to calendar events (Phase 7.1)';



CREATE TABLE IF NOT EXISTS "public"."meal_plan_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "meal_plan_id" "uuid" NOT NULL,
    "task_id" "uuid" NOT NULL,
    "meal_date" "date" NOT NULL,
    "meal_type" "text" NOT NULL,
    "is_auto_generated" boolean DEFAULT false,
    "auto_complete_after_meal" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."meal_plan_tasks" OWNER TO "postgres";


COMMENT ON TABLE "public"."meal_plan_tasks" IS 'Links meal plans to cooking/prep tasks with date/type filtering';



COMMENT ON COLUMN "public"."meal_plan_tasks"."auto_complete_after_meal" IS 'Automatically mark complete 2 hours after meal time';



CREATE TABLE IF NOT EXISTS "public"."meal_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid",
    "recipe_id" "uuid",
    "meal_date" "date" NOT NULL,
    "meal_type" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."meal_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "recipe_id" "uuid",
    "meal_type" "text" NOT NULL,
    "scheduled_date" "date" NOT NULL,
    "notes" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "name" "text",
    "assigned_to" "uuid",
    "calendar_sync" boolean DEFAULT true,
    CONSTRAINT "meals_meal_type_check" CHECK (("meal_type" = ANY (ARRAY['breakfast'::"text", 'lunch'::"text", 'dinner'::"text", 'snack'::"text"])))
);


ALTER TABLE "public"."meals" OWNER TO "postgres";


COMMENT ON COLUMN "public"."meals"."scheduled_date" IS 'Date when the meal is scheduled (DATE type to avoid timezone conversion)';



COMMENT ON COLUMN "public"."meals"."name" IS 'Custom name for meals without recipes. Falls back to recipe name if not provided.';



COMMENT ON COLUMN "public"."meals"."assigned_to" IS 'User assigned to prepare/handle this meal (simple single-member assignment)';



COMMENT ON COLUMN "public"."meals"."calendar_sync" IS 'Whether this meal should sync to calendar as an event (default TRUE)';



CREATE TABLE IF NOT EXISTS "public"."mentions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "comment_id" "uuid" NOT NULL,
    "mentioned_user_id" "uuid" NOT NULL,
    "is_read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."mentions" OWNER TO "postgres";


COMMENT ON TABLE "public"."mentions" IS 'User mentions (@username) in comments with notification tracking';



CREATE TABLE IF NOT EXISTS "public"."message_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_size" bigint NOT NULL,
    "mime_type" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "thumbnail_path" "text",
    "width" integer,
    "height" integer,
    "duration" integer,
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "message_attachments_file_size_check" CHECK ((("file_size" > 0) AND ("file_size" <= 52428800))),
    CONSTRAINT "message_attachments_file_type_check" CHECK (("file_type" = ANY (ARRAY['image'::"text", 'video'::"text", 'document'::"text", 'audio'::"text"])))
);


ALTER TABLE "public"."message_attachments" OWNER TO "postgres";


COMMENT ON TABLE "public"."message_attachments" IS 'Stores file attachments for messages (images, videos, documents, audio)';



CREATE TABLE IF NOT EXISTS "public"."message_mentions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "mentioned_user_id" "uuid" NOT NULL,
    "mentioned_by_user_id" "uuid" NOT NULL,
    "space_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "read" boolean DEFAULT false,
    "read_at" timestamp with time zone
);


ALTER TABLE "public"."message_mentions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "emoji" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "message_reactions_emoji_check" CHECK (("length"("emoji") <= 10))
);


ALTER TABLE "public"."message_reactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."message_reactions" IS 'Emoji reactions to messages';



COMMENT ON COLUMN "public"."message_reactions"."emoji" IS 'Emoji character (1-10 chars, typically 1-2 for standard emoji)';



CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid",
    "sender_id" "uuid",
    "content" "text" NOT NULL,
    "thread_id" "uuid",
    "is_pinned" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "conversation_id" "uuid",
    "read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "parent_message_id" "uuid",
    "thread_reply_count" integer DEFAULT 0,
    "pinned_at" timestamp with time zone,
    "pinned_by" "uuid"
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


COMMENT ON COLUMN "public"."messages"."is_pinned" IS 'Whether this message is pinned to the top of the conversation';



COMMENT ON COLUMN "public"."messages"."parent_message_id" IS 'Reference to parent message for threaded replies';



COMMENT ON COLUMN "public"."messages"."thread_reply_count" IS 'Number of direct replies to this message';



COMMENT ON COLUMN "public"."messages"."pinned_at" IS 'Timestamp when the message was pinned';



COMMENT ON COLUMN "public"."messages"."pinned_by" IS 'User who pinned the message';



CREATE TABLE IF NOT EXISTS "public"."milestone_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "type" "text" NOT NULL,
    "target_value" integer,
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "milestone_templates_type_check" CHECK (("type" = ANY (ARRAY['percentage'::"text", 'money'::"text", 'count'::"text", 'date'::"text"])))
);


ALTER TABLE "public"."milestone_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_interactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "notification_id" "uuid",
    "action" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notification_interactions_action_check" CHECK (("action" = ANY (ARRAY['dismissed'::"text", 'clicked'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."notification_interactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "category" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'sent'::"text" NOT NULL,
    "error_message" "text",
    CONSTRAINT "notification_log_category_check" CHECK (("category" = ANY (ARRAY['reminder'::"text", 'task'::"text", 'shopping'::"text", 'meal'::"text", 'event'::"text", 'message'::"text", 'digest'::"text", 'goal_milestone'::"text"]))),
    CONSTRAINT "notification_log_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'failed'::"text", 'bounced'::"text"]))),
    CONSTRAINT "notification_log_type_check" CHECK (("type" = ANY (ARRAY['email'::"text", 'push'::"text"])))
);


ALTER TABLE "public"."notification_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_log" IS 'Log of all notifications sent to users for tracking and debugging purposes.';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "space_id" "uuid",
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "link" "text",
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'User-facing notifications that can be marked as read/unread';



COMMENT ON COLUMN "public"."notifications"."user_id" IS 'User who should receive this notification';



COMMENT ON COLUMN "public"."notifications"."space_id" IS 'Optional space context for the notification';



COMMENT ON COLUMN "public"."notifications"."type" IS 'Type of notification (goal_milestone, task, reminder, etc.)';



COMMENT ON COLUMN "public"."notifications"."title" IS 'Notification title/heading';



COMMENT ON COLUMN "public"."notifications"."message" IS 'Notification message body';



COMMENT ON COLUMN "public"."notifications"."link" IS 'Optional link to navigate to when clicked';



COMMENT ON COLUMN "public"."notifications"."read" IS 'Whether the user has read this notification';



CREATE TABLE IF NOT EXISTS "public"."nudge_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "space_id" "uuid" NOT NULL,
    "goal_id" "uuid",
    "template_id" "uuid",
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "category" "text" NOT NULL,
    "trigger_type" "text" NOT NULL,
    "delivery_method" "text" DEFAULT 'in_app'::"text",
    "sent_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "read_at" timestamp with time zone,
    "clicked_at" timestamp with time zone,
    "dismissed_at" timestamp with time zone,
    "was_effective" boolean,
    "effectiveness_score" integer,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."nudge_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nudge_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "space_id" "uuid" NOT NULL,
    "nudges_enabled" boolean DEFAULT true,
    "daily_nudges_enabled" boolean DEFAULT true,
    "weekly_summary_enabled" boolean DEFAULT true,
    "milestone_reminders_enabled" boolean DEFAULT true,
    "deadline_alerts_enabled" boolean DEFAULT true,
    "motivation_quotes_enabled" boolean DEFAULT true,
    "preferred_nudge_time" time without time zone DEFAULT '09:00:00'::time without time zone,
    "preferred_timezone" "text" DEFAULT 'UTC'::"text",
    "nudge_frequency_days" integer DEFAULT 1,
    "max_daily_nudges" integer DEFAULT 3,
    "quiet_hours_start" time without time zone DEFAULT '22:00:00'::time without time zone,
    "quiet_hours_end" time without time zone DEFAULT '07:00:00'::time without time zone,
    "weekend_nudges_enabled" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."nudge_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nudge_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "trigger_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "action_text" "text",
    "icon" "text",
    "goal_categories" "text"[],
    "days_before_deadline" integer,
    "days_since_activity" integer,
    "priority" integer DEFAULT 1,
    "is_active" boolean DEFAULT true,
    "is_system" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."nudge_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."partnership_balances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partnership_id" "uuid" NOT NULL,
    "space_id" "uuid" NOT NULL,
    "user1_id" "uuid" NOT NULL,
    "user2_id" "uuid" NOT NULL,
    "balance" numeric(10,2) DEFAULT 0,
    "user1_income" numeric(12,2),
    "user2_income" numeric(12,2),
    "last_calculated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."partnership_balances" OWNER TO "postgres";


COMMENT ON TABLE "public"."partnership_balances" IS 'Running balance tracking who owes whom in the partnership';



COMMENT ON COLUMN "public"."partnership_balances"."balance" IS 'Positive = user1 owes user2, Negative = user2 owes user1';



CREATE TABLE IF NOT EXISTS "public"."point_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "space_id" "uuid" NOT NULL,
    "source_type" "text" NOT NULL,
    "source_id" "uuid",
    "points" integer NOT NULL,
    "reason" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "point_transactions_source_type_check" CHECK (("source_type" = ANY (ARRAY['chore'::"text", 'task'::"text", 'streak_bonus'::"text", 'weekly_goal'::"text", 'perfect_week'::"text", 'redemption'::"text", 'adjustment'::"text", 'bonus'::"text", 'late_penalty'::"text", 'penalty_forgiven'::"text"])))
);


ALTER TABLE "public"."point_transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."point_transactions" IS 'Immutable ledger of all point credits and debits';



CREATE TABLE IF NOT EXISTS "public"."privacy_email_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "notification_type" "text" NOT NULL,
    "email_address" "text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "delivery_status" "text" DEFAULT 'sent'::"text",
    "email_provider_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "privacy_email_notifications_delivery_status_check" CHECK (("delivery_status" = ANY (ARRAY['sent'::"text", 'delivered'::"text", 'failed'::"text", 'bounced'::"text"]))),
    CONSTRAINT "privacy_email_notifications_notification_type_check" CHECK (("notification_type" = ANY (ARRAY['deletion_confirmation'::"text", 'deletion_reminder_7_days'::"text", 'deletion_reminder_1_day'::"text", 'deletion_completed'::"text", 'deletion_cancelled'::"text", 'data_export_ready'::"text", 'privacy_settings_changed'::"text"])))
);


ALTER TABLE "public"."privacy_email_notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."privacy_email_notifications" IS 'Tracks all privacy-related email notifications sent to users';



CREATE TABLE IF NOT EXISTS "public"."privacy_preference_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "preference_key" "text" NOT NULL,
    "old_value" boolean,
    "new_value" boolean NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."privacy_preference_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."privacy_preference_history" IS 'Audit trail of all privacy preference changes';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "avatar_url" "text",
    "phone" "text",
    "timezone" "text" DEFAULT 'America/New_York'::"text",
    "notification_preferences" "jsonb" DEFAULT '{"sms": false, "push": true, "email": true}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "name" "text",
    "phone_number" "text",
    "privacy_settings" "jsonb" DEFAULT '{"analytics": true, "readReceipts": true, "activityStatus": true, "profileVisibility": true}'::"jsonb"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_line_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "vendor_id" "uuid",
    "category" "text" NOT NULL,
    "description" "text" NOT NULL,
    "quantity" numeric(10,2) DEFAULT 1,
    "unit_price" numeric(10,2),
    "estimated_cost" numeric(10,2) NOT NULL,
    "actual_cost" numeric(10,2) DEFAULT 0,
    "is_paid" boolean DEFAULT false,
    "paid_date" "date",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "project_line_items_estimated_cost_check" CHECK (("estimated_cost" >= (0)::numeric))
);


ALTER TABLE "public"."project_line_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."project_line_items" IS 'Individual cost line items for project budgets';



CREATE OR REPLACE VIEW "public"."project_cost_breakdown" WITH ("security_invoker"='true') AS
 SELECT "project_id",
    "category",
    "count"("id") AS "line_item_count",
    "sum"("estimated_cost") AS "total_estimated",
    "sum"("actual_cost") AS "total_actual",
    "sum"(("estimated_cost" - "actual_cost")) AS "variance",
        CASE
            WHEN ("sum"("estimated_cost") > (0)::numeric) THEN "round"(((("sum"("estimated_cost") - "sum"("actual_cost")) / "sum"("estimated_cost")) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS "variance_percentage"
   FROM "public"."project_line_items" "pli"
  GROUP BY "project_id", "category";


ALTER VIEW "public"."project_cost_breakdown" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "title" "text",
    "description" "text",
    "photo_url" "text" NOT NULL,
    "photo_type" "text" DEFAULT 'progress'::"text",
    "taken_date" "date" DEFAULT CURRENT_DATE,
    "display_order" integer DEFAULT 0,
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."project_photos" OWNER TO "postgres";


COMMENT ON TABLE "public"."project_photos" IS 'Project photo gallery with before/during/after photos';



COMMENT ON COLUMN "public"."project_photos"."photo_type" IS 'before, during, after, progress, receipt, or damage';



CREATE OR REPLACE VIEW "public"."project_summary" AS
SELECT
    NULL::"uuid" AS "project_id",
    NULL::"uuid" AS "space_id",
    NULL::"text" AS "name",
    NULL::"text" AS "status",
    NULL::"public"."project_priority" AS "priority",
    NULL::numeric(12,2) AS "estimated_budget",
    NULL::numeric(12,2) AS "actual_cost",
    NULL::numeric(12,2) AS "budget_variance",
    NULL::numeric(5,2) AS "variance_percentage",
    NULL::timestamp with time zone AS "start_date",
    NULL::"date" AS "estimated_completion_date",
    NULL::"date" AS "actual_completion_date",
    NULL::bigint AS "line_item_count",
    NULL::bigint AS "expense_count",
    NULL::bigint AS "photo_count",
    NULL::bigint AS "vendor_count",
    NULL::"text"[] AS "vendor_names",
    NULL::"uuid" AS "created_by",
    NULL::timestamp with time zone AS "created_at",
    NULL::timestamp with time zone AS "updated_at";


ALTER VIEW "public"."project_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'planning'::"text" NOT NULL,
    "start_date" timestamp with time zone,
    "target_date" timestamp with time zone,
    "budget_amount" numeric(10,2),
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "priority" "public"."project_priority" DEFAULT 'medium'::"public"."project_priority",
    "estimated_completion_date" "date",
    "actual_completion_date" "date",
    "estimated_budget" numeric(12,2),
    "actual_cost" numeric(12,2) DEFAULT 0,
    "budget_variance" numeric(12,2) DEFAULT 0,
    "variance_percentage" numeric(5,2) DEFAULT 0,
    "location" "text",
    "tags" "text"[],
    CONSTRAINT "projects_status_check" CHECK (("status" = ANY (ARRAY['planning'::"text", 'in_progress'::"text", 'completed'::"text", 'on_hold'::"text"])))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


COMMENT ON TABLE "public"."projects" IS 'Home improvement and renovation projects with budget tracking';



COMMENT ON COLUMN "public"."projects"."budget_variance" IS 'Positive = under budget, Negative = over budget';



COMMENT ON COLUMN "public"."projects"."variance_percentage" IS 'Percentage variance from estimated budget';



CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_used_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "space_id" "uuid",
    "device_name" "text",
    "is_active" boolean DEFAULT true,
    "expires_at" timestamp with time zone
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."push_subscriptions" IS 'Web push notification subscriptions for browser notifications.';



CREATE TABLE IF NOT EXISTS "public"."push_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "platform" "text" NOT NULL,
    "device_name" "text",
    "is_active" boolean DEFAULT true,
    "last_used_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "push_tokens_platform_check" CHECK (("platform" = ANY (ARRAY['ios'::"text", 'android'::"text", 'web'::"text"])))
);


ALTER TABLE "public"."push_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quick_action_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "context" "text",
    "used_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quick_action_usage" OWNER TO "postgres";


COMMENT ON TABLE "public"."quick_action_usage" IS 'Tracks usage of quick actions for analytics';



COMMENT ON COLUMN "public"."quick_action_usage"."action_type" IS 'Type of quick action (mark_complete, assign_to_me, snooze_1_day, etc.)';



CREATE MATERIALIZED VIEW "public"."quick_action_stats" AS
 SELECT "space_id",
    "user_id",
    "action_type",
    "count"(*) AS "usage_count",
    "max"("used_at") AS "last_used_at"
   FROM "public"."quick_action_usage"
  WHERE ("used_at" >= ("now"() - '30 days'::interval))
  GROUP BY "space_id", "user_id", "action_type"
  ORDER BY ("count"(*)) DESC
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."quick_action_stats" OWNER TO "postgres";


COMMENT ON MATERIALIZED VIEW "public"."quick_action_stats" IS 'Aggregated quick action usage stats (last 30 days)';



CREATE OR REPLACE VIEW "public"."reaction_counts" WITH ("security_invoker"='true') AS
 SELECT "comment_id",
    "emoji",
    "count"(*) AS "reaction_count",
    "array_agg"("user_id") AS "user_ids"
   FROM "public"."comment_reactions"
  GROUP BY "comment_id", "emoji";


ALTER VIEW "public"."reaction_counts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."receipts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "expense_id" "uuid",
    "storage_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" integer NOT NULL,
    "mime_type" "text" NOT NULL,
    "merchant_name" "text",
    "total_amount" numeric(10,2),
    "receipt_date" "date",
    "category" "text",
    "currency" "text" DEFAULT 'USD'::"text",
    "ocr_text" "text",
    "ocr_confidence" numeric(5,2),
    "ocr_processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."receipts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "ingredients" "jsonb",
    "instructions" "text",
    "prep_time" integer,
    "cook_time" integer,
    "servings" integer,
    "category" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "cuisine_type" "text",
    "difficulty" "text",
    "source_url" "text",
    "image_url" "text",
    "tags" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."recipes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."recipes"."cuisine_type" IS 'Type of cuisine (e.g., Italian, Mexican, Asian, etc.)';



COMMENT ON COLUMN "public"."recipes"."difficulty" IS 'Recipe difficulty level (e.g., easy, medium, hard)';



COMMENT ON COLUMN "public"."recipes"."source_url" IS 'URL to the original recipe source';



COMMENT ON COLUMN "public"."recipes"."tags" IS 'Array of tags for recipe categorization (e.g., cuisine type, source API, etc.)';



CREATE TABLE IF NOT EXISTS "public"."recurring_event_exceptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "series_id" "uuid" NOT NULL,
    "exception_date" "date" NOT NULL,
    "exception_type" "text" NOT NULL,
    "modified_event_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "recurring_event_exceptions_exception_type_check" CHECK (("exception_type" = ANY (ARRAY['deleted'::"text", 'modified'::"text", 'rescheduled'::"text"])))
);


ALTER TABLE "public"."recurring_event_exceptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recurring_expense_patterns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "pattern_name" "text" NOT NULL,
    "merchant_name" "text",
    "category" "text",
    "frequency" "public"."recurrence_frequency" NOT NULL,
    "average_amount" numeric(10,2) NOT NULL,
    "amount_variance" numeric(10,2) DEFAULT 0,
    "confidence_score" numeric(5,2) NOT NULL,
    "detection_method" "text",
    "first_occurrence" "date" NOT NULL,
    "last_occurrence" "date" NOT NULL,
    "occurrence_count" integer DEFAULT 1,
    "expense_ids" "uuid"[],
    "next_expected_date" "date",
    "next_expected_amount" numeric(10,2),
    "user_confirmed" boolean DEFAULT false,
    "user_ignored" boolean DEFAULT false,
    "auto_created" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_analyzed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."recurring_expense_patterns" OWNER TO "postgres";


COMMENT ON TABLE "public"."recurring_expense_patterns" IS 'Stores detected recurring expense patterns for auto-suggestions and duplicate detection';



COMMENT ON COLUMN "public"."recurring_expense_patterns"."frequency" IS 'How often this expense recurs';



COMMENT ON COLUMN "public"."recurring_expense_patterns"."confidence_score" IS '0-100 confidence that this is a valid recurring pattern';



COMMENT ON COLUMN "public"."recurring_expense_patterns"."detection_method" IS 'Method used to detect this pattern';



COMMENT ON COLUMN "public"."recurring_expense_patterns"."expense_ids" IS 'Array of expense IDs that match this pattern';



COMMENT ON COLUMN "public"."recurring_expense_patterns"."user_confirmed" IS 'Whether user has confirmed this is a valid recurring expense';



COMMENT ON COLUMN "public"."recurring_expense_patterns"."user_ignored" IS 'Whether user has marked this pattern to be ignored';



CREATE TABLE IF NOT EXISTS "public"."recurring_goal_instances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "goal_id" "uuid",
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "target_value" numeric(10,2) NOT NULL,
    "current_value" numeric(10,2) DEFAULT 0,
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "completion_percentage" integer DEFAULT 0,
    "completed_at" timestamp with time zone,
    "auto_generated" boolean DEFAULT true,
    "generation_date" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."recurring_goal_instances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recurring_goal_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "category" character varying(100) DEFAULT 'general'::character varying,
    "tags" "jsonb" DEFAULT '[]'::"jsonb",
    "target_type" character varying(50) DEFAULT 'completion'::character varying,
    "target_value" numeric(10,2) DEFAULT 1,
    "target_unit" character varying(50) DEFAULT 'times'::character varying,
    "recurrence_type" character varying(50) NOT NULL,
    "recurrence_pattern" "jsonb" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "is_habit" boolean DEFAULT false,
    "habit_category" character varying(100),
    "ideal_streak_length" integer DEFAULT 30,
    "allow_partial_completion" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."recurring_goal_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reminder_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reminder_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reminder_activities_valid_uuid_check" CHECK ((("reminder_id")::"text" ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'::"text")),
    CONSTRAINT "valid_action_type" CHECK (("action" = ANY (ARRAY['created'::"text", 'updated'::"text", 'completed'::"text", 'uncompleted'::"text", 'snoozed'::"text", 'unsnoozed'::"text", 'assigned'::"text", 'unassigned'::"text", 'deleted'::"text", 'commented'::"text", 'status_changed'::"text", 'priority_changed'::"text", 'category_changed'::"text"])))
);


ALTER TABLE "public"."reminder_activities" OWNER TO "postgres";


COMMENT ON TABLE "public"."reminder_activities" IS 'Immutable audit log of all reminder changes. Activity records are automatically deleted when the parent reminder is deleted.';



COMMENT ON COLUMN "public"."reminder_activities"."user_id" IS 'User who performed the action';



COMMENT ON COLUMN "public"."reminder_activities"."action" IS 'Type of change: created, updated, completed, snoozed, assigned, etc.';



COMMENT ON COLUMN "public"."reminder_activities"."metadata" IS 'JSON object with change details specific to the action type';



CREATE TABLE IF NOT EXISTS "public"."reminder_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reminder_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "file_path" "text",
    "file_size" integer,
    "mime_type" "text",
    "url" "text",
    "linked_id" "uuid",
    "display_name" "text" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reminder_attachments_type_check" CHECK (("type" = ANY (ARRAY['file'::"text", 'url'::"text", 'link_task'::"text", 'link_shopping'::"text", 'link_event'::"text"])))
);


ALTER TABLE "public"."reminder_attachments" OWNER TO "postgres";


COMMENT ON TABLE "public"."reminder_attachments" IS 'Stores file uploads, URLs, and cross-feature links for reminders';



COMMENT ON COLUMN "public"."reminder_attachments"."type" IS 'Attachment type: file, url, link_task, link_shopping, link_event';



COMMENT ON COLUMN "public"."reminder_attachments"."file_path" IS 'Path to file in Supabase Storage (for type=file)';



COMMENT ON COLUMN "public"."reminder_attachments"."url" IS 'External URL (for type=url)';



COMMENT ON COLUMN "public"."reminder_attachments"."linked_id" IS 'ID of linked resource (for type=link_*)';



CREATE TABLE IF NOT EXISTS "public"."reminder_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reminder_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_comment_content" CHECK ((("char_length"(TRIM(BOTH FROM "content")) >= 1) AND ("char_length"("content") <= 5000)))
);


ALTER TABLE "public"."reminder_comments" OWNER TO "postgres";


COMMENT ON TABLE "public"."reminder_comments" IS 'Comments and conversations on reminders for collaborative discussions';



CREATE TABLE IF NOT EXISTS "public"."reminder_mentions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reminder_id" "uuid" NOT NULL,
    "comment_id" "uuid",
    "mentioned_user_id" "uuid" NOT NULL,
    "mentioning_user_id" "uuid" NOT NULL,
    "mention_context" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_mention_context" CHECK (("mention_context" = ANY (ARRAY['description'::"text", 'comment'::"text"])))
);


ALTER TABLE "public"."reminder_mentions" OWNER TO "postgres";


COMMENT ON TABLE "public"."reminder_mentions" IS '@mentions in reminder descriptions and comments';



CREATE TABLE IF NOT EXISTS "public"."reminder_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reminder_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "channel" "text" NOT NULL,
    "is_read" boolean DEFAULT false,
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "goal_id" "uuid",
    "title" "text",
    "message" "text",
    CONSTRAINT "reminder_notifications_entity_check" CHECK ((("reminder_id" IS NOT NULL) OR ("goal_id" IS NOT NULL))),
    CONSTRAINT "valid_notification_channel" CHECK (("channel" = ANY (ARRAY['in_app'::"text", 'email'::"text", 'push'::"text"]))),
    CONSTRAINT "valid_notification_type" CHECK (("type" = ANY (ARRAY['due'::"text", 'overdue'::"text", 'assigned'::"text", 'unassigned'::"text", 'mentioned'::"text", 'commented'::"text", 'completed'::"text", 'snoozed'::"text"])))
);


ALTER TABLE "public"."reminder_notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."reminder_notifications" IS 'Notifications sent to users about reminder changes and due dates';



CREATE TABLE IF NOT EXISTS "public"."reminder_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid",
    "created_by" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "emoji" "text" DEFAULT '🔔'::"text",
    "category" "text" DEFAULT 'personal'::"text",
    "priority" "text" DEFAULT 'medium'::"text",
    "template_title" "text" NOT NULL,
    "template_description" "text",
    "reminder_type" "text" DEFAULT 'time'::"text",
    "default_time_offset_minutes" integer,
    "default_location" "text",
    "repeat_pattern" "text",
    "repeat_days" integer[],
    "is_system_template" boolean DEFAULT false,
    "usage_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_category" CHECK (("category" = ANY (ARRAY['bills'::"text", 'health'::"text", 'work'::"text", 'personal'::"text", 'household'::"text"]))),
    CONSTRAINT "valid_priority" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "valid_reminder_type" CHECK (("reminder_type" = ANY (ARRAY['time'::"text", 'location'::"text"])))
);


ALTER TABLE "public"."reminder_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."reminder_templates" IS 'Reusable reminder templates for quick creation';



COMMENT ON COLUMN "public"."reminder_templates"."is_system_template" IS 'System templates are available to all users';



COMMENT ON COLUMN "public"."reminder_templates"."usage_count" IS 'Tracks how often template is used for popularity sorting';



CREATE TABLE IF NOT EXISTS "public"."reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "remind_at" timestamp with time zone NOT NULL,
    "is_recurring" boolean DEFAULT false,
    "recurrence_pattern" "text",
    "assigned_to" "uuid",
    "created_by" "uuid",
    "completed" boolean DEFAULT false,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "category" "text" DEFAULT 'personal'::"text",
    "emoji" "text" DEFAULT '🔔'::"text",
    "priority" "text" DEFAULT 'medium'::"text",
    "status" "text" DEFAULT 'active'::"text",
    "snooze_until" timestamp with time zone,
    "repeat_pattern" "text",
    "reminder_time" timestamp with time zone,
    "repeat_days" "jsonb" DEFAULT '[]'::"jsonb",
    "snoozed_by" "uuid",
    "reminder_type" "text" DEFAULT 'time'::"text",
    "location" "text",
    "linked_bill_id" "uuid",
    CONSTRAINT "reminders_category_check" CHECK (("category" = ANY (ARRAY['bills'::"text", 'health'::"text", 'work'::"text", 'personal'::"text", 'household'::"text"]))),
    CONSTRAINT "reminders_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "reminders_reminder_type_check" CHECK (("reminder_type" = ANY (ARRAY['time'::"text", 'location'::"text"]))),
    CONSTRAINT "reminders_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'snoozed'::"text"])))
);


ALTER TABLE "public"."reminders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."reminders"."category" IS 'Category: bills, health, work, personal, household';



COMMENT ON COLUMN "public"."reminders"."emoji" IS 'Emoji icon for the reminder (e.g., 🔔, 🛒, 💊)';



COMMENT ON COLUMN "public"."reminders"."priority" IS 'Priority level: low, medium, high, urgent';



COMMENT ON COLUMN "public"."reminders"."status" IS 'Current status: active, completed, snoozed';



COMMENT ON COLUMN "public"."reminders"."snooze_until" IS 'When a snoozed reminder should become active again';



COMMENT ON COLUMN "public"."reminders"."reminder_time" IS 'When the reminder should trigger (new field name)';



COMMENT ON COLUMN "public"."reminders"."repeat_days" IS 'Array of weekday numbers (0=Sunday) for recurring reminders';



COMMENT ON COLUMN "public"."reminders"."snoozed_by" IS 'User who snoozed the reminder (for collaborative transparency)';



COMMENT ON COLUMN "public"."reminders"."reminder_type" IS 'Type: time (scheduled) or location (geofenced)';



COMMENT ON COLUMN "public"."reminders"."location" IS 'Location for location-based reminders or context';



COMMENT ON COLUMN "public"."reminders"."linked_bill_id" IS 'Foreign key to bills table. When a bill has reminder_enabled, a linked reminder is created.';



CREATE TABLE IF NOT EXISTS "public"."report_favorites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "report_id" "uuid",
    "template_id" "uuid",
    "name" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    CONSTRAINT "favorite_target" CHECK (((("report_id" IS NOT NULL) AND ("template_id" IS NULL)) OR (("report_id" IS NULL) AND ("template_id" IS NOT NULL))))
);


ALTER TABLE "public"."report_favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."report_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "space_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "schedule_type" "text" NOT NULL,
    "schedule_config" "jsonb" DEFAULT '{}'::"jsonb",
    "email_recipients" "text"[],
    "email_subject_template" "text",
    "email_body_template" "text",
    "include_pdf" boolean DEFAULT true,
    "is_active" boolean DEFAULT true,
    "next_run_at" timestamp with time zone,
    "last_run_at" timestamp with time zone,
    "last_success_at" timestamp with time zone,
    "run_count" integer DEFAULT 0,
    "failure_count" integer DEFAULT 0,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."report_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."report_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text" NOT NULL,
    "report_type" "text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "default_date_range" "text" DEFAULT 'current_month'::"text",
    "is_system" boolean DEFAULT true,
    "is_active" boolean DEFAULT true,
    "requires_goals" boolean DEFAULT false,
    "requires_budget" boolean DEFAULT false,
    "created_by" "uuid",
    "space_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."report_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reward_points" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "space_id" "uuid" NOT NULL,
    "points" integer DEFAULT 0 NOT NULL,
    "level" integer DEFAULT 1 NOT NULL,
    "current_streak" integer DEFAULT 0 NOT NULL,
    "longest_streak" integer DEFAULT 0 NOT NULL,
    "last_activity_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reward_points_level_check" CHECK (("level" >= 1)),
    CONSTRAINT "reward_points_points_check" CHECK (("points" >= 0))
);


ALTER TABLE "public"."reward_points" OWNER TO "postgres";


COMMENT ON TABLE "public"."reward_points" IS 'Tracks user point balances and streaks per space';



CREATE TABLE IF NOT EXISTS "public"."reward_redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "space_id" "uuid" NOT NULL,
    "reward_id" "uuid" NOT NULL,
    "points_spent" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "fulfilled_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reward_redemptions_points_spent_check" CHECK (("points_spent" > 0)),
    CONSTRAINT "reward_redemptions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'fulfilled'::"text", 'denied'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."reward_redemptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."reward_redemptions" IS 'History of reward redemptions with approval workflow';



CREATE TABLE IF NOT EXISTS "public"."rewards_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "cost_points" integer NOT NULL,
    "category" "text" DEFAULT 'other'::"text" NOT NULL,
    "image_url" "text",
    "emoji" "text" DEFAULT '🎁'::"text",
    "is_active" boolean DEFAULT true NOT NULL,
    "max_redemptions_per_week" integer,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "rewards_catalog_category_check" CHECK (("category" = ANY (ARRAY['screen_time'::"text", 'treats'::"text", 'activities'::"text", 'money'::"text", 'privileges'::"text", 'other'::"text"]))),
    CONSTRAINT "rewards_catalog_cost_points_check" CHECK (("cost_points" > 0))
);


ALTER TABLE "public"."rewards_catalog" OWNER TO "postgres";


COMMENT ON TABLE "public"."rewards_catalog" IS 'Configurable rewards that family members can redeem';



CREATE TABLE IF NOT EXISTS "public"."settlements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "from_user_id" "uuid" NOT NULL,
    "to_user_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "settlement_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "payment_method" "text",
    "reference_number" "text",
    "notes" "text",
    "expense_ids" "uuid"[],
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "settlements_amount_check" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "public"."settlements" OWNER TO "postgres";


COMMENT ON TABLE "public"."settlements" IS 'Payment records between partners to settle shared expenses';



CREATE OR REPLACE VIEW "public"."settlement_summary" AS
 SELECT "space_id",
    "from_user_id",
    "to_user_id",
    "count"("id") AS "settlement_count",
    "sum"("amount") AS "total_settled",
    "min"("settlement_date") AS "first_settlement",
    "max"("settlement_date") AS "last_settlement"
   FROM "public"."settlements" "s"
  GROUP BY "space_id", "from_user_id", "to_user_id";


ALTER VIEW "public"."settlement_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shopping_calendar_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "list_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "reminder_time" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."shopping_calendar_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."shopping_calendar_events" IS 'Links shopping lists to calendar events';



CREATE TABLE IF NOT EXISTS "public"."shopping_item_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "item_name" character varying(255) NOT NULL,
    "category" character varying(50),
    "frequency" integer DEFAULT 1,
    "last_purchased" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."shopping_item_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."shopping_item_history" IS 'Purchase history for smart suggestions';



CREATE TABLE IF NOT EXISTS "public"."shopping_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "list_id" "uuid",
    "name" "text" NOT NULL,
    "quantity" "text",
    "category" "text",
    "is_purchased" boolean DEFAULT false,
    "added_by" "uuid",
    "purchased_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "checked" boolean DEFAULT false,
    "recipe_id" "uuid",
    "notes" "text",
    "unit" "text",
    "sort_order" integer DEFAULT 0,
    "assigned_to" "uuid",
    "estimated_price" numeric(10,2),
    "actual_price" numeric(10,2),
    "recipe_source_id" "uuid"
);


ALTER TABLE "public"."shopping_items" OWNER TO "postgres";


COMMENT ON COLUMN "public"."shopping_items"."category" IS 'Item category for organization (produce, dairy, meat, etc.)';



COMMENT ON COLUMN "public"."shopping_items"."recipe_id" IS 'Reference to recipe this ingredient came from';



COMMENT ON COLUMN "public"."shopping_items"."notes" IS 'Additional notes or details about the item';



COMMENT ON COLUMN "public"."shopping_items"."unit" IS 'Measurement unit for the item (cups, lbs, etc.)';



COMMENT ON COLUMN "public"."shopping_items"."sort_order" IS 'Custom sort order within category';



COMMENT ON COLUMN "public"."shopping_items"."assigned_to" IS 'User assigned to get this item';



COMMENT ON COLUMN "public"."shopping_items"."estimated_price" IS 'Estimated price of item';



COMMENT ON COLUMN "public"."shopping_items"."actual_price" IS 'Actual price paid for item';



CREATE TABLE IF NOT EXISTS "public"."shopping_lists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "store" "text",
    "status" "text" DEFAULT 'active'::"text",
    "completed_at" timestamp with time zone,
    "share_token" "text" DEFAULT "public"."generate_secure_share_token"(),
    "meal_ids" "jsonb" DEFAULT '[]'::"jsonb",
    "is_public" boolean DEFAULT false,
    "shared_at" timestamp with time zone,
    "auto_generated" boolean DEFAULT false,
    "store_name" character varying(255),
    "estimated_total" numeric(10,2),
    "actual_total" numeric(10,2),
    "budget" numeric(10,2),
    "last_modified_by" "uuid",
    "last_modified_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "shopping_lists_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."shopping_lists" OWNER TO "postgres";


COMMENT ON COLUMN "public"."shopping_lists"."share_token" IS 'Cryptographically secure token for public sharing (256-bit entropy)';



COMMENT ON COLUMN "public"."shopping_lists"."meal_ids" IS 'Array of meal plan IDs used to generate this list';



COMMENT ON COLUMN "public"."shopping_lists"."is_public" IS 'Whether this list can be accessed via public share link';



COMMENT ON COLUMN "public"."shopping_lists"."shared_at" IS 'Timestamp when list was first shared publicly';



COMMENT ON COLUMN "public"."shopping_lists"."auto_generated" IS 'Whether this list was auto-generated from meal plans';



COMMENT ON COLUMN "public"."shopping_lists"."store_name" IS 'Store where shopping will be done';



COMMENT ON COLUMN "public"."shopping_lists"."estimated_total" IS 'Estimated total cost of list';



COMMENT ON COLUMN "public"."shopping_lists"."actual_total" IS 'Actual total cost of list';



COMMENT ON COLUMN "public"."shopping_lists"."budget" IS 'Budget limit for this shopping list';



COMMENT ON COLUMN "public"."shopping_lists"."last_modified_by" IS 'User who last modified the list';



COMMENT ON COLUMN "public"."shopping_lists"."last_modified_at" IS 'Timestamp of last modification';



CREATE TABLE IF NOT EXISTS "public"."shopping_reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "list_id" "uuid",
    "item_id" "uuid",
    "reminder_id" "uuid" NOT NULL,
    "trigger_type" character varying(50) DEFAULT 'time'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "shopping_reminders_check" CHECK ((("list_id" IS NOT NULL) OR ("item_id" IS NOT NULL)))
);


ALTER TABLE "public"."shopping_reminders" OWNER TO "postgres";


COMMENT ON TABLE "public"."shopping_reminders" IS 'Links shopping lists/items to reminders';



CREATE TABLE IF NOT EXISTS "public"."shopping_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "list_id" "uuid" NOT NULL,
    "task_id" "uuid" NOT NULL,
    "sync_completion" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "auto_delete_at" timestamp with time zone,
    "auto_complete_at" timestamp with time zone,
    "is_auto_created" boolean DEFAULT false,
    "source_recipe_id" "uuid"
);


ALTER TABLE "public"."shopping_tasks" OWNER TO "postgres";


COMMENT ON TABLE "public"."shopping_tasks" IS 'Links shopping lists to tasks';



COMMENT ON COLUMN "public"."shopping_tasks"."auto_delete_at" IS 'Automatically delete task at this time (midnight local time)';



COMMENT ON COLUMN "public"."shopping_tasks"."auto_complete_at" IS 'Automatically mark task as complete at this time (midnight local time)';



COMMENT ON COLUMN "public"."shopping_tasks"."is_auto_created" IS 'True if task was auto-created from recipe';



COMMENT ON COLUMN "public"."shopping_tasks"."source_recipe_id" IS 'Recipe that generated this shopping task';



CREATE TABLE IF NOT EXISTS "public"."shopping_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."shopping_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."shopping_templates" IS 'Reusable shopping list templates';



CREATE TABLE IF NOT EXISTS "public"."space_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "invited_by" "uuid",
    "token" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval),
    "accepted_at" timestamp with time zone,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    CONSTRAINT "space_invitations_role_check" CHECK (("role" = ANY (ARRAY['member'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."space_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."space_members" (
    "space_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text",
    "joined_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."space_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_presence" (
    "user_id" "uuid" NOT NULL,
    "space_id" "uuid",
    "status" "public"."presence_status" DEFAULT 'offline'::"public"."presence_status",
    "last_activity" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_presence" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_presence" IS 'Simple cached presence tracking for space members (online/offline only)';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "name" "text" NOT NULL,
    "pronouns" "text",
    "color_theme" "text" DEFAULT 'emerald'::"text",
    "timezone" "text" DEFAULT 'America/New_York'::"text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "show_tasks_on_calendar" boolean DEFAULT true,
    "calendar_task_filter" "jsonb" DEFAULT '{"categories": [], "priorities": []}'::"jsonb",
    "default_reminder_offset" "text" DEFAULT '1_day_before'::"text",
    "privacy_settings" "jsonb" DEFAULT '{"analytics": true, "readReceipts": true, "activityStatus": true, "profileVisibility": true}'::"jsonb",
    "show_chores_on_calendar" boolean DEFAULT true,
    "calendar_chore_filter" "jsonb" DEFAULT '{"categories": [], "frequencies": []}'::"jsonb",
    "show_meals_on_calendar" boolean DEFAULT true,
    "welcome_completed_at" timestamp with time zone,
    CONSTRAINT "users_calendar_chore_filter_check" CHECK ((("calendar_chore_filter" ? 'categories'::"text") AND ("calendar_chore_filter" ? 'frequencies'::"text"))),
    CONSTRAINT "users_default_reminder_offset_check" CHECK (("default_reminder_offset" = ANY (ARRAY['at_due_time'::"text", '15_min_before'::"text", '1_hour_before'::"text", '1_day_before'::"text", '1_week_before'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."show_tasks_on_calendar" IS 'User preference: Display tasks with due dates on calendar';



COMMENT ON COLUMN "public"."users"."calendar_task_filter" IS 'JSON filter for which task categories/priorities to show on calendar';



COMMENT ON COLUMN "public"."users"."default_reminder_offset" IS 'Default reminder timing for new tasks';



COMMENT ON COLUMN "public"."users"."show_chores_on_calendar" IS 'User preference: Display chores with due dates on calendar';



COMMENT ON COLUMN "public"."users"."calendar_chore_filter" IS 'JSON filter for which chore categories/frequencies to show on calendar';



COMMENT ON COLUMN "public"."users"."show_meals_on_calendar" IS 'User preference: display planned meals on the calendar view';



COMMENT ON COLUMN "public"."users"."welcome_completed_at" IS 'Timestamp when the user finished or skipped the post-signup /welcome step. NULL means they have not been through it yet and should be redirected on next dashboard visit.';



CREATE OR REPLACE VIEW "public"."space_members_with_presence" WITH ("security_invoker"='true') AS
 SELECT "sm"."space_id",
    "sm"."user_id",
    "sm"."role",
    "sm"."joined_at",
    "u"."name",
    "u"."email",
    "u"."avatar_url",
    COALESCE("up"."status", 'offline'::"public"."presence_status") AS "presence_status",
    "up"."last_activity",
    "up"."updated_at" AS "presence_updated_at"
   FROM (("public"."space_members" "sm"
     LEFT JOIN "public"."users" "u" ON (("sm"."user_id" = "u"."id")))
     LEFT JOIN "public"."user_presence" "up" ON ((("sm"."user_id" = "up"."user_id") AND ("sm"."space_id" = "up"."space_id"))))
  ORDER BY
        CASE
            WHEN (COALESCE("up"."status", 'offline'::"public"."presence_status") = 'online'::"public"."presence_status") THEN 1
            ELSE 2
        END, "sm"."role", "u"."name";


ALTER VIEW "public"."space_members_with_presence" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."spaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "description" "text",
    "type" "text" DEFAULT 'household'::"text",
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "user_id" "uuid",
    "is_personal" boolean DEFAULT false,
    "auto_created" boolean DEFAULT false,
    "late_penalty_settings" "jsonb" DEFAULT '{"enabled": false, "exclude_weekends": false, "forgiveness_allowed": true, "progressive_penalty": true, "max_penalty_per_chore": 50, "default_penalty_points": 5, "default_grace_period_hours": 2, "penalty_multiplier_per_day": 1.5}'::"jsonb"
);


ALTER TABLE "public"."spaces" OWNER TO "postgres";


COMMENT ON COLUMN "public"."spaces"."late_penalty_settings" IS 'Space-wide configuration for late penalty system';



CREATE TABLE IF NOT EXISTS "public"."storage_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "total_bytes" bigint DEFAULT 0 NOT NULL,
    "file_count" integer DEFAULT 0 NOT NULL,
    "last_calculated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."storage_usage" OWNER TO "postgres";


COMMENT ON TABLE "public"."storage_usage" IS 'Tracks current storage usage per space for quota enforcement';



CREATE TABLE IF NOT EXISTS "public"."storage_warnings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "space_id" "uuid" NOT NULL,
    "warning_type" "text" NOT NULL,
    "dismissed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "storage_bytes" bigint NOT NULL,
    "storage_limit_bytes" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "storage_warnings_warning_type_check" CHECK (("warning_type" = ANY (ARRAY['80_percent'::"text", '90_percent'::"text", '100_percent'::"text"])))
);


ALTER TABLE "public"."storage_warnings" OWNER TO "postgres";


COMMENT ON TABLE "public"."storage_warnings" IS 'Tracks user dismissals of storage warnings to avoid spam';



CREATE TABLE IF NOT EXISTS "public"."store_layouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "store_name" character varying(255) NOT NULL,
    "aisle_order" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."store_layouts" OWNER TO "postgres";


COMMENT ON TABLE "public"."store_layouts" IS 'Custom aisle ordering per store';



CREATE TABLE IF NOT EXISTS "public"."subscription_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "from_tier" "text",
    "to_tier" "text",
    "trigger_source" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subscription_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."subscription_events" IS 'Audit log of all subscription-related events for analytics';



CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tier" "text" DEFAULT 'free'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "period" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "subscription_started_at" timestamp with time zone,
    "subscription_ends_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_founding_member" boolean DEFAULT false,
    "founding_member_number" integer,
    "founding_member_locked_price_id" "text",
    "polar_customer_id" "text",
    "polar_subscription_id" "text",
    "trial_started_at" timestamp with time zone,
    "trial_ends_at" timestamp with time zone,
    CONSTRAINT "subscriptions_period_check" CHECK (("period" = ANY (ARRAY['monthly'::"text", 'annual'::"text"]))),
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'past_due'::"text", 'canceled'::"text", 'paused'::"text"]))),
    CONSTRAINT "subscriptions_tier_check" CHECK (("tier" = ANY (ARRAY['free'::"text", 'pro'::"text", 'family'::"text", 'owner'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."subscriptions" IS 'User subscription information for monetization';



COMMENT ON COLUMN "public"."subscriptions"."is_founding_member" IS 'True if this user is a founding member (first 1000 paid subscribers)';



COMMENT ON COLUMN "public"."subscriptions"."founding_member_number" IS 'Sequential number (1-1000) for founding members';



COMMENT ON COLUMN "public"."subscriptions"."founding_member_locked_price_id" IS 'The Polar product ID that this founding member locked in';



COMMENT ON COLUMN "public"."subscriptions"."polar_customer_id" IS 'Polar customer ID for payment processing';



COMMENT ON COLUMN "public"."subscriptions"."polar_subscription_id" IS 'Polar subscription ID for recurring payments';



COMMENT ON COLUMN "public"."subscriptions"."trial_started_at" IS 'When a free-trial began. NULL when user has no trial. Used by getUserTier() to detect expired trials and downgrade to free.';



COMMENT ON COLUMN "public"."subscriptions"."trial_ends_at" IS 'When a free-trial expires. NULL when user has no trial. provision_new_user() sets this to NOW() + 14 days for new signups.';



CREATE TABLE IF NOT EXISTS "public"."subtasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parent_task_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "priority" "text" DEFAULT 'medium'::"text",
    "sort_order" integer DEFAULT 0,
    "assigned_to" "uuid",
    "due_date" "date",
    "estimated_duration" integer,
    "actual_duration" integer,
    "completed_at" timestamp with time zone,
    "completed_by" "uuid",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "subtasks_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "subtasks_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'completed'::"text", 'blocked'::"text"])))
);


ALTER TABLE "public"."subtasks" OWNER TO "postgres";


COMMENT ON TABLE "public"."subtasks" IS 'Break down tasks into smaller actionable steps';



COMMENT ON COLUMN "public"."subtasks"."sort_order" IS 'Custom ordering within parent task';



COMMENT ON COLUMN "public"."subtasks"."estimated_duration" IS 'Estimated time in minutes';



COMMENT ON COLUMN "public"."subtasks"."actual_duration" IS 'Actual time spent in minutes';



CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#8b5cf6'::"text",
    "description" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."tags" IS 'Reusable tags that can be applied to expenses, goals, and tasks';



CREATE TABLE IF NOT EXISTS "public"."task_activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "action_type" "text" NOT NULL,
    "field_name" "text",
    "old_value" "text",
    "new_value" "text",
    "change_summary" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "task_activity_log_action_type_check" CHECK (("action_type" = ANY (ARRAY['created'::"text", 'updated'::"text", 'deleted'::"text", 'completed'::"text", 'uncompleted'::"text", 'assigned'::"text", 'unassigned'::"text", 'status_changed'::"text", 'priority_changed'::"text", 'due_date_changed'::"text", 'commented'::"text", 'attached_file'::"text", 'removed_file'::"text"])))
);


ALTER TABLE "public"."task_activity_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_activity_log" IS 'Comprehensive activity log for all task changes';



COMMENT ON COLUMN "public"."task_activity_log"."action_type" IS 'Type of action performed on the task';



COMMENT ON COLUMN "public"."task_activity_log"."change_summary" IS 'Human-readable description of the change';



COMMENT ON COLUMN "public"."task_activity_log"."metadata" IS 'Additional context (IP, user agent, etc.)';



CREATE TABLE IF NOT EXISTS "public"."task_approvals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "approver_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "reviewed_at" timestamp with time zone,
    "review_note" "text",
    "changes_requested" "text",
    "requested_by" "uuid" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "task_approvals_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'changes_requested'::"text"])))
);


ALTER TABLE "public"."task_approvals" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_approvals" IS 'Approval workflow for tasks requiring review before completion';



COMMENT ON COLUMN "public"."task_approvals"."changes_requested" IS 'Specific feedback on what needs to be changed';



CREATE TABLE IF NOT EXISTS "public"."task_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'assignee'::"text",
    "is_primary" boolean DEFAULT false,
    "assigned_by" "uuid",
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "task_assignments_role_check" CHECK (("role" = ANY (ARRAY['assignee'::"text", 'reviewer'::"text", 'observer'::"text"])))
);


ALTER TABLE "public"."task_assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_assignments" IS 'Junction table for assigning multiple users to a task';



COMMENT ON COLUMN "public"."task_assignments"."role" IS 'assignee = responsible, reviewer = approver, observer = follower';



COMMENT ON COLUMN "public"."task_assignments"."is_primary" IS 'Primary assignee appears in tasks.assigned_to for backward compatibility';



CREATE TABLE IF NOT EXISTS "public"."task_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" integer NOT NULL,
    "file_type" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "storage_bucket" "text" DEFAULT 'task-attachments'::"text",
    "thumbnail_path" "text",
    "is_image" boolean DEFAULT false,
    "is_document" boolean DEFAULT false,
    "is_video" boolean DEFAULT false,
    "uploaded_by" "uuid" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_file_size" CHECK (("file_size" <= 52428800))
);


ALTER TABLE "public"."task_attachments" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_attachments" IS 'File attachments for tasks (images, documents, etc.)';



COMMENT ON COLUMN "public"."task_attachments"."file_size" IS 'File size in bytes (max 50MB)';



COMMENT ON COLUMN "public"."task_attachments"."storage_path" IS 'Full path in Supabase Storage bucket';



COMMENT ON COLUMN "public"."task_attachments"."thumbnail_path" IS 'Path to generated thumbnail for preview';



CREATE TABLE IF NOT EXISTS "public"."task_calendar_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "event_id" "uuid",
    "is_synced" boolean DEFAULT false,
    "sync_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_calendar_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_calendar_events" IS 'Sync records between tasks and calendar events';



CREATE TABLE IF NOT EXISTS "public"."task_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" NOT NULL,
    "icon" "text",
    "description" "text",
    "sort_order" integer DEFAULT 0,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_categories" IS 'Custom categories with color themes for tasks';



COMMENT ON COLUMN "public"."task_categories"."color" IS 'Tailwind color name (blue, emerald, purple, etc.)';



CREATE TABLE IF NOT EXISTS "public"."task_comment_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "comment_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "emoji" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_comment_reactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_comment_reactions" IS 'Emoji reactions on task comments';



CREATE TABLE IF NOT EXISTS "public"."task_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "parent_comment_id" "uuid",
    "is_edited" boolean DEFAULT false,
    "edited_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_comments" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_comments" IS 'Comments and discussions on tasks';



COMMENT ON COLUMN "public"."task_comments"."parent_comment_id" IS 'For threaded replies to comments';



CREATE TABLE IF NOT EXISTS "public"."task_dependencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "depends_on_task_id" "uuid" NOT NULL,
    "dependency_type" "text" DEFAULT 'blocks'::"text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_no_self_dependency" CHECK (("task_id" <> "depends_on_task_id")),
    CONSTRAINT "task_dependencies_dependency_type_check" CHECK (("dependency_type" = ANY (ARRAY['blocks'::"text", 'relates_to'::"text"])))
);


ALTER TABLE "public"."task_dependencies" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_dependencies" IS 'Defines blocking relationships between tasks';



COMMENT ON COLUMN "public"."task_dependencies"."dependency_type" IS 'blocks = must complete first, relates_to = soft connection';



CREATE TABLE IF NOT EXISTS "public"."task_handoffs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "from_user_id" "uuid",
    "to_user_id" "uuid" NOT NULL,
    "handoff_note" "text",
    "reason" "text",
    "performed_by" "uuid" NOT NULL,
    "performed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_handoffs" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_handoffs" IS 'Tracks task reassignments with optional notes and reasons';



COMMENT ON COLUMN "public"."task_handoffs"."handoff_note" IS 'Optional note from assignee to new assignee';



COMMENT ON COLUMN "public"."task_handoffs"."reason" IS 'Category reason for handoff (overloaded, expertise, unavailable)';



COMMENT ON COLUMN "public"."task_handoffs"."performed_by" IS 'User who initiated the reassignment';



CREATE TABLE IF NOT EXISTS "public"."task_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "emoji" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_reactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_reactions" IS 'Emoji reactions on tasks';



CREATE TABLE IF NOT EXISTS "public"."task_reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "remind_at" timestamp with time zone NOT NULL,
    "reminder_type" "text" DEFAULT 'notification'::"text",
    "offset_type" "text",
    "custom_offset_minutes" integer,
    "is_sent" boolean DEFAULT false,
    "sent_at" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "task_reminders_offset_type_check" CHECK (("offset_type" = ANY (ARRAY['at_due_time'::"text", '15_min_before'::"text", '1_hour_before'::"text", '1_day_before'::"text", '1_week_before'::"text", 'custom'::"text"]))),
    CONSTRAINT "task_reminders_reminder_type_check" CHECK (("reminder_type" = ANY (ARRAY['notification'::"text", 'email'::"text", 'both'::"text"])))
);


ALTER TABLE "public"."task_reminders" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_reminders" IS 'Reminder system for tasks with customizable timing';



COMMENT ON COLUMN "public"."task_reminders"."reminder_type" IS 'notification = in-app push, email = email, both = both channels';



COMMENT ON COLUMN "public"."task_reminders"."offset_type" IS 'Pre-defined offset from due date or custom';



CREATE TABLE IF NOT EXISTS "public"."task_snooze_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "snoozed_by" "uuid" NOT NULL,
    "snoozed_from_date" "date",
    "snoozed_to_date" "date",
    "snooze_duration_minutes" integer,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_snooze_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_snooze_history" IS 'History of all snooze actions for analytics';



CREATE TABLE IF NOT EXISTS "public"."task_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "month" "date" NOT NULL,
    "total_tasks" integer DEFAULT 0,
    "completed_tasks" integer DEFAULT 0,
    "pending_tasks" integer DEFAULT 0,
    "in_progress_tasks" integer DEFAULT 0,
    "total_chores" integer DEFAULT 0,
    "completed_chores" integer DEFAULT 0,
    "pending_chores" integer DEFAULT 0,
    "total_items" integer DEFAULT 0,
    "completed_items" integer DEFAULT 0,
    "completion_rate" numeric(5,2) DEFAULT 0.00,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_stats" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_stats" IS 'Pre-aggregated monthly statistics for tasks and chores to support historical analytics';



COMMENT ON COLUMN "public"."task_stats"."month" IS 'First day of the month for these statistics (e.g., 2025-10-01 for October 2025)';



COMMENT ON COLUMN "public"."task_stats"."completion_rate" IS 'Percentage of completed items out of total items (0.00 to 100.00)';



CREATE TABLE IF NOT EXISTS "public"."task_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_tags" IS 'Junction table linking tasks to tags (many-to-many)';



CREATE TABLE IF NOT EXISTS "public"."task_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "title" "text" NOT NULL,
    "task_description" "text",
    "category" "text",
    "priority" "text" DEFAULT 'medium'::"text",
    "estimated_duration" integer,
    "default_recurrence_pattern" "text",
    "default_recurrence_interval" integer DEFAULT 1,
    "default_recurrence_days_of_week" "jsonb" DEFAULT '[]'::"jsonb",
    "default_assigned_to" "uuid",
    "use_count" integer DEFAULT 0,
    "is_favorite" boolean DEFAULT false,
    "tags" "jsonb" DEFAULT '[]'::"jsonb",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "task_templates_default_recurrence_pattern_check" CHECK (("default_recurrence_pattern" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'biweekly'::"text", 'monthly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "task_templates_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'urgent'::"text"])))
);


ALTER TABLE "public"."task_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_templates" IS 'Reusable task templates for quick task creation';



COMMENT ON COLUMN "public"."task_templates"."default_recurrence_pattern" IS 'Default recurrence pattern: daily, weekly, biweekly, monthly, yearly';



COMMENT ON COLUMN "public"."task_templates"."use_count" IS 'Tracks popularity of template';



COMMENT ON COLUMN "public"."task_templates"."tags" IS 'Array of strings for categorization and filtering';



CREATE TABLE IF NOT EXISTS "public"."task_time_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone,
    "duration" integer,
    "notes" "text",
    "is_manual" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_time_entry_order" CHECK ((("end_time" IS NULL) OR ("end_time" > "start_time")))
);


ALTER TABLE "public"."task_time_entries" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_time_entries" IS 'Track time spent on tasks with start/stop timer or manual entry';



COMMENT ON COLUMN "public"."task_time_entries"."duration" IS 'Duration in minutes, auto-calculated from start/end times';



COMMENT ON COLUMN "public"."task_time_entries"."is_manual" IS 'True if manually entered, false if tracked with timer';



CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "category" "text",
    "priority" "text" DEFAULT 'medium'::"text",
    "status" "text" DEFAULT 'pending'::"text",
    "due_date" "date",
    "assigned_to" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "is_recurring" boolean DEFAULT false,
    "recurrence_pattern" "text",
    "recurrence_interval" integer DEFAULT 1,
    "recurrence_days_of_week" "jsonb" DEFAULT '[]'::"jsonb",
    "recurrence_day_of_month" integer,
    "recurrence_month" integer,
    "recurrence_end_date" "date",
    "recurrence_end_count" integer,
    "parent_recurrence_id" "uuid",
    "is_recurrence_template" boolean DEFAULT false,
    "recurrence_exceptions" "jsonb" DEFAULT '[]'::"jsonb",
    "recurrence_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "estimated_duration" integer,
    "actual_duration" integer,
    "is_blocked" boolean DEFAULT false,
    "blocking_count" integer DEFAULT 0,
    "sort_order" integer DEFAULT 0,
    "color" "text",
    "comment_count" integer DEFAULT 0,
    "is_snoozed" boolean DEFAULT false,
    "snoozed_until" timestamp with time zone,
    "snoozed_by" "uuid",
    "snooze_count" integer DEFAULT 0,
    "handoff_count" integer DEFAULT 0,
    "requires_approval" boolean DEFAULT false,
    "approval_status" "text",
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "archived" boolean DEFAULT false,
    "archived_at" timestamp with time zone,
    "calendar_sync" boolean DEFAULT false,
    "estimated_hours" numeric(5,2),
    "quick_note" "text",
    "tags" "text",
    CONSTRAINT "tasks_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['not_required'::"text", 'pending'::"text", 'approved'::"text", 'rejected'::"text", 'changes_requested'::"text"]))),
    CONSTRAINT "tasks_estimated_hours_check" CHECK (("estimated_hours" >= (0)::numeric)),
    CONSTRAINT "tasks_recurrence_day_of_month_check" CHECK ((("recurrence_day_of_month" >= 1) AND ("recurrence_day_of_month" <= 31))),
    CONSTRAINT "tasks_recurrence_end_count_check" CHECK (("recurrence_end_count" >= 1)),
    CONSTRAINT "tasks_recurrence_interval_check" CHECK ((("recurrence_interval" >= 1) AND ("recurrence_interval" <= 365))),
    CONSTRAINT "tasks_recurrence_month_check" CHECK ((("recurrence_month" >= 1) AND ("recurrence_month" <= 12))),
    CONSTRAINT "tasks_recurrence_pattern_check" CHECK (("recurrence_pattern" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'biweekly'::"text", 'monthly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "tasks_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in-progress'::"text", 'blocked'::"text", 'completed'::"text", 'on-hold'::"text"])))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tasks"."status" IS 'Status of the task: pending, in-progress, blocked, completed, or on-hold';



COMMENT ON COLUMN "public"."tasks"."is_recurring" IS 'Indicates if this task is part of a recurring series';



COMMENT ON COLUMN "public"."tasks"."recurrence_pattern" IS 'Pattern type: daily, weekly, biweekly, monthly, yearly';



COMMENT ON COLUMN "public"."tasks"."recurrence_interval" IS 'Interval between occurrences (e.g., 2 for every 2 weeks)';



COMMENT ON COLUMN "public"."tasks"."recurrence_days_of_week" IS 'Array of days [0-6] for weekly recurrence (0=Sunday)';



COMMENT ON COLUMN "public"."tasks"."recurrence_day_of_month" IS 'Day of month (1-31) for monthly recurrence';



COMMENT ON COLUMN "public"."tasks"."recurrence_month" IS 'Month (1-12) for yearly recurrence';



COMMENT ON COLUMN "public"."tasks"."recurrence_end_date" IS 'Optional date when recurrence should stop';



COMMENT ON COLUMN "public"."tasks"."recurrence_end_count" IS 'Optional number of occurrences before stopping';



COMMENT ON COLUMN "public"."tasks"."parent_recurrence_id" IS 'Links to the template task that generated this occurrence';



COMMENT ON COLUMN "public"."tasks"."is_recurrence_template" IS 'True for the parent recurring task template';



COMMENT ON COLUMN "public"."tasks"."recurrence_exceptions" IS 'Array of ISO date strings to skip';



COMMENT ON COLUMN "public"."tasks"."recurrence_metadata" IS 'Additional metadata for recurrence system';



COMMENT ON COLUMN "public"."tasks"."estimated_duration" IS 'Estimated time to complete in minutes';



COMMENT ON COLUMN "public"."tasks"."actual_duration" IS 'Total time tracked in minutes (sum of all time entries)';



COMMENT ON COLUMN "public"."tasks"."is_blocked" IS 'True if task has incomplete dependencies';



COMMENT ON COLUMN "public"."tasks"."blocking_count" IS 'Number of tasks this task is blocking';



COMMENT ON COLUMN "public"."tasks"."sort_order" IS 'Custom ordering for drag-and-drop reordering (0-based index)';



COMMENT ON COLUMN "public"."tasks"."color" IS 'Optional color override for individual tasks';



COMMENT ON COLUMN "public"."tasks"."comment_count" IS 'Cached count of comments for quick display';



COMMENT ON COLUMN "public"."tasks"."is_snoozed" IS 'True if task is currently snoozed/hidden';



COMMENT ON COLUMN "public"."tasks"."snoozed_until" IS 'Timestamp when task should reappear';



COMMENT ON COLUMN "public"."tasks"."snooze_count" IS 'Total number of times this task has been snoozed';



COMMENT ON COLUMN "public"."tasks"."handoff_count" IS 'Total number of times task has been reassigned';



COMMENT ON COLUMN "public"."tasks"."requires_approval" IS 'True if task needs approval before being marked complete';



COMMENT ON COLUMN "public"."tasks"."approval_status" IS 'Current approval state of the task';



COMMENT ON COLUMN "public"."tasks"."metadata" IS 'JSON metadata for task configuration (e.g., auto_complete_on_approval)';



COMMENT ON COLUMN "public"."tasks"."archived" IS 'Whether this task has been archived for data minimization';



COMMENT ON COLUMN "public"."tasks"."calendar_sync" IS 'Whether this task should be synced with external calendars';



COMMENT ON COLUMN "public"."tasks"."estimated_hours" IS 'Estimated time to complete the task in hours (decimal, e.g., 1.5 for 1 hour 30 minutes)';



COMMENT ON COLUMN "public"."tasks"."quick_note" IS 'Quick collaborative note for family members about this task';



COMMENT ON COLUMN "public"."tasks"."tags" IS 'Comma-separated tags for task organization and filtering';



CREATE TABLE IF NOT EXISTS "public"."typing_indicators" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "last_typed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."typing_indicators" OWNER TO "postgres";


COMMENT ON TABLE "public"."typing_indicators" IS 'Real-time typing indicators for conversations';



COMMENT ON COLUMN "public"."typing_indicators"."last_typed_at" IS 'Timestamp of last typing activity (auto-expires after 10 seconds)';



CREATE OR REPLACE VIEW "public"."unread_mentions" WITH ("security_invoker"='true') AS
 SELECT "m"."id",
    "m"."comment_id",
    "m"."mentioned_user_id",
    "c"."content" AS "comment_content",
    "c"."commentable_type",
    "c"."commentable_id",
    "c"."created_by" AS "comment_author_id",
    "u"."email" AS "comment_author_email",
    "c"."created_at"
   FROM (("public"."mentions" "m"
     JOIN "public"."comments" "c" ON (("m"."comment_id" = "c"."id")))
     JOIN "public"."users" "u" ON (("c"."created_by" = "u"."id")))
  WHERE (("m"."is_read" = false) AND ("c"."is_deleted" = false));


ALTER VIEW "public"."unread_mentions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."upgrade_page_visits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "visited_at" timestamp with time zone DEFAULT "now"(),
    "user_agent" "text",
    "referrer" "text"
);


ALTER TABLE "public"."upgrade_page_visits" OWNER TO "postgres";


COMMENT ON TABLE "public"."upgrade_page_visits" IS 'Tracks visits to /upgrade page for conversion analytics';



CREATE OR REPLACE VIEW "public"."upgrade_conversion_stats" AS
 SELECT "date"("upv"."visited_at") AS "visit_date",
    "count"(DISTINCT "upv"."email") AS "unique_visitors",
    "count"(*) AS "total_visits",
    "count"(DISTINCT
        CASE
            WHEN ("u"."id" IS NOT NULL) THEN "upv"."email"
            ELSE NULL::"text"
        END) AS "conversions",
    "round"(((("count"(DISTINCT
        CASE
            WHEN ("u"."id" IS NOT NULL) THEN "upv"."email"
            ELSE NULL::"text"
        END))::numeric / (NULLIF("count"(DISTINCT "upv"."email"), 0))::numeric) * (100)::numeric), 2) AS "conversion_rate_percentage"
   FROM ("public"."upgrade_page_visits" "upv"
     LEFT JOIN "auth"."users" "u" ON (((("u"."email")::"text" = "upv"."email") AND ("u"."created_at" > "upv"."visited_at"))))
  GROUP BY ("date"("upv"."visited_at"))
  ORDER BY ("date"("upv"."visited_at")) DESC;


ALTER VIEW "public"."upgrade_conversion_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."upgrade_conversion_stats" IS 'Daily conversion statistics from upgrade page visits to account creation';



CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "space_id" "uuid" NOT NULL,
    "badge_id" "uuid" NOT NULL,
    "earned_at" timestamp with time zone DEFAULT "now"(),
    "progress_data" "jsonb"
);


ALTER TABLE "public"."user_achievements" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_achievements" IS 'Tracks which badges users have earned in each space';



CREATE TABLE IF NOT EXISTS "public"."user_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "action_category" "text" NOT NULL,
    "resource_type" "text",
    "resource_id" "text",
    "ip_address" "text",
    "user_agent" "text",
    "location" "text",
    "details" "jsonb",
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_audit_log" IS 'GDPR Article 15 compliance: User audit trail showing all data access events. Retained for 2 years. Immutable for compliance.';



CREATE TABLE IF NOT EXISTS "public"."user_calendar_preferences" (
    "user_id" "uuid" NOT NULL,
    "default_view" "text" DEFAULT 'month'::"text",
    "show_completed" boolean DEFAULT false,
    "show_weekends" boolean DEFAULT true,
    "density" "text" DEFAULT 'normal'::"text",
    "visible_categories" "text"[],
    "week_start_day" integer DEFAULT 0,
    "time_format" "text" DEFAULT '12h'::"text",
    "theme_preset" "text",
    "custom_theme" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_calendar_preferences_default_view_check" CHECK (("default_view" = ANY (ARRAY['month'::"text", 'week'::"text", 'day'::"text", 'agenda'::"text", 'timeline'::"text"]))),
    CONSTRAINT "user_calendar_preferences_density_check" CHECK (("density" = ANY (ARRAY['compact'::"text", 'normal'::"text", 'spacious'::"text"]))),
    CONSTRAINT "user_calendar_preferences_time_format_check" CHECK (("time_format" = ANY (ARRAY['12h'::"text", '24h'::"text"]))),
    CONSTRAINT "user_calendar_preferences_week_start_day_check" CHECK ((("week_start_day" >= 0) AND ("week_start_day" <= 6)))
);


ALTER TABLE "public"."user_calendar_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_feedback_category_check" CHECK (("category" = ANY (ARRAY['bug_report'::"text", 'feature_request'::"text", 'general'::"text"]))),
    CONSTRAINT "user_feedback_description_check" CHECK ((("char_length"("description") >= 1) AND ("char_length"("description") <= 2000))),
    CONSTRAINT "user_feedback_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'done'::"text", 'deleted'::"text"]))),
    CONSTRAINT "user_feedback_title_check" CHECK ((("char_length"("title") >= 1) AND ("char_length"("title") <= 100)))
);


ALTER TABLE "public"."user_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "space_id" "uuid",
    "email_enabled" boolean DEFAULT true,
    "email_due_reminders" boolean DEFAULT true,
    "email_assignments" boolean DEFAULT true,
    "email_mentions" boolean DEFAULT true,
    "email_comments" boolean DEFAULT false,
    "in_app_enabled" boolean DEFAULT true,
    "in_app_due_reminders" boolean DEFAULT true,
    "in_app_assignments" boolean DEFAULT true,
    "in_app_mentions" boolean DEFAULT true,
    "in_app_comments" boolean DEFAULT true,
    "notification_frequency" "text" DEFAULT 'instant'::"text",
    "quiet_hours_enabled" boolean DEFAULT false,
    "quiet_hours_start" time without time zone,
    "quiet_hours_end" time without time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "push_enabled" boolean DEFAULT true NOT NULL,
    "push_due_reminders" boolean DEFAULT true NOT NULL,
    "push_assignments" boolean DEFAULT true NOT NULL,
    "push_mentions" boolean DEFAULT true NOT NULL,
    "push_comments" boolean DEFAULT false NOT NULL,
    CONSTRAINT "valid_notification_frequency" CHECK (("notification_frequency" = ANY (ARRAY['instant'::"text", 'hourly'::"text", 'daily'::"text", 'never'::"text"])))
);


ALTER TABLE "public"."user_notification_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_notification_preferences" IS 'Primary table for user notification preferences including email, push, digest, and quiet hours settings. This table replaced the old notification_preferences table.';



COMMENT ON COLUMN "public"."user_notification_preferences"."push_enabled" IS 'Master toggle for native/web push delivery channel';



COMMENT ON COLUMN "public"."user_notification_preferences"."push_due_reminders" IS 'Push: tasks and events due-date reminders';



COMMENT ON COLUMN "public"."user_notification_preferences"."push_assignments" IS 'Push: when user is assigned a task, chore, or shopping item';



COMMENT ON COLUMN "public"."user_notification_preferences"."push_mentions" IS 'Push: when user is @-mentioned in a message or comment';



COMMENT ON COLUMN "public"."user_notification_preferences"."push_comments" IS 'Push: replies on items the user owns or follows (off by default — high volume)';



CREATE TABLE IF NOT EXISTS "public"."user_privacy_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "marketing_emails_enabled" boolean DEFAULT false,
    "analytics_cookies_enabled" boolean DEFAULT true,
    "allow_third_party_analytics" boolean DEFAULT true,
    "location_tracking_enabled" boolean DEFAULT false,
    "ccpa_do_not_sell" boolean DEFAULT true,
    "gdpr_automated_decision_making_opt_out" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "activity_status_visible" boolean DEFAULT true,
    "share_anonymous_analytics" boolean DEFAULT false,
    "third_party_analytics_enabled" boolean DEFAULT false
);


ALTER TABLE "public"."user_privacy_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_privacy_preferences" IS 'Simplified privacy preferences focusing on essential controls only - data minimization approach';



CREATE TABLE IF NOT EXISTS "public"."user_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "space_id" "uuid",
    "onboarding_completed" boolean DEFAULT false,
    "space_setup_completed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_token" "text" NOT NULL,
    "device_type" "text",
    "browser" "text",
    "browser_version" "text",
    "os" "text",
    "os_version" "text",
    "device_name" "text",
    "ip_address" "text",
    "city" "text",
    "region" "text",
    "country" "text",
    "country_code" "text",
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "is_current" boolean DEFAULT false,
    "last_active" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "revoked_at" timestamp with time zone,
    "user_agent" "text"
);


ALTER TABLE "public"."user_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_sessions" IS 'Tracks active user sessions with device and location information for security monitoring';



COMMENT ON COLUMN "public"."user_sessions"."session_token" IS 'Hashed session token for security';



COMMENT ON COLUMN "public"."user_sessions"."is_current" IS 'Marks the current active session';



COMMENT ON COLUMN "public"."user_sessions"."revoked_at" IS 'Timestamp when session was manually revoked by user';



CREATE OR REPLACE VIEW "public"."vendor_spend_summary" AS
SELECT
    NULL::"uuid" AS "vendor_id",
    NULL::"uuid" AS "space_id",
    NULL::"text" AS "name",
    NULL::"text" AS "company_name",
    NULL::"text" AS "trade",
    NULL::integer AS "rating",
    NULL::boolean AS "is_preferred",
    NULL::bigint AS "project_count",
    NULL::bigint AS "expense_count",
    NULL::numeric AS "total_spent",
    NULL::"date" AS "first_transaction_date",
    NULL::"date" AS "last_transaction_date";


ALTER VIEW "public"."vendor_spend_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "company_name" "text",
    "trade" "text",
    "email" "text",
    "phone" "text",
    "address" "text",
    "website" "text",
    "license_number" "text",
    "insurance_verified" boolean DEFAULT false,
    "rating" integer,
    "notes" "text",
    "is_preferred" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "vendors_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."vendors" OWNER TO "postgres";


COMMENT ON TABLE "public"."vendors" IS 'Contractors and vendors database';



COMMENT ON COLUMN "public"."vendors"."is_preferred" IS 'Flag for preferred/trusted vendors';



CREATE TABLE IF NOT EXISTS "public"."voice_note_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid",
    "created_by" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "category" character varying(50) DEFAULT 'general'::character varying NOT NULL,
    "prompt" "text" NOT NULL,
    "questions" "jsonb" DEFAULT '[]'::"jsonb",
    "usage_count" integer DEFAULT 0,
    "is_default" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."voice_note_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."voice_transcriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "goal_check_in_id" "uuid",
    "transcription" "text" NOT NULL,
    "confidence" numeric(3,2) DEFAULT 0.0,
    "language" character varying(10) DEFAULT 'en-US'::character varying,
    "duration" integer DEFAULT 0,
    "word_count" integer DEFAULT 0,
    "keywords" "jsonb" DEFAULT '[]'::"jsonb",
    "sentiment" character varying(20) DEFAULT 'neutral'::character varying,
    "emotions" "jsonb" DEFAULT '[]'::"jsonb",
    "topics" "jsonb" DEFAULT '[]'::"jsonb",
    "action_items" "jsonb" DEFAULT '[]'::"jsonb",
    "summary" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."voice_transcriptions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."account_deletion_audit_log"
    ADD CONSTRAINT "account_deletion_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."account_deletion_requests"
    ADD CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."account_deletion_requests"
    ADD CONSTRAINT "account_deletion_requests_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."achievement_badges"
    ADD CONSTRAINT "achievement_badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."achievement_progress"
    ADD CONSTRAINT "achievement_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."ai_conversations"
    ADD CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_messages"
    ADD CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_usage_daily"
    ADD CONSTRAINT "ai_usage_daily_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_user_settings"
    ADD CONSTRAINT "ai_user_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_user_settings"
    ADD CONSTRAINT "ai_user_settings_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."availability_blocks"
    ADD CONSTRAINT "availability_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budget_categories"
    ADD CONSTRAINT "budget_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budget_categories"
    ADD CONSTRAINT "budget_categories_space_id_category_name_key" UNIQUE ("space_id", "category_name");



ALTER TABLE ONLY "public"."budget_template_categories"
    ADD CONSTRAINT "budget_template_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budget_templates"
    ADD CONSTRAINT "budget_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_space_id_key" UNIQUE ("space_id");



ALTER TABLE ONLY "public"."calendar_connections"
    ADD CONSTRAINT "calendar_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_event_mappings"
    ADD CONSTRAINT "calendar_event_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_sync_conflicts"
    ADD CONSTRAINT "calendar_sync_conflicts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_sync_logs"
    ADD CONSTRAINT "calendar_sync_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_sync_map"
    ADD CONSTRAINT "calendar_sync_map_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_sync_map"
    ADD CONSTRAINT "calendar_sync_map_rowan_event_id_provider_key" UNIQUE ("rowan_event_id", "provider");



ALTER TABLE ONLY "public"."calendar_sync_queue"
    ADD CONSTRAINT "calendar_sync_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_webhook_subscriptions"
    ADD CONSTRAINT "calendar_webhook_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_webhook_subscriptions"
    ADD CONSTRAINT "calendar_webhook_subscriptions_webhook_id_key" UNIQUE ("webhook_id");



ALTER TABLE ONLY "public"."ccpa_audit_log"
    ADD CONSTRAINT "ccpa_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ccpa_do_not_sell"
    ADD CONSTRAINT "ccpa_do_not_sell_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ccpa_do_not_sell"
    ADD CONSTRAINT "ccpa_do_not_sell_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."ccpa_opt_out_status"
    ADD CONSTRAINT "ccpa_opt_out_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ccpa_opt_out_status"
    ADD CONSTRAINT "ccpa_opt_out_status_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."checkin_reactions"
    ADD CONSTRAINT "checkin_reactions_checkin_id_from_user_id_key" UNIQUE ("checkin_id", "from_user_id");



ALTER TABLE ONLY "public"."checkin_reactions"
    ADD CONSTRAINT "checkin_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chore_calendar_events"
    ADD CONSTRAINT "chore_calendar_events_chore_id_event_id_key" UNIQUE ("chore_id", "event_id");



ALTER TABLE ONLY "public"."chore_calendar_events"
    ADD CONSTRAINT "chore_calendar_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chore_rotations"
    ADD CONSTRAINT "chore_rotations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "chores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comment_reactions"
    ADD CONSTRAINT "comment_reactions_comment_id_user_id_emoji_key" UNIQUE ("comment_id", "user_id", "emoji");



ALTER TABLE ONLY "public"."comment_reactions"
    ADD CONSTRAINT "comment_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."compliance_events_log"
    ADD CONSTRAINT "compliance_events_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_categories"
    ADD CONSTRAINT "custom_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_categories"
    ADD CONSTRAINT "custom_categories_space_id_name_key" UNIQUE ("space_id", "name");



ALTER TABLE ONLY "public"."daily_analytics"
    ADD CONSTRAINT "daily_analytics_date_key" UNIQUE ("date");



ALTER TABLE ONLY "public"."daily_analytics"
    ADD CONSTRAINT "daily_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_checkins"
    ADD CONSTRAINT "daily_checkins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_checkins"
    ADD CONSTRAINT "daily_checkins_user_id_space_id_date_key" UNIQUE ("user_id", "space_id", "date");



ALTER TABLE ONLY "public"."daily_usage"
    ADD CONSTRAINT "daily_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_usage"
    ADD CONSTRAINT "daily_usage_user_id_date_key" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."data_export_requests"
    ADD CONSTRAINT "data_export_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_processing_agreements"
    ADD CONSTRAINT "data_processing_agreements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deleted_accounts"
    ADD CONSTRAINT "deleted_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_attachments"
    ADD CONSTRAINT "event_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_audit_log"
    ADD CONSTRAINT "event_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_note_versions"
    ADD CONSTRAINT "event_note_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_notes"
    ADD CONSTRAINT "event_notes_event_id_key" UNIQUE ("event_id");



ALTER TABLE ONLY "public"."event_notes"
    ADD CONSTRAINT "event_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_proposal_votes"
    ADD CONSTRAINT "event_proposal_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_proposal_votes"
    ADD CONSTRAINT "event_proposal_votes_proposal_id_time_slot_index_user_id_key" UNIQUE ("proposal_id", "time_slot_index", "user_id");



ALTER TABLE ONLY "public"."event_proposals"
    ADD CONSTRAINT "event_proposals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_reminders"
    ADD CONSTRAINT "event_reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_share_links"
    ADD CONSTRAINT "event_share_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_share_links"
    ADD CONSTRAINT "event_share_links_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."event_templates"
    ADD CONSTRAINT "event_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expense_splits"
    ADD CONSTRAINT "expense_splits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expense_tags"
    ADD CONSTRAINT "expense_tags_expense_id_tag_id_key" UNIQUE ("expense_id", "tag_id");



ALTER TABLE ONLY "public"."expense_tags"
    ADD CONSTRAINT "expense_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."external_calendar_connections"
    ADD CONSTRAINT "external_calendar_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."external_calendar_connections"
    ADD CONSTRAINT "external_calendar_connections_user_id_provider_key" UNIQUE ("user_id", "provider");



ALTER TABLE ONLY "public"."feature_events"
    ADD CONSTRAINT "feature_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_usage_daily"
    ADD CONSTRAINT "feature_usage_daily_date_feature_key" UNIQUE ("date", "feature");



ALTER TABLE ONLY "public"."feature_usage_daily"
    ADD CONSTRAINT "feature_usage_daily_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."founding_member_counter"
    ADD CONSTRAINT "founding_member_counter_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."generated_reports"
    ADD CONSTRAINT "generated_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."generated_reports"
    ADD CONSTRAINT "generated_reports_share_token_key" UNIQUE ("share_token");



ALTER TABLE ONLY "public"."goal_activities"
    ADD CONSTRAINT "goal_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goal_check_in_photos"
    ADD CONSTRAINT "goal_check_in_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goal_check_in_reactions"
    ADD CONSTRAINT "goal_check_in_reactions_check_in_id_user_id_emoji_key" UNIQUE ("check_in_id", "user_id", "emoji");



ALTER TABLE ONLY "public"."goal_check_in_reactions"
    ADD CONSTRAINT "goal_check_in_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goal_check_in_reminders"
    ADD CONSTRAINT "goal_check_in_reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goal_check_in_settings"
    ADD CONSTRAINT "goal_check_in_settings_goal_id_user_id_key" UNIQUE ("goal_id", "user_id");



ALTER TABLE ONLY "public"."goal_check_in_settings"
    ADD CONSTRAINT "goal_check_in_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goal_check_ins"
    ADD CONSTRAINT "goal_check_ins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goal_collaborators"
    ADD CONSTRAINT "goal_collaborators_goal_id_user_id_key" UNIQUE ("goal_id", "user_id");



ALTER TABLE ONLY "public"."goal_collaborators"
    ADD CONSTRAINT "goal_collaborators_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goal_comment_reactions"
    ADD CONSTRAINT "goal_comment_reactions_comment_id_user_id_emoji_key" UNIQUE ("comment_id", "user_id", "emoji");



ALTER TABLE ONLY "public"."goal_comment_reactions"
    ADD CONSTRAINT "goal_comment_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goal_comments"
    ADD CONSTRAINT "goal_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goal_contributions"
    ADD CONSTRAINT "goal_contributions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goal_dependencies"
    ADD CONSTRAINT "goal_dependencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goal_mentions"
    ADD CONSTRAINT "goal_mentions_comment_id_mentioned_user_id_key" UNIQUE ("comment_id", "mentioned_user_id");



ALTER TABLE ONLY "public"."goal_mentions"
    ADD CONSTRAINT "goal_mentions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goal_milestones"
    ADD CONSTRAINT "goal_milestones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goal_nudge_tracking"
    ADD CONSTRAINT "goal_nudge_tracking_goal_id_user_id_key" UNIQUE ("goal_id", "user_id");



ALTER TABLE ONLY "public"."goal_nudge_tracking"
    ADD CONSTRAINT "goal_nudge_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goal_tags"
    ADD CONSTRAINT "goal_tags_goal_id_tag_id_key" UNIQUE ("goal_id", "tag_id");



ALTER TABLE ONLY "public"."goal_tags"
    ADD CONSTRAINT "goal_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goal_templates"
    ADD CONSTRAINT "goal_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goal_updates"
    ADD CONSTRAINT "goal_updates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."habit_analytics"
    ADD CONSTRAINT "habit_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."habit_analytics"
    ADD CONSTRAINT "habit_analytics_template_id_user_id_period_type_period_star_key" UNIQUE ("template_id", "user_id", "period_type", "period_start");



ALTER TABLE ONLY "public"."habit_entries"
    ADD CONSTRAINT "habit_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."habit_entries"
    ADD CONSTRAINT "habit_entries_template_id_user_id_entry_date_key" UNIQUE ("template_id", "user_id", "entry_date");



ALTER TABLE ONLY "public"."habit_streaks"
    ADD CONSTRAINT "habit_streaks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."habit_streaks"
    ADD CONSTRAINT "habit_streaks_template_id_user_id_streak_type_key" UNIQUE ("template_id", "user_id", "streak_type");



ALTER TABLE ONLY "public"."in_app_notifications"
    ADD CONSTRAINT "in_app_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."late_penalties"
    ADD CONSTRAINT "late_penalties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."launch_notifications"
    ADD CONSTRAINT "launch_notifications_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."launch_notifications"
    ADD CONSTRAINT "launch_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meal_calendar_events"
    ADD CONSTRAINT "meal_calendar_events_meal_id_event_id_key" UNIQUE ("meal_id", "event_id");



ALTER TABLE ONLY "public"."meal_calendar_events"
    ADD CONSTRAINT "meal_calendar_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meal_plan_tasks"
    ADD CONSTRAINT "meal_plan_tasks_meal_date_meal_type_task_id_key" UNIQUE ("meal_date", "meal_type", "task_id");



ALTER TABLE ONLY "public"."meal_plan_tasks"
    ADD CONSTRAINT "meal_plan_tasks_meal_plan_id_task_id_key" UNIQUE ("meal_plan_id", "task_id");



ALTER TABLE ONLY "public"."meal_plan_tasks"
    ADD CONSTRAINT "meal_plan_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meal_plans"
    ADD CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meals"
    ADD CONSTRAINT "meals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mentions"
    ADD CONSTRAINT "mentions_comment_id_mentioned_user_id_key" UNIQUE ("comment_id", "mentioned_user_id");



ALTER TABLE ONLY "public"."mentions"
    ADD CONSTRAINT "mentions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_attachments"
    ADD CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_mentions"
    ADD CONSTRAINT "message_mentions_message_id_mentioned_user_id_key" UNIQUE ("message_id", "mentioned_user_id");



ALTER TABLE ONLY "public"."message_mentions"
    ADD CONSTRAINT "message_mentions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_message_id_user_id_emoji_key" UNIQUE ("message_id", "user_id", "emoji");



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."milestone_templates"
    ADD CONSTRAINT "milestone_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_interactions"
    ADD CONSTRAINT "notification_interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_log"
    ADD CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nudge_history"
    ADD CONSTRAINT "nudge_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nudge_settings"
    ADD CONSTRAINT "nudge_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nudge_settings"
    ADD CONSTRAINT "nudge_settings_user_id_space_id_key" UNIQUE ("user_id", "space_id");



ALTER TABLE ONLY "public"."nudge_templates"
    ADD CONSTRAINT "nudge_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partnership_balances"
    ADD CONSTRAINT "partnership_balances_partnership_id_space_id_key" UNIQUE ("partnership_id", "space_id");



ALTER TABLE ONLY "public"."partnership_balances"
    ADD CONSTRAINT "partnership_balances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."point_transactions"
    ADD CONSTRAINT "point_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."privacy_email_notifications"
    ADD CONSTRAINT "privacy_email_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."privacy_preference_history"
    ADD CONSTRAINT "privacy_preference_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_line_items"
    ADD CONSTRAINT "project_line_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_photos"
    ADD CONSTRAINT "project_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_endpoint_key" UNIQUE ("endpoint");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_token_key" UNIQUE ("user_id", "token");



ALTER TABLE ONLY "public"."quick_action_usage"
    ADD CONSTRAINT "quick_action_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recurring_event_exceptions"
    ADD CONSTRAINT "recurring_event_exceptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recurring_event_exceptions"
    ADD CONSTRAINT "recurring_event_exceptions_series_id_exception_date_key" UNIQUE ("series_id", "exception_date");



ALTER TABLE ONLY "public"."recurring_expense_patterns"
    ADD CONSTRAINT "recurring_expense_patterns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recurring_goal_instances"
    ADD CONSTRAINT "recurring_goal_instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recurring_goal_instances"
    ADD CONSTRAINT "recurring_goal_instances_template_id_period_start_key" UNIQUE ("template_id", "period_start");



ALTER TABLE ONLY "public"."recurring_goal_templates"
    ADD CONSTRAINT "recurring_goal_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reminder_activities"
    ADD CONSTRAINT "reminder_activity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reminder_attachments"
    ADD CONSTRAINT "reminder_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reminder_comments"
    ADD CONSTRAINT "reminder_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reminder_mentions"
    ADD CONSTRAINT "reminder_mentions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reminder_mentions"
    ADD CONSTRAINT "reminder_mentions_reminder_id_comment_id_mentioned_user_id_key" UNIQUE ("reminder_id", "comment_id", "mentioned_user_id");



ALTER TABLE ONLY "public"."reminder_notifications"
    ADD CONSTRAINT "reminder_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reminder_templates"
    ADD CONSTRAINT "reminder_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reminders"
    ADD CONSTRAINT "reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."report_favorites"
    ADD CONSTRAINT "report_favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."report_favorites"
    ADD CONSTRAINT "report_favorites_user_id_report_id_key" UNIQUE ("user_id", "report_id");



ALTER TABLE ONLY "public"."report_favorites"
    ADD CONSTRAINT "report_favorites_user_id_template_id_key" UNIQUE ("user_id", "template_id");



ALTER TABLE ONLY "public"."report_schedules"
    ADD CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."report_templates"
    ADD CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reward_points"
    ADD CONSTRAINT "reward_points_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reward_points"
    ADD CONSTRAINT "reward_points_user_id_space_id_key" UNIQUE ("user_id", "space_id");



ALTER TABLE ONLY "public"."reward_redemptions"
    ADD CONSTRAINT "reward_redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rewards_catalog"
    ADD CONSTRAINT "rewards_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settlements"
    ADD CONSTRAINT "settlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shopping_calendar_events"
    ADD CONSTRAINT "shopping_calendar_events_list_id_event_id_key" UNIQUE ("list_id", "event_id");



ALTER TABLE ONLY "public"."shopping_calendar_events"
    ADD CONSTRAINT "shopping_calendar_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shopping_item_history"
    ADD CONSTRAINT "shopping_item_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shopping_item_history"
    ADD CONSTRAINT "shopping_item_history_space_name_unique" UNIQUE ("space_id", "item_name");



ALTER TABLE ONLY "public"."shopping_items"
    ADD CONSTRAINT "shopping_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shopping_lists"
    ADD CONSTRAINT "shopping_lists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shopping_lists"
    ADD CONSTRAINT "shopping_lists_share_token_key" UNIQUE ("share_token");



ALTER TABLE ONLY "public"."shopping_reminders"
    ADD CONSTRAINT "shopping_reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shopping_tasks"
    ADD CONSTRAINT "shopping_tasks_list_id_task_id_key" UNIQUE ("list_id", "task_id");



ALTER TABLE ONLY "public"."shopping_tasks"
    ADD CONSTRAINT "shopping_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shopping_templates"
    ADD CONSTRAINT "shopping_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."space_invitations"
    ADD CONSTRAINT "space_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."space_members"
    ADD CONSTRAINT "space_members_pkey" PRIMARY KEY ("space_id", "user_id");



ALTER TABLE ONLY "public"."spaces"
    ADD CONSTRAINT "spaces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."storage_usage"
    ADD CONSTRAINT "storage_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."storage_usage"
    ADD CONSTRAINT "storage_usage_space_id_key" UNIQUE ("space_id");



ALTER TABLE ONLY "public"."storage_warnings"
    ADD CONSTRAINT "storage_warnings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."storage_warnings"
    ADD CONSTRAINT "storage_warnings_user_id_space_id_warning_type_key" UNIQUE ("user_id", "space_id", "warning_type");



ALTER TABLE ONLY "public"."store_layouts"
    ADD CONSTRAINT "store_layouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_layouts"
    ADD CONSTRAINT "store_layouts_space_id_store_name_key" UNIQUE ("space_id", "store_name");



ALTER TABLE ONLY "public"."subscription_events"
    ADD CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_polar_customer_id_key" UNIQUE ("polar_customer_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_polar_subscription_id_key" UNIQUE ("polar_subscription_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."subtasks"
    ADD CONSTRAINT "subtasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_space_id_name_key" UNIQUE ("space_id", "name");



ALTER TABLE ONLY "public"."task_activity_log"
    ADD CONSTRAINT "task_activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_approvals"
    ADD CONSTRAINT "task_approvals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_assignments"
    ADD CONSTRAINT "task_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_assignments"
    ADD CONSTRAINT "task_assignments_task_id_user_id_key" UNIQUE ("task_id", "user_id");



ALTER TABLE ONLY "public"."task_attachments"
    ADD CONSTRAINT "task_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_calendar_events"
    ADD CONSTRAINT "task_calendar_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_calendar_events"
    ADD CONSTRAINT "task_calendar_events_task_id_key" UNIQUE ("task_id");



ALTER TABLE ONLY "public"."task_categories"
    ADD CONSTRAINT "task_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_categories"
    ADD CONSTRAINT "task_categories_space_id_name_key" UNIQUE ("space_id", "name");



ALTER TABLE ONLY "public"."task_comment_reactions"
    ADD CONSTRAINT "task_comment_reactions_comment_id_user_id_emoji_key" UNIQUE ("comment_id", "user_id", "emoji");



ALTER TABLE ONLY "public"."task_comment_reactions"
    ADD CONSTRAINT "task_comment_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_dependencies"
    ADD CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_dependencies"
    ADD CONSTRAINT "task_dependencies_task_id_depends_on_task_id_key" UNIQUE ("task_id", "depends_on_task_id");



ALTER TABLE ONLY "public"."task_handoffs"
    ADD CONSTRAINT "task_handoffs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_reactions"
    ADD CONSTRAINT "task_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_reactions"
    ADD CONSTRAINT "task_reactions_task_id_user_id_emoji_key" UNIQUE ("task_id", "user_id", "emoji");



ALTER TABLE ONLY "public"."task_reminders"
    ADD CONSTRAINT "task_reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_snooze_history"
    ADD CONSTRAINT "task_snooze_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_stats"
    ADD CONSTRAINT "task_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_stats"
    ADD CONSTRAINT "task_stats_space_id_month_key" UNIQUE ("space_id", "month");



ALTER TABLE ONLY "public"."task_tags"
    ADD CONSTRAINT "task_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_tags"
    ADD CONSTRAINT "task_tags_task_id_tag_id_key" UNIQUE ("task_id", "tag_id");



ALTER TABLE ONLY "public"."task_templates"
    ADD CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_time_entries"
    ADD CONSTRAINT "task_time_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."typing_indicators"
    ADD CONSTRAINT "typing_indicators_conversation_id_user_id_key" UNIQUE ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."typing_indicators"
    ADD CONSTRAINT "typing_indicators_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."achievement_badges"
    ADD CONSTRAINT "unique_badge_name" UNIQUE ("name");



ALTER TABLE ONLY "public"."calendar_webhook_subscriptions"
    ADD CONSTRAINT "unique_connection_webhook" UNIQUE ("connection_id");



ALTER TABLE ONLY "public"."calendar_event_mappings"
    ADD CONSTRAINT "unique_external_event" UNIQUE ("connection_id", "external_event_id");



ALTER TABLE ONLY "public"."calendar_event_mappings"
    ADD CONSTRAINT "unique_rowan_event_connection" UNIQUE ("rowan_event_id", "connection_id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "unique_user_badge_per_space" UNIQUE ("user_id", "space_id", "badge_id");



ALTER TABLE ONLY "public"."achievement_progress"
    ADD CONSTRAINT "unique_user_badge_progress" UNIQUE ("user_id", "space_id", "badge_id");



ALTER TABLE ONLY "public"."calendar_connections"
    ADD CONSTRAINT "unique_user_provider_space" UNIQUE ("user_id", "provider", "space_id");



ALTER TABLE ONLY "public"."upgrade_page_visits"
    ADD CONSTRAINT "upgrade_page_visits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_audit_log"
    ADD CONSTRAINT "user_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_calendar_preferences"
    ADD CONSTRAINT "user_calendar_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_feedback"
    ADD CONSTRAINT "user_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_notification_preferences"
    ADD CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_notification_preferences"
    ADD CONSTRAINT "user_notification_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_notification_preferences"
    ADD CONSTRAINT "user_notification_preferences_user_id_space_id_key" UNIQUE ("user_id", "space_id");



ALTER TABLE ONLY "public"."user_presence"
    ADD CONSTRAINT "user_presence_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_presence"
    ADD CONSTRAINT "user_presence_user_id_space_id_key" UNIQUE ("user_id", "space_id");



ALTER TABLE ONLY "public"."user_privacy_preferences"
    ADD CONSTRAINT "user_privacy_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_privacy_preferences"
    ADD CONSTRAINT "user_privacy_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_session_token_key" UNIQUE ("session_token");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voice_note_templates"
    ADD CONSTRAINT "voice_note_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voice_transcriptions"
    ADD CONSTRAINT "voice_transcriptions_pkey" PRIMARY KEY ("id");



CREATE INDEX "ai_usage_daily_date_cost_idx" ON "public"."ai_usage_daily" USING "btree" ("date", "estimated_cost_usd");



CREATE INDEX "ai_usage_daily_feature_source_idx" ON "public"."ai_usage_daily" USING "btree" ("feature_source", "date");



CREATE INDEX "ai_usage_daily_space_date_idx" ON "public"."ai_usage_daily" USING "btree" ("space_id", "date");



CREATE UNIQUE INDEX "ai_usage_daily_user_date_feature_idx" ON "public"."ai_usage_daily" USING "btree" ("user_id", "date", "feature_source");



CREATE INDEX "idx_account_deletion_requests_user_id" ON "public"."account_deletion_requests" USING "btree" ("user_id");



CREATE INDEX "idx_achievement_progress_badge_id" ON "public"."achievement_progress" USING "btree" ("badge_id");



CREATE INDEX "idx_achievement_progress_space_id" ON "public"."achievement_progress" USING "btree" ("space_id");



CREATE INDEX "idx_achievement_progress_user_space" ON "public"."achievement_progress" USING "btree" ("user_id", "space_id");



CREATE INDEX "idx_activity_log_space_id" ON "public"."activity_log" USING "btree" ("space_id");



CREATE INDEX "idx_activity_log_user_id" ON "public"."activity_log" USING "btree" ("user_id");



CREATE INDEX "idx_activity_logs_space" ON "public"."activity_logs" USING "btree" ("space_id");



CREATE INDEX "idx_activity_logs_user" ON "public"."activity_logs" USING "btree" ("user_id");



CREATE INDEX "idx_admin_audit_log_action" ON "public"."admin_audit_log" USING "btree" ("action");



CREATE INDEX "idx_admin_audit_log_admin_user" ON "public"."admin_audit_log" USING "btree" ("admin_user_id");



CREATE INDEX "idx_admin_audit_log_created_at" ON "public"."admin_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_admin_users_email" ON "public"."admin_users" USING "btree" ("email");



CREATE INDEX "idx_admin_users_last_login" ON "public"."admin_users" USING "btree" ("last_login");



CREATE INDEX "idx_admin_users_role" ON "public"."admin_users" USING "btree" ("role");



CREATE INDEX "idx_ai_conversations_last_message" ON "public"."ai_conversations" USING "btree" ("last_message_at" DESC);



CREATE INDEX "idx_ai_conversations_space" ON "public"."ai_conversations" USING "btree" ("space_id");



CREATE INDEX "idx_ai_conversations_user" ON "public"."ai_conversations" USING "btree" ("user_id");



CREATE INDEX "idx_ai_messages_conversation_id" ON "public"."ai_messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_ai_messages_created" ON "public"."ai_messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ai_messages_feedback" ON "public"."ai_messages" USING "btree" ("feedback") WHERE ("feedback" IS NOT NULL);



CREATE INDEX "idx_ai_usage_daily_user_date" ON "public"."ai_usage_daily" USING "btree" ("user_id", "date");



CREATE INDEX "idx_availability_blocks_user_id" ON "public"."availability_blocks" USING "btree" ("user_id");



CREATE INDEX "idx_bills_created_by" ON "public"."bills" USING "btree" ("created_by");



CREATE INDEX "idx_bills_linked_calendar_event" ON "public"."bills" USING "btree" ("linked_calendar_event_id") WHERE ("linked_calendar_event_id" IS NOT NULL);



CREATE INDEX "idx_bills_linked_calendar_event_id" ON "public"."bills" USING "btree" ("linked_calendar_event_id");



CREATE INDEX "idx_bills_linked_expense_id" ON "public"."bills" USING "btree" ("linked_expense_id");



CREATE INDEX "idx_bills_linked_reminder" ON "public"."bills" USING "btree" ("linked_reminder_id") WHERE ("linked_reminder_id" IS NOT NULL);



CREATE INDEX "idx_bills_space_status" ON "public"."bills" USING "btree" ("space_id", "status");



CREATE INDEX "idx_budget_categories_space_id" ON "public"."budget_categories" USING "btree" ("space_id");



CREATE INDEX "idx_budget_template_categories_template_id" ON "public"."budget_template_categories" USING "btree" ("template_id");



CREATE INDEX "idx_budgets_space_id" ON "public"."budgets" USING "btree" ("space_id");



CREATE INDEX "idx_calendar_connections_needs_sync" ON "public"."calendar_connections" USING "btree" ("provider", "next_sync_at") WHERE ("sync_status" = 'active'::"public"."sync_status_type");



CREATE INDEX "idx_calendar_connections_next_sync" ON "public"."calendar_connections" USING "btree" ("next_sync_at") WHERE ("sync_status" = 'active'::"public"."sync_status_type");



CREATE INDEX "idx_calendar_connections_provider" ON "public"."calendar_connections" USING "btree" ("provider");



CREATE INDEX "idx_calendar_connections_space_id" ON "public"."calendar_connections" USING "btree" ("space_id");



CREATE INDEX "idx_calendar_connections_sync_status" ON "public"."calendar_connections" USING "btree" ("sync_status") WHERE ("sync_status" <> 'disconnected'::"public"."sync_status_type");



CREATE INDEX "idx_calendar_connections_token_expiry" ON "public"."calendar_connections" USING "btree" ("token_expires_at") WHERE (("token_expires_at" IS NOT NULL) AND ("sync_status" <> 'disconnected'::"public"."sync_status_type"));



CREATE INDEX "idx_calendar_connections_user_id" ON "public"."calendar_connections" USING "btree" ("user_id");



CREATE INDEX "idx_calendar_connections_user_provider_active" ON "public"."calendar_connections" USING "btree" ("user_id", "provider", "sync_status") WHERE ("sync_status" = ANY (ARRAY['active'::"public"."sync_status_type", 'syncing'::"public"."sync_status_type"]));



CREATE INDEX "idx_calendar_connections_webhook_expiry" ON "public"."calendar_connections" USING "btree" ("webhook_expires_at") WHERE ("webhook_expires_at" IS NOT NULL);



CREATE INDEX "idx_calendar_sync_rowan_event_id" ON "public"."calendar_sync_map" USING "btree" ("rowan_event_id");



CREATE INDEX "idx_ccpa_do_not_sell_user_id" ON "public"."ccpa_do_not_sell" USING "btree" ("user_id");



CREATE INDEX "idx_ccpa_opt_out_user_id" ON "public"."ccpa_opt_out_status" USING "btree" ("user_id");



CREATE INDEX "idx_checkin_reactions_checkin_id" ON "public"."checkin_reactions" USING "btree" ("checkin_id");



CREATE INDEX "idx_checkin_reactions_from_user_id" ON "public"."checkin_reactions" USING "btree" ("from_user_id");



CREATE INDEX "idx_chore_calendar_events_chore" ON "public"."chore_calendar_events" USING "btree" ("chore_id");



CREATE INDEX "idx_chore_calendar_events_event" ON "public"."chore_calendar_events" USING "btree" ("event_id");



CREATE INDEX "idx_chore_calendar_events_synced" ON "public"."chore_calendar_events" USING "btree" ("is_synced") WHERE ("is_synced" = true);



CREATE INDEX "idx_chore_rotations_chore" ON "public"."chore_rotations" USING "btree" ("chore_id");



CREATE INDEX "idx_chore_rotations_created_by" ON "public"."chore_rotations" USING "btree" ("created_by");



CREATE INDEX "idx_chore_rotations_last_assigned_to" ON "public"."chore_rotations" USING "btree" ("last_assigned_to");



CREATE INDEX "idx_chores_assigned_to" ON "public"."chores" USING "btree" ("assigned_to");



CREATE INDEX "idx_chores_created_by" ON "public"."chores" USING "btree" ("created_by");



CREATE INDEX "idx_chores_rotation_id" ON "public"."chores" USING "btree" ("rotation_id");



CREATE INDEX "idx_chores_sort_order" ON "public"."chores" USING "btree" ("sort_order");



CREATE INDEX "idx_chores_space_id" ON "public"."chores" USING "btree" ("space_id");



CREATE INDEX "idx_comment_reactions_comment" ON "public"."task_comment_reactions" USING "btree" ("comment_id");



CREATE INDEX "idx_comment_reactions_user" ON "public"."task_comment_reactions" USING "btree" ("user_id");



CREATE INDEX "idx_comments_created_by" ON "public"."comments" USING "btree" ("created_by");



CREATE INDEX "idx_comments_deleted_by" ON "public"."comments" USING "btree" ("deleted_by");



CREATE INDEX "idx_comments_parent_comment_id" ON "public"."comments" USING "btree" ("parent_comment_id");



CREATE INDEX "idx_comments_space" ON "public"."comments" USING "btree" ("space_id");



CREATE INDEX "idx_compliance_events_log_created_at" ON "public"."compliance_events_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_compliance_events_log_type" ON "public"."compliance_events_log" USING "btree" ("event_type", "user_id");



CREATE INDEX "idx_compliance_events_log_user_id" ON "public"."compliance_events_log" USING "btree" ("user_id");



CREATE INDEX "idx_connection_mapping_lookup" ON "public"."calendar_event_mappings" USING "btree" ("connection_id", "external_event_id", "rowan_event_id");



CREATE INDEX "idx_conversations_archived" ON "public"."conversations" USING "btree" ("space_id", "is_archived");



CREATE INDEX "idx_conversations_space_id" ON "public"."conversations" USING "btree" ("space_id");



CREATE INDEX "idx_custom_categories_created_by" ON "public"."custom_categories" USING "btree" ("created_by");



CREATE INDEX "idx_custom_categories_parent_category_id" ON "public"."custom_categories" USING "btree" ("parent_category_id");



CREATE INDEX "idx_custom_categories_space" ON "public"."custom_categories" USING "btree" ("space_id");



CREATE INDEX "idx_daily_analytics_date" ON "public"."daily_analytics" USING "btree" ("date");



CREATE INDEX "idx_daily_checkins_space_date" ON "public"."daily_checkins" USING "btree" ("space_id", "date" DESC);



CREATE INDEX "idx_daily_checkins_user_date" ON "public"."daily_checkins" USING "btree" ("user_id", "date" DESC);



CREATE INDEX "idx_daily_checkins_user_id" ON "public"."daily_checkins" USING "btree" ("user_id");



CREATE INDEX "idx_daily_usage_date" ON "public"."daily_usage" USING "btree" ("date");



CREATE INDEX "idx_daily_usage_user_date" ON "public"."daily_usage" USING "btree" ("user_id", "date");



CREATE INDEX "idx_data_export_requests_user_id" ON "public"."data_export_requests" USING "btree" ("user_id");



CREATE INDEX "idx_data_processing_agreements_type" ON "public"."data_processing_agreements" USING "btree" ("agreement_type", "user_id");



CREATE INDEX "idx_data_processing_agreements_user_id" ON "public"."data_processing_agreements" USING "btree" ("user_id");



CREATE INDEX "idx_event_attachments_event_id" ON "public"."event_attachments" USING "btree" ("event_id");



CREATE INDEX "idx_event_attachments_space_id" ON "public"."event_attachments" USING "btree" ("space_id");



CREATE INDEX "idx_event_attachments_uploaded_by" ON "public"."event_attachments" USING "btree" ("uploaded_by");



CREATE INDEX "idx_event_audit_log_changed_by" ON "public"."event_audit_log" USING "btree" ("changed_by");



CREATE INDEX "idx_event_comments_event_id" ON "public"."event_comments" USING "btree" ("event_id");



CREATE INDEX "idx_event_comments_parent_comment_id" ON "public"."event_comments" USING "btree" ("parent_comment_id");



CREATE INDEX "idx_event_comments_space_id" ON "public"."event_comments" USING "btree" ("space_id");



CREATE INDEX "idx_event_comments_user_id" ON "public"."event_comments" USING "btree" ("user_id");



CREATE INDEX "idx_event_mappings_conflicts" ON "public"."calendar_event_mappings" USING "btree" ("has_conflict") WHERE ("has_conflict" = true);



CREATE INDEX "idx_event_mappings_connection" ON "public"."calendar_event_mappings" USING "btree" ("connection_id");



CREATE INDEX "idx_event_mappings_external_event" ON "public"."calendar_event_mappings" USING "btree" ("external_event_id");



CREATE INDEX "idx_event_mappings_has_conflict" ON "public"."calendar_event_mappings" USING "btree" ("connection_id", "has_conflict", "conflict_detected_at") WHERE ("has_conflict" = true);



CREATE INDEX "idx_event_mappings_last_synced" ON "public"."calendar_event_mappings" USING "btree" ("last_synced_at");



CREATE INDEX "idx_event_mappings_rowan_event" ON "public"."calendar_event_mappings" USING "btree" ("rowan_event_id");



CREATE INDEX "idx_event_mappings_stale" ON "public"."calendar_event_mappings" USING "btree" ("connection_id", "last_synced_at");



CREATE INDEX "idx_event_note_versions_edited_by" ON "public"."event_note_versions" USING "btree" ("edited_by");



CREATE INDEX "idx_event_note_versions_note_id" ON "public"."event_note_versions" USING "btree" ("note_id");



CREATE INDEX "idx_event_notes_event_id" ON "public"."event_notes" USING "btree" ("event_id");



CREATE INDEX "idx_event_notes_last_edited_by" ON "public"."event_notes" USING "btree" ("last_edited_by");



CREATE INDEX "idx_event_proposals_counter_proposal_id" ON "public"."event_proposals" USING "btree" ("counter_proposal_id");



CREATE INDEX "idx_event_proposals_created_event" ON "public"."event_proposals" USING "btree" ("created_event_id");



CREATE INDEX "idx_event_proposals_event_id" ON "public"."event_proposals" USING "btree" ("event_id");



CREATE INDEX "idx_event_proposals_proposed_by" ON "public"."event_proposals" USING "btree" ("proposed_by");



CREATE INDEX "idx_event_proposals_space_id" ON "public"."event_proposals" USING "btree" ("space_id");



CREATE INDEX "idx_event_proposals_status" ON "public"."event_proposals" USING "btree" ("status");



CREATE INDEX "idx_event_reminders_event_id" ON "public"."event_reminders" USING "btree" ("event_id");



CREATE INDEX "idx_event_share_links_event_id" ON "public"."event_share_links" USING "btree" ("event_id");



CREATE INDEX "idx_event_templates_created_by" ON "public"."event_templates" USING "btree" ("created_by");



CREATE INDEX "idx_event_templates_space" ON "public"."event_templates" USING "btree" ("space_id");



CREATE INDEX "idx_events_assigned_to" ON "public"."events" USING "btree" ("assigned_to");



CREATE INDEX "idx_events_created_by" ON "public"."events" USING "btree" ("created_by");



CREATE INDEX "idx_events_deleted_by" ON "public"."events" USING "btree" ("deleted_by");



CREATE INDEX "idx_events_expense_id" ON "public"."events" USING "btree" ("expense_id");



CREATE INDEX "idx_events_external_source" ON "public"."events" USING "btree" ("external_source") WHERE ("external_source" IS NOT NULL);



CREATE INDEX "idx_events_last_external_sync" ON "public"."events" USING "btree" ("last_external_sync") WHERE ("last_external_sync" IS NOT NULL);



CREATE INDEX "idx_events_linked_bill" ON "public"."events" USING "btree" ("linked_bill_id") WHERE ("linked_bill_id" IS NOT NULL);



CREATE INDEX "idx_events_space_id" ON "public"."events" USING "btree" ("space_id");



CREATE INDEX "idx_events_sync_eligible" ON "public"."events" USING "btree" ("space_id", "updated_at") WHERE (("deleted_at" IS NULL) AND ("sync_locked" = false));



CREATE INDEX "idx_events_sync_locked" ON "public"."events" USING "btree" ("sync_locked") WHERE ("sync_locked" = true);



CREATE INDEX "idx_events_unmapped" ON "public"."events" USING "btree" ("space_id", "created_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_expense_splits_expense" ON "public"."expense_splits" USING "btree" ("expense_id");



CREATE INDEX "idx_expense_splits_status" ON "public"."expense_splits" USING "btree" ("status");



CREATE INDEX "idx_expense_splits_user" ON "public"."expense_splits" USING "btree" ("user_id");



CREATE INDEX "idx_expense_tags_expense" ON "public"."expense_tags" USING "btree" ("expense_id");



CREATE INDEX "idx_expense_tags_tag_id" ON "public"."expense_tags" USING "btree" ("tag_id");



CREATE INDEX "idx_expenses_archived" ON "public"."expenses" USING "btree" ("archived") WHERE ("archived" = true);



CREATE INDEX "idx_expenses_due_date" ON "public"."expenses" USING "btree" ("due_date");



CREATE INDEX "idx_expenses_event_id" ON "public"."expenses" USING "btree" ("event_id");



CREATE INDEX "idx_expenses_line_item_id" ON "public"."expenses" USING "btree" ("line_item_id");



CREATE INDEX "idx_expenses_ownership" ON "public"."expenses" USING "btree" ("ownership");



CREATE INDEX "idx_expenses_paid_by" ON "public"."expenses" USING "btree" ("paid_by");



CREATE INDEX "idx_expenses_project_id" ON "public"."expenses" USING "btree" ("project_id");



CREATE INDEX "idx_expenses_receipt_id" ON "public"."expenses" USING "btree" ("receipt_id");



CREATE INDEX "idx_expenses_space_id" ON "public"."expenses" USING "btree" ("space_id");



CREATE INDEX "idx_expenses_split" ON "public"."expenses" USING "btree" ("is_split") WHERE ("is_split" = true);



CREATE INDEX "idx_expenses_vendor_id" ON "public"."expenses" USING "btree" ("vendor_id");



CREATE INDEX "idx_external_calendar_user_id" ON "public"."external_calendar_connections" USING "btree" ("user_id");



CREATE INDEX "idx_feature_events_action" ON "public"."feature_events" USING "btree" ("action");



CREATE INDEX "idx_feature_events_created" ON "public"."feature_events" USING "btree" ("created_at");



CREATE INDEX "idx_feature_events_created_at" ON "public"."feature_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_feature_events_device" ON "public"."feature_events" USING "btree" ("device_type");



CREATE INDEX "idx_feature_events_feature" ON "public"."feature_events" USING "btree" ("feature");



CREATE INDEX "idx_feature_events_feature_created" ON "public"."feature_events" USING "btree" ("feature", "created_at");



CREATE INDEX "idx_feature_events_user" ON "public"."feature_events" USING "btree" ("user_id");



CREATE INDEX "idx_feature_usage_daily_date" ON "public"."feature_usage_daily" USING "btree" ("date");



CREATE INDEX "idx_feature_usage_daily_date_feature" ON "public"."feature_usage_daily" USING "btree" ("date", "feature");



CREATE INDEX "idx_feature_usage_daily_feature" ON "public"."feature_usage_daily" USING "btree" ("feature");



CREATE INDEX "idx_generated_reports_generated_by" ON "public"."generated_reports" USING "btree" ("generated_by");



CREATE INDEX "idx_generated_reports_space_id" ON "public"."generated_reports" USING "btree" ("space_id");



CREATE INDEX "idx_generated_reports_template_id" ON "public"."generated_reports" USING "btree" ("template_id");



CREATE INDEX "idx_goal_activities_check_in_id" ON "public"."goal_activities" USING "btree" ("check_in_id");



CREATE INDEX "idx_goal_activities_goal_id" ON "public"."goal_activities" USING "btree" ("goal_id");



CREATE INDEX "idx_goal_activities_milestone_id" ON "public"."goal_activities" USING "btree" ("milestone_id");



CREATE INDEX "idx_goal_activities_space_id" ON "public"."goal_activities" USING "btree" ("space_id");



CREATE INDEX "idx_goal_activities_user_id" ON "public"."goal_activities" USING "btree" ("user_id");



CREATE INDEX "idx_goal_check_in_photos_check_in_id" ON "public"."goal_check_in_photos" USING "btree" ("check_in_id");



CREATE INDEX "idx_goal_check_in_photos_order" ON "public"."goal_check_in_photos" USING "btree" ("check_in_id", "order_index");



CREATE INDEX "idx_goal_check_in_reactions_check_in_id" ON "public"."goal_check_in_reactions" USING "btree" ("check_in_id");



CREATE INDEX "idx_goal_check_in_reactions_created_at" ON "public"."goal_check_in_reactions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_goal_check_in_reactions_emoji" ON "public"."goal_check_in_reactions" USING "btree" ("emoji");



CREATE INDEX "idx_goal_check_in_reactions_user_id" ON "public"."goal_check_in_reactions" USING "btree" ("user_id");



CREATE INDEX "idx_goal_check_in_reminders_completed" ON "public"."goal_check_in_reminders" USING "btree" ("completed");



CREATE INDEX "idx_goal_check_in_reminders_goal_id" ON "public"."goal_check_in_reminders" USING "btree" ("goal_id");



CREATE INDEX "idx_goal_check_in_reminders_notification_sent" ON "public"."goal_check_in_reminders" USING "btree" ("notification_sent");



CREATE INDEX "idx_goal_check_in_reminders_scheduled_for" ON "public"."goal_check_in_reminders" USING "btree" ("scheduled_for");



CREATE INDEX "idx_goal_check_in_reminders_user_id" ON "public"."goal_check_in_reminders" USING "btree" ("user_id");



CREATE INDEX "idx_goal_check_in_settings_goal_id" ON "public"."goal_check_in_settings" USING "btree" ("goal_id");



CREATE INDEX "idx_goal_check_in_settings_user_id" ON "public"."goal_check_in_settings" USING "btree" ("user_id");



CREATE INDEX "idx_goal_check_ins_created_at" ON "public"."goal_check_ins" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_goal_check_ins_goal_id" ON "public"."goal_check_ins" USING "btree" ("goal_id");



CREATE INDEX "idx_goal_check_ins_mood" ON "public"."goal_check_ins" USING "btree" ("mood");



CREATE INDEX "idx_goal_check_ins_user_id" ON "public"."goal_check_ins" USING "btree" ("user_id");



CREATE INDEX "idx_goal_check_ins_voice_category" ON "public"."goal_check_ins" USING "btree" ("voice_note_category");



CREATE INDEX "idx_goal_check_ins_voice_template" ON "public"."goal_check_ins" USING "btree" ("voice_note_template_id");



CREATE INDEX "idx_goal_collaborators_goal_id" ON "public"."goal_collaborators" USING "btree" ("goal_id");



CREATE INDEX "idx_goal_collaborators_invited_by" ON "public"."goal_collaborators" USING "btree" ("invited_by");



CREATE INDEX "idx_goal_collaborators_user_id" ON "public"."goal_collaborators" USING "btree" ("user_id");



CREATE INDEX "idx_goal_comment_reactions_comment_id" ON "public"."goal_comment_reactions" USING "btree" ("comment_id");



CREATE INDEX "idx_goal_comment_reactions_user_id" ON "public"."goal_comment_reactions" USING "btree" ("user_id");



CREATE INDEX "idx_goal_comments_created_at" ON "public"."goal_comments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_goal_comments_goal_id" ON "public"."goal_comments" USING "btree" ("goal_id");



CREATE INDEX "idx_goal_comments_parent" ON "public"."goal_comments" USING "btree" ("parent_comment_id");



CREATE INDEX "idx_goal_comments_user_id" ON "public"."goal_comments" USING "btree" ("user_id");



CREATE INDEX "idx_goal_contributions_created_by" ON "public"."goal_contributions" USING "btree" ("created_by");



CREATE INDEX "idx_goal_contributions_expense_id" ON "public"."goal_contributions" USING "btree" ("expense_id");



CREATE INDEX "idx_goal_contributions_goal" ON "public"."goal_contributions" USING "btree" ("goal_id");



CREATE INDEX "idx_goal_contributions_user" ON "public"."goal_contributions" USING "btree" ("user_id");



CREATE INDEX "idx_goal_dependencies_bypassed_by" ON "public"."goal_dependencies" USING "btree" ("bypassed_by");



CREATE INDEX "idx_goal_dependencies_chain" ON "public"."goal_dependencies" USING "btree" ("space_id", "goal_id", "depends_on_goal_id");



CREATE INDEX "idx_goal_dependencies_created_by" ON "public"."goal_dependencies" USING "btree" ("created_by");



CREATE INDEX "idx_goal_dependencies_depends_on_goal_id" ON "public"."goal_dependencies" USING "btree" ("depends_on_goal_id");



CREATE INDEX "idx_goal_dependencies_goal_id" ON "public"."goal_dependencies" USING "btree" ("goal_id");



CREATE INDEX "idx_goal_mentions_mentioned_user" ON "public"."goal_mentions" USING "btree" ("mentioned_user_id");



CREATE INDEX "idx_goal_mentions_unread" ON "public"."goal_mentions" USING "btree" ("mentioned_user_id", "is_read") WHERE (NOT "is_read");



CREATE INDEX "idx_goal_milestones_goal_id" ON "public"."goal_milestones" USING "btree" ("goal_id");



CREATE INDEX "idx_goal_nudge_tracking_user_id" ON "public"."goal_nudge_tracking" USING "btree" ("user_id");



CREATE INDEX "idx_goal_tags_goal" ON "public"."goal_tags" USING "btree" ("goal_id");



CREATE INDEX "idx_goal_tags_tag_id" ON "public"."goal_tags" USING "btree" ("tag_id");



CREATE INDEX "idx_goal_templates_category" ON "public"."goal_templates" USING "btree" ("category");



CREATE INDEX "idx_goal_templates_created_by" ON "public"."goal_templates" USING "btree" ("created_by");



CREATE INDEX "idx_goal_templates_public" ON "public"."goal_templates" USING "btree" ("is_public");



CREATE INDEX "idx_goal_updates_goal_id" ON "public"."goal_updates" USING "btree" ("goal_id");



CREATE INDEX "idx_goal_updates_user_id" ON "public"."goal_updates" USING "btree" ("user_id");



CREATE INDEX "idx_goals_assigned_to" ON "public"."goals" USING "btree" ("assigned_to");



CREATE INDEX "idx_goals_created_by" ON "public"."goals" USING "btree" ("created_by");



CREATE INDEX "idx_goals_priority_order" ON "public"."goals" USING "btree" ("space_id", "is_pinned" DESC, "priority_order");



CREATE INDEX "idx_goals_space_assigned" ON "public"."goals" USING "btree" ("space_id", "assigned_to");



CREATE INDEX "idx_goals_space_id" ON "public"."goals" USING "btree" ("space_id");



CREATE INDEX "idx_goals_template_id" ON "public"."goals" USING "btree" ("template_id");



CREATE INDEX "idx_habit_analytics_period_type" ON "public"."habit_analytics" USING "btree" ("period_type");



CREATE INDEX "idx_habit_entries_entry_date" ON "public"."habit_entries" USING "btree" ("entry_date");



CREATE INDEX "idx_habit_entries_user_id" ON "public"."habit_entries" USING "btree" ("user_id");



CREATE INDEX "idx_habit_streaks_is_active" ON "public"."habit_streaks" USING "btree" ("is_active");



CREATE INDEX "idx_in_app_notifications_sender_id" ON "public"."in_app_notifications" USING "btree" ("sender_id");



CREATE INDEX "idx_in_app_notifs_space" ON "public"."in_app_notifications" USING "btree" ("space_id");



CREATE INDEX "idx_in_app_notifs_unread" ON "public"."in_app_notifications" USING "btree" ("user_id", "is_read") WHERE ("is_read" = false);



CREATE INDEX "idx_in_app_notifs_user_created" ON "public"."in_app_notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_in_app_notifs_user_type_unread" ON "public"."in_app_notifications" USING "btree" ("user_id", "type", "is_read");



CREATE INDEX "idx_late_penalties_chore" ON "public"."late_penalties" USING "btree" ("chore_id");



CREATE INDEX "idx_late_penalties_created" ON "public"."late_penalties" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_late_penalties_space" ON "public"."late_penalties" USING "btree" ("space_id");



CREATE INDEX "idx_late_penalties_user" ON "public"."late_penalties" USING "btree" ("user_id");



CREATE INDEX "idx_launch_notifications_created" ON "public"."launch_notifications" USING "btree" ("created_at");



CREATE INDEX "idx_launch_notifications_created_at" ON "public"."launch_notifications" USING "btree" ("created_at" DESC);



COMMENT ON INDEX "public"."idx_launch_notifications_created_at" IS 'Optimizes date-range queries for notification stats';



CREATE INDEX "idx_launch_notifications_source" ON "public"."launch_notifications" USING "btree" ("source");



CREATE INDEX "idx_launch_notifications_subscribed" ON "public"."launch_notifications" USING "btree" ("subscribed") WHERE ("subscribed" = true);



COMMENT ON INDEX "public"."idx_launch_notifications_subscribed" IS 'Optimizes active subscriber counts';



CREATE INDEX "idx_meal_calendar_events_event" ON "public"."meal_calendar_events" USING "btree" ("event_id");



CREATE INDEX "idx_meal_calendar_events_meal" ON "public"."meal_calendar_events" USING "btree" ("meal_id");



CREATE INDEX "idx_meal_plan_tasks_task" ON "public"."meal_plan_tasks" USING "btree" ("task_id");



CREATE INDEX "idx_meal_plans_created_by" ON "public"."meal_plans" USING "btree" ("created_by");



CREATE INDEX "idx_meal_plans_recipe_id" ON "public"."meal_plans" USING "btree" ("recipe_id");



CREATE INDEX "idx_meal_plans_space_id" ON "public"."meal_plans" USING "btree" ("space_id");



CREATE INDEX "idx_meals_assigned_to" ON "public"."meals" USING "btree" ("assigned_to");



CREATE INDEX "idx_meals_recipe_id" ON "public"."meals" USING "btree" ("recipe_id");



CREATE INDEX "idx_meals_space_assigned" ON "public"."meals" USING "btree" ("space_id", "assigned_to");



CREATE INDEX "idx_meals_space_id" ON "public"."meals" USING "btree" ("space_id");



CREATE INDEX "idx_mentions_user" ON "public"."mentions" USING "btree" ("mentioned_user_id");



CREATE INDEX "idx_message_attachments_message_id" ON "public"."message_attachments" USING "btree" ("message_id");



CREATE INDEX "idx_message_attachments_uploaded_by" ON "public"."message_attachments" USING "btree" ("uploaded_by");



CREATE INDEX "idx_message_mentions_mentioned_by_user_id" ON "public"."message_mentions" USING "btree" ("mentioned_by_user_id");



CREATE INDEX "idx_message_mentions_mentioned_user" ON "public"."message_mentions" USING "btree" ("mentioned_user_id");



CREATE INDEX "idx_message_mentions_message_id" ON "public"."message_mentions" USING "btree" ("message_id");



CREATE INDEX "idx_message_mentions_space_id" ON "public"."message_mentions" USING "btree" ("space_id");



CREATE INDEX "idx_message_reactions_message_id" ON "public"."message_reactions" USING "btree" ("message_id");



CREATE INDEX "idx_message_reactions_user_id" ON "public"."message_reactions" USING "btree" ("user_id");



CREATE INDEX "idx_messages_conversation_id" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_parent_id" ON "public"."messages" USING "btree" ("parent_message_id");



CREATE INDEX "idx_messages_pinned" ON "public"."messages" USING "btree" ("conversation_id", "is_pinned", "pinned_at" DESC) WHERE ("is_pinned" = true);



CREATE INDEX "idx_messages_pinned_by" ON "public"."messages" USING "btree" ("pinned_by");



CREATE INDEX "idx_messages_sender_id" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_messages_space_id" ON "public"."messages" USING "btree" ("space_id");



CREATE INDEX "idx_messages_thread_id" ON "public"."messages" USING "btree" ("thread_id");



CREATE INDEX "idx_milestone_templates_template_id" ON "public"."milestone_templates" USING "btree" ("template_id");



CREATE INDEX "idx_notif_log_user_date" ON "public"."notification_log" USING "btree" ("user_id", "sent_at" DESC);



CREATE INDEX "idx_notification_interactions_notification_id" ON "public"."notification_interactions" USING "btree" ("notification_id");



CREATE INDEX "idx_notification_interactions_user_id" ON "public"."notification_interactions" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_notification_preferences_user" ON "public"."user_notification_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_space_id" ON "public"."notifications" USING "btree" ("space_id");



CREATE INDEX "idx_notifications_user_read" ON "public"."notifications" USING "btree" ("user_id", "read");



CREATE INDEX "idx_nudge_history_goal_id" ON "public"."nudge_history" USING "btree" ("goal_id");



CREATE INDEX "idx_nudge_history_space_id" ON "public"."nudge_history" USING "btree" ("space_id");



CREATE INDEX "idx_nudge_history_template_id" ON "public"."nudge_history" USING "btree" ("template_id");



CREATE INDEX "idx_nudge_history_user_id" ON "public"."nudge_history" USING "btree" ("user_id");



CREATE INDEX "idx_nudge_settings_space_id" ON "public"."nudge_settings" USING "btree" ("space_id");



CREATE INDEX "idx_partnership_balances_partnership" ON "public"."partnership_balances" USING "btree" ("partnership_id");



CREATE INDEX "idx_partnership_balances_space" ON "public"."partnership_balances" USING "btree" ("space_id");



CREATE INDEX "idx_point_transactions_created_at" ON "public"."point_transactions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_point_transactions_source" ON "public"."point_transactions" USING "btree" ("source_type", "source_id");



CREATE INDEX "idx_point_transactions_user_space" ON "public"."point_transactions" USING "btree" ("user_id", "space_id");



CREATE INDEX "idx_privacy_email_notifications_user_id" ON "public"."privacy_email_notifications" USING "btree" ("user_id");



CREATE INDEX "idx_privacy_preference_history_user_id" ON "public"."privacy_preference_history" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_privacy_settings" ON "public"."profiles" USING "gin" ("privacy_settings");



CREATE INDEX "idx_profiles_updated_at" ON "public"."profiles" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_project_line_items_project" ON "public"."project_line_items" USING "btree" ("project_id");



CREATE INDEX "idx_project_line_items_vendor_id" ON "public"."project_line_items" USING "btree" ("vendor_id");



CREATE INDEX "idx_project_photos_order" ON "public"."project_photos" USING "btree" ("project_id", "display_order");



CREATE INDEX "idx_project_photos_uploaded_by" ON "public"."project_photos" USING "btree" ("uploaded_by");



CREATE INDEX "idx_projects_created_by" ON "public"."projects" USING "btree" ("created_by");



CREATE INDEX "idx_proposal_votes_user_id" ON "public"."event_proposal_votes" USING "btree" ("user_id");



CREATE INDEX "idx_push_subs_user_id" ON "public"."push_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_push_subscriptions_space_id" ON "public"."push_subscriptions" USING "btree" ("space_id");



CREATE INDEX "idx_push_tokens_user_active" ON "public"."push_tokens" USING "btree" ("user_id") WHERE ("is_active" = true);



CREATE INDEX "idx_quick_action_usage_space" ON "public"."quick_action_usage" USING "btree" ("space_id", "used_at" DESC);



CREATE INDEX "idx_quick_action_usage_type" ON "public"."quick_action_usage" USING "btree" ("action_type", "used_at" DESC);



CREATE INDEX "idx_quick_action_usage_user" ON "public"."quick_action_usage" USING "btree" ("user_id", "used_at" DESC);



CREATE INDEX "idx_reactions_user" ON "public"."comment_reactions" USING "btree" ("user_id");



CREATE INDEX "idx_receipts_created_by" ON "public"."receipts" USING "btree" ("created_by");



CREATE INDEX "idx_receipts_expense_id" ON "public"."receipts" USING "btree" ("expense_id");



CREATE INDEX "idx_receipts_space_id" ON "public"."receipts" USING "btree" ("space_id");



CREATE INDEX "idx_recipes_created_by" ON "public"."recipes" USING "btree" ("created_by");



CREATE INDEX "idx_recipes_space_id" ON "public"."recipes" USING "btree" ("space_id");



CREATE INDEX "idx_recurring_event_exceptions_modified_event_id" ON "public"."recurring_event_exceptions" USING "btree" ("modified_event_id");



CREATE INDEX "idx_recurring_exceptions_series_id" ON "public"."recurring_event_exceptions" USING "btree" ("series_id");



CREATE INDEX "idx_recurring_goal_instances_goal_id" ON "public"."recurring_goal_instances" USING "btree" ("goal_id");



CREATE INDEX "idx_recurring_goal_instances_period_start" ON "public"."recurring_goal_instances" USING "btree" ("period_start");



CREATE INDEX "idx_recurring_goal_instances_status" ON "public"."recurring_goal_instances" USING "btree" ("status");



CREATE INDEX "idx_recurring_goal_templates_category" ON "public"."recurring_goal_templates" USING "btree" ("category");



CREATE INDEX "idx_recurring_goal_templates_created_by" ON "public"."recurring_goal_templates" USING "btree" ("created_by");



CREATE INDEX "idx_recurring_goal_templates_is_active" ON "public"."recurring_goal_templates" USING "btree" ("is_active");



CREATE INDEX "idx_recurring_goal_templates_recurrence_type" ON "public"."recurring_goal_templates" USING "btree" ("recurrence_type");



CREATE INDEX "idx_recurring_patterns_space" ON "public"."recurring_expense_patterns" USING "btree" ("space_id");



CREATE INDEX "idx_reminder_activities_reminder_time" ON "public"."reminder_activities" USING "btree" ("reminder_id", "created_at" DESC);



CREATE INDEX "idx_reminder_activities_user_id" ON "public"."reminder_activities" USING "btree" ("user_id");



CREATE INDEX "idx_reminder_attachments_reminder_id" ON "public"."reminder_attachments" USING "btree" ("reminder_id");



CREATE INDEX "idx_reminder_attachments_uploaded_by" ON "public"."reminder_attachments" USING "btree" ("uploaded_by");



CREATE INDEX "idx_reminder_comments_reminder_created" ON "public"."reminder_comments" USING "btree" ("reminder_id", "created_at" DESC);



CREATE INDEX "idx_reminder_comments_user_id" ON "public"."reminder_comments" USING "btree" ("user_id");



CREATE INDEX "idx_reminder_mentions_comment_id" ON "public"."reminder_mentions" USING "btree" ("comment_id");



CREATE INDEX "idx_reminder_mentions_mentioning_user" ON "public"."reminder_mentions" USING "btree" ("mentioning_user_id");



CREATE INDEX "idx_reminder_mentions_reminder_id" ON "public"."reminder_mentions" USING "btree" ("reminder_id");



CREATE INDEX "idx_reminder_mentions_user_reminder" ON "public"."reminder_mentions" USING "btree" ("mentioned_user_id", "reminder_id", "created_at" DESC);



CREATE INDEX "idx_reminder_notifications_goal_id" ON "public"."reminder_notifications" USING "btree" ("goal_id");



CREATE INDEX "idx_reminder_notifications_reminder_id" ON "public"."reminder_notifications" USING "btree" ("reminder_id");



CREATE INDEX "idx_reminder_notifications_user_unread" ON "public"."reminder_notifications" USING "btree" ("user_id", "is_read", "created_at" DESC);



CREATE INDEX "idx_reminder_templates_created_by" ON "public"."reminder_templates" USING "btree" ("created_by");



CREATE INDEX "idx_reminder_templates_space_usage" ON "public"."reminder_templates" USING "btree" ("space_id", "usage_count" DESC);



CREATE INDEX "idx_reminder_templates_usage_count" ON "public"."reminder_templates" USING "btree" ("usage_count" DESC);



CREATE INDEX "idx_reminders_assigned_to" ON "public"."reminders" USING "btree" ("assigned_to") WHERE ("assigned_to" IS NOT NULL);



CREATE INDEX "idx_reminders_created_by" ON "public"."reminders" USING "btree" ("created_by");



CREATE INDEX "idx_reminders_linked_bill" ON "public"."reminders" USING "btree" ("linked_bill_id") WHERE ("linked_bill_id" IS NOT NULL);



CREATE INDEX "idx_reminders_linked_bill_id" ON "public"."reminders" USING "btree" ("linked_bill_id");



CREATE INDEX "idx_reminders_snoozed_by" ON "public"."reminders" USING "btree" ("snoozed_by");



CREATE INDEX "idx_reminders_space_id" ON "public"."reminders" USING "btree" ("space_id");



CREATE INDEX "idx_report_favorites_report_id" ON "public"."report_favorites" USING "btree" ("report_id");



CREATE INDEX "idx_report_favorites_template_id" ON "public"."report_favorites" USING "btree" ("template_id");



CREATE INDEX "idx_report_schedules_created_by" ON "public"."report_schedules" USING "btree" ("created_by");



CREATE INDEX "idx_report_schedules_space_id" ON "public"."report_schedules" USING "btree" ("space_id");



CREATE INDEX "idx_report_schedules_template_id" ON "public"."report_schedules" USING "btree" ("template_id");



CREATE INDEX "idx_report_templates_created_by" ON "public"."report_templates" USING "btree" ("created_by");



CREATE INDEX "idx_report_templates_space_id" ON "public"."report_templates" USING "btree" ("space_id");



CREATE INDEX "idx_reward_points_user_space" ON "public"."reward_points" USING "btree" ("user_id", "space_id");



CREATE INDEX "idx_reward_redemptions_status" ON "public"."reward_redemptions" USING "btree" ("status") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_reward_redemptions_user" ON "public"."reward_redemptions" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_rewards_catalog_space" ON "public"."rewards_catalog" USING "btree" ("space_id") WHERE ("is_active" = true);



CREATE INDEX "idx_rewards_catalog_space_id" ON "public"."rewards_catalog" USING "btree" ("space_id");



CREATE INDEX "idx_settlements_date" ON "public"."settlements" USING "btree" ("settlement_date");



CREATE INDEX "idx_settlements_from_user" ON "public"."settlements" USING "btree" ("from_user_id");



CREATE INDEX "idx_settlements_space" ON "public"."settlements" USING "btree" ("space_id");



CREATE INDEX "idx_settlements_to_user" ON "public"."settlements" USING "btree" ("to_user_id");



CREATE INDEX "idx_shopping_calendar_event" ON "public"."shopping_calendar_events" USING "btree" ("event_id");



CREATE INDEX "idx_shopping_calendar_list" ON "public"."shopping_calendar_events" USING "btree" ("list_id");



CREATE INDEX "idx_shopping_items_added_by" ON "public"."shopping_items" USING "btree" ("added_by");



CREATE INDEX "idx_shopping_items_assigned_to" ON "public"."shopping_items" USING "btree" ("assigned_to");



CREATE INDEX "idx_shopping_items_list_id" ON "public"."shopping_items" USING "btree" ("list_id");



CREATE INDEX "idx_shopping_items_list_id_sort" ON "public"."shopping_items" USING "btree" ("list_id", "sort_order");



CREATE INDEX "idx_shopping_items_purchased_by" ON "public"."shopping_items" USING "btree" ("purchased_by");



CREATE INDEX "idx_shopping_items_recipe_id" ON "public"."shopping_items" USING "btree" ("recipe_id");



CREATE INDEX "idx_shopping_lists_created_by" ON "public"."shopping_lists" USING "btree" ("created_by");



CREATE INDEX "idx_shopping_lists_last_modified_by" ON "public"."shopping_lists" USING "btree" ("last_modified_by");



CREATE INDEX "idx_shopping_lists_space_id" ON "public"."shopping_lists" USING "btree" ("space_id");



CREATE INDEX "idx_shopping_reminders_item" ON "public"."shopping_reminders" USING "btree" ("item_id");



CREATE INDEX "idx_shopping_reminders_list" ON "public"."shopping_reminders" USING "btree" ("list_id");



CREATE INDEX "idx_shopping_reminders_reminder" ON "public"."shopping_reminders" USING "btree" ("reminder_id");



CREATE INDEX "idx_shopping_tasks_list" ON "public"."shopping_tasks" USING "btree" ("list_id");



CREATE INDEX "idx_shopping_tasks_source_recipe_id" ON "public"."shopping_tasks" USING "btree" ("source_recipe_id");



CREATE INDEX "idx_shopping_tasks_task" ON "public"."shopping_tasks" USING "btree" ("task_id");



CREATE INDEX "idx_shopping_templates_created_by" ON "public"."shopping_templates" USING "btree" ("created_by");



CREATE INDEX "idx_shopping_templates_space" ON "public"."shopping_templates" USING "btree" ("space_id");



CREATE INDEX "idx_space_invitations_invited_by" ON "public"."space_invitations" USING "btree" ("invited_by");



CREATE INDEX "idx_space_members_rls_optimization" ON "public"."space_members" USING "btree" ("space_id", "user_id");



CREATE INDEX "idx_space_members_space_id" ON "public"."space_members" USING "btree" ("space_id");



CREATE INDEX "idx_space_members_user_id" ON "public"."space_members" USING "btree" ("user_id");



CREATE INDEX "idx_space_members_user_space" ON "public"."space_members" USING "btree" ("user_id", "space_id");



CREATE INDEX "idx_spaces_created_by" ON "public"."spaces" USING "btree" ("created_by");



CREATE INDEX "idx_storage_usage_space" ON "public"."storage_usage" USING "btree" ("space_id");



CREATE INDEX "idx_storage_usage_total" ON "public"."storage_usage" USING "btree" ("total_bytes");



CREATE INDEX "idx_storage_warnings_type" ON "public"."storage_warnings" USING "btree" ("warning_type");



CREATE INDEX "idx_storage_warnings_user_space" ON "public"."storage_warnings" USING "btree" ("user_id", "space_id");



CREATE INDEX "idx_store_layouts_created_by" ON "public"."store_layouts" USING "btree" ("created_by");



CREATE INDEX "idx_store_layouts_space" ON "public"."store_layouts" USING "btree" ("space_id");



CREATE INDEX "idx_subscription_events_created_at" ON "public"."subscription_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_subscription_events_trigger_source" ON "public"."subscription_events" USING "btree" ("trigger_source");



CREATE INDEX "idx_subscription_events_type" ON "public"."subscription_events" USING "btree" ("event_type");



CREATE INDEX "idx_subscription_events_user_id" ON "public"."subscription_events" USING "btree" ("user_id");



CREATE INDEX "idx_subscriptions_polar_customer" ON "public"."subscriptions" USING "btree" ("polar_customer_id");



CREATE INDEX "idx_subscriptions_polar_subscription" ON "public"."subscriptions" USING "btree" ("polar_subscription_id");



CREATE INDEX "idx_subscriptions_status" ON "public"."subscriptions" USING "btree" ("status");



CREATE INDEX "idx_subscriptions_stripe_customer" ON "public"."subscriptions" USING "btree" ("stripe_customer_id");



CREATE INDEX "idx_subscriptions_tier" ON "public"."subscriptions" USING "btree" ("tier");



CREATE INDEX "idx_subscriptions_user_id" ON "public"."subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_subtasks_assigned_to" ON "public"."subtasks" USING "btree" ("assigned_to");



CREATE INDEX "idx_subtasks_completed_by" ON "public"."subtasks" USING "btree" ("completed_by");



CREATE INDEX "idx_subtasks_created_by" ON "public"."subtasks" USING "btree" ("created_by");



CREATE INDEX "idx_subtasks_sort_order" ON "public"."subtasks" USING "btree" ("parent_task_id", "sort_order");



CREATE INDEX "idx_sync_conflicts_analytics" ON "public"."calendar_sync_conflicts" USING "btree" ("winning_source", "resolution_strategy", "resolved_at") WHERE ("resolution_status" = 'resolved'::"public"."resolution_status");



CREATE INDEX "idx_sync_conflicts_connection" ON "public"."calendar_sync_conflicts" USING "btree" ("connection_id");



CREATE INDEX "idx_sync_conflicts_detected_at" ON "public"."calendar_sync_conflicts" USING "btree" ("detected_at" DESC);



CREATE INDEX "idx_sync_conflicts_mapping" ON "public"."calendar_sync_conflicts" USING "btree" ("mapping_id");



CREATE INDEX "idx_sync_conflicts_recent_unresolved" ON "public"."calendar_sync_conflicts" USING "btree" ("connection_id", "detected_at" DESC) WHERE ("resolution_status" = 'detected'::"public"."resolution_status");



CREATE INDEX "idx_sync_conflicts_status" ON "public"."calendar_sync_conflicts" USING "btree" ("resolution_status");



CREATE INDEX "idx_sync_conflicts_unresolved" ON "public"."calendar_sync_conflicts" USING "btree" ("detected_at") WHERE ("resolution_status" = 'detected'::"public"."resolution_status");



CREATE INDEX "idx_sync_logs_connection" ON "public"."calendar_sync_logs" USING "btree" ("connection_id");



CREATE INDEX "idx_sync_logs_connection_created" ON "public"."calendar_sync_logs" USING "btree" ("connection_id", "created_at" DESC);



CREATE INDEX "idx_sync_logs_created_at" ON "public"."calendar_sync_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_sync_logs_failed" ON "public"."calendar_sync_logs" USING "btree" ("connection_id", "started_at" DESC) WHERE ("status" = 'failed'::"public"."sync_log_status");



CREATE INDEX "idx_sync_logs_performance" ON "public"."calendar_sync_logs" USING "btree" ("sync_type", "completed_at", "duration_ms") WHERE ("status" = 'completed'::"public"."sync_log_status");



CREATE INDEX "idx_sync_logs_recent_by_connection" ON "public"."calendar_sync_logs" USING "btree" ("connection_id", "started_at" DESC, "status");



CREATE INDEX "idx_sync_logs_status" ON "public"."calendar_sync_logs" USING "btree" ("status");



CREATE INDEX "idx_sync_queue_connection" ON "public"."calendar_sync_queue" USING "btree" ("connection_id", "status");



CREATE INDEX "idx_sync_queue_event" ON "public"."calendar_sync_queue" USING "btree" ("event_id");



CREATE INDEX "idx_sync_queue_pending" ON "public"."calendar_sync_queue" USING "btree" ("priority", "created_at") WHERE ("status" = 'pending'::"public"."queue_status");



CREATE INDEX "idx_sync_queue_retry" ON "public"."calendar_sync_queue" USING "btree" ("next_retry_at") WHERE (("status" = 'failed'::"public"."queue_status") AND ("retry_count" < "max_retries"));



CREATE INDEX "idx_tags_created_by" ON "public"."tags" USING "btree" ("created_by");



CREATE INDEX "idx_tags_space" ON "public"."tags" USING "btree" ("space_id");



CREATE INDEX "idx_task_activity_log_task" ON "public"."task_activity_log" USING "btree" ("task_id", "created_at" DESC);



CREATE INDEX "idx_task_activity_log_user_id" ON "public"."task_activity_log" USING "btree" ("user_id");



CREATE INDEX "idx_task_approvals_approver" ON "public"."task_approvals" USING "btree" ("approver_id", "status");



CREATE INDEX "idx_task_approvals_requested_by" ON "public"."task_approvals" USING "btree" ("requested_by");



CREATE INDEX "idx_task_approvals_task" ON "public"."task_approvals" USING "btree" ("task_id");



CREATE INDEX "idx_task_assignments_assigned_by" ON "public"."task_assignments" USING "btree" ("assigned_by");



CREATE UNIQUE INDEX "idx_task_assignments_one_primary" ON "public"."task_assignments" USING "btree" ("task_id") WHERE ("is_primary" = true);



CREATE INDEX "idx_task_assignments_task" ON "public"."task_assignments" USING "btree" ("task_id");



CREATE INDEX "idx_task_assignments_user" ON "public"."task_assignments" USING "btree" ("user_id");



CREATE INDEX "idx_task_attachments_task" ON "public"."task_attachments" USING "btree" ("task_id");



CREATE INDEX "idx_task_attachments_uploaded_by" ON "public"."task_attachments" USING "btree" ("uploaded_by");



CREATE INDEX "idx_task_calendar_events_event" ON "public"."task_calendar_events" USING "btree" ("event_id");



CREATE INDEX "idx_task_calendar_events_task" ON "public"."task_calendar_events" USING "btree" ("task_id");



CREATE INDEX "idx_task_categories_created_by" ON "public"."task_categories" USING "btree" ("created_by");



CREATE INDEX "idx_task_categories_sort_order" ON "public"."task_categories" USING "btree" ("space_id", "sort_order");



CREATE INDEX "idx_task_comments_parent" ON "public"."task_comments" USING "btree" ("parent_comment_id");



CREATE INDEX "idx_task_comments_task" ON "public"."task_comments" USING "btree" ("task_id", "created_at" DESC);



CREATE INDEX "idx_task_comments_user" ON "public"."task_comments" USING "btree" ("user_id");



CREATE INDEX "idx_task_dependencies_created_by" ON "public"."task_dependencies" USING "btree" ("created_by");



CREATE INDEX "idx_task_dependencies_depends_on" ON "public"."task_dependencies" USING "btree" ("depends_on_task_id");



CREATE INDEX "idx_task_dependencies_task" ON "public"."task_dependencies" USING "btree" ("task_id");



CREATE INDEX "idx_task_handoffs_from_user" ON "public"."task_handoffs" USING "btree" ("from_user_id");



CREATE INDEX "idx_task_handoffs_performed_by" ON "public"."task_handoffs" USING "btree" ("performed_by");



CREATE INDEX "idx_task_handoffs_task" ON "public"."task_handoffs" USING "btree" ("task_id", "performed_at" DESC);



CREATE INDEX "idx_task_handoffs_to_user" ON "public"."task_handoffs" USING "btree" ("to_user_id");



CREATE INDEX "idx_task_reactions_task" ON "public"."task_reactions" USING "btree" ("task_id");



CREATE INDEX "idx_task_reactions_user" ON "public"."task_reactions" USING "btree" ("user_id");



CREATE INDEX "idx_task_reminders_created_by" ON "public"."task_reminders" USING "btree" ("created_by");



CREATE INDEX "idx_task_reminders_task" ON "public"."task_reminders" USING "btree" ("task_id");



CREATE INDEX "idx_task_reminders_user" ON "public"."task_reminders" USING "btree" ("user_id");



CREATE INDEX "idx_task_snooze_history_task" ON "public"."task_snooze_history" USING "btree" ("task_id", "created_at" DESC);



CREATE INDEX "idx_task_snooze_history_user" ON "public"."task_snooze_history" USING "btree" ("snoozed_by");



CREATE INDEX "idx_task_stats_space_month" ON "public"."task_stats" USING "btree" ("space_id", "month");



CREATE INDEX "idx_task_tags_tag_id" ON "public"."task_tags" USING "btree" ("tag_id");



CREATE INDEX "idx_task_tags_task" ON "public"."task_tags" USING "btree" ("task_id");



CREATE INDEX "idx_task_templates_created_by" ON "public"."task_templates" USING "btree" ("created_by");



CREATE INDEX "idx_task_templates_default_assigned_to" ON "public"."task_templates" USING "btree" ("default_assigned_to");



CREATE INDEX "idx_task_templates_space" ON "public"."task_templates" USING "btree" ("space_id");



CREATE INDEX "idx_tasks_approved_by" ON "public"."tasks" USING "btree" ("approved_by");



CREATE INDEX "idx_tasks_archived" ON "public"."tasks" USING "btree" ("archived") WHERE ("archived" = true);



CREATE INDEX "idx_tasks_assigned_to" ON "public"."tasks" USING "btree" ("assigned_to");



CREATE INDEX "idx_tasks_created_by" ON "public"."tasks" USING "btree" ("created_by");



CREATE INDEX "idx_tasks_parent_recurrence" ON "public"."tasks" USING "btree" ("parent_recurrence_id") WHERE ("parent_recurrence_id" IS NOT NULL);



CREATE INDEX "idx_tasks_snoozed_by" ON "public"."tasks" USING "btree" ("snoozed_by");



CREATE INDEX "idx_tasks_space_id" ON "public"."tasks" USING "btree" ("space_id");



CREATE INDEX "idx_tasks_status_sort_order" ON "public"."tasks" USING "btree" ("space_id", "status", "sort_order");



CREATE INDEX "idx_time_entries_task" ON "public"."task_time_entries" USING "btree" ("task_id");



CREATE INDEX "idx_time_entries_user" ON "public"."task_time_entries" USING "btree" ("user_id");



CREATE INDEX "idx_typing_indicators_conversation_id" ON "public"."typing_indicators" USING "btree" ("conversation_id");



CREATE INDEX "idx_typing_indicators_last_typed_at" ON "public"."typing_indicators" USING "btree" ("last_typed_at");



CREATE INDEX "idx_typing_indicators_user_id" ON "public"."typing_indicators" USING "btree" ("user_id");



CREATE INDEX "idx_upgrade_visits_date" ON "public"."upgrade_page_visits" USING "btree" ("visited_at" DESC);



CREATE INDEX "idx_upgrade_visits_email" ON "public"."upgrade_page_visits" USING "btree" ("email");



CREATE INDEX "idx_user_achievements_badge_id" ON "public"."user_achievements" USING "btree" ("badge_id");



CREATE INDEX "idx_user_achievements_space_id" ON "public"."user_achievements" USING "btree" ("space_id");



CREATE INDEX "idx_user_achievements_user_space" ON "public"."user_achievements" USING "btree" ("user_id", "space_id");



CREATE INDEX "idx_user_audit_log_user_id" ON "public"."user_audit_log" USING "btree" ("user_id");



CREATE INDEX "idx_user_connection_stats" ON "public"."calendar_connections" USING "btree" ("user_id", "space_id", "provider", "sync_status", "last_sync_at");



CREATE INDEX "idx_user_feedback_category" ON "public"."user_feedback" USING "btree" ("category");



CREATE INDEX "idx_user_feedback_created_at" ON "public"."user_feedback" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_user_feedback_status" ON "public"."user_feedback" USING "btree" ("status");



CREATE INDEX "idx_user_feedback_user_id" ON "public"."user_feedback" USING "btree" ("user_id");



CREATE INDEX "idx_user_notification_preferences_space_id" ON "public"."user_notification_preferences" USING "btree" ("space_id");



CREATE INDEX "idx_user_notification_preferences_user_id" ON "public"."user_notification_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_user_presence_space_status" ON "public"."user_presence" USING "btree" ("space_id", "status");



CREATE INDEX "idx_user_privacy_preferences_user_id" ON "public"."user_privacy_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_user_progress_space_id" ON "public"."user_progress" USING "btree" ("space_id");



CREATE INDEX "idx_user_progress_user_id" ON "public"."user_progress" USING "btree" ("user_id");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_vendors_created_by" ON "public"."vendors" USING "btree" ("created_by");



CREATE INDEX "idx_vendors_space" ON "public"."vendors" USING "btree" ("space_id");



CREATE INDEX "idx_voice_note_templates_created_by" ON "public"."voice_note_templates" USING "btree" ("created_by");



CREATE INDEX "idx_voice_note_templates_is_active" ON "public"."voice_note_templates" USING "btree" ("is_active");



CREATE INDEX "idx_voice_note_templates_space_id" ON "public"."voice_note_templates" USING "btree" ("space_id");



CREATE INDEX "idx_voice_transcriptions_created_at" ON "public"."voice_transcriptions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_voice_transcriptions_goal_check_in_id" ON "public"."voice_transcriptions" USING "btree" ("goal_check_in_id");



CREATE INDEX "idx_voice_transcriptions_keywords" ON "public"."voice_transcriptions" USING "gin" ("keywords");



CREATE INDEX "idx_voice_transcriptions_transcription" ON "public"."voice_transcriptions" USING "gin" ("to_tsvector"('"english"'::"regconfig", "transcription"));



CREATE INDEX "idx_voice_transcriptions_user_id" ON "public"."voice_transcriptions" USING "btree" ("user_id");



CREATE INDEX "idx_webhook_subs_active" ON "public"."calendar_webhook_subscriptions" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_webhook_subs_activity" ON "public"."calendar_webhook_subscriptions" USING "btree" ("connection_id", "last_event_at" DESC) WHERE ("is_active" = true);



CREATE INDEX "idx_webhook_subs_connection" ON "public"."calendar_webhook_subscriptions" USING "btree" ("connection_id");



CREATE INDEX "idx_webhook_subs_expiring" ON "public"."calendar_webhook_subscriptions" USING "btree" ("expires_at") WHERE ("is_active" = true);



CREATE INDEX "idx_webhook_subs_webhook_id" ON "public"."calendar_webhook_subscriptions" USING "btree" ("webhook_id");



CREATE INDEX "projects_space_id_idx" ON "public"."projects" USING "btree" ("space_id");



CREATE INDEX "space_invitations_email_idx" ON "public"."space_invitations" USING "btree" ("email");



CREATE INDEX "space_invitations_space_id_idx" ON "public"."space_invitations" USING "btree" ("space_id");



CREATE UNIQUE INDEX "space_invitations_token_key" ON "public"."space_invitations" USING "btree" ("token");



CREATE INDEX "user_sessions_session_token_idx" ON "public"."user_sessions" USING "btree" ("session_token");



CREATE INDEX "user_sessions_user_id_idx" ON "public"."user_sessions" USING "btree" ("user_id");



CREATE OR REPLACE VIEW "public"."project_summary" WITH ("security_invoker"='true') AS
 SELECT "p"."id" AS "project_id",
    "p"."space_id",
    "p"."name",
    "p"."status",
    "p"."priority",
    "p"."estimated_budget",
    "p"."actual_cost",
    "p"."budget_variance",
    "p"."variance_percentage",
    "p"."start_date",
    "p"."estimated_completion_date",
    "p"."actual_completion_date",
    "count"(DISTINCT "pli"."id") AS "line_item_count",
    "count"(DISTINCT "e"."id") AS "expense_count",
    "count"(DISTINCT "pp"."id") AS "photo_count",
    "count"(DISTINCT "v"."id") AS "vendor_count",
    "array_agg"(DISTINCT "v"."name") FILTER (WHERE ("v"."name" IS NOT NULL)) AS "vendor_names",
    "p"."created_by",
    "p"."created_at",
    "p"."updated_at"
   FROM (((("public"."projects" "p"
     LEFT JOIN "public"."project_line_items" "pli" ON (("p"."id" = "pli"."project_id")))
     LEFT JOIN "public"."expenses" "e" ON (("p"."id" = "e"."project_id")))
     LEFT JOIN "public"."project_photos" "pp" ON (("p"."id" = "pp"."project_id")))
     LEFT JOIN "public"."vendors" "v" ON ((("pli"."vendor_id" = "v"."id") OR ("e"."vendor_id" = "v"."id"))))
  GROUP BY "p"."id";



CREATE OR REPLACE VIEW "public"."vendor_spend_summary" WITH ("security_invoker"='true') AS
 SELECT "v"."id" AS "vendor_id",
    "v"."space_id",
    "v"."name",
    "v"."company_name",
    "v"."trade",
    "v"."rating",
    "v"."is_preferred",
    "count"(DISTINCT "e"."project_id") AS "project_count",
    "count"(DISTINCT "e"."id") AS "expense_count",
    COALESCE("sum"("e"."amount"), (0)::numeric) AS "total_spent",
    "min"("e"."date") AS "first_transaction_date",
    "max"("e"."date") AS "last_transaction_date"
   FROM ("public"."vendors" "v"
     LEFT JOIN "public"."expenses" "e" ON (("v"."id" = "e"."vendor_id")))
  GROUP BY "v"."id";



CREATE OR REPLACE TRIGGER "achievement_badges_updated_at" BEFORE UPDATE ON "public"."achievement_badges" FOR EACH ROW EXECUTE FUNCTION "public"."update_achievement_badges_updated_at"();



CREATE OR REPLACE TRIGGER "achievement_progress_updated_at" BEFORE UPDATE ON "public"."achievement_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_achievement_progress_updated_at"();



CREATE OR REPLACE TRIGGER "auto_create_bill_event_trigger" AFTER INSERT ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."auto_create_bill_calendar_event"();



CREATE OR REPLACE TRIGGER "calculate_sync_log_duration" BEFORE UPDATE ON "public"."calendar_sync_logs" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_sync_duration"();



CREATE OR REPLACE TRIGGER "check_milestone_completion_on_update" AFTER UPDATE OF "current_amount" ON "public"."goals" FOR EACH ROW WHEN (("new"."current_amount" IS DISTINCT FROM "old"."current_amount")) EXECUTE FUNCTION "public"."check_milestone_completion"();



CREATE OR REPLACE TRIGGER "chore_calendar_events_updated_at_trigger" BEFORE UPDATE ON "public"."chore_calendar_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_chore_calendar_events_updated_at"();



CREATE OR REPLACE TRIGGER "chore_rotations_updated_at_trigger" BEFORE UPDATE ON "public"."chore_rotations" FOR EACH ROW EXECUTE FUNCTION "public"."update_chore_rotations_updated_at"();



CREATE OR REPLACE TRIGGER "comments_updated_at" BEFORE UPDATE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "create_goal_milestones_trigger" AFTER INSERT ON "public"."goals" FOR EACH ROW EXECUTE FUNCTION "public"."create_financial_goal_milestones"();



CREATE OR REPLACE TRIGGER "custom_categories_updated_at" BEFORE UPDATE ON "public"."custom_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_custom_categories_updated_at"();



CREATE OR REPLACE TRIGGER "daily_usage_updated_at" BEFORE UPDATE ON "public"."daily_usage" FOR EACH ROW EXECUTE FUNCTION "public"."update_daily_usage_updated_at"();



CREATE OR REPLACE TRIGGER "delete_bill_event_trigger" BEFORE DELETE ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."delete_bill_calendar_event"();



CREATE OR REPLACE TRIGGER "delete_calendar_event_for_meal_trigger" BEFORE DELETE ON "public"."meals" FOR EACH ROW EXECUTE FUNCTION "public"."delete_calendar_event_for_meal"();



CREATE OR REPLACE TRIGGER "event_comments_updated_at_trigger" BEFORE UPDATE ON "public"."event_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_event_comments_updated_at"();



CREATE OR REPLACE TRIGGER "event_proposal_votes_updated_at_trigger" BEFORE UPDATE ON "public"."event_proposal_votes" FOR EACH ROW EXECUTE FUNCTION "public"."update_event_proposals_updated_at"();



CREATE OR REPLACE TRIGGER "event_proposals_updated_at_trigger" BEFORE UPDATE ON "public"."event_proposals" FOR EACH ROW EXECUTE FUNCTION "public"."update_event_proposals_updated_at"();



CREATE OR REPLACE TRIGGER "expense_splits_auto_calculate" AFTER INSERT OR UPDATE ON "public"."expenses" FOR EACH ROW WHEN (("new"."is_split" = true)) EXECUTE FUNCTION "public"."trigger_calculate_splits"();



CREATE OR REPLACE TRIGGER "expense_splits_updated_at" BEFORE UPDATE ON "public"."expense_splits" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "goal_contributions_updated_at" BEFORE UPDATE ON "public"."goal_contributions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "goal_dependencies_updated_at" BEFORE UPDATE ON "public"."goal_dependencies" FOR EACH ROW EXECUTE FUNCTION "public"."update_goal_dependencies_updated_at"();



CREATE OR REPLACE TRIGGER "log_ccpa_preference_changes" AFTER UPDATE ON "public"."ccpa_do_not_sell" FOR EACH ROW EXECUTE FUNCTION "public"."log_compliance_event"();



CREATE OR REPLACE TRIGGER "log_privacy_preference_changes" AFTER UPDATE ON "public"."user_privacy_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."log_privacy_preference_change"();



CREATE OR REPLACE TRIGGER "log_reminder_change_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."reminders" FOR EACH ROW EXECUTE FUNCTION "public"."log_reminder_change"();



CREATE OR REPLACE TRIGGER "log_reminder_comment_activity_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."reminder_comments" FOR EACH ROW EXECUTE FUNCTION "public"."log_reminder_comment_activity"();



CREATE OR REPLACE TRIGGER "meal_calendar_events_updated_at_trigger" BEFORE UPDATE ON "public"."meal_calendar_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_meal_calendar_events_updated_at"();



CREATE OR REPLACE TRIGGER "meal_plan_tasks_uniqueness_trigger" BEFORE INSERT ON "public"."meal_plan_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."check_meal_plan_task_uniqueness"();



CREATE OR REPLACE TRIGGER "on_user_created_provision_workspace" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user_workspace_provisioning"();



COMMENT ON TRIGGER "on_user_created_provision_workspace" ON "public"."users" IS 'Trigger that fires after user insertion to auto-provision workspace.';



CREATE OR REPLACE TRIGGER "partnership_balances_updated_at" BEFORE UPDATE ON "public"."partnership_balances" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "project_line_items_updated_at" BEFORE UPDATE ON "public"."project_line_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "project_photos_updated_at" BEFORE UPDATE ON "public"."project_photos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "projects_updated_at_trigger" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_projects_updated_at"();



CREATE OR REPLACE TRIGGER "receipts_updated_at" BEFORE UPDATE ON "public"."receipts" FOR EACH ROW EXECUTE FUNCTION "public"."update_receipts_updated_at"();



CREATE OR REPLACE TRIGGER "recurring_patterns_updated_at" BEFORE UPDATE ON "public"."recurring_expense_patterns" FOR EACH ROW EXECUTE FUNCTION "public"."update_recurring_patterns_updated_at"();



CREATE OR REPLACE TRIGGER "set_budgets_updated_at" BEFORE UPDATE ON "public"."budgets" FOR EACH ROW EXECUTE FUNCTION "public"."update_budgets_updated_at"();



CREATE OR REPLACE TRIGGER "set_chores_updated_at" BEFORE UPDATE ON "public"."chores" FOR EACH ROW EXECUTE FUNCTION "public"."update_chores_updated_at"();



CREATE OR REPLACE TRIGGER "set_daily_checkins_updated_at" BEFORE UPDATE ON "public"."daily_checkins" FOR EACH ROW EXECUTE FUNCTION "public"."update_daily_checkins_updated_at"();



CREATE OR REPLACE TRIGGER "set_event_attachments_updated_at" BEFORE UPDATE ON "public"."event_attachments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_event_comments_updated_at" BEFORE UPDATE ON "public"."event_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_event_proposal_votes_updated_at" BEFORE UPDATE ON "public"."event_proposal_votes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_event_proposals_updated_at" BEFORE UPDATE ON "public"."event_proposals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_expenses_updated_at" BEFORE UPDATE ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."update_expenses_updated_at"();



CREATE OR REPLACE TRIGGER "set_in_app_notifications_updated_at" BEFORE UPDATE ON "public"."in_app_notifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_in_app_notifications_updated_at"();



CREATE OR REPLACE TRIGGER "set_notification_read_at_trigger" BEFORE UPDATE ON "public"."in_app_notifications" FOR EACH ROW EXECUTE FUNCTION "public"."set_notification_read_at"();



CREATE OR REPLACE TRIGGER "set_projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_projects_updated_at"();



CREATE OR REPLACE TRIGGER "set_shopping_list_shared_at_secure" BEFORE UPDATE ON "public"."shopping_lists" FOR EACH ROW EXECUTE FUNCTION "public"."update_shared_at_secure"();



CREATE OR REPLACE TRIGGER "set_space_creator_trigger" BEFORE INSERT ON "public"."spaces" FOR EACH ROW EXECUTE FUNCTION "public"."set_space_creator"();



CREATE OR REPLACE TRIGGER "settlement_updates_balance" AFTER INSERT ON "public"."settlements" FOR EACH ROW EXECUTE FUNCTION "public"."update_partnership_balance_on_settlement"();



CREATE OR REPLACE TRIGGER "settlements_updated_at" BEFORE UPDATE ON "public"."settlements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "shopping_list_modified" BEFORE UPDATE ON "public"."shopping_lists" FOR EACH ROW EXECUTE FUNCTION "public"."update_shopping_list_modified"();



CREATE OR REPLACE TRIGGER "shopping_tasks_auto_times_trigger" BEFORE INSERT ON "public"."shopping_tasks" FOR EACH ROW WHEN (("new"."is_auto_created" = true)) EXECUTE FUNCTION "public"."set_shopping_task_auto_times"();



CREATE OR REPLACE TRIGGER "subscriptions_updated_at" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_subscriptions_updated_at"();



CREATE OR REPLACE TRIGGER "subtasks_completion_check_trigger" AFTER INSERT OR UPDATE OF "status" ON "public"."subtasks" FOR EACH ROW WHEN (("new"."status" = 'completed'::"text")) EXECUTE FUNCTION "public"."check_parent_task_completion"();



CREATE OR REPLACE TRIGGER "subtasks_updated_at_trigger" BEFORE UPDATE ON "public"."subtasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_subtasks_updated_at"();



CREATE OR REPLACE TRIGGER "sync_chore_to_calendar_on_insert" AFTER INSERT ON "public"."chores" FOR EACH ROW EXECUTE FUNCTION "public"."sync_chore_to_calendar"();



CREATE OR REPLACE TRIGGER "sync_chore_to_calendar_on_update" AFTER UPDATE ON "public"."chores" FOR EACH ROW EXECUTE FUNCTION "public"."sync_chore_to_calendar"();



CREATE OR REPLACE TRIGGER "sync_meal_to_calendar_on_insert" AFTER INSERT ON "public"."meals" FOR EACH ROW EXECUTE FUNCTION "public"."sync_meal_to_calendar"();



CREATE OR REPLACE TRIGGER "sync_meal_to_calendar_on_update" AFTER UPDATE ON "public"."meals" FOR EACH ROW EXECUTE FUNCTION "public"."sync_meal_to_calendar"();



CREATE OR REPLACE TRIGGER "tags_updated_at" BEFORE UPDATE ON "public"."tags" FOR EACH ROW EXECUTE FUNCTION "public"."update_custom_categories_updated_at"();



CREATE OR REPLACE TRIGGER "task_approvals_update_status_trigger" AFTER INSERT OR UPDATE OF "status" ON "public"."task_approvals" FOR EACH ROW EXECUTE FUNCTION "public"."update_task_approval_status"();



CREATE OR REPLACE TRIGGER "task_approvals_updated_at_trigger" BEFORE UPDATE ON "public"."task_approvals" FOR EACH ROW EXECUTE FUNCTION "public"."update_task_approvals_updated_at"();



CREATE OR REPLACE TRIGGER "task_assignments_sync_primary_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."task_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."sync_task_primary_assignment"();



CREATE OR REPLACE TRIGGER "task_attachments_type_flags_trigger" BEFORE INSERT OR UPDATE ON "public"."task_attachments" FOR EACH ROW EXECUTE FUNCTION "public"."set_attachment_type_flags"();



CREATE OR REPLACE TRIGGER "task_calendar_events_updated_at_trigger" BEFORE UPDATE ON "public"."task_calendar_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_task_calendar_events_updated_at"();



CREATE OR REPLACE TRIGGER "task_categories_updated_at_trigger" BEFORE UPDATE ON "public"."task_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_task_categories_updated_at"();



CREATE OR REPLACE TRIGGER "task_comments_count_trigger" AFTER INSERT OR DELETE ON "public"."task_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_task_comment_count"();



CREATE OR REPLACE TRIGGER "task_comments_updated_at_trigger" BEFORE UPDATE ON "public"."task_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_task_comments_updated_at"();



CREATE OR REPLACE TRIGGER "task_dependencies_circular_check_trigger" BEFORE INSERT OR UPDATE ON "public"."task_dependencies" FOR EACH ROW EXECUTE FUNCTION "public"."check_circular_dependency"();



CREATE OR REPLACE TRIGGER "task_dependencies_update_status_trigger" AFTER INSERT OR DELETE ON "public"."task_dependencies" FOR EACH ROW EXECUTE FUNCTION "public"."update_task_blocked_status"();



CREATE OR REPLACE TRIGGER "task_handoffs_count_trigger" AFTER INSERT ON "public"."task_handoffs" FOR EACH ROW EXECUTE FUNCTION "public"."update_task_handoff_count"();



CREATE OR REPLACE TRIGGER "task_reminders_calculate_time_trigger" BEFORE INSERT ON "public"."task_reminders" FOR EACH ROW WHEN (("new"."remind_at" IS NULL)) EXECUTE FUNCTION "public"."calculate_reminder_time"();



CREATE OR REPLACE TRIGGER "task_reminders_updated_at_trigger" BEFORE UPDATE ON "public"."task_reminders" FOR EACH ROW EXECUTE FUNCTION "public"."update_task_reminders_updated_at"();



CREATE OR REPLACE TRIGGER "task_templates_updated_at_trigger" BEFORE UPDATE ON "public"."task_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_task_templates_updated_at"();



CREATE OR REPLACE TRIGGER "tasks_activity_log_trigger" AFTER INSERT OR UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."log_task_changes"();



CREATE OR REPLACE TRIGGER "tasks_auto_complete_on_approval_trigger" BEFORE UPDATE OF "approval_status" ON "public"."tasks" FOR EACH ROW WHEN (("new"."approval_status" = 'approved'::"text")) EXECUTE FUNCTION "public"."auto_complete_on_approval"();



CREATE OR REPLACE TRIGGER "tasks_completion_update_blocked_trigger" AFTER UPDATE OF "status" ON "public"."tasks" FOR EACH ROW WHEN (("new"."status" = 'completed'::"text")) EXECUTE FUNCTION "public"."update_blocked_tasks_on_completion"();



CREATE OR REPLACE TRIGGER "tasks_handoff_tracking_trigger" AFTER UPDATE OF "assigned_to" ON "public"."tasks" FOR EACH ROW WHEN (("new"."assigned_to" IS DISTINCT FROM "old"."assigned_to")) EXECUTE FUNCTION "public"."record_task_handoff"();



CREATE OR REPLACE TRIGGER "tasks_snooze_tracking_trigger" BEFORE UPDATE OF "is_snoozed" ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."record_task_snooze"();



CREATE OR REPLACE TRIGGER "tasks_sort_order_trigger" BEFORE INSERT ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."assign_task_sort_order"();



CREATE OR REPLACE TRIGGER "tasks_sync_to_calendar_trigger" AFTER INSERT ON "public"."tasks" FOR EACH ROW WHEN (("new"."due_date" IS NOT NULL)) EXECUTE FUNCTION "public"."sync_task_to_calendar"();



CREATE OR REPLACE TRIGGER "tasks_update_calendar_event_trigger" AFTER UPDATE ON "public"."tasks" FOR EACH ROW WHEN ((("new"."due_date" IS NOT NULL) AND (("new"."due_date" <> "old"."due_date") OR ("new"."title" <> "old"."title")))) EXECUTE FUNCTION "public"."update_calendar_event_from_task"();



CREATE OR REPLACE TRIGGER "template_updated" BEFORE UPDATE ON "public"."shopping_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_template_timestamp"();



CREATE OR REPLACE TRIGGER "time_entries_duration_trigger" BEFORE INSERT OR UPDATE ON "public"."task_time_entries" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_time_entry_duration"();



CREATE OR REPLACE TRIGGER "time_entries_update_task_duration_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."task_time_entries" FOR EACH ROW EXECUTE FUNCTION "public"."update_task_actual_duration"();



CREATE OR REPLACE TRIGGER "time_entries_updated_at_trigger" BEFORE UPDATE ON "public"."task_time_entries" FOR EACH ROW EXECUTE FUNCTION "public"."update_time_entries_updated_at"();



CREATE OR REPLACE TRIGGER "track_item_history" AFTER UPDATE ON "public"."shopping_items" FOR EACH ROW EXECUTE FUNCTION "public"."track_shopping_item_history"();



CREATE OR REPLACE TRIGGER "trigger_add_goal_creator" AFTER INSERT ON "public"."goals" FOR EACH ROW EXECUTE FUNCTION "public"."add_goal_creator_as_collaborator"();



CREATE OR REPLACE TRIGGER "trigger_assign_goal_priority_order" BEFORE INSERT ON "public"."goals" FOR EACH ROW EXECUTE FUNCTION "public"."assign_goal_priority_order"();



CREATE OR REPLACE TRIGGER "trigger_bills_updated_at" BEFORE UPDATE ON "public"."bills" FOR EACH ROW EXECUTE FUNCTION "public"."update_bills_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_create_checkin_activity" AFTER INSERT ON "public"."goal_check_ins" FOR EACH ROW EXECUTE FUNCTION "public"."create_checkin_activity"();



CREATE OR REPLACE TRIGGER "trigger_create_checkin_reaction_activity" AFTER INSERT ON "public"."goal_check_in_reactions" FOR EACH ROW EXECUTE FUNCTION "public"."create_checkin_reaction_activity"();



CREATE OR REPLACE TRIGGER "trigger_create_goal_activity" AFTER INSERT OR UPDATE ON "public"."goals" FOR EACH ROW EXECUTE FUNCTION "public"."create_goal_activity"();



CREATE OR REPLACE TRIGGER "trigger_create_mention_notification" AFTER INSERT ON "public"."message_mentions" FOR EACH ROW EXECUTE FUNCTION "public"."create_mention_notification"();



CREATE OR REPLACE TRIGGER "trigger_create_milestone_activity" AFTER UPDATE ON "public"."goal_milestones" FOR EACH ROW EXECUTE FUNCTION "public"."create_milestone_activity"();



CREATE OR REPLACE TRIGGER "trigger_create_voice_transcription_entry" AFTER INSERT ON "public"."goal_check_ins" FOR EACH ROW EXECUTE FUNCTION "public"."create_voice_transcription_entry"();



CREATE OR REPLACE TRIGGER "trigger_extract_mentions" AFTER INSERT OR UPDATE OF "content" ON "public"."comments" FOR EACH ROW WHEN (("new"."is_deleted" = false)) EXECUTE FUNCTION "public"."extract_mentions_from_comment"();



CREATE OR REPLACE TRIGGER "trigger_increment_template_usage" AFTER INSERT ON "public"."goals" FOR EACH ROW EXECUTE FUNCTION "public"."increment_template_usage"();



CREATE OR REPLACE TRIGGER "trigger_log_comment_activity" AFTER INSERT OR DELETE OR UPDATE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."log_comment_activity"();



CREATE OR REPLACE TRIGGER "trigger_log_mention_activity" AFTER INSERT ON "public"."mentions" FOR EACH ROW EXECUTE FUNCTION "public"."log_mention_activity"();



CREATE OR REPLACE TRIGGER "trigger_log_reaction_activity" AFTER INSERT ON "public"."comment_reactions" FOR EACH ROW EXECUTE FUNCTION "public"."log_reaction_activity"();



CREATE OR REPLACE TRIGGER "trigger_mark_checkin_reminder_completed" AFTER INSERT ON "public"."goal_check_ins" FOR EACH ROW EXECUTE FUNCTION "public"."mark_checkin_reminder_completed"();



CREATE OR REPLACE TRIGGER "trigger_notifications_updated_at" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_notifications_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_queue_calendar_sync" AFTER INSERT OR DELETE OR UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."queue_calendar_sync_on_change"();



CREATE OR REPLACE TRIGGER "trigger_reward_points_updated_at" BEFORE UPDATE ON "public"."reward_points" FOR EACH ROW EXECUTE FUNCTION "public"."update_rewards_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_reward_redemptions_updated_at" BEFORE UPDATE ON "public"."reward_redemptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_rewards_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_rewards_catalog_updated_at" BEFORE UPDATE ON "public"."rewards_catalog" FOR EACH ROW EXECUTE FUNCTION "public"."update_rewards_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_schedule_checkin_reminders" AFTER INSERT OR UPDATE ON "public"."goal_check_in_settings" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_schedule_checkin_reminders"();



CREATE OR REPLACE TRIGGER "trigger_set_initial_next_due_date" BEFORE INSERT ON "public"."bills" FOR EACH ROW EXECUTE FUNCTION "public"."set_initial_next_due_date"();



CREATE OR REPLACE TRIGGER "trigger_set_pinned_at" BEFORE UPDATE ON "public"."messages" FOR EACH ROW WHEN (("old"."is_pinned" IS DISTINCT FROM "new"."is_pinned")) EXECUTE FUNCTION "public"."set_pinned_at"();



CREATE OR REPLACE TRIGGER "trigger_update_comment_reactions" AFTER INSERT OR DELETE ON "public"."goal_comment_reactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_comment_reaction_counts"();



CREATE OR REPLACE TRIGGER "trigger_update_conversation_last_message" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_last_message"();



CREATE OR REPLACE TRIGGER "trigger_update_goal_amount_on_delete" AFTER DELETE ON "public"."goal_contributions" FOR EACH ROW EXECUTE FUNCTION "public"."update_goal_current_amount"();



CREATE OR REPLACE TRIGGER "trigger_update_goal_amount_on_insert" AFTER INSERT ON "public"."goal_contributions" FOR EACH ROW EXECUTE FUNCTION "public"."update_goal_current_amount"();



CREATE OR REPLACE TRIGGER "trigger_update_goal_amount_on_update" AFTER UPDATE ON "public"."goal_contributions" FOR EACH ROW EXECUTE FUNCTION "public"."update_goal_current_amount"();



CREATE OR REPLACE TRIGGER "trigger_update_goal_progress" AFTER INSERT ON "public"."goal_check_ins" FOR EACH ROW EXECUTE FUNCTION "public"."update_goal_progress_from_checkin"();



CREATE OR REPLACE TRIGGER "trigger_update_goal_progress_from_checkin" AFTER INSERT OR UPDATE ON "public"."goal_check_ins" FOR EACH ROW EXECUTE FUNCTION "public"."update_goal_progress_from_checkin"();



CREATE OR REPLACE TRIGGER "trigger_update_habit_streaks" AFTER INSERT OR UPDATE ON "public"."habit_entries" FOR EACH ROW EXECUTE FUNCTION "public"."update_habit_streaks"();



CREATE OR REPLACE TRIGGER "trigger_update_line_item_cost_on_expense_delete" AFTER DELETE ON "public"."expenses" FOR EACH ROW WHEN (("old"."line_item_id" IS NOT NULL)) EXECUTE FUNCTION "public"."update_line_item_actual_cost"();



CREATE OR REPLACE TRIGGER "trigger_update_line_item_cost_on_expense_insert" AFTER INSERT ON "public"."expenses" FOR EACH ROW WHEN (("new"."line_item_id" IS NOT NULL)) EXECUTE FUNCTION "public"."update_line_item_actual_cost"();



CREATE OR REPLACE TRIGGER "trigger_update_line_item_cost_on_expense_update" AFTER UPDATE ON "public"."expenses" FOR EACH ROW WHEN ((("new"."line_item_id" IS NOT NULL) OR ("old"."line_item_id" IS NOT NULL))) EXECUTE FUNCTION "public"."update_line_item_actual_cost"();



CREATE OR REPLACE TRIGGER "trigger_update_project_cost_on_expense_delete" AFTER DELETE ON "public"."expenses" FOR EACH ROW WHEN (("old"."project_id" IS NOT NULL)) EXECUTE FUNCTION "public"."update_project_actual_cost"();



CREATE OR REPLACE TRIGGER "trigger_update_project_cost_on_expense_insert" AFTER INSERT ON "public"."expenses" FOR EACH ROW WHEN (("new"."project_id" IS NOT NULL)) EXECUTE FUNCTION "public"."update_project_actual_cost"();



CREATE OR REPLACE TRIGGER "trigger_update_project_cost_on_expense_update" AFTER UPDATE ON "public"."expenses" FOR EACH ROW WHEN ((("new"."project_id" IS NOT NULL) OR ("old"."project_id" IS NOT NULL))) EXECUTE FUNCTION "public"."update_project_actual_cost"();



CREATE OR REPLACE TRIGGER "trigger_update_thread_reply_count" AFTER INSERT OR DELETE ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_thread_reply_count"();



CREATE OR REPLACE TRIGGER "trigger_user_feedback_updated_at" BEFORE UPDATE ON "public"."user_feedback" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_feedback_updated_at"();



CREATE OR REPLACE TRIGGER "update_account_deletion_requests_updated_at" BEFORE UPDATE ON "public"."account_deletion_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_bill_event_trigger" AFTER UPDATE ON "public"."expenses" FOR EACH ROW WHEN ((("old"."description" IS DISTINCT FROM "new"."description") OR ("old"."amount" IS DISTINCT FROM "new"."amount") OR ("old"."date" IS DISTINCT FROM "new"."date") OR ("old"."recurring_frequency" IS DISTINCT FROM "new"."recurring_frequency") OR ("old"."is_recurring" IS DISTINCT FROM "new"."is_recurring") OR ("old"."recurring" IS DISTINCT FROM "new"."recurring"))) EXECUTE FUNCTION "public"."update_bill_calendar_event"();



CREATE OR REPLACE TRIGGER "update_calendar_connections_updated_at" BEFORE UPDATE ON "public"."calendar_connections" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_calendar_event_from_chore_trigger" AFTER UPDATE ON "public"."chores" FOR EACH ROW EXECUTE FUNCTION "public"."update_calendar_event_from_chore"();



CREATE OR REPLACE TRIGGER "update_calendar_event_from_meal_trigger" AFTER UPDATE ON "public"."meals" FOR EACH ROW EXECUTE FUNCTION "public"."update_calendar_event_from_meal"();



CREATE OR REPLACE TRIGGER "update_calendar_event_mappings_updated_at" BEFORE UPDATE ON "public"."calendar_event_mappings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_calendar_sync_conflicts_updated_at" BEFORE UPDATE ON "public"."calendar_sync_conflicts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_calendar_sync_queue_updated_at" BEFORE UPDATE ON "public"."calendar_sync_queue" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_calendar_webhook_subscriptions_updated_at" BEFORE UPDATE ON "public"."calendar_webhook_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ccpa_opt_out_status_updated_at" BEFORE UPDATE ON "public"."ccpa_opt_out_status" FOR EACH ROW EXECUTE FUNCTION "public"."update_ccpa_opt_out_updated_at"();



CREATE OR REPLACE TRIGGER "update_chores_updated_at" BEFORE UPDATE ON "public"."chores" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_daily_checkins_updated_at" BEFORE UPDATE ON "public"."daily_checkins" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_data_export_requests_updated_at" BEFORE UPDATE ON "public"."data_export_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_event_templates_updated_at" BEFORE UPDATE ON "public"."event_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_events_updated_at" BEFORE UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_expenses_updated_at" BEFORE UPDATE ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_goal_activities_updated_at" BEFORE UPDATE ON "public"."goal_activities" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_goal_check_in_settings_updated_at" BEFORE UPDATE ON "public"."goal_check_in_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_goal_check_ins_updated_at" BEFORE UPDATE ON "public"."goal_check_ins" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_goal_collaborators_updated_at" BEFORE UPDATE ON "public"."goal_collaborators" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_goal_comments_updated_at" BEFORE UPDATE ON "public"."goal_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_goal_dependencies" AFTER UPDATE ON "public"."goals" FOR EACH ROW EXECUTE FUNCTION "public"."update_goal_dependency_status"();



CREATE OR REPLACE TRIGGER "update_goal_milestones_updated_at" BEFORE UPDATE ON "public"."goal_milestones" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_goal_templates_updated_at" BEFORE UPDATE ON "public"."goal_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_goals_updated_at" BEFORE UPDATE ON "public"."goals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_meal_plans_updated_at" BEFORE UPDATE ON "public"."meal_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_messages_updated_at" BEFORE UPDATE ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_notification_preferences_updated_at" BEFORE UPDATE ON "public"."user_notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_push_tokens_updated_at" BEFORE UPDATE ON "public"."push_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_recipes_updated_at" BEFORE UPDATE ON "public"."recipes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_reminder_attachments_timestamp" BEFORE UPDATE ON "public"."reminder_attachments" FOR EACH ROW EXECUTE FUNCTION "public"."update_reminder_attachments_updated_at"();



CREATE OR REPLACE TRIGGER "update_reminder_comment_timestamp_trigger" BEFORE UPDATE ON "public"."reminder_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_reminder_comment_timestamp"();



CREATE OR REPLACE TRIGGER "update_reminder_template_timestamp_trigger" BEFORE UPDATE ON "public"."reminder_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_reminder_template_timestamp"();



CREATE OR REPLACE TRIGGER "update_reminders_updated_at" BEFORE UPDATE ON "public"."reminders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_shopping_items_updated_at" BEFORE UPDATE ON "public"."shopping_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_shopping_lists_updated_at" BEFORE UPDATE ON "public"."shopping_lists" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_spaces_updated_at" BEFORE UPDATE ON "public"."spaces" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_task_stats_updated_at_trigger" BEFORE UPDATE ON "public"."task_stats" FOR EACH ROW EXECUTE FUNCTION "public"."update_task_stats_updated_at"();



CREATE OR REPLACE TRIGGER "update_tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_privacy_preferences_updated_at" BEFORE UPDATE ON "public"."user_privacy_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_progress_updated_at" BEFORE UPDATE ON "public"."user_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "vendors_updated_at" BEFORE UPDATE ON "public"."vendors" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."account_deletion_requests"
    ADD CONSTRAINT "account_deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."achievement_progress"
    ADD CONSTRAINT "achievement_progress_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."achievement_badges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."achievement_progress"
    ADD CONSTRAINT "achievement_progress_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."achievement_progress"
    ADD CONSTRAINT "achievement_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_conversations"
    ADD CONSTRAINT "ai_conversations_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_conversations"
    ADD CONSTRAINT "ai_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_messages"
    ADD CONSTRAINT "ai_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_usage_daily"
    ADD CONSTRAINT "ai_usage_daily_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_usage_daily"
    ADD CONSTRAINT "ai_usage_daily_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_user_settings"
    ADD CONSTRAINT "ai_user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."availability_blocks"
    ADD CONSTRAINT "availability_blocks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_linked_calendar_event_id_fkey" FOREIGN KEY ("linked_calendar_event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_linked_expense_id_fkey" FOREIGN KEY ("linked_expense_id") REFERENCES "public"."expenses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_linked_reminder_id_fkey" FOREIGN KEY ("linked_reminder_id") REFERENCES "public"."reminders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budget_categories"
    ADD CONSTRAINT "budget_categories_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budget_template_categories"
    ADD CONSTRAINT "budget_template_categories_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."budget_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_connections"
    ADD CONSTRAINT "calendar_connections_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_connections"
    ADD CONSTRAINT "calendar_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_event_mappings"
    ADD CONSTRAINT "calendar_event_mappings_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "public"."calendar_connections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_event_mappings"
    ADD CONSTRAINT "calendar_event_mappings_rowan_event_id_fkey" FOREIGN KEY ("rowan_event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_sync_conflicts"
    ADD CONSTRAINT "calendar_sync_conflicts_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "public"."calendar_connections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_sync_conflicts"
    ADD CONSTRAINT "calendar_sync_conflicts_mapping_id_fkey" FOREIGN KEY ("mapping_id") REFERENCES "public"."calendar_event_mappings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_sync_conflicts"
    ADD CONSTRAINT "calendar_sync_conflicts_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."calendar_sync_logs"
    ADD CONSTRAINT "calendar_sync_logs_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "public"."calendar_connections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_sync_map"
    ADD CONSTRAINT "calendar_sync_map_rowan_event_id_fkey" FOREIGN KEY ("rowan_event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_sync_queue"
    ADD CONSTRAINT "calendar_sync_queue_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "public"."calendar_connections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_sync_queue"
    ADD CONSTRAINT "calendar_sync_queue_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_sync_queue"
    ADD CONSTRAINT "calendar_sync_queue_mapping_id_fkey" FOREIGN KEY ("mapping_id") REFERENCES "public"."calendar_event_mappings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."calendar_webhook_subscriptions"
    ADD CONSTRAINT "calendar_webhook_subscriptions_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "public"."calendar_connections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ccpa_do_not_sell"
    ADD CONSTRAINT "ccpa_do_not_sell_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ccpa_opt_out_status"
    ADD CONSTRAINT "ccpa_opt_out_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checkin_reactions"
    ADD CONSTRAINT "checkin_reactions_checkin_id_fkey" FOREIGN KEY ("checkin_id") REFERENCES "public"."daily_checkins"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checkin_reactions"
    ADD CONSTRAINT "checkin_reactions_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chore_calendar_events"
    ADD CONSTRAINT "chore_calendar_events_chore_id_fkey" FOREIGN KEY ("chore_id") REFERENCES "public"."chores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chore_calendar_events"
    ADD CONSTRAINT "chore_calendar_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chore_rotations"
    ADD CONSTRAINT "chore_rotations_chore_id_fkey" FOREIGN KEY ("chore_id") REFERENCES "public"."chores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chore_rotations"
    ADD CONSTRAINT "chore_rotations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chore_rotations"
    ADD CONSTRAINT "chore_rotations_last_assigned_to_fkey" FOREIGN KEY ("last_assigned_to") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "chores_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "chores_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "chores_rotation_id_fkey" FOREIGN KEY ("rotation_id") REFERENCES "public"."chore_rotations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "chores_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comment_reactions"
    ADD CONSTRAINT "comment_reactions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comment_reactions"
    ADD CONSTRAINT "comment_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."compliance_events_log"
    ADD CONSTRAINT "compliance_events_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."custom_categories"
    ADD CONSTRAINT "custom_categories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."custom_categories"
    ADD CONSTRAINT "custom_categories_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "public"."custom_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."custom_categories"
    ADD CONSTRAINT "custom_categories_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_checkins"
    ADD CONSTRAINT "daily_checkins_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_checkins"
    ADD CONSTRAINT "daily_checkins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_usage"
    ADD CONSTRAINT "daily_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."data_export_requests"
    ADD CONSTRAINT "data_export_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."data_processing_agreements"
    ADD CONSTRAINT "data_processing_agreements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deleted_accounts"
    ADD CONSTRAINT "deleted_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_attachments"
    ADD CONSTRAINT "event_attachments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_attachments"
    ADD CONSTRAINT "event_attachments_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_attachments"
    ADD CONSTRAINT "event_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."event_audit_log"
    ADD CONSTRAINT "event_audit_log_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."event_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."event_note_versions"
    ADD CONSTRAINT "event_note_versions_edited_by_fkey" FOREIGN KEY ("edited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."event_note_versions"
    ADD CONSTRAINT "event_note_versions_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "public"."event_notes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_notes"
    ADD CONSTRAINT "event_notes_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_notes"
    ADD CONSTRAINT "event_notes_last_edited_by_fkey" FOREIGN KEY ("last_edited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."event_proposal_votes"
    ADD CONSTRAINT "event_proposal_votes_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."event_proposals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_proposal_votes"
    ADD CONSTRAINT "event_proposal_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."event_proposals"
    ADD CONSTRAINT "event_proposals_counter_proposal_id_fkey" FOREIGN KEY ("counter_proposal_id") REFERENCES "public"."event_proposals"("id");



ALTER TABLE ONLY "public"."event_proposals"
    ADD CONSTRAINT "event_proposals_created_event_id_fkey" FOREIGN KEY ("created_event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_proposals"
    ADD CONSTRAINT "event_proposals_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_proposals"
    ADD CONSTRAINT "event_proposals_proposed_by_fkey" FOREIGN KEY ("proposed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."event_proposals"
    ADD CONSTRAINT "event_proposals_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_reminders"
    ADD CONSTRAINT "event_reminders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_share_links"
    ADD CONSTRAINT "event_share_links_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_templates"
    ADD CONSTRAINT "event_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_templates"
    ADD CONSTRAINT "event_templates_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_linked_bill_id_fkey" FOREIGN KEY ("linked_bill_id") REFERENCES "public"."bills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expense_splits"
    ADD CONSTRAINT "expense_splits_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expense_splits"
    ADD CONSTRAINT "expense_splits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expense_tags"
    ADD CONSTRAINT "expense_tags_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expense_tags"
    ADD CONSTRAINT "expense_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_line_item_id_fkey" FOREIGN KEY ("line_item_id") REFERENCES "public"."project_line_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."external_calendar_connections"
    ADD CONSTRAINT "external_calendar_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_events"
    ADD CONSTRAINT "feature_events_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feature_events"
    ADD CONSTRAINT "feature_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."late_penalties"
    ADD CONSTRAINT "fk_late_penalties_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."generated_reports"
    ADD CONSTRAINT "generated_reports_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."generated_reports"
    ADD CONSTRAINT "generated_reports_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."generated_reports"
    ADD CONSTRAINT "generated_reports_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."report_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_activities"
    ADD CONSTRAINT "goal_activities_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "public"."goal_check_ins"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_activities"
    ADD CONSTRAINT "goal_activities_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_activities"
    ADD CONSTRAINT "goal_activities_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "public"."goal_milestones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_activities"
    ADD CONSTRAINT "goal_activities_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_activities"
    ADD CONSTRAINT "goal_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_check_in_photos"
    ADD CONSTRAINT "goal_check_in_photos_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "public"."goal_check_ins"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_check_in_reactions"
    ADD CONSTRAINT "goal_check_in_reactions_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "public"."goal_check_ins"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_check_in_reactions"
    ADD CONSTRAINT "goal_check_in_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_check_in_reminders"
    ADD CONSTRAINT "goal_check_in_reminders_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_check_in_reminders"
    ADD CONSTRAINT "goal_check_in_reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_check_in_settings"
    ADD CONSTRAINT "goal_check_in_settings_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_check_in_settings"
    ADD CONSTRAINT "goal_check_in_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_check_ins"
    ADD CONSTRAINT "goal_check_ins_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_check_ins"
    ADD CONSTRAINT "goal_check_ins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_check_ins"
    ADD CONSTRAINT "goal_check_ins_voice_note_template_id_fkey" FOREIGN KEY ("voice_note_template_id") REFERENCES "public"."voice_note_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."goal_collaborators"
    ADD CONSTRAINT "goal_collaborators_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_collaborators"
    ADD CONSTRAINT "goal_collaborators_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."goal_collaborators"
    ADD CONSTRAINT "goal_collaborators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_comment_reactions"
    ADD CONSTRAINT "goal_comment_reactions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."goal_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_comment_reactions"
    ADD CONSTRAINT "goal_comment_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_comments"
    ADD CONSTRAINT "goal_comments_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_comments"
    ADD CONSTRAINT "goal_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."goal_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_comments"
    ADD CONSTRAINT "goal_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_contributions"
    ADD CONSTRAINT "goal_contributions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."goal_contributions"
    ADD CONSTRAINT "goal_contributions_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."goal_contributions"
    ADD CONSTRAINT "goal_contributions_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_contributions"
    ADD CONSTRAINT "goal_contributions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."goal_dependencies"
    ADD CONSTRAINT "goal_dependencies_bypassed_by_fkey" FOREIGN KEY ("bypassed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."goal_dependencies"
    ADD CONSTRAINT "goal_dependencies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."goal_dependencies"
    ADD CONSTRAINT "goal_dependencies_depends_on_goal_id_fkey" FOREIGN KEY ("depends_on_goal_id") REFERENCES "public"."goals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_dependencies"
    ADD CONSTRAINT "goal_dependencies_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_dependencies"
    ADD CONSTRAINT "goal_dependencies_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_mentions"
    ADD CONSTRAINT "goal_mentions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."goal_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_mentions"
    ADD CONSTRAINT "goal_mentions_mentioned_user_id_fkey" FOREIGN KEY ("mentioned_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_mentions"
    ADD CONSTRAINT "goal_mentions_mentioning_user_id_fkey" FOREIGN KEY ("mentioning_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_milestones"
    ADD CONSTRAINT "goal_milestones_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_nudge_tracking"
    ADD CONSTRAINT "goal_nudge_tracking_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_nudge_tracking"
    ADD CONSTRAINT "goal_nudge_tracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_tags"
    ADD CONSTRAINT "goal_tags_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_tags"
    ADD CONSTRAINT "goal_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_templates"
    ADD CONSTRAINT "goal_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."goal_updates"
    ADD CONSTRAINT "goal_updates_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_updates"
    ADD CONSTRAINT "goal_updates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."goal_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."habit_analytics"
    ADD CONSTRAINT "habit_analytics_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."recurring_goal_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."habit_analytics"
    ADD CONSTRAINT "habit_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."habit_entries"
    ADD CONSTRAINT "habit_entries_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."recurring_goal_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."habit_entries"
    ADD CONSTRAINT "habit_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."habit_streaks"
    ADD CONSTRAINT "habit_streaks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."recurring_goal_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."habit_streaks"
    ADD CONSTRAINT "habit_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."in_app_notifications"
    ADD CONSTRAINT "in_app_notifications_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."in_app_notifications"
    ADD CONSTRAINT "in_app_notifications_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."in_app_notifications"
    ADD CONSTRAINT "in_app_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."late_penalties"
    ADD CONSTRAINT "late_penalties_chore_id_fkey" FOREIGN KEY ("chore_id") REFERENCES "public"."chores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."late_penalties"
    ADD CONSTRAINT "late_penalties_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meal_calendar_events"
    ADD CONSTRAINT "meal_calendar_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meal_calendar_events"
    ADD CONSTRAINT "meal_calendar_events_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meal_plan_tasks"
    ADD CONSTRAINT "meal_plan_tasks_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meal_plan_tasks"
    ADD CONSTRAINT "meal_plan_tasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meal_plans"
    ADD CONSTRAINT "meal_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meal_plans"
    ADD CONSTRAINT "meal_plans_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meal_plans"
    ADD CONSTRAINT "meal_plans_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meals"
    ADD CONSTRAINT "meals_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meals"
    ADD CONSTRAINT "meals_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meals"
    ADD CONSTRAINT "meals_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mentions"
    ADD CONSTRAINT "mentions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mentions"
    ADD CONSTRAINT "mentions_mentioned_user_id_fkey" FOREIGN KEY ("mentioned_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_attachments"
    ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_attachments"
    ADD CONSTRAINT "message_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."message_mentions"
    ADD CONSTRAINT "message_mentions_mentioned_by_user_id_fkey" FOREIGN KEY ("mentioned_by_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_mentions"
    ADD CONSTRAINT "message_mentions_mentioned_user_id_fkey" FOREIGN KEY ("mentioned_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_mentions"
    ADD CONSTRAINT "message_mentions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_mentions"
    ADD CONSTRAINT "message_mentions_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_parent_message_id_fkey" FOREIGN KEY ("parent_message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pinned_by_fkey" FOREIGN KEY ("pinned_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."milestone_templates"
    ADD CONSTRAINT "milestone_templates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."goal_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_interactions"
    ADD CONSTRAINT "notification_interactions_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."in_app_notifications"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification_interactions"
    ADD CONSTRAINT "notification_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_log"
    ADD CONSTRAINT "notification_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nudge_history"
    ADD CONSTRAINT "nudge_history_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nudge_history"
    ADD CONSTRAINT "nudge_history_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nudge_history"
    ADD CONSTRAINT "nudge_history_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."nudge_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."nudge_history"
    ADD CONSTRAINT "nudge_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nudge_settings"
    ADD CONSTRAINT "nudge_settings_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nudge_settings"
    ADD CONSTRAINT "nudge_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partnership_balances"
    ADD CONSTRAINT "partnership_balances_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partnership_balances"
    ADD CONSTRAINT "partnership_balances_user1_id_fkey" FOREIGN KEY ("user1_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partnership_balances"
    ADD CONSTRAINT "partnership_balances_user2_id_fkey" FOREIGN KEY ("user2_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."point_transactions"
    ADD CONSTRAINT "point_transactions_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."point_transactions"
    ADD CONSTRAINT "point_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."privacy_email_notifications"
    ADD CONSTRAINT "privacy_email_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."privacy_preference_history"
    ADD CONSTRAINT "privacy_preference_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_line_items"
    ADD CONSTRAINT "project_line_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_line_items"
    ADD CONSTRAINT "project_line_items_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_photos"
    ADD CONSTRAINT "project_photos_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_photos"
    ADD CONSTRAINT "project_photos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quick_action_usage"
    ADD CONSTRAINT "quick_action_usage_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quick_action_usage"
    ADD CONSTRAINT "quick_action_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_event_exceptions"
    ADD CONSTRAINT "recurring_event_exceptions_modified_event_id_fkey" FOREIGN KEY ("modified_event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."recurring_event_exceptions"
    ADD CONSTRAINT "recurring_event_exceptions_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_expense_patterns"
    ADD CONSTRAINT "recurring_expense_patterns_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_goal_instances"
    ADD CONSTRAINT "recurring_goal_instances_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recurring_goal_instances"
    ADD CONSTRAINT "recurring_goal_instances_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."recurring_goal_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_goal_templates"
    ADD CONSTRAINT "recurring_goal_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_goal_templates"
    ADD CONSTRAINT "recurring_goal_templates_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminder_activities"
    ADD CONSTRAINT "reminder_activities_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "public"."reminders"("id") ON DELETE CASCADE DEFERRABLE;



ALTER TABLE ONLY "public"."reminder_activities"
    ADD CONSTRAINT "reminder_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL DEFERRABLE;



ALTER TABLE ONLY "public"."reminder_activities"
    ADD CONSTRAINT "reminder_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reminder_attachments"
    ADD CONSTRAINT "reminder_attachments_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "public"."reminders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminder_attachments"
    ADD CONSTRAINT "reminder_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminder_comments"
    ADD CONSTRAINT "reminder_comments_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "public"."reminders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminder_comments"
    ADD CONSTRAINT "reminder_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminder_mentions"
    ADD CONSTRAINT "reminder_mentions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."reminder_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminder_mentions"
    ADD CONSTRAINT "reminder_mentions_mentioned_user_id_fkey" FOREIGN KEY ("mentioned_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminder_mentions"
    ADD CONSTRAINT "reminder_mentions_mentioning_user_id_fkey" FOREIGN KEY ("mentioning_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminder_mentions"
    ADD CONSTRAINT "reminder_mentions_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "public"."reminders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminder_notifications"
    ADD CONSTRAINT "reminder_notifications_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminder_notifications"
    ADD CONSTRAINT "reminder_notifications_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "public"."reminders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminder_notifications"
    ADD CONSTRAINT "reminder_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminder_templates"
    ADD CONSTRAINT "reminder_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminder_templates"
    ADD CONSTRAINT "reminder_templates_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminders"
    ADD CONSTRAINT "reminders_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reminders"
    ADD CONSTRAINT "reminders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reminders"
    ADD CONSTRAINT "reminders_linked_bill_id_fkey" FOREIGN KEY ("linked_bill_id") REFERENCES "public"."bills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminders"
    ADD CONSTRAINT "reminders_snoozed_by_fkey" FOREIGN KEY ("snoozed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reminders"
    ADD CONSTRAINT "reminders_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_favorites"
    ADD CONSTRAINT "report_favorites_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."generated_reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_favorites"
    ADD CONSTRAINT "report_favorites_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."report_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_favorites"
    ADD CONSTRAINT "report_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_schedules"
    ADD CONSTRAINT "report_schedules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_schedules"
    ADD CONSTRAINT "report_schedules_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_schedules"
    ADD CONSTRAINT "report_schedules_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."report_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_templates"
    ADD CONSTRAINT "report_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."report_templates"
    ADD CONSTRAINT "report_templates_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reward_points"
    ADD CONSTRAINT "reward_points_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reward_points"
    ADD CONSTRAINT "reward_points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reward_redemptions"
    ADD CONSTRAINT "reward_redemptions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."reward_redemptions"
    ADD CONSTRAINT "reward_redemptions_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards_catalog"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reward_redemptions"
    ADD CONSTRAINT "reward_redemptions_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reward_redemptions"
    ADD CONSTRAINT "reward_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rewards_catalog"
    ADD CONSTRAINT "rewards_catalog_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."rewards_catalog"
    ADD CONSTRAINT "rewards_catalog_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."settlements"
    ADD CONSTRAINT "settlements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."settlements"
    ADD CONSTRAINT "settlements_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."settlements"
    ADD CONSTRAINT "settlements_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."settlements"
    ADD CONSTRAINT "settlements_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shopping_calendar_events"
    ADD CONSTRAINT "shopping_calendar_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shopping_calendar_events"
    ADD CONSTRAINT "shopping_calendar_events_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "public"."shopping_lists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shopping_item_history"
    ADD CONSTRAINT "shopping_item_history_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shopping_items"
    ADD CONSTRAINT "shopping_items_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shopping_items"
    ADD CONSTRAINT "shopping_items_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shopping_items"
    ADD CONSTRAINT "shopping_items_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "public"."shopping_lists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shopping_items"
    ADD CONSTRAINT "shopping_items_purchased_by_fkey" FOREIGN KEY ("purchased_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shopping_items"
    ADD CONSTRAINT "shopping_items_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shopping_lists"
    ADD CONSTRAINT "shopping_lists_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shopping_lists"
    ADD CONSTRAINT "shopping_lists_last_modified_by_fkey" FOREIGN KEY ("last_modified_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shopping_lists"
    ADD CONSTRAINT "shopping_lists_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shopping_reminders"
    ADD CONSTRAINT "shopping_reminders_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."shopping_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shopping_reminders"
    ADD CONSTRAINT "shopping_reminders_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "public"."shopping_lists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shopping_reminders"
    ADD CONSTRAINT "shopping_reminders_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "public"."reminders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shopping_tasks"
    ADD CONSTRAINT "shopping_tasks_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "public"."shopping_lists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shopping_tasks"
    ADD CONSTRAINT "shopping_tasks_source_recipe_id_fkey" FOREIGN KEY ("source_recipe_id") REFERENCES "public"."recipes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shopping_tasks"
    ADD CONSTRAINT "shopping_tasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shopping_templates"
    ADD CONSTRAINT "shopping_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shopping_templates"
    ADD CONSTRAINT "shopping_templates_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."space_invitations"
    ADD CONSTRAINT "space_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."space_invitations"
    ADD CONSTRAINT "space_invitations_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."space_members"
    ADD CONSTRAINT "space_members_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."space_members"
    ADD CONSTRAINT "space_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."spaces"
    ADD CONSTRAINT "spaces_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."spaces"
    ADD CONSTRAINT "spaces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."storage_usage"
    ADD CONSTRAINT "storage_usage_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."storage_warnings"
    ADD CONSTRAINT "storage_warnings_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."storage_warnings"
    ADD CONSTRAINT "storage_warnings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_layouts"
    ADD CONSTRAINT "store_layouts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."store_layouts"
    ADD CONSTRAINT "store_layouts_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_events"
    ADD CONSTRAINT "subscription_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subtasks"
    ADD CONSTRAINT "subtasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."subtasks"
    ADD CONSTRAINT "subtasks_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."subtasks"
    ADD CONSTRAINT "subtasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subtasks"
    ADD CONSTRAINT "subtasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_activity_log"
    ADD CONSTRAINT "task_activity_log_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_activity_log"
    ADD CONSTRAINT "task_activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."task_approvals"
    ADD CONSTRAINT "task_approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_approvals"
    ADD CONSTRAINT "task_approvals_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_approvals"
    ADD CONSTRAINT "task_approvals_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_assignments"
    ADD CONSTRAINT "task_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."task_assignments"
    ADD CONSTRAINT "task_assignments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_assignments"
    ADD CONSTRAINT "task_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_attachments"
    ADD CONSTRAINT "task_attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_attachments"
    ADD CONSTRAINT "task_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_calendar_events"
    ADD CONSTRAINT "task_calendar_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_calendar_events"
    ADD CONSTRAINT "task_calendar_events_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_categories"
    ADD CONSTRAINT "task_categories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_categories"
    ADD CONSTRAINT "task_categories_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_comment_reactions"
    ADD CONSTRAINT "task_comment_reactions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."task_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_comment_reactions"
    ADD CONSTRAINT "task_comment_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."task_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_dependencies"
    ADD CONSTRAINT "task_dependencies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_dependencies"
    ADD CONSTRAINT "task_dependencies_depends_on_task_id_fkey" FOREIGN KEY ("depends_on_task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_dependencies"
    ADD CONSTRAINT "task_dependencies_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_handoffs"
    ADD CONSTRAINT "task_handoffs_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."task_handoffs"
    ADD CONSTRAINT "task_handoffs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_handoffs"
    ADD CONSTRAINT "task_handoffs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_handoffs"
    ADD CONSTRAINT "task_handoffs_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_reactions"
    ADD CONSTRAINT "task_reactions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_reactions"
    ADD CONSTRAINT "task_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_reminders"
    ADD CONSTRAINT "task_reminders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_reminders"
    ADD CONSTRAINT "task_reminders_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_reminders"
    ADD CONSTRAINT "task_reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_snooze_history"
    ADD CONSTRAINT "task_snooze_history_snoozed_by_fkey" FOREIGN KEY ("snoozed_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_snooze_history"
    ADD CONSTRAINT "task_snooze_history_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_stats"
    ADD CONSTRAINT "task_stats_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_tags"
    ADD CONSTRAINT "task_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_tags"
    ADD CONSTRAINT "task_tags_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_templates"
    ADD CONSTRAINT "task_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_templates"
    ADD CONSTRAINT "task_templates_default_assigned_to_fkey" FOREIGN KEY ("default_assigned_to") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."task_templates"
    ADD CONSTRAINT "task_templates_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_time_entries"
    ADD CONSTRAINT "task_time_entries_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_time_entries"
    ADD CONSTRAINT "task_time_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_parent_recurrence_id_fkey" FOREIGN KEY ("parent_recurrence_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_snoozed_by_fkey" FOREIGN KEY ("snoozed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."typing_indicators"
    ADD CONSTRAINT "typing_indicators_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."typing_indicators"
    ADD CONSTRAINT "typing_indicators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."achievement_badges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_audit_log"
    ADD CONSTRAINT "user_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_calendar_preferences"
    ADD CONSTRAINT "user_calendar_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_feedback"
    ADD CONSTRAINT "user_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_notification_preferences"
    ADD CONSTRAINT "user_notification_preferences_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_notification_preferences"
    ADD CONSTRAINT "user_notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_presence"
    ADD CONSTRAINT "user_presence_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_presence"
    ADD CONSTRAINT "user_presence_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_privacy_preferences"
    ADD CONSTRAINT "user_privacy_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



COMMENT ON CONSTRAINT "user_progress_user_id_fkey" ON "public"."user_progress" IS 'Foreign key with CASCADE delete - updated 2025-10-11';



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voice_note_templates"
    ADD CONSTRAINT "voice_note_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voice_note_templates"
    ADD CONSTRAINT "voice_note_templates_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voice_transcriptions"
    ADD CONSTRAINT "voice_transcriptions_goal_check_in_id_fkey" FOREIGN KEY ("goal_check_in_id") REFERENCES "public"."goal_check_ins"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voice_transcriptions"
    ADD CONSTRAINT "voice_transcriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Activity logs are immutable" ON "public"."reminder_activities" FOR UPDATE USING (false);



CREATE POLICY "Activity logs cannot be deleted" ON "public"."reminder_activities" FOR DELETE USING (false);



CREATE POLICY "Admin only access" ON "public"."daily_analytics" USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE (("admin_users"."email" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text")) AND ("admin_users"."is_active" = true)))));



CREATE POLICY "Admin only access" ON "public"."feature_usage_daily" USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE (("admin_users"."user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) AND ("admin_users"."is_active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE (("admin_users"."user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) AND ("admin_users"."is_active" = true)))));



CREATE POLICY "Admin only access" ON "public"."launch_notifications" USING (false);



CREATE POLICY "Admin read access" ON "public"."feature_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE (("admin_users"."user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) AND ("admin_users"."is_active" = true)))));



CREATE POLICY "Admins can read audit log" ON "public"."admin_audit_log" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE (("admin_users"."user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) AND ("admin_users"."is_active" = true)))));



CREATE POLICY "Admins can update penalties" ON "public"."late_penalties" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."space_members"
  WHERE (("space_members"."space_id" = "late_penalties"."space_id") AND ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("space_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Anon users can read founding member counter" ON "public"."founding_member_counter" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anyone can create mentions when commenting" ON "public"."mentions" FOR INSERT TO "authenticated" WITH CHECK (("comment_id" IN ( SELECT "comments"."id"
   FROM "public"."comments"
  WHERE ("comments"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Anyone can view active badges" ON "public"."achievement_badges" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active nudge templates" ON "public"."nudge_templates" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view budget templates" ON "public"."budget_templates" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view public shopping items" ON "public"."shopping_items" FOR SELECT USING (("list_id" IN ( SELECT "shopping_lists"."id"
   FROM "public"."shopping_lists"
  WHERE ("shopping_lists"."is_public" = true))));



CREATE POLICY "Anyone can view public shopping lists" ON "public"."shopping_lists" FOR SELECT USING (("is_public" = true));



CREATE POLICY "Anyone can view template categories" ON "public"."budget_template_categories" FOR SELECT USING (("template_id" IN ( SELECT "budget_templates"."id"
   FROM "public"."budget_templates"
  WHERE ("budget_templates"."is_active" = true))));



CREATE POLICY "Authenticated can insert audit log" ON "public"."admin_audit_log" FOR INSERT TO "authenticated" WITH CHECK ((("admin_user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE (("admin_users"."user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) AND ("admin_users"."is_active" = true))))));



CREATE POLICY "Authenticated users can read founding member counter" ON "public"."founding_member_counter" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Collaborators can remove themselves" ON "public"."goal_collaborators" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Creators and contributors can manage milestones" ON "public"."goal_milestones" USING (("goal_id" IN ( SELECT "g"."id"
   FROM "public"."goals" "g"
  WHERE (("g"."created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ("g"."id" IN ( SELECT "goal_collaborators"."goal_id"
           FROM "public"."goal_collaborators"
          WHERE (("goal_collaborators"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("goal_collaborators"."role" = ANY (ARRAY['contributor'::"text", 'owner'::"text"])))))))));



CREATE POLICY "Creators and contributors can update goals" ON "public"."goals" FOR UPDATE USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ("id" IN ( SELECT "goal_collaborators"."goal_id"
   FROM "public"."goal_collaborators"
  WHERE (("goal_collaborators"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("goal_collaborators"."role" = ANY (ARRAY['contributor'::"text", 'owner'::"text"])))))));



CREATE POLICY "Goal creators can manage collaborators" ON "public"."goal_collaborators" USING (("goal_id" IN ( SELECT "goals"."id"
   FROM "public"."goals"
  WHERE ("goals"."created_by" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Mentioning user can delete mentions" ON "public"."reminder_mentions" FOR DELETE USING (("mentioning_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Milestone templates follow parent template access" ON "public"."milestone_templates" FOR SELECT USING (("template_id" IN ( SELECT "goal_templates"."id"
   FROM "public"."goal_templates"
  WHERE (("goal_templates"."is_public" = true) OR ("goal_templates"."created_by" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "No deletes allowed" ON "public"."reminder_notifications" FOR DELETE USING (false);



CREATE POLICY "No updates allowed" ON "public"."reminder_mentions" FOR UPDATE USING (false);



CREATE POLICY "Only creators can delete goals" ON "public"."goals" FOR DELETE USING (("created_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Partnership members can update balances" ON "public"."partnership_balances" TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Proposal creators can delete their proposals" ON "public"."event_proposals" FOR DELETE USING (("proposed_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Proposal creators can update their proposals" ON "public"."event_proposals" FOR UPDATE USING (("proposed_by" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("proposed_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Public templates are viewable by all" ON "public"."goal_templates" FOR SELECT USING ((("is_public" = true) OR ("created_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Service can insert CCPA preferences" ON "public"."ccpa_do_not_sell" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service can insert activity logs" ON "public"."activity_log" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service can insert agreements" ON "public"."data_processing_agreements" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service can insert audit logs" ON "public"."user_audit_log" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service can insert compliance events" ON "public"."compliance_events_log" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service can insert nudge history" ON "public"."nudge_history" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service can insert privacy preferences" ON "public"."user_privacy_preferences" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service role can insert audit log" ON "public"."admin_audit_log" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role can insert penalties" ON "public"."late_penalties" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service role can manage CCPA audit logs" ON "public"."ccpa_audit_log" USING ((CURRENT_USER = 'service_role'::"name"));



CREATE POLICY "Service role can manage audit logs" ON "public"."account_deletion_audit_log" USING ((CURRENT_USER = 'service_role'::"name"));



CREATE POLICY "Service role can manage daily usage" ON "public"."daily_usage" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage founding member counter" ON "public"."founding_member_counter" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage subscription events" ON "public"."subscription_events" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage subscriptions" ON "public"."subscriptions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."user_feedback" AS RESTRICTIVE USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text")) WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "Service role has full access to calendar_connections" ON "public"."calendar_connections" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to event_mappings" ON "public"."calendar_event_mappings" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to sync_conflicts" ON "public"."calendar_sync_conflicts" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to sync_logs" ON "public"."calendar_sync_logs" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to sync_queue" ON "public"."calendar_sync_queue" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to webhook_subscriptions" ON "public"."calendar_webhook_subscriptions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Space members can create attachments" ON "public"."reminder_attachments" FOR INSERT WITH CHECK ((("uploaded_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("reminder_id" IN ( SELECT "reminders"."id"
   FROM "public"."reminders"
  WHERE ("reminders"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "Space members can create bills" ON "public"."bills" FOR INSERT WITH CHECK ((("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("created_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Space members can create budget categories" ON "public"."budget_categories" FOR INSERT WITH CHECK (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Space members can create goals" ON "public"."goals" FOR INSERT WITH CHECK ((("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("created_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Space members can delete bills" ON "public"."bills" FOR DELETE USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Space members can delete budget categories" ON "public"."budget_categories" FOR DELETE USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Space members can manage rewards" ON "public"."rewards_catalog" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Space members can update bills" ON "public"."bills" FOR UPDATE USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Space members can update budget categories" ON "public"."budget_categories" FOR UPDATE USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Space members can update redemptions" ON "public"."reward_redemptions" FOR UPDATE USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Space members can view attachments" ON "public"."reminder_attachments" FOR SELECT USING (("reminder_id" IN ( SELECT "reminders"."id"
   FROM "public"."reminders"
  WHERE ("reminders"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Space members can view bills" ON "public"."bills" FOR SELECT USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Space members can view budget categories" ON "public"."budget_categories" FOR SELECT USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "System can create instances" ON "public"."recurring_goal_instances" FOR INSERT WITH CHECK (("template_id" IN ( SELECT "rgt"."id"
   FROM ("public"."recurring_goal_templates" "rgt"
     JOIN "public"."space_members" "sm" ON (("rgt"."space_id" = "sm"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "System can create notifications" ON "public"."reminder_notifications" FOR INSERT WITH CHECK ((("user_id" IS NOT NULL) AND ((("reminder_id" IS NOT NULL) AND ("reminder_id" IN ( SELECT "r"."id"
   FROM ("public"."reminders" "r"
     JOIN "public"."space_members" "sm" ON (("r"."space_id" = "sm"."space_id")))
  WHERE ("sm"."user_id" = "sm"."user_id")))) OR (("goal_id" IS NOT NULL) AND ("goal_id" IN ( SELECT "g"."id"
   FROM ("public"."goals" "g"
     JOIN "public"."space_members" "sm" ON (("g"."space_id" = "sm"."space_id")))
  WHERE ("sm"."user_id" = "sm"."user_id")))))));



CREATE POLICY "System can insert nudge history" ON "public"."nudge_history" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert sessions" ON "public"."user_sessions" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert transactions" ON "public"."point_transactions" FOR INSERT WITH CHECK (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "System can insert/update points" ON "public"."reward_points" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "System can manage user analytics" ON "public"."habit_analytics" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "System can manage user streaks" ON "public"."habit_streaks" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can add comments to events in their space" ON "public"."event_comments" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("event_id" IN ( SELECT "e"."id"
   FROM ("public"."events" "e"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "e"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can add goal contributions" ON "public"."goal_contributions" FOR INSERT TO "authenticated" WITH CHECK ((("goal_id" IN ( SELECT "g"."id"
   FROM "public"."goals" "g"
  WHERE (("g"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND (("g"."visibility" = 'private'::"text") OR (("g"."visibility" = 'shared'::"text") AND (("g"."created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ("g"."id" IN ( SELECT "goal_collaborators"."goal_id"
           FROM "public"."goal_collaborators"
          WHERE (("goal_collaborators"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("goal_collaborators"."role" = ANY (ARRAY['contributor'::"text", 'owner'::"text"]))))))))))) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can add reactions in their spaces" ON "public"."comment_reactions" FOR INSERT TO "authenticated" WITH CHECK ((("comment_id" IN ( SELECT "comments"."id"
   FROM "public"."comments"
  WHERE ("comments"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can add reactions to accessible check-ins" ON "public"."goal_check_in_reactions" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("check_in_id" IN ( SELECT "ci"."id"
   FROM (("public"."goal_check_ins" "ci"
     JOIN "public"."goals" "g" ON (("ci"."goal_id" = "g"."id")))
     JOIN "public"."space_members" "sm" ON (("g"."space_id" = "sm"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can add reactions to messages in their space" ON "public"."message_reactions" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM (("public"."messages"
     JOIN "public"."conversations" ON (("conversations"."id" = "messages"."conversation_id")))
     JOIN "public"."space_members" ON (("space_members"."space_id" = "conversations"."space_id")))
  WHERE (("messages"."id" = "message_reactions"."message_id") AND ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can add tags to expenses in their spaces" ON "public"."expense_tags" FOR INSERT TO "authenticated" WITH CHECK (("expense_id" IN ( SELECT "expenses"."id"
   FROM ("public"."expenses"
     JOIN "public"."space_members" ON (("expenses"."space_id" = "space_members"."space_id")))
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can add tags to goals in their spaces" ON "public"."goal_tags" FOR INSERT TO "authenticated" WITH CHECK (("goal_id" IN ( SELECT "goals"."id"
   FROM ("public"."goals"
     JOIN "public"."space_members" ON (("goals"."space_id" = "space_members"."space_id")))
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can add tags to tasks in their spaces" ON "public"."task_tags" FOR INSERT TO "authenticated" WITH CHECK (("task_id" IN ( SELECT "tasks"."id"
   FROM ("public"."tasks"
     JOIN "public"."space_members" ON (("tasks"."space_id" = "space_members"."space_id")))
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can add votes to proposals in their space" ON "public"."event_proposal_votes" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("proposal_id" IN ( SELECT "event_proposals"."id"
   FROM "public"."event_proposals"
  WHERE ("event_proposals"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "Users can create achievements in their spaces" ON "public"."user_achievements" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can create activities for their actions" ON "public"."goal_activities" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can create activity logs in their spaces" ON "public"."activity_logs" FOR INSERT TO "authenticated" WITH CHECK (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can create calendar connections" ON "public"."calendar_connections" FOR INSERT TO "authenticated" WITH CHECK ((("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can create check-ins for accessible goals" ON "public"."goal_check_ins" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("goal_id" IN ( SELECT "g"."id"
   FROM ("public"."goals" "g"
     JOIN "public"."space_members" "sm" ON (("g"."space_id" = "sm"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can create comments in their space" ON "public"."event_comments" FOR INSERT WITH CHECK ((("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can create comments in their spaces" ON "public"."comments" FOR INSERT TO "authenticated" WITH CHECK ((("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("created_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can create comments in their spaces" ON "public"."reminder_comments" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("reminder_id" IN ( SELECT "r"."id"
   FROM ("public"."reminders" "r"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "r"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can create comments on accessible goals" ON "public"."goal_comments" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("goal_id" IN ( SELECT "g"."id"
   FROM ("public"."goals" "g"
     JOIN "public"."space_members" "sm" ON (("g"."space_id" = "sm"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can create dependencies in their spaces" ON "public"."goal_dependencies" FOR INSERT WITH CHECK (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can create exceptions for events in their space" ON "public"."recurring_event_exceptions" FOR INSERT WITH CHECK (("series_id" IN ( SELECT "e"."id"
   FROM ("public"."events" "e"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "e"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can create goals in their space" ON "public"."goals" FOR INSERT WITH CHECK (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can create mentions in accessible comments" ON "public"."goal_mentions" FOR INSERT WITH CHECK ((("mentioning_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("comment_id" IN ( SELECT "c"."id"
   FROM (("public"."goal_comments" "c"
     JOIN "public"."goals" "g" ON (("c"."goal_id" = "g"."id")))
     JOIN "public"."space_members" "sm" ON (("g"."space_id" = "sm"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can create mentions in their spaces" ON "public"."message_mentions" FOR INSERT WITH CHECK (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can create mentions in their spaces" ON "public"."reminder_mentions" FOR INSERT WITH CHECK ((("mentioning_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("reminder_id" IN ( SELECT "r"."id"
   FROM ("public"."reminders" "r"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "r"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can create milestones in their space" ON "public"."goal_milestones" FOR INSERT WITH CHECK (("goal_id" IN ( SELECT "goals"."id"
   FROM "public"."goals"
  WHERE ("goals"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can create note versions for events in their space" ON "public"."event_note_versions" FOR INSERT WITH CHECK (("note_id" IN ( SELECT "en"."id"
   FROM (("public"."event_notes" "en"
     JOIN "public"."events" "e" ON (("e"."id" = "en"."event_id")))
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "e"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can create notes for events in their space" ON "public"."event_notes" FOR INSERT WITH CHECK (("event_id" IN ( SELECT "e"."id"
   FROM ("public"."events" "e"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "e"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can create own deletion requests" ON "public"."account_deletion_requests" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can create own export requests" ON "public"."data_export_requests" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can create projects in their spaces" ON "public"."projects" FOR INSERT TO "authenticated" WITH CHECK ((("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("created_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can create proposals in their space" ON "public"."event_proposals" FOR INSERT WITH CHECK ((("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("proposed_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can create receipts in their spaces" ON "public"."receipts" FOR INSERT TO "authenticated" WITH CHECK ((("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("created_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can create reminders for accessible goals" ON "public"."goal_check_in_reminders" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("goal_id" IN ( SELECT "g"."id"
   FROM ("public"."goals" "g"
     JOIN "public"."space_members" "sm" ON (("g"."space_id" = "sm"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can create reminders for events in their space" ON "public"."event_reminders" FOR INSERT WITH CHECK (("event_id" IN ( SELECT "e"."id"
   FROM ("public"."events" "e"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "e"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can create reports for their spaces" ON "public"."generated_reports" FOR INSERT WITH CHECK ((("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("generated_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can create settlements in their spaces" ON "public"."settlements" FOR INSERT TO "authenticated" WITH CHECK ((("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("from_user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can create share links for events in their space" ON "public"."event_share_links" FOR INSERT WITH CHECK (("event_id" IN ( SELECT "e"."id"
   FROM ("public"."events" "e"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "e"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can create space chores" ON "public"."chores" FOR INSERT WITH CHECK (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can create space expenses" ON "public"."expenses" FOR INSERT WITH CHECK (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can create sync mappings for events in their space" ON "public"."calendar_sync_map" FOR INSERT WITH CHECK (("rowan_event_id" IN ( SELECT "e"."id"
   FROM ("public"."events" "e"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "e"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can create templates for their spaces" ON "public"."report_templates" FOR INSERT WITH CHECK ((("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("created_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can create templates in their space" ON "public"."event_templates" FOR INSERT WITH CHECK ((("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("created_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can create templates in their space" ON "public"."shopping_templates" FOR INSERT WITH CHECK (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can create templates in their spaces" ON "public"."recurring_goal_templates" FOR INSERT WITH CHECK ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("space_id" IN ( SELECT "sm"."space_id"
   FROM "public"."space_members" "sm"
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can create templates in their spaces" ON "public"."reminder_templates" FOR INSERT WITH CHECK ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("is_system_template" = false) AND ("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can create templates in their spaces" ON "public"."voice_note_templates" FOR INSERT WITH CHECK ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND (("space_id" IS NULL) OR ("space_id" IN ( SELECT "sm"."space_id"
   FROM "public"."space_members" "sm"
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can create their habit entries" ON "public"."habit_entries" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("template_id" IN ( SELECT "rgt"."id"
   FROM ("public"."recurring_goal_templates" "rgt"
     JOIN "public"."space_members" "sm" ON (("rgt"."space_id" = "sm"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can create their own AI conversations" ON "public"."ai_conversations" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can create their own AI settings" ON "public"."ai_user_settings" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can create their own availability blocks" ON "public"."availability_blocks" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can create their own calendar connections" ON "public"."external_calendar_connections" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can create their own calendar preferences" ON "public"."user_calendar_preferences" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can create their own check-ins" ON "public"."daily_checkins" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can create their own nudge settings" ON "public"."nudge_settings" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can create their own redemptions" ON "public"."reward_redemptions" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can create their own templates" ON "public"."goal_templates" FOR INSERT WITH CHECK (("created_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can create transcriptions for their check-ins" ON "public"."voice_transcriptions" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("goal_check_in_id" IS NULL) OR ("goal_check_in_id" IN ( SELECT "ci"."id"
   FROM "public"."goal_check_ins" "ci"
  WHERE ("ci"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can delete custom categories in their spaces" ON "public"."custom_categories" FOR DELETE TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete dependencies in their spaces" ON "public"."goal_dependencies" FOR DELETE USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete exceptions for events in their space" ON "public"."recurring_event_exceptions" FOR DELETE USING (("series_id" IN ( SELECT "e"."id"
   FROM ("public"."events" "e"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "e"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete goals in their space" ON "public"."goals" FOR DELETE USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete mentions they created" ON "public"."message_mentions" FOR DELETE USING (("mentioned_by_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete milestones in their space" ON "public"."goal_milestones" FOR DELETE USING (("goal_id" IN ( SELECT "goals"."id"
   FROM "public"."goals"
  WHERE ("goals"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can delete own attachments" ON "public"."reminder_attachments" FOR DELETE USING (("uploaded_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete own calendar connections" ON "public"."calendar_connections" FOR DELETE TO "authenticated" USING ((("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can delete own check-ins" ON "public"."daily_checkins" FOR DELETE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can delete own contributions" ON "public"."goal_contributions" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete own notifications" ON "public"."in_app_notifications" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete own notifications" ON "public"."notifications" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete own push subscriptions" ON "public"."push_subscriptions" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete own reactions" ON "public"."checkin_reactions" FOR DELETE USING (("from_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete patterns in their spaces" ON "public"."recurring_expense_patterns" FOR DELETE TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete receipts in their spaces" ON "public"."receipts" FOR DELETE TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete reminders for events in their space" ON "public"."event_reminders" FOR DELETE USING (("event_id" IN ( SELECT "e"."id"
   FROM ("public"."events" "e"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "e"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete share links for events in their space" ON "public"."event_share_links" FOR DELETE USING (("event_id" IN ( SELECT "e"."id"
   FROM ("public"."events" "e"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "e"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete space budgets" ON "public"."budgets" FOR DELETE USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete space chores" ON "public"."chores" FOR DELETE USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete space expenses" ON "public"."expenses" FOR DELETE USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete sync mappings for events in their space" ON "public"."calendar_sync_map" FOR DELETE USING (("rowan_event_id" IN ( SELECT "e"."id"
   FROM ("public"."events" "e"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "e"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete tags in their spaces" ON "public"."tags" FOR DELETE TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete templates in their space" ON "public"."shopping_templates" FOR DELETE USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete their habit entries" ON "public"."habit_entries" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their notifications" ON "public"."reminder_notifications" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own AI conversations" ON "public"."ai_conversations" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own attachments" ON "public"."event_attachments" FOR DELETE USING (("uploaded_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own attachments" ON "public"."message_attachments" FOR DELETE USING (("uploaded_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own availability blocks" ON "public"."availability_blocks" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own calendar connections" ON "public"."external_calendar_connections" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own check-ins" ON "public"."daily_checkins" FOR DELETE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can delete their own check-ins" ON "public"."goal_check_ins" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own comments" ON "public"."comments" FOR DELETE TO "authenticated" USING (("created_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own comments" ON "public"."event_comments" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own comments" ON "public"."goal_comments" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own comments" ON "public"."reminder_comments" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own deletion records (cancel)" ON "public"."deleted_accounts" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own notification preferences" ON "public"."user_notification_preferences" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own nudge settings" ON "public"."nudge_settings" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own preferences" ON "public"."user_notification_preferences" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own projects" ON "public"."projects" FOR DELETE TO "authenticated" USING (("created_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own proposals" ON "public"."event_proposals" FOR DELETE USING (("proposed_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own reactions" ON "public"."goal_check_in_reactions" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own reactions" ON "public"."message_reactions" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own reminders" ON "public"."goal_check_in_reminders" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own reports" ON "public"."generated_reports" FOR DELETE USING ((("generated_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can delete their own sessions" ON "public"."user_sessions" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own settlements" ON "public"."settlements" FOR DELETE TO "authenticated" USING (("created_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own templates" ON "public"."event_templates" FOR DELETE USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can delete their own templates" ON "public"."goal_templates" FOR DELETE USING (("created_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own templates" ON "public"."reminder_templates" FOR DELETE USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("is_system_template" = false)));



CREATE POLICY "Users can delete their own templates" ON "public"."report_templates" FOR DELETE USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can delete their own templates" ON "public"."voice_note_templates" FOR DELETE USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("is_default" = false)));



CREATE POLICY "Users can delete their own transcriptions" ON "public"."voice_transcriptions" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own typing indicators" ON "public"."typing_indicators" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own votes" ON "public"."event_proposal_votes" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their templates" ON "public"."recurring_goal_templates" FOR DELETE USING (("created_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert activities for reminders in their space" ON "public"."reminder_activities" FOR INSERT WITH CHECK ((("reminder_id" IN ( SELECT "r"."id"
   FROM ("public"."reminders" "r"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "r"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can insert custom categories in their spaces" ON "public"."custom_categories" FOR INSERT TO "authenticated" WITH CHECK (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can insert messages in their own conversations" ON "public"."ai_messages" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."ai_conversations"
  WHERE (("ai_conversations"."id" = "ai_messages"."conversation_id") AND ("ai_conversations"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can insert own check-ins" ON "public"."daily_checkins" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can insert own events" ON "public"."feature_events" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can insert own feedback" ON "public"."user_feedback" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert own notification interactions" ON "public"."notification_interactions" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert own notifications" ON "public"."in_app_notifications" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert own privacy preferences" ON "public"."user_privacy_preferences" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert own progress" ON "public"."user_progress" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert own push subscriptions" ON "public"."push_subscriptions" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert own reminder notifications" ON "public"."reminder_notifications" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert patterns in their spaces" ON "public"."recurring_expense_patterns" FOR INSERT TO "authenticated" WITH CHECK (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can insert space budgets" ON "public"."budgets" FOR INSERT WITH CHECK (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can insert space chores" ON "public"."chores" FOR INSERT WITH CHECK (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can insert space expenses" ON "public"."expenses" FOR INSERT WITH CHECK (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can insert space projects" ON "public"."projects" FOR INSERT WITH CHECK (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can insert tags in their spaces" ON "public"."tags" FOR INSERT TO "authenticated" WITH CHECK (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can insert their own deletion records" ON "public"."deleted_accounts" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert their own notification preferences" ON "public"."user_notification_preferences" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert their own preferences" ON "public"."user_notification_preferences" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert typing indicators in their conversations" ON "public"."typing_indicators" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."conversations"
     JOIN "public"."space_members" ON (("space_members"."space_id" = "conversations"."space_id")))
  WHERE (("conversations"."id" = "typing_indicators"."conversation_id") AND ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can manage calendar links in their space" ON "public"."shopping_calendar_events" USING (("list_id" IN ( SELECT "shopping_lists"."id"
   FROM "public"."shopping_lists"
  WHERE ("shopping_lists"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can manage expense splits for their expenses" ON "public"."expense_splits" TO "authenticated" USING (("expense_id" IN ( SELECT "e"."id"
   FROM "public"."expenses" "e"
  WHERE ("e"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can manage history in their space" ON "public"."shopping_item_history" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can manage layouts in their space" ON "public"."store_layouts" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can manage line items for their projects" ON "public"."project_line_items" TO "authenticated" USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can manage milestones for their templates" ON "public"."milestone_templates" USING (("template_id" IN ( SELECT "goal_templates"."id"
   FROM "public"."goal_templates"
  WHERE ("goal_templates"."created_by" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can manage own push tokens" ON "public"."push_tokens" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can manage photos for their check-ins" ON "public"."goal_check_in_photos" USING (("check_in_id" IN ( SELECT "goal_check_ins"."id"
   FROM "public"."goal_check_ins"
  WHERE ("goal_check_ins"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can manage photos for their projects" ON "public"."project_photos" TO "authenticated" USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can manage reminder links in their space" ON "public"."shopping_reminders" USING (COALESCE(("list_id" IN ( SELECT "shopping_lists"."id"
   FROM "public"."shopping_lists"
  WHERE ("shopping_lists"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))), ("item_id" IN ( SELECT "shopping_items"."id"
   FROM "public"."shopping_items"
  WHERE ("shopping_items"."list_id" IN ( SELECT "shopping_lists"."id"
           FROM "public"."shopping_lists"
          WHERE ("shopping_lists"."space_id" IN ( SELECT "space_members"."space_id"
                   FROM "public"."space_members"
                  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))))));



CREATE POLICY "Users can manage schedules for their spaces" ON "public"."report_schedules" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can manage task links in their space" ON "public"."shopping_tasks" USING (("list_id" IN ( SELECT "shopping_lists"."id"
   FROM "public"."shopping_lists"
  WHERE ("shopping_lists"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can manage their own CCPA opt-out status" ON "public"."ccpa_opt_out_status" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can manage their own check-in settings" ON "public"."goal_check_in_settings" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can manage their own favorites" ON "public"."report_favorites" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can manage their own goal nudge tracking" ON "public"."goal_nudge_tracking" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can manage their own reactions" ON "public"."goal_comment_reactions" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can manage vendors in their spaces" ON "public"."vendors" TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can modify their progress" ON "public"."achievement_progress" FOR UPDATE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can react to partner check-ins" ON "public"."checkin_reactions" FOR INSERT WITH CHECK ((("from_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("checkin_id" IN ( SELECT "daily_checkins"."id"
   FROM "public"."daily_checkins"
  WHERE (("daily_checkins"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("daily_checkins"."user_id" <> ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can read own feedback" ON "public"."user_feedback" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can remove tags from expenses in their spaces" ON "public"."expense_tags" FOR DELETE TO "authenticated" USING (("expense_id" IN ( SELECT "expenses"."id"
   FROM ("public"."expenses"
     JOIN "public"."space_members" ON (("expenses"."space_id" = "space_members"."space_id")))
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can remove tags from goals in their spaces" ON "public"."goal_tags" FOR DELETE TO "authenticated" USING (("goal_id" IN ( SELECT "goals"."id"
   FROM ("public"."goals"
     JOIN "public"."space_members" ON (("goals"."space_id" = "space_members"."space_id")))
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can remove tags from tasks in their spaces" ON "public"."task_tags" FOR DELETE TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM ("public"."tasks"
     JOIN "public"."space_members" ON (("tasks"."space_id" = "space_members"."space_id")))
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can remove their own reactions" ON "public"."comment_reactions" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update accessible instances" ON "public"."recurring_goal_instances" FOR UPDATE USING (("template_id" IN ( SELECT "rgt"."id"
   FROM ("public"."recurring_goal_templates" "rgt"
     JOIN "public"."space_members" "sm" ON (("rgt"."space_id" = "sm"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update custom categories in their spaces" ON "public"."custom_categories" FOR UPDATE TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update dependencies in their spaces" ON "public"."goal_dependencies" FOR UPDATE USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update goals in their space" ON "public"."goals" FOR UPDATE USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update milestones in their space" ON "public"."goal_milestones" FOR UPDATE USING (("goal_id" IN ( SELECT "goals"."id"
   FROM "public"."goals"
  WHERE ("goals"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can update notes for events in their space" ON "public"."event_notes" FOR UPDATE USING (("event_id" IN ( SELECT "e"."id"
   FROM ("public"."events" "e"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "e"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update own CCPA preferences" ON "public"."ccpa_do_not_sell" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own calendar connections" ON "public"."calendar_connections" FOR UPDATE TO "authenticated" USING ((("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can update own check-ins" ON "public"."daily_checkins" FOR UPDATE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update own contributions" ON "public"."goal_contributions" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own deletion requests" ON "public"."account_deletion_requests" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own notifications" ON "public"."in_app_notifications" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own privacy preferences" ON "public"."user_privacy_preferences" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own progress" ON "public"."user_progress" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own push subscriptions" ON "public"."push_subscriptions" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update patterns in their spaces" ON "public"."recurring_expense_patterns" FOR UPDATE TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update projects in their spaces" ON "public"."projects" FOR UPDATE TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update receipts in their spaces" ON "public"."receipts" FOR UPDATE TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update reminders for events in their space" ON "public"."event_reminders" FOR UPDATE USING (("event_id" IN ( SELECT "e"."id"
   FROM ("public"."events" "e"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "e"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update space budgets" ON "public"."budgets" FOR UPDATE USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update space chores" ON "public"."chores" FOR UPDATE USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update space expenses" ON "public"."expenses" FOR UPDATE USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update sync conflicts" ON "public"."calendar_sync_conflicts" FOR UPDATE TO "authenticated" USING (("connection_id" IN ( SELECT "calendar_connections"."id"
   FROM "public"."calendar_connections"
  WHERE ("calendar_connections"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can update tags in their spaces" ON "public"."tags" FOR UPDATE TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update templates in their space" ON "public"."shopping_templates" FOR UPDATE USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update their habit entries" ON "public"."habit_entries" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their notifications" ON "public"."reminder_notifications" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own AI conversations" ON "public"."ai_conversations" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update their own AI settings" ON "public"."ai_user_settings" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update their own activities" ON "public"."goal_activities" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own availability blocks" ON "public"."availability_blocks" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own calendar connections" ON "public"."external_calendar_connections" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own calendar preferences" ON "public"."user_calendar_preferences" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own check-ins" ON "public"."daily_checkins" FOR UPDATE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update their own check-ins" ON "public"."goal_check_ins" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own comments" ON "public"."comments" FOR UPDATE TO "authenticated" USING (("created_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own comments" ON "public"."event_comments" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own comments" ON "public"."goal_comments" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own comments" ON "public"."reminder_comments" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own mention read status" ON "public"."mentions" FOR UPDATE TO "authenticated" USING (("mentioned_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own mentions" ON "public"."goal_mentions" FOR UPDATE USING (("mentioned_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own mentions" ON "public"."message_mentions" FOR UPDATE USING (("mentioned_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own notification preferences" ON "public"."user_notification_preferences" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own notifications" ON "public"."reminder_notifications" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own nudge history" ON "public"."nudge_history" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own nudge settings" ON "public"."nudge_settings" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own preferences" ON "public"."user_notification_preferences" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own proposals" ON "public"."event_proposals" FOR UPDATE USING (("proposed_by" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("proposed_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own reminders" ON "public"."goal_check_in_reminders" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own reports" ON "public"."generated_reports" FOR UPDATE USING ((("generated_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update their own sessions" ON "public"."user_sessions" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update their own settlements" ON "public"."settlements" FOR UPDATE TO "authenticated" USING (("created_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own templates" ON "public"."event_templates" FOR UPDATE USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update their own templates" ON "public"."goal_templates" FOR UPDATE USING (("created_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own templates" ON "public"."reminder_templates" FOR UPDATE USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("is_system_template" = false))) WITH CHECK ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("is_system_template" = false)));



CREATE POLICY "Users can update their own templates" ON "public"."report_templates" FOR UPDATE USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update their own templates" ON "public"."voice_note_templates" FOR UPDATE USING (("created_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own transcriptions" ON "public"."voice_transcriptions" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own typing indicators" ON "public"."typing_indicators" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own votes" ON "public"."event_proposal_votes" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their progress" ON "public"."achievement_progress" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update their templates" ON "public"."recurring_goal_templates" FOR UPDATE USING (("created_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can upload attachments to events in their space" ON "public"."event_attachments" FOR INSERT WITH CHECK ((("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("uploaded_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can upload attachments to their messages" ON "public"."message_attachments" FOR INSERT WITH CHECK ((("uploaded_by" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM (("public"."messages"
     JOIN "public"."conversations" ON (("conversations"."id" = "messages"."conversation_id")))
     JOIN "public"."space_members" ON (("space_members"."space_id" = "conversations"."space_id")))
  WHERE (("messages"."id" = "message_attachments"."message_id") AND ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can view accessible goals" ON "public"."goals" FOR SELECT USING (((("visibility" = 'private'::"text") AND ("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (("visibility" = 'shared'::"text") AND (("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ("id" IN ( SELECT "goal_collaborators"."goal_id"
   FROM "public"."goal_collaborators"
  WHERE ("goal_collaborators"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) OR ("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "Users can view accessible milestones" ON "public"."goal_milestones" FOR SELECT USING (("goal_id" IN ( SELECT "goals"."id"
   FROM "public"."goals"
  WHERE ((("goals"."visibility" = 'private'::"text") AND ("goals"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (("goals"."visibility" = 'shared'::"text") AND (("goals"."created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ("goals"."id" IN ( SELECT "goal_collaborators"."goal_id"
           FROM "public"."goal_collaborators"
          WHERE ("goal_collaborators"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) OR ("goals"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))))));



CREATE POLICY "Users can view accessible templates" ON "public"."voice_note_templates" FOR SELECT USING ((("is_default" = true) OR (("space_id" IS NOT NULL) AND ("space_id" IN ( SELECT "sm"."space_id"
   FROM "public"."space_members" "sm"
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can view achievements in their spaces" ON "public"."user_achievements" FOR SELECT USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view activities for reminders in their space" ON "public"."reminder_activities" FOR SELECT USING (("reminder_id" IN ( SELECT "r"."id"
   FROM ("public"."reminders" "r"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "r"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view activities in their spaces" ON "public"."goal_activities" FOR SELECT USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view activity logs in their spaces" ON "public"."activity_logs" FOR SELECT TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view attachments for events in their space" ON "public"."event_attachments" FOR SELECT USING (("event_id" IN ( SELECT "e"."id"
   FROM ("public"."events" "e"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "e"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view attachments in their space" ON "public"."event_attachments" FOR SELECT USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view attachments in their space conversations" ON "public"."message_attachments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."messages"
     JOIN "public"."conversations" ON (("conversations"."id" = "messages"."conversation_id")))
     JOIN "public"."space_members" ON (("space_members"."space_id" = "conversations"."space_id")))
  WHERE (("messages"."id" = "message_attachments"."message_id") AND ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view audit logs for events in their space" ON "public"."event_audit_log" FOR SELECT USING (("event_id" IN ( SELECT "e"."id"
   FROM ("public"."events" "e"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "e"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view balances for their partnerships" ON "public"."partnership_balances" FOR SELECT TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view check-ins for goals they have access to" ON "public"."goal_check_ins" FOR SELECT USING (("goal_id" IN ( SELECT "g"."id"
   FROM ("public"."goals" "g"
     JOIN "public"."space_members" "sm" ON (("g"."space_id" = "sm"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view check-ins in their space" ON "public"."daily_checkins" FOR SELECT USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view comments in their space" ON "public"."event_comments" FOR SELECT USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view comments in their spaces" ON "public"."comments" FOR SELECT TO "authenticated" USING ((("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("is_deleted" = false)));



CREATE POLICY "Users can view comments in their spaces" ON "public"."reminder_comments" FOR SELECT USING (("reminder_id" IN ( SELECT "r"."id"
   FROM ("public"."reminders" "r"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "r"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view comments on accessible goals" ON "public"."goal_comments" FOR SELECT USING (("goal_id" IN ( SELECT "g"."id"
   FROM ("public"."goals" "g"
     JOIN "public"."space_members" "sm" ON (("g"."space_id" = "sm"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view comments on events in their space" ON "public"."event_comments" FOR SELECT USING (("event_id" IN ( SELECT "e"."id"
   FROM ("public"."events" "e"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "e"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view custom categories from their spaces" ON "public"."custom_categories" FOR SELECT TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view dependencies in their spaces" ON "public"."goal_dependencies" FOR SELECT USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view event mappings" ON "public"."calendar_event_mappings" FOR SELECT TO "authenticated" USING (("connection_id" IN ( SELECT "calendar_connections"."id"
   FROM "public"."calendar_connections"
  WHERE ("calendar_connections"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can view exceptions for events in their space" ON "public"."recurring_event_exceptions" FOR SELECT USING (("series_id" IN ( SELECT "e"."id"
   FROM ("public"."events" "e"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "e"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view expense splits for their expenses" ON "public"."expense_splits" FOR SELECT TO "authenticated" USING (("expense_id" IN ( SELECT "e"."id"
   FROM "public"."expenses" "e"
  WHERE ("e"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can view expense tags from their spaces" ON "public"."expense_tags" FOR SELECT TO "authenticated" USING (("expense_id" IN ( SELECT "expenses"."id"
   FROM ("public"."expenses"
     JOIN "public"."space_members" ON (("expenses"."space_id" = "space_members"."space_id")))
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view goal collaborators" ON "public"."goal_collaborators" FOR SELECT USING ((("goal_id" IN ( SELECT "goals"."id"
   FROM "public"."goals"
  WHERE ("goals"."created_by" = ( SELECT "auth"."uid"() AS "uid")))) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("goal_id" IN ( SELECT "g"."id"
   FROM ("public"."goals" "g"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "g"."space_id")))
  WHERE (("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("g"."visibility" = 'shared'::"text"))))));



CREATE POLICY "Users can view goal contributions" ON "public"."goal_contributions" FOR SELECT TO "authenticated" USING (("goal_id" IN ( SELECT "g"."id"
   FROM "public"."goals" "g"
  WHERE ((("g"."visibility" = 'private'::"text") AND ("g"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (("g"."visibility" = 'shared'::"text") AND (("g"."created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ("g"."id" IN ( SELECT "goal_collaborators"."goal_id"
           FROM "public"."goal_collaborators"
          WHERE ("goal_collaborators"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) OR ("g"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))))));



CREATE POLICY "Users can view goal tags from their spaces" ON "public"."goal_tags" FOR SELECT TO "authenticated" USING (("goal_id" IN ( SELECT "goals"."id"
   FROM ("public"."goals"
     JOIN "public"."space_members" ON (("goals"."space_id" = "space_members"."space_id")))
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view goals in their space" ON "public"."goals" FOR SELECT USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view history in their space" ON "public"."shopping_item_history" FOR SELECT USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view instances in their spaces" ON "public"."recurring_goal_instances" FOR SELECT USING (("template_id" IN ( SELECT "rgt"."id"
   FROM ("public"."recurring_goal_templates" "rgt"
     JOIN "public"."space_members" "sm" ON (("rgt"."space_id" = "sm"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view layouts in their space" ON "public"."store_layouts" FOR SELECT USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view line items for their projects" ON "public"."project_line_items" FOR SELECT TO "authenticated" USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can view mentions in their spaces" ON "public"."mentions" FOR SELECT TO "authenticated" USING (("comment_id" IN ( SELECT "comments"."id"
   FROM "public"."comments"
  WHERE ("comments"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can view mentions in their spaces" ON "public"."message_mentions" FOR SELECT USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view mentions in their spaces" ON "public"."reminder_mentions" FOR SELECT USING (("reminder_id" IN ( SELECT "r"."id"
   FROM ("public"."reminders" "r"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "r"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view messages in their own conversations" ON "public"."ai_messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."ai_conversations"
  WHERE (("ai_conversations"."id" = "ai_messages"."conversation_id") AND ("ai_conversations"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view milestones in their space" ON "public"."goal_milestones" FOR SELECT USING (("goal_id" IN ( SELECT "goals"."id"
   FROM "public"."goals"
  WHERE ("goals"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can view note versions for events in their space" ON "public"."event_note_versions" FOR SELECT USING (("note_id" IN ( SELECT "en"."id"
   FROM (("public"."event_notes" "en"
     JOIN "public"."events" "e" ON (("e"."id" = "en"."event_id")))
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "e"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view notes for events in their space" ON "public"."event_notes" FOR SELECT USING (("event_id" IN ( SELECT "e"."id"
   FROM ("public"."events" "e"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "e"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view own CCPA preferences" ON "public"."ccpa_do_not_sell" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own calendar connections" ON "public"."calendar_connections" FOR SELECT TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view own compliance events" ON "public"."compliance_events_log" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own daily usage" ON "public"."daily_usage" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own deletion requests" ON "public"."account_deletion_requests" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own email notifications" ON "public"."privacy_email_notifications" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own export requests" ON "public"."data_export_requests" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own notification interactions" ON "public"."notification_interactions" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own notification logs" ON "public"."notification_log" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own notifications" ON "public"."in_app_notifications" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own privacy history" ON "public"."privacy_preference_history" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own privacy preferences" ON "public"."user_privacy_preferences" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own processing agreements" ON "public"."data_processing_agreements" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own progress" ON "public"."user_progress" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own push subscriptions" ON "public"."push_subscriptions" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own subscription" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own subscription events" ON "public"."subscription_events" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own sync queue items" ON "public"."calendar_sync_queue" FOR SELECT TO "authenticated" USING (("connection_id" IN ( SELECT "calendar_connections"."id"
   FROM "public"."calendar_connections"
  WHERE ("calendar_connections"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can view patterns from their spaces" ON "public"."recurring_expense_patterns" FOR SELECT TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view penalties in their space" ON "public"."late_penalties" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."space_members"
  WHERE (("space_members"."space_id" = "late_penalties"."space_id") AND ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view photos for accessible check-ins" ON "public"."goal_check_in_photos" FOR SELECT USING (("check_in_id" IN ( SELECT "ci"."id"
   FROM (("public"."goal_check_ins" "ci"
     JOIN "public"."goals" "g" ON (("ci"."goal_id" = "g"."id")))
     JOIN "public"."space_members" "sm" ON (("g"."space_id" = "sm"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view photos for their projects" ON "public"."project_photos" FOR SELECT TO "authenticated" USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can view projects in their spaces" ON "public"."projects" FOR SELECT TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view proposals in their space" ON "public"."event_proposals" FOR SELECT USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view reactions in their space" ON "public"."checkin_reactions" FOR SELECT USING (("checkin_id" IN ( SELECT "daily_checkins"."id"
   FROM "public"."daily_checkins"
  WHERE ("daily_checkins"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can view reactions in their space conversations" ON "public"."message_reactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."messages"
     JOIN "public"."conversations" ON (("conversations"."id" = "messages"."conversation_id")))
     JOIN "public"."space_members" ON (("space_members"."space_id" = "conversations"."space_id")))
  WHERE (("messages"."id" = "message_reactions"."message_id") AND ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view reactions in their spaces" ON "public"."comment_reactions" FOR SELECT TO "authenticated" USING (("comment_id" IN ( SELECT "comments"."id"
   FROM "public"."comments"
  WHERE ("comments"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can view reactions on accessible check-ins" ON "public"."goal_check_in_reactions" FOR SELECT USING (("check_in_id" IN ( SELECT "ci"."id"
   FROM (("public"."goal_check_ins" "ci"
     JOIN "public"."goals" "g" ON (("ci"."goal_id" = "g"."id")))
     JOIN "public"."space_members" "sm" ON (("g"."space_id" = "sm"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view reactions on accessible comments" ON "public"."goal_comment_reactions" FOR SELECT USING (("comment_id" IN ( SELECT "c"."id"
   FROM (("public"."goal_comments" "c"
     JOIN "public"."goals" "g" ON (("c"."goal_id" = "g"."id")))
     JOIN "public"."space_members" "sm" ON (("g"."space_id" = "sm"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view receipts from their spaces" ON "public"."receipts" FOR SELECT TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view redemptions in their spaces" ON "public"."reward_redemptions" FOR SELECT USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view relevant mentions" ON "public"."goal_mentions" FOR SELECT USING ((("mentioned_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("mentioning_user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can view reminders for accessible goals" ON "public"."goal_check_in_reminders" FOR SELECT USING (("goal_id" IN ( SELECT "g"."id"
   FROM ("public"."goals" "g"
     JOIN "public"."space_members" "sm" ON (("g"."space_id" = "sm"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view reminders for events in their space" ON "public"."event_reminders" FOR SELECT USING (("event_id" IN ( SELECT "e"."id"
   FROM ("public"."events" "e"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "e"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view reports from their spaces" ON "public"."generated_reports" FOR SELECT USING ((("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) OR (("is_shared" = true) AND ("share_token" IS NOT NULL))));



CREATE POLICY "Users can view rewards in their spaces" ON "public"."rewards_catalog" FOR SELECT USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view settings for accessible goals" ON "public"."goal_check_in_settings" FOR SELECT USING (("goal_id" IN ( SELECT "g"."id"
   FROM ("public"."goals" "g"
     JOIN "public"."space_members" "sm" ON (("g"."space_id" = "sm"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view settlements in their spaces" ON "public"."settlements" FOR SELECT TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view share links for events in their space" ON "public"."event_share_links" FOR SELECT USING (("event_id" IN ( SELECT "e"."id"
   FROM ("public"."events" "e"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "e"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view space and system templates" ON "public"."reminder_templates" FOR SELECT USING ((("is_system_template" = true) OR ("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view space budgets" ON "public"."budgets" FOR SELECT USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view space check-ins" ON "public"."daily_checkins" FOR SELECT USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view space chores" ON "public"."chores" FOR SELECT USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view space expenses" ON "public"."expenses" FOR SELECT USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view sync conflicts" ON "public"."calendar_sync_conflicts" FOR SELECT TO "authenticated" USING (("connection_id" IN ( SELECT "calendar_connections"."id"
   FROM "public"."calendar_connections"
  WHERE ("calendar_connections"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can view sync logs" ON "public"."calendar_sync_logs" FOR SELECT TO "authenticated" USING (("connection_id" IN ( SELECT "calendar_connections"."id"
   FROM "public"."calendar_connections"
  WHERE ("calendar_connections"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can view sync mappings for events in their space" ON "public"."calendar_sync_map" FOR SELECT USING (("rowan_event_id" IN ( SELECT "e"."id"
   FROM ("public"."events" "e"
     JOIN "public"."space_members" "sm" ON (("sm"."space_id" = "e"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view system and space templates" ON "public"."report_templates" FOR SELECT USING ((("is_system" = true) OR ("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view tags from their spaces" ON "public"."tags" FOR SELECT TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view task tags from their spaces" ON "public"."task_tags" FOR SELECT TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM ("public"."tasks"
     JOIN "public"."space_members" ON (("tasks"."space_id" = "space_members"."space_id")))
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view templates in their space" ON "public"."event_templates" FOR SELECT USING ((("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) OR ("is_system_template" = true)));



CREATE POLICY "Users can view templates in their space" ON "public"."shopping_templates" FOR SELECT USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view templates in their spaces" ON "public"."recurring_goal_templates" FOR SELECT USING (("space_id" IN ( SELECT "sm"."space_id"
   FROM "public"."space_members" "sm"
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view their analytics" ON "public"."habit_analytics" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their habit entries" ON "public"."habit_entries" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their own AI conversations" ON "public"."ai_conversations" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own AI settings" ON "public"."ai_user_settings" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own AI usage" ON "public"."ai_usage_daily" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own CCPA audit logs" ON "public"."ccpa_audit_log" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own CCPA opt-out status" ON "public"."ccpa_opt_out_status" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own audit logs" ON "public"."user_audit_log" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own availability blocks" ON "public"."availability_blocks" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their own calendar connections" ON "public"."external_calendar_connections" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their own calendar preferences" ON "public"."user_calendar_preferences" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their own deletion records" ON "public"."deleted_accounts" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own goal nudge tracking" ON "public"."goal_nudge_tracking" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their own notification preferences" ON "public"."user_notification_preferences" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their own notifications" ON "public"."reminder_notifications" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their own nudge history" ON "public"."nudge_history" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their own nudge settings" ON "public"."nudge_settings" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their own points" ON "public"."reward_points" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view their own preferences" ON "public"."user_notification_preferences" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their own sessions" ON "public"."user_sessions" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own transcriptions" ON "public"."voice_transcriptions" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their progress" ON "public"."achievement_progress" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view their reminder notifications" ON "public"."reminder_notifications" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ((("reminder_id" IS NOT NULL) AND ("reminder_id" IN ( SELECT "r"."id"
   FROM ("public"."reminders" "r"
     JOIN "public"."space_members" "sm" ON (("r"."space_id" = "sm"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (("goal_id" IS NOT NULL) AND ("goal_id" IN ( SELECT "g"."id"
   FROM ("public"."goals" "g"
     JOIN "public"."space_members" "sm" ON (("g"."space_id" = "sm"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "Users can view their streaks" ON "public"."habit_streaks" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view transactions in their spaces" ON "public"."point_transactions" FOR SELECT USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view typing indicators in their space conversations" ON "public"."typing_indicators" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."conversations"
     JOIN "public"."space_members" ON (("space_members"."space_id" = "conversations"."space_id")))
  WHERE (("conversations"."id" = "typing_indicators"."conversation_id") AND ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view vendors in their spaces" ON "public"."vendors" FOR SELECT TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view votes in their space proposals" ON "public"."event_proposal_votes" FOR SELECT USING (("proposal_id" IN ( SELECT "event_proposals"."id"
   FROM "public"."event_proposals"
  WHERE ("event_proposals"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can view votes on proposals in their space" ON "public"."event_proposal_votes" FOR SELECT USING (("proposal_id" IN ( SELECT "event_proposals"."id"
   FROM "public"."event_proposals"
  WHERE ("event_proposals"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can view webhook subscriptions" ON "public"."calendar_webhook_subscriptions" FOR SELECT TO "authenticated" USING (("connection_id" IN ( SELECT "calendar_connections"."id"
   FROM "public"."calendar_connections"
  WHERE ("calendar_connections"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can vote on proposals in their space" ON "public"."event_proposal_votes" FOR INSERT WITH CHECK ((("proposal_id" IN ( SELECT "event_proposals"."id"
   FROM "public"."event_proposals"
  WHERE ("event_proposals"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."account_deletion_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."account_deletion_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."achievement_badges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."achievement_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."activity_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "activity_log_insert" ON "public"."activity_log" FOR INSERT WITH CHECK (true);



CREATE POLICY "activity_log_select" ON "public"."activity_log" FOR SELECT USING ("public"."user_has_space_access"("space_id"));



ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_users_delete" ON "public"."admin_users" FOR DELETE USING ("public"."check_is_admin"());



CREATE POLICY "admin_users_insert" ON "public"."admin_users" FOR INSERT WITH CHECK ("public"."check_is_admin"());



CREATE POLICY "admin_users_select" ON "public"."admin_users" FOR SELECT USING (("public"."check_is_admin"() OR (((( SELECT "auth"."jwt"() AS "jwt") ->> 'email'::"text") = "email") AND ("is_active" = true))));



CREATE POLICY "admin_users_update" ON "public"."admin_users" FOR UPDATE USING (("public"."check_is_admin"() OR (((( SELECT "auth"."jwt"() AS "jwt") ->> 'email'::"text") = "email") AND ("is_active" = true))));



ALTER TABLE "public"."ai_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_usage_daily" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_user_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."availability_blocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."budget_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."budget_template_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."budget_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."budgets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "budgets_delete" ON "public"."budgets" FOR DELETE USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "budgets_insert" ON "public"."budgets" FOR INSERT WITH CHECK ("public"."user_has_space_access"("space_id"));



CREATE POLICY "budgets_select" ON "public"."budgets" FOR SELECT USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "budgets_update" ON "public"."budgets" FOR UPDATE USING ("public"."user_has_space_access"("space_id"));



ALTER TABLE "public"."calendar_connections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_event_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_sync_conflicts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_sync_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_sync_map" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_sync_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_webhook_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ccpa_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ccpa_do_not_sell" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ccpa_opt_out_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."checkin_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chore_calendar_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chore_calendar_events_access" ON "public"."chore_calendar_events" USING (("chore_id" IN ( SELECT "c"."id"
   FROM ("public"."chores" "c"
     JOIN "public"."space_members" "sm" ON (("c"."space_id" = "sm"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."chore_rotations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chore_rotations_delete" ON "public"."chore_rotations" FOR DELETE TO "authenticated" USING (("chore_id" IN ( SELECT "chores"."id"
   FROM "public"."chores"
  WHERE ("chores"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "chore_rotations_insert" ON "public"."chore_rotations" FOR INSERT TO "authenticated" WITH CHECK (("chore_id" IN ( SELECT "chores"."id"
   FROM "public"."chores"
  WHERE ("chores"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "chore_rotations_select" ON "public"."chore_rotations" FOR SELECT TO "authenticated" USING (("chore_id" IN ( SELECT "chores"."id"
   FROM "public"."chores"
  WHERE ("chores"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "chore_rotations_update" ON "public"."chore_rotations" FOR UPDATE TO "authenticated" USING (("chore_id" IN ( SELECT "chores"."id"
   FROM "public"."chores"
  WHERE ("chores"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."chores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chores_delete" ON "public"."chores" FOR DELETE USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "chores_insert" ON "public"."chores" FOR INSERT WITH CHECK ("public"."user_has_space_access"("space_id"));



CREATE POLICY "chores_select" ON "public"."chores" FOR SELECT USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "chores_update" ON "public"."chores" FOR UPDATE USING ("public"."user_has_space_access"("space_id"));



ALTER TABLE "public"."comment_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."compliance_events_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversations_delete" ON "public"."conversations" FOR DELETE USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "conversations_insert" ON "public"."conversations" FOR INSERT WITH CHECK ("public"."user_has_space_access"("space_id"));



CREATE POLICY "conversations_select" ON "public"."conversations" FOR SELECT USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "conversations_update" ON "public"."conversations" FOR UPDATE USING ("public"."user_has_space_access"("space_id"));



ALTER TABLE "public"."custom_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_checkins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "daily_checkins_delete" ON "public"."daily_checkins" FOR DELETE USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "daily_checkins_insert" ON "public"."daily_checkins" FOR INSERT WITH CHECK ("public"."user_has_space_access"("space_id"));



CREATE POLICY "daily_checkins_select" ON "public"."daily_checkins" FOR SELECT USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "daily_checkins_update" ON "public"."daily_checkins" FOR UPDATE USING ("public"."user_has_space_access"("space_id"));



ALTER TABLE "public"."daily_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_export_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_processing_agreements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deleted_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_note_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_proposal_votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_proposals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_reminders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_share_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "events_delete" ON "public"."events" FOR DELETE USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "events_insert" ON "public"."events" FOR INSERT WITH CHECK ("public"."user_has_space_access"("space_id"));



CREATE POLICY "events_select" ON "public"."events" FOR SELECT USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "events_update" ON "public"."events" FOR UPDATE USING ("public"."user_has_space_access"("space_id"));



ALTER TABLE "public"."expense_splits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expense_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "expenses_delete" ON "public"."expenses" FOR DELETE USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "expenses_insert" ON "public"."expenses" FOR INSERT WITH CHECK ("public"."user_has_space_access"("space_id"));



CREATE POLICY "expenses_select" ON "public"."expenses" FOR SELECT USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "expenses_update" ON "public"."expenses" FOR UPDATE USING ("public"."user_has_space_access"("space_id"));



ALTER TABLE "public"."external_calendar_connections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_usage_daily" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."founding_member_counter" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."generated_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goal_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goal_check_in_photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goal_check_in_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goal_check_in_reminders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goal_check_in_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goal_check_ins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goal_collaborators" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goal_comment_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goal_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goal_contributions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goal_dependencies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goal_mentions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goal_milestones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "goal_milestones_delete" ON "public"."goal_milestones" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."goals" "g"
  WHERE (("g"."id" = "goal_milestones"."goal_id") AND "public"."user_has_space_access"("g"."space_id")))));



CREATE POLICY "goal_milestones_insert" ON "public"."goal_milestones" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."goals" "g"
  WHERE (("g"."id" = "goal_milestones"."goal_id") AND "public"."user_has_space_access"("g"."space_id")))));



CREATE POLICY "goal_milestones_select" ON "public"."goal_milestones" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."goals" "g"
  WHERE (("g"."id" = "goal_milestones"."goal_id") AND "public"."user_has_space_access"("g"."space_id")))));



CREATE POLICY "goal_milestones_update" ON "public"."goal_milestones" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."goals" "g"
  WHERE (("g"."id" = "goal_milestones"."goal_id") AND "public"."user_has_space_access"("g"."space_id")))));



ALTER TABLE "public"."goal_nudge_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goal_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goal_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goal_updates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "goal_updates_delete" ON "public"."goal_updates" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."goals" "g"
  WHERE (("g"."id" = "goal_updates"."goal_id") AND "public"."user_has_space_access"("g"."space_id")))));



CREATE POLICY "goal_updates_insert" ON "public"."goal_updates" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."goals" "g"
  WHERE (("g"."id" = "goal_updates"."goal_id") AND "public"."user_has_space_access"("g"."space_id")))));



CREATE POLICY "goal_updates_select" ON "public"."goal_updates" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."goals" "g"
  WHERE (("g"."id" = "goal_updates"."goal_id") AND "public"."user_has_space_access"("g"."space_id")))));



ALTER TABLE "public"."goals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "goals_delete" ON "public"."goals" FOR DELETE USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "goals_insert" ON "public"."goals" FOR INSERT WITH CHECK ("public"."user_has_space_access"("space_id"));



CREATE POLICY "goals_select" ON "public"."goals" FOR SELECT USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "goals_update" ON "public"."goals" FOR UPDATE USING ("public"."user_has_space_access"("space_id"));



ALTER TABLE "public"."habit_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."habit_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."habit_streaks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."in_app_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."late_penalties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."launch_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meal_calendar_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "meal_calendar_events_access" ON "public"."meal_calendar_events" USING (("meal_id" IN ( SELECT "m"."id"
   FROM ("public"."meals" "m"
     JOIN "public"."space_members" "sm" ON (("m"."space_id" = "sm"."space_id")))
  WHERE ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."meal_plan_tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "meal_plan_tasks_delete" ON "public"."meal_plan_tasks" FOR DELETE TO "authenticated" USING (("meal_plan_id" IN ( SELECT "meal_plans"."id"
   FROM "public"."meal_plans"
  WHERE ("meal_plans"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "meal_plan_tasks_insert" ON "public"."meal_plan_tasks" FOR INSERT TO "authenticated" WITH CHECK (("meal_plan_id" IN ( SELECT "meal_plans"."id"
   FROM "public"."meal_plans"
  WHERE ("meal_plans"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "meal_plan_tasks_select" ON "public"."meal_plan_tasks" FOR SELECT TO "authenticated" USING (("meal_plan_id" IN ( SELECT "meal_plans"."id"
   FROM "public"."meal_plans"
  WHERE ("meal_plans"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "meal_plan_tasks_update" ON "public"."meal_plan_tasks" FOR UPDATE TO "authenticated" USING (("meal_plan_id" IN ( SELECT "meal_plans"."id"
   FROM "public"."meal_plans"
  WHERE ("meal_plans"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."meal_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "meal_plans_delete" ON "public"."meal_plans" FOR DELETE USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "meal_plans_insert" ON "public"."meal_plans" FOR INSERT WITH CHECK ("public"."user_has_space_access"("space_id"));



CREATE POLICY "meal_plans_select" ON "public"."meal_plans" FOR SELECT USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "meal_plans_update" ON "public"."meal_plans" FOR UPDATE USING ("public"."user_has_space_access"("space_id"));



ALTER TABLE "public"."meals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "meals_delete" ON "public"."meals" FOR DELETE USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "meals_insert" ON "public"."meals" FOR INSERT WITH CHECK ("public"."user_has_space_access"("space_id"));



CREATE POLICY "meals_select" ON "public"."meals" FOR SELECT USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "meals_update" ON "public"."meals" FOR UPDATE USING ("public"."user_has_space_access"("space_id"));



ALTER TABLE "public"."mentions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_mentions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_delete" ON "public"."messages" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "messages"."conversation_id") AND "public"."user_has_space_access"("c"."space_id")))));



CREATE POLICY "messages_insert" ON "public"."messages" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "messages"."conversation_id") AND "public"."user_has_space_access"("c"."space_id")))));



CREATE POLICY "messages_select" ON "public"."messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "messages"."conversation_id") AND "public"."user_has_space_access"("c"."space_id")))));



CREATE POLICY "messages_update" ON "public"."messages" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "messages"."conversation_id") AND "public"."user_has_space_access"("c"."space_id")))));



ALTER TABLE "public"."milestone_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_interactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nudge_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nudge_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nudge_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."partnership_balances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."point_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."privacy_email_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."privacy_preference_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_line_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "projects_delete" ON "public"."projects" FOR DELETE USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "projects_insert" ON "public"."projects" FOR INSERT WITH CHECK (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "projects_select" ON "public"."projects" FOR SELECT USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "projects_update" ON "public"."projects" FOR UPDATE USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quick_action_usage" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quick_action_usage_delete" ON "public"."quick_action_usage" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "quick_action_usage_insert" ON "public"."quick_action_usage" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "quick_action_usage_select" ON "public"."quick_action_usage" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "quick_action_usage_update" ON "public"."quick_action_usage" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."receipts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "recipes_delete" ON "public"."recipes" FOR DELETE USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "recipes_insert" ON "public"."recipes" FOR INSERT WITH CHECK ("public"."user_has_space_access"("space_id"));



CREATE POLICY "recipes_select" ON "public"."recipes" FOR SELECT USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "recipes_update" ON "public"."recipes" FOR UPDATE USING ("public"."user_has_space_access"("space_id"));



ALTER TABLE "public"."recurring_event_exceptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recurring_expense_patterns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recurring_goal_instances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recurring_goal_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reminder_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reminder_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reminder_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reminder_mentions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reminder_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reminder_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reminders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reminders_delete" ON "public"."reminders" FOR DELETE USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "reminders_insert" ON "public"."reminders" FOR INSERT WITH CHECK ("public"."user_has_space_access"("space_id"));



CREATE POLICY "reminders_select" ON "public"."reminders" FOR SELECT USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "reminders_update" ON "public"."reminders" FOR UPDATE USING ("public"."user_has_space_access"("space_id"));



ALTER TABLE "public"."report_favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."report_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."report_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reward_points" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reward_redemptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rewards_catalog" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_bypass_chore_rotations" ON "public"."chore_rotations" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_bypass_meal_plan_tasks" ON "public"."meal_plan_tasks" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_bypass_quick_action_usage" ON "public"."quick_action_usage" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_bypass_subtasks" ON "public"."subtasks" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_bypass_task_activity_log" ON "public"."task_activity_log" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_bypass_task_approvals" ON "public"."task_approvals" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_bypass_task_assignments" ON "public"."task_assignments" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_bypass_task_attachments" ON "public"."task_attachments" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_bypass_task_calendar_events" ON "public"."task_calendar_events" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_bypass_task_categories" ON "public"."task_categories" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_bypass_task_comment_reactions" ON "public"."task_comment_reactions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_bypass_task_comments" ON "public"."task_comments" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_bypass_task_dependencies" ON "public"."task_dependencies" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_bypass_task_handoffs" ON "public"."task_handoffs" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_bypass_task_reactions" ON "public"."task_reactions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_bypass_task_reminders" ON "public"."task_reminders" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_bypass_task_snooze_history" ON "public"."task_snooze_history" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_bypass_task_templates" ON "public"."task_templates" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_bypass_task_time_entries" ON "public"."task_time_entries" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."settlements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shopping_calendar_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shopping_item_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shopping_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shopping_items_delete" ON "public"."shopping_items" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."shopping_lists" "sl"
  WHERE (("sl"."id" = "shopping_items"."list_id") AND "public"."user_has_space_access"("sl"."space_id")))));



CREATE POLICY "shopping_items_insert" ON "public"."shopping_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."shopping_lists" "sl"
  WHERE (("sl"."id" = "shopping_items"."list_id") AND "public"."user_has_space_access"("sl"."space_id")))));



CREATE POLICY "shopping_items_select" ON "public"."shopping_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."shopping_lists" "sl"
  WHERE (("sl"."id" = "shopping_items"."list_id") AND "public"."user_has_space_access"("sl"."space_id")))));



CREATE POLICY "shopping_items_update" ON "public"."shopping_items" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."shopping_lists" "sl"
  WHERE (("sl"."id" = "shopping_items"."list_id") AND "public"."user_has_space_access"("sl"."space_id")))));



ALTER TABLE "public"."shopping_lists" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shopping_lists_delete" ON "public"."shopping_lists" FOR DELETE USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "shopping_lists_insert" ON "public"."shopping_lists" FOR INSERT WITH CHECK ("public"."user_has_space_access"("space_id"));



CREATE POLICY "shopping_lists_select" ON "public"."shopping_lists" FOR SELECT USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "shopping_lists_update" ON "public"."shopping_lists" FOR UPDATE USING ("public"."user_has_space_access"("space_id"));



ALTER TABLE "public"."shopping_reminders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shopping_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shopping_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."space_invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "space_invitations_delete" ON "public"."space_invitations" FOR DELETE USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "space_invitations_insert" ON "public"."space_invitations" FOR INSERT WITH CHECK ("public"."user_has_space_access"("space_id"));



CREATE POLICY "space_invitations_select" ON "public"."space_invitations" FOR SELECT USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "space_invitations_update" ON "public"."space_invitations" FOR UPDATE USING ("public"."user_has_space_access"("space_id"));



ALTER TABLE "public"."space_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "space_members_delete" ON "public"."space_members" FOR DELETE USING (("public"."check_space_membership"("space_id", ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."space_members" "sm"
  WHERE (("sm"."space_id" = "space_members"."space_id") AND ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("sm"."role" = 'owner'::"text"))))));



CREATE POLICY "space_members_insert" ON "public"."space_members" FOR INSERT WITH CHECK (("user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")));



CREATE POLICY "space_members_select" ON "public"."space_members" FOR SELECT USING (("user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")));



CREATE POLICY "space_members_view_storage" ON "public"."storage_usage" FOR SELECT USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."spaces" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "spaces_delete" ON "public"."spaces" FOR DELETE USING ("public"."user_has_space_access"("id"));



CREATE POLICY "spaces_insert" ON "public"."spaces" FOR INSERT WITH CHECK ((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") IS NOT NULL));



CREATE POLICY "spaces_select" ON "public"."spaces" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."space_members"
  WHERE (("space_members"."space_id" = "spaces"."id") AND ("space_members"."user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))))) OR (("created_at" > ("now"() - '00:00:10'::interval)) AND ("created_by" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")))));



CREATE POLICY "spaces_update" ON "public"."spaces" FOR UPDATE USING ("public"."user_has_space_access"("id"));



ALTER TABLE "public"."storage_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."storage_warnings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_layouts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subtasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subtasks_delete" ON "public"."subtasks" FOR DELETE TO "authenticated" USING (("parent_task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "subtasks_insert" ON "public"."subtasks" FOR INSERT TO "authenticated" WITH CHECK (("parent_task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "subtasks_select" ON "public"."subtasks" FOR SELECT TO "authenticated" USING (("parent_task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "subtasks_update" ON "public"."subtasks" FOR UPDATE TO "authenticated" USING (("parent_task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_activity_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_activity_log_insert" ON "public"."task_activity_log" FOR INSERT TO "authenticated" WITH CHECK (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_activity_log_select" ON "public"."task_activity_log" FOR SELECT TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."task_approvals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_approvals_delete" ON "public"."task_approvals" FOR DELETE TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_approvals_insert" ON "public"."task_approvals" FOR INSERT TO "authenticated" WITH CHECK (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_approvals_select" ON "public"."task_approvals" FOR SELECT TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_approvals_update" ON "public"."task_approvals" FOR UPDATE TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."task_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_assignments_delete" ON "public"."task_assignments" FOR DELETE TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_assignments_insert" ON "public"."task_assignments" FOR INSERT TO "authenticated" WITH CHECK (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_assignments_select" ON "public"."task_assignments" FOR SELECT TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_assignments_update" ON "public"."task_assignments" FOR UPDATE TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."task_attachments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_attachments_delete" ON "public"."task_attachments" FOR DELETE TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_attachments_insert" ON "public"."task_attachments" FOR INSERT TO "authenticated" WITH CHECK (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_attachments_select" ON "public"."task_attachments" FOR SELECT TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_attachments_update" ON "public"."task_attachments" FOR UPDATE TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."task_calendar_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_calendar_events_delete" ON "public"."task_calendar_events" FOR DELETE TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_calendar_events_insert" ON "public"."task_calendar_events" FOR INSERT TO "authenticated" WITH CHECK (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_calendar_events_select" ON "public"."task_calendar_events" FOR SELECT TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_calendar_events_update" ON "public"."task_calendar_events" FOR UPDATE TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."task_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_categories_delete" ON "public"."task_categories" FOR DELETE TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "task_categories_insert" ON "public"."task_categories" FOR INSERT TO "authenticated" WITH CHECK (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "task_categories_select" ON "public"."task_categories" FOR SELECT TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "task_categories_update" ON "public"."task_categories" FOR UPDATE TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."task_comment_reactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_comment_reactions_delete" ON "public"."task_comment_reactions" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "task_comment_reactions_insert" ON "public"."task_comment_reactions" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("comment_id" IN ( SELECT "tc"."id"
   FROM ("public"."task_comments" "tc"
     JOIN "public"."tasks" "t" ON (("tc"."task_id" = "t"."id")))
  WHERE ("t"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "task_comment_reactions_select" ON "public"."task_comment_reactions" FOR SELECT TO "authenticated" USING (("comment_id" IN ( SELECT "tc"."id"
   FROM ("public"."task_comments" "tc"
     JOIN "public"."tasks" "t" ON (("tc"."task_id" = "t"."id")))
  WHERE ("t"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."task_comments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_comments_delete" ON "public"."task_comments" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "task_comments_insert" ON "public"."task_comments" FOR INSERT TO "authenticated" WITH CHECK (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_comments_select" ON "public"."task_comments" FOR SELECT TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_comments_update" ON "public"."task_comments" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."task_dependencies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_dependencies_delete" ON "public"."task_dependencies" FOR DELETE TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_dependencies_insert" ON "public"."task_dependencies" FOR INSERT TO "authenticated" WITH CHECK (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_dependencies_select" ON "public"."task_dependencies" FOR SELECT TO "authenticated" USING ((("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) OR ("depends_on_task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "task_dependencies_update" ON "public"."task_dependencies" FOR UPDATE TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."task_handoffs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_handoffs_delete" ON "public"."task_handoffs" FOR DELETE TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_handoffs_insert" ON "public"."task_handoffs" FOR INSERT TO "authenticated" WITH CHECK (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_handoffs_select" ON "public"."task_handoffs" FOR SELECT TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_handoffs_update" ON "public"."task_handoffs" FOR UPDATE TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."task_reactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_reactions_delete" ON "public"."task_reactions" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "task_reactions_insert" ON "public"."task_reactions" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "task_reactions_select" ON "public"."task_reactions" FOR SELECT TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."task_reminders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_reminders_delete" ON "public"."task_reminders" FOR DELETE TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_reminders_insert" ON "public"."task_reminders" FOR INSERT TO "authenticated" WITH CHECK (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_reminders_select" ON "public"."task_reminders" FOR SELECT TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_reminders_update" ON "public"."task_reminders" FOR UPDATE TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."task_snooze_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_snooze_history_delete" ON "public"."task_snooze_history" FOR DELETE TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_snooze_history_insert" ON "public"."task_snooze_history" FOR INSERT TO "authenticated" WITH CHECK (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_snooze_history_select" ON "public"."task_snooze_history" FOR SELECT TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_snooze_history_update" ON "public"."task_snooze_history" FOR UPDATE TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."task_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_templates_delete" ON "public"."task_templates" FOR DELETE TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "task_templates_insert" ON "public"."task_templates" FOR INSERT TO "authenticated" WITH CHECK (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "task_templates_select" ON "public"."task_templates" FOR SELECT TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "task_templates_update" ON "public"."task_templates" FOR UPDATE TO "authenticated" USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."task_time_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_time_entries_delete" ON "public"."task_time_entries" FOR DELETE TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_time_entries_insert" ON "public"."task_time_entries" FOR INSERT TO "authenticated" WITH CHECK (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_time_entries_select" ON "public"."task_time_entries" FOR SELECT TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "task_time_entries_update" ON "public"."task_time_entries" FOR UPDATE TO "authenticated" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."space_id" IN ( SELECT "space_members"."space_id"
           FROM "public"."space_members"
          WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tasks_delete" ON "public"."tasks" FOR DELETE USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "tasks_insert" ON "public"."tasks" FOR INSERT WITH CHECK ("public"."user_has_space_access"("space_id"));



CREATE POLICY "tasks_select" ON "public"."tasks" FOR SELECT USING ("public"."user_has_space_access"("space_id"));



CREATE POLICY "tasks_update" ON "public"."tasks" FOR UPDATE USING ("public"."user_has_space_access"("space_id"));



ALTER TABLE "public"."typing_indicators" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_calendar_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_presence" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_presence_insert" ON "public"."user_presence" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "user_presence_select" ON "public"."user_presence" FOR SELECT USING (("space_id" IN ( SELECT "space_members"."space_id"
   FROM "public"."space_members"
  WHERE ("space_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "user_presence_update" ON "public"."user_presence" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."user_privacy_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_insert_own" ON "public"."users" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "users_manage_own_warnings" ON "public"."storage_warnings" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "users_select_no_circular_dependency" ON "public"."users" FOR SELECT USING ("public"."can_access_user_profile"("id"));



COMMENT ON POLICY "users_select_no_circular_dependency" ON "public"."users" IS 'Fixed circular dependency by using function that prioritizes auth.uid() = id check. Prevents authentication hanging by ensuring own profile access never queries space_members table.';



CREATE POLICY "users_update_own" ON "public"."users" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



ALTER TABLE "public"."vendors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."voice_note_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."voice_transcriptions" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."add_goal_creator_as_collaborator"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_goal_creator_as_collaborator"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_goal_creator_as_collaborator"() TO "service_role";



GRANT ALL ON FUNCTION "public"."adjust_for_quiet_hours"("p_user_id" "uuid", "p_space_id" "uuid", "p_scheduled_time" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."adjust_for_quiet_hours"("p_user_id" "uuid", "p_space_id" "uuid", "p_scheduled_time" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."adjust_for_quiet_hours"("p_user_id" "uuid", "p_space_id" "uuid", "p_scheduled_time" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."aggregate_feature_usage_daily"("target_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."aggregate_feature_usage_daily"("target_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."aggregate_feature_usage_daily"("target_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."apply_budget_template"("p_space_id" "uuid", "p_template_id" "uuid", "p_monthly_income" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_budget_template"("p_space_id" "uuid", "p_template_id" "uuid", "p_monthly_income" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_budget_template"("p_space_id" "uuid", "p_template_id" "uuid", "p_monthly_income" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_goal_priority_order"() TO "anon";
GRANT ALL ON FUNCTION "public"."assign_goal_priority_order"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_goal_priority_order"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."assign_task_sort_order"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assign_task_sort_order"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_task_sort_order"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."auto_archive_old_events"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auto_archive_old_events"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_archive_old_events"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."auto_archive_old_tasks"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auto_archive_old_tasks"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_archive_old_tasks"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_complete_on_approval"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_complete_on_approval"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_complete_on_approval"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_complete_shopping_tasks"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_complete_shopping_tasks"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_complete_shopping_tasks"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_create_bill_calendar_event"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_create_bill_calendar_event"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_create_bill_calendar_event"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."auto_generate_habit_instances"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auto_generate_habit_instances"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_generate_habit_instances"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_unsnooze_expired_tasks"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_unsnooze_expired_tasks"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_unsnooze_expired_tasks"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."calculate_expense_splits"("p_expense_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."calculate_expense_splits"("p_expense_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_expense_splits"("p_expense_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_goal_completion_date"("p_goal_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_goal_completion_date"("p_goal_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_goal_completion_date"("p_goal_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_late_penalty"("p_due_date" timestamp with time zone, "p_completion_date" timestamp with time zone, "p_grace_period_hours" integer, "p_base_penalty" integer, "p_progressive" boolean, "p_multiplier" numeric, "p_max_penalty" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_late_penalty"("p_due_date" timestamp with time zone, "p_completion_date" timestamp with time zone, "p_grace_period_hours" integer, "p_base_penalty" integer, "p_progressive" boolean, "p_multiplier" numeric, "p_max_penalty" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_late_penalty"("p_due_date" timestamp with time zone, "p_completion_date" timestamp with time zone, "p_grace_period_hours" integer, "p_base_penalty" integer, "p_progressive" boolean, "p_multiplier" numeric, "p_max_penalty" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_next_checkin_date"("frequency" "text", "day_of_week" integer, "day_of_month" integer, "reminder_time" "text", "from_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_next_checkin_date"("frequency" "text", "day_of_week" integer, "day_of_month" integer, "reminder_time" "text", "from_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_next_checkin_date"("frequency" "text", "day_of_week" integer, "day_of_month" integer, "reminder_time" "text", "from_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_next_delivery_time"("p_frequency" "text", "p_base_time" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_next_delivery_time"("p_frequency" "text", "p_base_time" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_next_delivery_time"("p_frequency" "text", "p_base_time" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_next_due_date"("current_due_date" "date", "bill_frequency" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_next_due_date"("current_due_date" "date", "bill_frequency" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_next_due_date"("current_due_date" "date", "bill_frequency" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_next_occurrence"("recurrence_type" "text", "recurrence_pattern" "jsonb", "from_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_next_occurrence"("recurrence_type" "text", "recurrence_pattern" "jsonb", "from_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_next_occurrence"("recurrence_type" "text", "recurrence_pattern" "jsonb", "from_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_reminder_time"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_reminder_time"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_reminder_time"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."calculate_space_storage"("p_space_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."calculate_space_storage"("p_space_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_space_storage"("p_space_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_sync_duration"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_sync_duration"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_sync_duration"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_sync_priority"("p_event_id" "uuid", "p_operation" "public"."queue_operation") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_sync_priority"("p_event_id" "uuid", "p_operation" "public"."queue_operation") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_sync_priority"("p_event_id" "uuid", "p_operation" "public"."queue_operation") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_time_entry_duration"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_time_entry_duration"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_time_entry_duration"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_access_user_profile"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_access_user_profile"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_user_profile"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_and_award_badges"("p_user_id" "uuid", "p_space_id" "uuid", "p_trigger_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_and_award_badges"("p_user_id" "uuid", "p_space_id" "uuid", "p_trigger_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_and_award_badges"("p_user_id" "uuid", "p_space_id" "uuid", "p_trigger_type" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_calendar_index_health"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_calendar_index_health"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_calendar_index_health"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_circular_dependency"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_circular_dependency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_circular_dependency"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_goal_circular_dependency"("p_goal_id" "uuid", "p_depends_on_goal_id" "uuid", "p_space_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_goal_circular_dependency"("p_goal_id" "uuid", "p_depends_on_goal_id" "uuid", "p_space_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_goal_circular_dependency"("p_goal_id" "uuid", "p_depends_on_goal_id" "uuid", "p_space_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_meal_plan_task_uniqueness"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_meal_plan_task_uniqueness"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_meal_plan_task_uniqueness"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_milestone_completion"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_milestone_completion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_milestone_completion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_parent_task_completion"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_parent_task_completion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_parent_task_completion"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_space_membership"("p_space_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_space_membership"("p_space_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_space_membership"("p_space_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_storage_quota"("p_space_id" "uuid", "p_file_size_bytes" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_storage_quota"("p_space_id" "uuid", "p_file_size_bytes" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_storage_quota"("p_space_id" "uuid", "p_file_size_bytes" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_founding_member_number"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_founding_member_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_founding_member_number"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_all_audit_logs"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_all_audit_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_all_audit_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_completed_queue_items"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_completed_queue_items"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_completed_queue_items"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_expired_sessions"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_shopping_tasks"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_shopping_tasks"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_shopping_tasks"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_old_audit_logs"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_old_audit_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_audit_logs"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_old_feature_events"("retention_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_old_feature_events"("retention_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_feature_events"("retention_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_old_notifications"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_old_notifications"("days_to_keep" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"("days_to_keep" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"("days_to_keep" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_quick_action_usage"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_quick_action_usage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_quick_action_usage"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_old_reports"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_old_reports"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_reports"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_sync_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_sync_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_sync_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_typing_indicators"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_typing_indicators"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_typing_indicators"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_bill_calendar_event"("p_expense_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_bill_calendar_event"("p_expense_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_bill_calendar_event"("p_expense_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_checkin_activity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_checkin_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_checkin_activity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_checkin_reaction_activity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_checkin_reaction_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_checkin_reaction_activity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_default_notification_preferences"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_default_notification_preferences"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_notification_preferences"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_default_privacy_preferences"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_default_privacy_preferences"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_privacy_preferences"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_financial_goal_milestones"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_financial_goal_milestones"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_financial_goal_milestones"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_goal_activity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_goal_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_goal_activity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_in_app_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_content" "text", "p_partnership_id" "uuid", "p_priority" "text", "p_space_id" "uuid", "p_space_name" "text", "p_related_item_id" "uuid", "p_related_item_type" "text", "p_action_url" "text", "p_emoji" "text", "p_sender_id" "uuid", "p_sender_name" "text", "p_metadata" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_in_app_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_content" "text", "p_partnership_id" "uuid", "p_priority" "text", "p_space_id" "uuid", "p_space_name" "text", "p_related_item_id" "uuid", "p_related_item_type" "text", "p_action_url" "text", "p_emoji" "text", "p_sender_id" "uuid", "p_sender_name" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_in_app_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_content" "text", "p_partnership_id" "uuid", "p_priority" "text", "p_space_id" "uuid", "p_space_name" "text", "p_related_item_id" "uuid", "p_related_item_type" "text", "p_action_url" "text", "p_emoji" "text", "p_sender_id" "uuid", "p_sender_name" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_mention_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_mention_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_mention_notification"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_milestone_activity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_milestone_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_milestone_activity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_user_profile"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_voice_transcription_entry"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_voice_transcription_entry"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_voice_transcription_entry"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_user_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."days_overdue"("p_due_date" timestamp with time zone, "p_grace_period_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."days_overdue"("p_due_date" timestamp with time zone, "p_grace_period_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."days_overdue"("p_due_date" timestamp with time zone, "p_grace_period_hours" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."deactivate_webhook"("p_webhook_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."deactivate_webhook"("p_webhook_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."deactivate_webhook"("p_webhook_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."deactivate_webhook"("p_webhook_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_bill_calendar_event"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_bill_calendar_event"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_bill_calendar_event"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_calendar_event_for_meal"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_calendar_event_for_meal"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_calendar_event_for_meal"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_oauth_tokens"("p_connection_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_oauth_tokens"("p_connection_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."delete_oauth_tokens"("p_connection_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."extract_mentions_from_comment"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."extract_mentions_from_comment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."extract_mentions_from_comment"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fix_orphaned_users"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fix_orphaned_users"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fix_orphaned_users"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_recurring_instances"("template_id_param" "uuid", "until_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_recurring_instances"("template_id_param" "uuid", "until_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_recurring_instances"("template_id_param" "uuid", "until_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_secure_share_token"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_secure_share_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_secure_share_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_launch_subscribers"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_launch_subscribers"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_launch_subscribers"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_admin_permissions"("user_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_admin_permissions"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_permissions"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_analytics_range"("start_date" "date", "end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_analytics_range"("start_date" "date", "end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_analytics_range"("start_date" "date", "end_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_conversations_with_unread"("space_id_param" "uuid", "user_id_param" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_conversations_with_unread"("space_id_param" "uuid", "user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_conversations_with_unread"("space_id_param" "uuid", "user_id_param" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_daily_usage_count"("p_user_id" "uuid", "p_usage_type" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_daily_usage_count"("p_user_id" "uuid", "p_usage_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_daily_usage_count"("p_user_id" "uuid", "p_usage_type" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_dashboard_summary"("p_space_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_dashboard_summary"("p_space_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_summary"("p_space_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."calendar_webhook_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."calendar_webhook_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_webhook_subscriptions" TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_expiring_webhooks"("hours_ahead" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_expiring_webhooks"("hours_ahead" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_expiring_webhooks"("hours_ahead" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_expiring_webhooks"("hours_ahead" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_feature_usage_summary"("days_back" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_feature_usage_summary"("days_back" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_feature_usage_summary"("days_back" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_founding_member_spots_remaining"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_founding_member_spots_remaining"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_founding_member_spots_remaining"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_goal_dependency_tree"("p_goal_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_goal_dependency_tree"("p_goal_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_goal_dependency_tree"("p_goal_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_meal_time"("meal_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_meal_time"("meal_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_meal_time"("meal_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_rotation_user"("rotation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_rotation_user"("rotation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_rotation_user"("rotation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_or_create_daily_analytics"("target_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_or_create_daily_analytics"("target_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_or_create_daily_analytics"("target_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pending_reminders"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_pending_reminders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pending_reminders"() TO "service_role";



GRANT ALL ON TABLE "public"."calendar_sync_queue" TO "anon";
GRANT ALL ON TABLE "public"."calendar_sync_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_sync_queue" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pending_sync_queue_items"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_pending_sync_queue_items"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pending_sync_queue_items"("p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recent_milestone_celebrations"("p_space_id" "uuid", "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_recent_milestone_celebrations"("p_space_id" "uuid", "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recent_milestone_celebrations"("p_space_id" "uuid", "p_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_reminder_comment_count"("p_reminder_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_reminder_comment_count"("p_reminder_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_reminder_comment_count"("p_reminder_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_smart_nudges"("p_user_id" "uuid", "p_space_id" "uuid", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_smart_nudges"("p_user_id" "uuid", "p_space_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_smart_nudges"("p_user_id" "uuid", "p_space_id" "uuid", "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_task_stats"("p_space_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_task_stats"("p_space_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_task_stats"("p_space_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_unread_mentions"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_unread_mentions"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_mentions"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_upcoming_bills"("p_space_id" "uuid", "p_days_ahead" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_upcoming_bills"("p_space_id" "uuid", "p_days_ahead" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_upcoming_bills"("p_space_id" "uuid", "p_days_ahead" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_subscription_tier"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_subscription_tier"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_subscription_tier"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_yesterday_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_yesterday_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_yesterday_metrics"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user_workspace_provisioning"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user_workspace_provisioning"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_workspace_provisioning"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_token_expiry"("p_connection_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_token_expiry"("p_connection_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_token_expiry"("p_connection_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_admin_role"("user_email" "text", "required_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_admin_role"("user_email" "text", "required_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_admin_role"("user_email" "text", "required_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_beta_requests"("target_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_beta_requests"("target_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_beta_requests"("target_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_daily_usage"("p_user_id" "uuid", "p_usage_type" "text", "p_amount" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_daily_usage"("p_user_id" "uuid", "p_usage_type" "text", "p_amount" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_daily_usage"("p_user_id" "uuid", "p_usage_type" "text", "p_amount" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."increment_template_usage"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."increment_template_usage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_template_usage"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."increment_template_usage"("template_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."increment_template_usage"("template_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_template_usage"("template_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."increment_usage_count"("p_user_id" "uuid", "p_usage_type" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."increment_usage_count"("p_user_id" "uuid", "p_usage_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_usage_count"("p_user_id" "uuid", "p_usage_type" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."increment_webhook_event_count"("p_webhook_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."increment_webhook_event_count"("p_webhook_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_webhook_event_count"("p_webhook_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_webhook_event_count"("p_webhook_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."initialize_subscription"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."initialize_subscription"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."initialize_subscription"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."initialize_user_privacy_preferences"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."initialize_user_privacy_preferences"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."initialize_user_privacy_preferences"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin"("user_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_chore_overdue"("p_due_date" timestamp with time zone, "p_grace_period_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."is_chore_overdue"("p_due_date" timestamp with time zone, "p_grace_period_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_chore_overdue"("p_due_date" timestamp with time zone, "p_grace_period_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_in_quiet_hours"("p_user_id" "uuid", "p_space_id" "uuid", "p_check_time" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."is_in_quiet_hours"("p_user_id" "uuid", "p_space_id" "uuid", "p_check_time" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_in_quiet_hours"("p_user_id" "uuid", "p_space_id" "uuid", "p_check_time" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_token_expired"("p_connection_id" "uuid", "p_buffer_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."is_token_expired"("p_connection_id" "uuid", "p_buffer_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_token_expired"("p_connection_id" "uuid", "p_buffer_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_within_geofence"("p_lat" numeric, "p_lng" numeric, "p_center_lat" numeric, "p_center_lng" numeric, "p_radius_meters" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."is_within_geofence"("p_lat" numeric, "p_lng" numeric, "p_center_lat" numeric, "p_center_lng" numeric, "p_radius_meters" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_within_geofence"("p_lat" numeric, "p_lng" numeric, "p_center_lat" numeric, "p_center_lng" numeric, "p_radius_meters" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."lock_event_for_sync"("p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."lock_event_for_sync"("p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lock_event_for_sync"("p_event_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_comment_activity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_comment_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_comment_activity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_compliance_event"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_compliance_event"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_compliance_event"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_mention_activity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_mention_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_mention_activity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_privacy_preference_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_privacy_preference_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_privacy_preference_change"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_reaction_activity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_reaction_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_reaction_activity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_reminder_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_reminder_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_reminder_change"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_reminder_comment_activity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_reminder_comment_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_reminder_comment_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_task_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_task_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_task_changes"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_all_notifications_read"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_bills_overdue"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_bills_overdue"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_bills_overdue"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_checkin_reminder_completed"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_checkin_reminder_completed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_checkin_reminder_completed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_inactive_users_offline"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_inactive_users_offline"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_inactive_users_offline"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_queue_item_completed"("p_queue_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_queue_item_completed"("p_queue_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_queue_item_completed"("p_queue_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_queue_item_failed"("p_queue_id" "uuid", "p_error_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_queue_item_failed"("p_queue_id" "uuid", "p_error_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_queue_item_failed"("p_queue_id" "uuid", "p_error_message" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_queue_item_processing"("p_queue_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_queue_item_processing"("p_queue_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_queue_item_processing"("p_queue_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_reminder_sent"("reminder_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_reminder_sent"("reminder_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_reminder_sent"("reminder_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."meal_event_title"("p_meal_type" "text", "p_meal_name" "text", "p_recipe_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."meal_event_title"("p_meal_type" "text", "p_meal_name" "text", "p_recipe_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."meal_event_title"("p_meal_type" "text", "p_meal_name" "text", "p_recipe_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."meal_type_default_time"("p_meal_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."meal_type_default_time"("p_meal_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."meal_type_default_time"("p_meal_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."meal_type_duration"("p_meal_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."meal_type_duration"("p_meal_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."meal_type_duration"("p_meal_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."meal_type_emoji"("p_meal_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."meal_type_emoji"("p_meal_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."meal_type_emoji"("p_meal_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_chore_rotations"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_chore_rotations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_chore_rotations"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."provision_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."provision_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."provision_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."queue_calendar_sync_on_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."queue_calendar_sync_on_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."queue_calendar_sync_on_change"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_admin_login"("user_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_admin_login"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_admin_login"("user_email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_feature_event"("p_user_id" "uuid", "p_space_id" "uuid", "p_feature" "text", "p_action" "text", "p_metadata" "jsonb", "p_device_type" "text", "p_browser" "text", "p_os" "text", "p_session_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_feature_event"("p_user_id" "uuid", "p_space_id" "uuid", "p_feature" "text", "p_action" "text", "p_metadata" "jsonb", "p_device_type" "text", "p_browser" "text", "p_os" "text", "p_session_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_feature_event"("p_user_id" "uuid", "p_space_id" "uuid", "p_feature" "text", "p_action" "text", "p_metadata" "jsonb", "p_device_type" "text", "p_browser" "text", "p_os" "text", "p_session_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_subscription_event"("p_user_id" "uuid", "p_event_type" "text", "p_from_tier" "text", "p_to_tier" "text", "p_trigger_source" "text", "p_metadata" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_subscription_event"("p_user_id" "uuid", "p_event_type" "text", "p_from_tier" "text", "p_to_tier" "text", "p_trigger_source" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_subscription_event"("p_user_id" "uuid", "p_event_type" "text", "p_from_tier" "text", "p_to_tier" "text", "p_trigger_source" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_task_handoff"() TO "anon";
GRANT ALL ON FUNCTION "public"."record_task_handoff"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_task_handoff"() TO "service_role";



GRANT ALL ON FUNCTION "public"."record_task_snooze"() TO "anon";
GRANT ALL ON FUNCTION "public"."record_task_snooze"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_task_snooze"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_quick_action_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_quick_action_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_quick_action_stats"() TO "service_role";



GRANT ALL ON TABLE "public"."calendar_sync_conflicts" TO "anon";
GRANT ALL ON TABLE "public"."calendar_sync_conflicts" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_sync_conflicts" TO "service_role";



REVOKE ALL ON FUNCTION "public"."resolve_calendar_conflict"("conflict_id" "uuid", "p_winning_source" "public"."winning_source", "p_resolved_by" "uuid", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resolve_calendar_conflict"("conflict_id" "uuid", "p_winning_source" "public"."winning_source", "p_resolved_by" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_calendar_conflict"("conflict_id" "uuid", "p_winning_source" "public"."winning_source", "p_resolved_by" "uuid", "p_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."schedule_next_checkin_reminder"("p_goal_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."schedule_next_checkin_reminder"("p_goal_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."schedule_next_checkin_reminder"("p_goal_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."search_voice_transcriptions"("p_user_id" "uuid", "p_query" "text", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."search_voice_transcriptions"("p_user_id" "uuid", "p_query" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_voice_transcriptions"("p_user_id" "uuid", "p_query" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_attachment_type_flags"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_attachment_type_flags"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_attachment_type_flags"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_initial_next_due_date"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_initial_next_due_date"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_initial_next_due_date"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_notification_read_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_notification_read_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_notification_read_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_pinned_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_pinned_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_pinned_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_shopping_task_auto_times"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_shopping_task_auto_times"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_shopping_task_auto_times"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_space_creator"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_space_creator"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_space_creator"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."should_send_notification"("p_user_id" "uuid", "p_space_id" "uuid", "p_notification_type" "text", "p_channel" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."should_send_notification"("p_user_id" "uuid", "p_space_id" "uuid", "p_notification_type" "text", "p_channel" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."should_send_notification"("p_user_id" "uuid", "p_space_id" "uuid", "p_notification_type" "text", "p_channel" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_chore_to_calendar"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_chore_to_calendar"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_chore_to_calendar"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_meal_to_calendar"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_meal_to_calendar"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_meal_to_calendar"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_task_primary_assignment"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_task_primary_assignment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_task_primary_assignment"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_task_to_calendar"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_task_to_calendar"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_task_to_calendar"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."track_shopping_item_history"() TO "anon";
GRANT ALL ON FUNCTION "public"."track_shopping_item_history"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_shopping_item_history"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_calculate_splits"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_calculate_splits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_calculate_splits"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."trigger_schedule_checkin_reminders"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."trigger_schedule_checkin_reminders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_schedule_checkin_reminders"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unlock_all_sync_locked_events"() TO "anon";
GRANT ALL ON FUNCTION "public"."unlock_all_sync_locked_events"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."unlock_all_sync_locked_events"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unlock_event_after_sync"("p_event_id" "uuid", "p_mark_synced" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."unlock_event_after_sync"("p_event_id" "uuid", "p_mark_synced" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."unlock_event_after_sync"("p_event_id" "uuid", "p_mark_synced" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."unsubscribe_launch_notification"("email_address" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."unsubscribe_launch_notification"("email_address" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unsubscribe_launch_notification"("email_address" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_achievement_badges_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_achievement_badges_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_achievement_badges_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_achievement_progress_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_achievement_progress_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_achievement_progress_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_bill_calendar_event"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_bill_calendar_event"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_bill_calendar_event"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_bills_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_bills_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_bills_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_blocked_tasks_on_completion"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_blocked_tasks_on_completion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_blocked_tasks_on_completion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_budgets_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_budgets_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_budgets_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_calendar_event_from_chore"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_calendar_event_from_chore"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_calendar_event_from_chore"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_calendar_event_from_meal"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_calendar_event_from_meal"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_calendar_event_from_meal"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_calendar_event_from_task"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_calendar_event_from_task"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_calendar_event_from_task"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_calendar_table_statistics"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_calendar_table_statistics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_calendar_table_statistics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ccpa_opt_out_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ccpa_opt_out_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ccpa_opt_out_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_chore_calendar_events_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_chore_calendar_events_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_chore_calendar_events_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_chore_rotations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_chore_rotations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_chore_rotations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_chores_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_chores_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_chores_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_comment_reaction_counts"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_comment_reaction_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_comment_reaction_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_custom_categories_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_custom_categories_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_custom_categories_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_daily_active_users"("user_count" integer, "target_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."update_daily_active_users"("user_count" integer, "target_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_daily_active_users"("user_count" integer, "target_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_daily_checkins_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_daily_checkins_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_daily_checkins_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_daily_usage_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_daily_usage_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_daily_usage_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_event_comments_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_event_comments_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_event_comments_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_event_proposals_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_event_proposals_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_event_proposals_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_expenses_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_expenses_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_expenses_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_goal_current_amount"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_goal_current_amount"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_goal_current_amount"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_goal_dependencies_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_goal_dependencies_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_goal_dependencies_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_goal_dependency_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_goal_dependency_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_goal_dependency_status"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_goal_progress_from_checkin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_goal_progress_from_checkin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_goal_progress_from_checkin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_habit_streaks"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_habit_streaks"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_habit_streaks"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_in_app_notifications_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_in_app_notifications_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_in_app_notifications_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_line_item_actual_cost"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_line_item_actual_cost"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_line_item_actual_cost"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_meal_calendar_events_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_meal_calendar_events_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_meal_calendar_events_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_notification_queue_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_notification_queue_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_notification_queue_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_notifications_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_notifications_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_notifications_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_partnership_balance_on_settlement"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_partnership_balance_on_settlement"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_partnership_balance_on_settlement"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_project_actual_cost"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_project_actual_cost"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_project_actual_cost"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_projects_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_projects_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_projects_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_receipts_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_receipts_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_receipts_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_recurring_patterns_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_recurring_patterns_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_recurring_patterns_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_reminder_attachments_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_reminder_attachments_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_reminder_attachments_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_reminder_comment_timestamp"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_reminder_comment_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_reminder_comment_timestamp"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_reminder_template_timestamp"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_reminder_template_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_reminder_template_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_rewards_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_rewards_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_rewards_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_shared_at_secure"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_shared_at_secure"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_shared_at_secure"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_shopping_list_modified"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_shopping_list_modified"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_shopping_list_modified"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_subscriptions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_subscriptions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_subscriptions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_subtasks_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_subtasks_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_subtasks_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_task_actual_duration"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_task_actual_duration"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_task_actual_duration"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_task_approval_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_task_approval_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_task_approval_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_task_approvals_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_task_approvals_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_task_approvals_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_task_blocked_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_task_blocked_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_task_blocked_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_task_calendar_events_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_task_calendar_events_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_task_calendar_events_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_task_categories_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_task_categories_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_task_categories_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_task_comment_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_task_comment_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_task_comment_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_task_comments_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_task_comments_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_task_comments_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_task_handoff_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_task_handoff_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_task_handoff_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_task_reminders_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_task_reminders_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_task_reminders_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_task_stats_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_task_stats_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_task_stats_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_task_templates_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_task_templates_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_task_templates_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_template_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_template_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_template_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_thread_reply_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_thread_reply_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_thread_reply_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_time_entries_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_time_entries_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_time_entries_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_token_expiry"("p_connection_id" "uuid", "p_expires_in_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."update_token_expiry"("p_connection_id" "uuid", "p_expires_in_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_token_expiry"("p_connection_id" "uuid", "p_expires_in_seconds" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_feedback_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_feedback_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_feedback_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_has_space_access"("p_space_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_has_space_access"("p_space_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_space_access"("p_space_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."verify_calendar_rls_enabled"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."verify_calendar_rls_enabled"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_calendar_rls_enabled"() TO "service_role";



GRANT ALL ON TABLE "public"."account_deletion_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."account_deletion_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."account_deletion_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."account_deletion_requests" TO "anon";
GRANT ALL ON TABLE "public"."account_deletion_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."account_deletion_requests" TO "service_role";



GRANT ALL ON TABLE "public"."achievement_badges" TO "anon";
GRANT ALL ON TABLE "public"."achievement_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."achievement_badges" TO "service_role";



GRANT ALL ON TABLE "public"."achievement_progress" TO "anon";
GRANT ALL ON TABLE "public"."achievement_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."achievement_progress" TO "service_role";



GRANT ALL ON TABLE "public"."activity_log" TO "anon";
GRANT ALL ON TABLE "public"."activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."admin_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."admin_users" TO "anon";
GRANT ALL ON TABLE "public"."admin_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_users" TO "service_role";



GRANT ALL ON TABLE "public"."ai_conversations" TO "anon";
GRANT ALL ON TABLE "public"."ai_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."ai_messages" TO "anon";
GRANT ALL ON TABLE "public"."ai_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_messages" TO "service_role";



GRANT ALL ON TABLE "public"."ai_usage_daily" TO "anon";
GRANT ALL ON TABLE "public"."ai_usage_daily" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_usage_daily" TO "service_role";



GRANT ALL ON TABLE "public"."ai_user_settings" TO "anon";
GRANT ALL ON TABLE "public"."ai_user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_user_settings" TO "service_role";



GRANT ALL ON TABLE "public"."availability_blocks" TO "anon";
GRANT ALL ON TABLE "public"."availability_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."availability_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."bills" TO "anon";
GRANT ALL ON TABLE "public"."bills" TO "authenticated";
GRANT ALL ON TABLE "public"."bills" TO "service_role";



GRANT ALL ON TABLE "public"."budget_categories" TO "anon";
GRANT ALL ON TABLE "public"."budget_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_categories" TO "service_role";



GRANT ALL ON TABLE "public"."budget_template_categories" TO "anon";
GRANT ALL ON TABLE "public"."budget_template_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_template_categories" TO "service_role";



GRANT ALL ON TABLE "public"."budget_templates" TO "anon";
GRANT ALL ON TABLE "public"."budget_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_templates" TO "service_role";



GRANT ALL ON TABLE "public"."budgets" TO "anon";
GRANT ALL ON TABLE "public"."budgets" TO "authenticated";
GRANT ALL ON TABLE "public"."budgets" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_connections" TO "anon";
GRANT ALL ON TABLE "public"."calendar_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_connections" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_event_mappings" TO "anon";
GRANT ALL ON TABLE "public"."calendar_event_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_event_mappings" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_sync_logs" TO "anon";
GRANT ALL ON TABLE "public"."calendar_sync_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_sync_logs" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_sync_map" TO "anon";
GRANT ALL ON TABLE "public"."calendar_sync_map" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_sync_map" TO "service_role";



GRANT ALL ON TABLE "public"."ccpa_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."ccpa_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."ccpa_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."ccpa_do_not_sell" TO "anon";
GRANT ALL ON TABLE "public"."ccpa_do_not_sell" TO "authenticated";
GRANT ALL ON TABLE "public"."ccpa_do_not_sell" TO "service_role";



GRANT ALL ON TABLE "public"."ccpa_opt_out_status" TO "anon";
GRANT ALL ON TABLE "public"."ccpa_opt_out_status" TO "authenticated";
GRANT ALL ON TABLE "public"."ccpa_opt_out_status" TO "service_role";



GRANT ALL ON TABLE "public"."checkin_reactions" TO "anon";
GRANT ALL ON TABLE "public"."checkin_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."checkin_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."chore_calendar_events" TO "anon";
GRANT ALL ON TABLE "public"."chore_calendar_events" TO "authenticated";
GRANT ALL ON TABLE "public"."chore_calendar_events" TO "service_role";



GRANT ALL ON TABLE "public"."chore_rotations" TO "anon";
GRANT ALL ON TABLE "public"."chore_rotations" TO "authenticated";
GRANT ALL ON TABLE "public"."chore_rotations" TO "service_role";



GRANT ALL ON TABLE "public"."chores" TO "anon";
GRANT ALL ON TABLE "public"."chores" TO "authenticated";
GRANT ALL ON TABLE "public"."chores" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."comment_counts" TO "anon";
GRANT ALL ON TABLE "public"."comment_counts" TO "authenticated";
GRANT ALL ON TABLE "public"."comment_counts" TO "service_role";



GRANT ALL ON TABLE "public"."comment_reactions" TO "anon";
GRANT ALL ON TABLE "public"."comment_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."comment_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."compliance_events_log" TO "anon";
GRANT ALL ON TABLE "public"."compliance_events_log" TO "authenticated";
GRANT ALL ON TABLE "public"."compliance_events_log" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."custom_categories" TO "anon";
GRANT ALL ON TABLE "public"."custom_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_categories" TO "service_role";



GRANT ALL ON TABLE "public"."daily_analytics" TO "anon";
GRANT ALL ON TABLE "public"."daily_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."daily_checkins" TO "anon";
GRANT ALL ON TABLE "public"."daily_checkins" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_checkins" TO "service_role";



GRANT ALL ON TABLE "public"."daily_usage" TO "anon";
GRANT ALL ON TABLE "public"."daily_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_usage" TO "service_role";



GRANT ALL ON TABLE "public"."data_export_requests" TO "anon";
GRANT ALL ON TABLE "public"."data_export_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."data_export_requests" TO "service_role";



GRANT ALL ON TABLE "public"."data_processing_agreements" TO "anon";
GRANT ALL ON TABLE "public"."data_processing_agreements" TO "authenticated";
GRANT ALL ON TABLE "public"."data_processing_agreements" TO "service_role";



GRANT ALL ON TABLE "public"."deleted_accounts" TO "anon";
GRANT ALL ON TABLE "public"."deleted_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."deleted_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."event_attachments" TO "anon";
GRANT ALL ON TABLE "public"."event_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."event_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."event_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."event_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."event_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."event_comments" TO "anon";
GRANT ALL ON TABLE "public"."event_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."event_comments" TO "service_role";



GRANT ALL ON TABLE "public"."event_note_versions" TO "anon";
GRANT ALL ON TABLE "public"."event_note_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."event_note_versions" TO "service_role";



GRANT ALL ON TABLE "public"."event_notes" TO "anon";
GRANT ALL ON TABLE "public"."event_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."event_notes" TO "service_role";



GRANT ALL ON TABLE "public"."event_proposal_votes" TO "anon";
GRANT ALL ON TABLE "public"."event_proposal_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."event_proposal_votes" TO "service_role";



GRANT ALL ON TABLE "public"."event_proposals" TO "anon";
GRANT ALL ON TABLE "public"."event_proposals" TO "authenticated";
GRANT ALL ON TABLE "public"."event_proposals" TO "service_role";



GRANT ALL ON TABLE "public"."event_reminders" TO "anon";
GRANT ALL ON TABLE "public"."event_reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."event_reminders" TO "service_role";



GRANT ALL ON TABLE "public"."event_share_links" TO "anon";
GRANT ALL ON TABLE "public"."event_share_links" TO "authenticated";
GRANT ALL ON TABLE "public"."event_share_links" TO "service_role";



GRANT ALL ON TABLE "public"."event_templates" TO "anon";
GRANT ALL ON TABLE "public"."event_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."event_templates" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."expense_splits" TO "anon";
GRANT ALL ON TABLE "public"."expense_splits" TO "authenticated";
GRANT ALL ON TABLE "public"."expense_splits" TO "service_role";



GRANT ALL ON TABLE "public"."expense_tags" TO "anon";
GRANT ALL ON TABLE "public"."expense_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."expense_tags" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."external_calendar_connections" TO "anon";
GRANT ALL ON TABLE "public"."external_calendar_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."external_calendar_connections" TO "service_role";



GRANT ALL ON TABLE "public"."feature_events" TO "anon";
GRANT ALL ON TABLE "public"."feature_events" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_events" TO "service_role";



GRANT ALL ON TABLE "public"."feature_usage_daily" TO "anon";
GRANT ALL ON TABLE "public"."feature_usage_daily" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_usage_daily" TO "service_role";



GRANT ALL ON TABLE "public"."founding_member_counter" TO "anon";
GRANT ALL ON TABLE "public"."founding_member_counter" TO "authenticated";
GRANT ALL ON TABLE "public"."founding_member_counter" TO "service_role";



GRANT ALL ON TABLE "public"."generated_reports" TO "anon";
GRANT ALL ON TABLE "public"."generated_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."generated_reports" TO "service_role";



GRANT ALL ON TABLE "public"."goal_activities" TO "anon";
GRANT ALL ON TABLE "public"."goal_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_activities" TO "service_role";



GRANT ALL ON TABLE "public"."goal_check_in_photos" TO "anon";
GRANT ALL ON TABLE "public"."goal_check_in_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_check_in_photos" TO "service_role";



GRANT ALL ON TABLE "public"."goal_check_in_reactions" TO "anon";
GRANT ALL ON TABLE "public"."goal_check_in_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_check_in_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."goal_check_in_reminders" TO "anon";
GRANT ALL ON TABLE "public"."goal_check_in_reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_check_in_reminders" TO "service_role";



GRANT ALL ON TABLE "public"."goal_check_in_settings" TO "anon";
GRANT ALL ON TABLE "public"."goal_check_in_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_check_in_settings" TO "service_role";



GRANT ALL ON TABLE "public"."goal_check_ins" TO "anon";
GRANT ALL ON TABLE "public"."goal_check_ins" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_check_ins" TO "service_role";



GRANT ALL ON TABLE "public"."goal_collaborators" TO "anon";
GRANT ALL ON TABLE "public"."goal_collaborators" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_collaborators" TO "service_role";



GRANT ALL ON TABLE "public"."goal_comment_reactions" TO "anon";
GRANT ALL ON TABLE "public"."goal_comment_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_comment_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."goal_comments" TO "anon";
GRANT ALL ON TABLE "public"."goal_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_comments" TO "service_role";



GRANT ALL ON TABLE "public"."goal_contributions" TO "anon";
GRANT ALL ON TABLE "public"."goal_contributions" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_contributions" TO "service_role";



GRANT ALL ON TABLE "public"."goals" TO "anon";
GRANT ALL ON TABLE "public"."goals" TO "authenticated";
GRANT ALL ON TABLE "public"."goals" TO "service_role";



GRANT ALL ON TABLE "public"."goal_contribution_stats" TO "anon";
GRANT ALL ON TABLE "public"."goal_contribution_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_contribution_stats" TO "service_role";



GRANT ALL ON TABLE "public"."goal_dependencies" TO "anon";
GRANT ALL ON TABLE "public"."goal_dependencies" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_dependencies" TO "service_role";



GRANT ALL ON TABLE "public"."goal_mentions" TO "anon";
GRANT ALL ON TABLE "public"."goal_mentions" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_mentions" TO "service_role";



GRANT ALL ON TABLE "public"."goal_milestones" TO "anon";
GRANT ALL ON TABLE "public"."goal_milestones" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_milestones" TO "service_role";



GRANT ALL ON TABLE "public"."goal_nudge_tracking" TO "anon";
GRANT ALL ON TABLE "public"."goal_nudge_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_nudge_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."goal_tags" TO "anon";
GRANT ALL ON TABLE "public"."goal_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_tags" TO "service_role";



GRANT ALL ON TABLE "public"."goal_templates" TO "anon";
GRANT ALL ON TABLE "public"."goal_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_templates" TO "service_role";



GRANT ALL ON TABLE "public"."goal_updates" TO "anon";
GRANT ALL ON TABLE "public"."goal_updates" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_updates" TO "service_role";



GRANT ALL ON TABLE "public"."habit_analytics" TO "anon";
GRANT ALL ON TABLE "public"."habit_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."habit_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."habit_entries" TO "anon";
GRANT ALL ON TABLE "public"."habit_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."habit_entries" TO "service_role";



GRANT ALL ON TABLE "public"."habit_streaks" TO "anon";
GRANT ALL ON TABLE "public"."habit_streaks" TO "authenticated";
GRANT ALL ON TABLE "public"."habit_streaks" TO "service_role";



GRANT ALL ON TABLE "public"."in_app_notifications" TO "anon";
GRANT ALL ON TABLE "public"."in_app_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."in_app_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."late_penalties" TO "anon";
GRANT ALL ON TABLE "public"."late_penalties" TO "authenticated";
GRANT ALL ON TABLE "public"."late_penalties" TO "service_role";



GRANT ALL ON TABLE "public"."launch_notifications" TO "anon";
GRANT ALL ON TABLE "public"."launch_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."launch_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."meal_calendar_events" TO "anon";
GRANT ALL ON TABLE "public"."meal_calendar_events" TO "authenticated";
GRANT ALL ON TABLE "public"."meal_calendar_events" TO "service_role";



GRANT ALL ON TABLE "public"."meal_plan_tasks" TO "anon";
GRANT ALL ON TABLE "public"."meal_plan_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."meal_plan_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."meal_plans" TO "anon";
GRANT ALL ON TABLE "public"."meal_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."meal_plans" TO "service_role";



GRANT ALL ON TABLE "public"."meals" TO "anon";
GRANT ALL ON TABLE "public"."meals" TO "authenticated";
GRANT ALL ON TABLE "public"."meals" TO "service_role";



GRANT ALL ON TABLE "public"."mentions" TO "anon";
GRANT ALL ON TABLE "public"."mentions" TO "authenticated";
GRANT ALL ON TABLE "public"."mentions" TO "service_role";



GRANT ALL ON TABLE "public"."message_attachments" TO "anon";
GRANT ALL ON TABLE "public"."message_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."message_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."message_mentions" TO "anon";
GRANT ALL ON TABLE "public"."message_mentions" TO "authenticated";
GRANT ALL ON TABLE "public"."message_mentions" TO "service_role";



GRANT ALL ON TABLE "public"."message_reactions" TO "anon";
GRANT ALL ON TABLE "public"."message_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."message_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."milestone_templates" TO "anon";
GRANT ALL ON TABLE "public"."milestone_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."milestone_templates" TO "service_role";



GRANT ALL ON TABLE "public"."notification_interactions" TO "anon";
GRANT ALL ON TABLE "public"."notification_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_interactions" TO "service_role";



GRANT ALL ON TABLE "public"."notification_log" TO "anon";
GRANT ALL ON TABLE "public"."notification_log" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_log" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."nudge_history" TO "anon";
GRANT ALL ON TABLE "public"."nudge_history" TO "authenticated";
GRANT ALL ON TABLE "public"."nudge_history" TO "service_role";



GRANT ALL ON TABLE "public"."nudge_settings" TO "anon";
GRANT ALL ON TABLE "public"."nudge_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."nudge_settings" TO "service_role";



GRANT ALL ON TABLE "public"."nudge_templates" TO "anon";
GRANT ALL ON TABLE "public"."nudge_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."nudge_templates" TO "service_role";



GRANT ALL ON TABLE "public"."partnership_balances" TO "anon";
GRANT ALL ON TABLE "public"."partnership_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."partnership_balances" TO "service_role";



GRANT ALL ON TABLE "public"."point_transactions" TO "anon";
GRANT ALL ON TABLE "public"."point_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."point_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."privacy_email_notifications" TO "anon";
GRANT ALL ON TABLE "public"."privacy_email_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."privacy_email_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."privacy_preference_history" TO "anon";
GRANT ALL ON TABLE "public"."privacy_preference_history" TO "authenticated";
GRANT ALL ON TABLE "public"."privacy_preference_history" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."project_line_items" TO "anon";
GRANT ALL ON TABLE "public"."project_line_items" TO "authenticated";
GRANT ALL ON TABLE "public"."project_line_items" TO "service_role";



GRANT ALL ON TABLE "public"."project_cost_breakdown" TO "anon";
GRANT ALL ON TABLE "public"."project_cost_breakdown" TO "authenticated";
GRANT ALL ON TABLE "public"."project_cost_breakdown" TO "service_role";



GRANT ALL ON TABLE "public"."project_photos" TO "anon";
GRANT ALL ON TABLE "public"."project_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."project_photos" TO "service_role";



GRANT ALL ON TABLE "public"."project_summary" TO "anon";
GRANT ALL ON TABLE "public"."project_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."project_summary" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."push_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."quick_action_usage" TO "anon";
GRANT ALL ON TABLE "public"."quick_action_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."quick_action_usage" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."quick_action_stats" TO "anon";
GRANT ALL ON TABLE "public"."quick_action_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."quick_action_stats" TO "service_role";



GRANT ALL ON TABLE "public"."reaction_counts" TO "anon";
GRANT ALL ON TABLE "public"."reaction_counts" TO "authenticated";
GRANT ALL ON TABLE "public"."reaction_counts" TO "service_role";



GRANT ALL ON TABLE "public"."receipts" TO "anon";
GRANT ALL ON TABLE "public"."receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."receipts" TO "service_role";



GRANT ALL ON TABLE "public"."recipes" TO "anon";
GRANT ALL ON TABLE "public"."recipes" TO "authenticated";
GRANT ALL ON TABLE "public"."recipes" TO "service_role";



GRANT ALL ON TABLE "public"."recurring_event_exceptions" TO "anon";
GRANT ALL ON TABLE "public"."recurring_event_exceptions" TO "authenticated";
GRANT ALL ON TABLE "public"."recurring_event_exceptions" TO "service_role";



GRANT ALL ON TABLE "public"."recurring_expense_patterns" TO "anon";
GRANT ALL ON TABLE "public"."recurring_expense_patterns" TO "authenticated";
GRANT ALL ON TABLE "public"."recurring_expense_patterns" TO "service_role";



GRANT ALL ON TABLE "public"."recurring_goal_instances" TO "anon";
GRANT ALL ON TABLE "public"."recurring_goal_instances" TO "authenticated";
GRANT ALL ON TABLE "public"."recurring_goal_instances" TO "service_role";



GRANT ALL ON TABLE "public"."recurring_goal_templates" TO "anon";
GRANT ALL ON TABLE "public"."recurring_goal_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."recurring_goal_templates" TO "service_role";



GRANT ALL ON TABLE "public"."reminder_activities" TO "anon";
GRANT ALL ON TABLE "public"."reminder_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."reminder_activities" TO "service_role";



GRANT ALL ON TABLE "public"."reminder_attachments" TO "anon";
GRANT ALL ON TABLE "public"."reminder_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."reminder_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."reminder_comments" TO "anon";
GRANT ALL ON TABLE "public"."reminder_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."reminder_comments" TO "service_role";



GRANT ALL ON TABLE "public"."reminder_mentions" TO "anon";
GRANT ALL ON TABLE "public"."reminder_mentions" TO "authenticated";
GRANT ALL ON TABLE "public"."reminder_mentions" TO "service_role";



GRANT ALL ON TABLE "public"."reminder_notifications" TO "anon";
GRANT ALL ON TABLE "public"."reminder_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."reminder_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."reminder_templates" TO "anon";
GRANT ALL ON TABLE "public"."reminder_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."reminder_templates" TO "service_role";



GRANT ALL ON TABLE "public"."reminders" TO "anon";
GRANT ALL ON TABLE "public"."reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."reminders" TO "service_role";



GRANT ALL ON TABLE "public"."report_favorites" TO "anon";
GRANT ALL ON TABLE "public"."report_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."report_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."report_schedules" TO "anon";
GRANT ALL ON TABLE "public"."report_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."report_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."report_templates" TO "anon";
GRANT ALL ON TABLE "public"."report_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."report_templates" TO "service_role";



GRANT ALL ON TABLE "public"."reward_points" TO "anon";
GRANT ALL ON TABLE "public"."reward_points" TO "authenticated";
GRANT ALL ON TABLE "public"."reward_points" TO "service_role";



GRANT ALL ON TABLE "public"."reward_redemptions" TO "anon";
GRANT ALL ON TABLE "public"."reward_redemptions" TO "authenticated";
GRANT ALL ON TABLE "public"."reward_redemptions" TO "service_role";



GRANT ALL ON TABLE "public"."rewards_catalog" TO "anon";
GRANT ALL ON TABLE "public"."rewards_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."rewards_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."settlements" TO "anon";
GRANT ALL ON TABLE "public"."settlements" TO "authenticated";
GRANT ALL ON TABLE "public"."settlements" TO "service_role";



GRANT ALL ON TABLE "public"."settlement_summary" TO "anon";
GRANT ALL ON TABLE "public"."settlement_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."settlement_summary" TO "service_role";



GRANT ALL ON TABLE "public"."shopping_calendar_events" TO "anon";
GRANT ALL ON TABLE "public"."shopping_calendar_events" TO "authenticated";
GRANT ALL ON TABLE "public"."shopping_calendar_events" TO "service_role";



GRANT ALL ON TABLE "public"."shopping_item_history" TO "anon";
GRANT ALL ON TABLE "public"."shopping_item_history" TO "authenticated";
GRANT ALL ON TABLE "public"."shopping_item_history" TO "service_role";



GRANT ALL ON TABLE "public"."shopping_items" TO "anon";
GRANT ALL ON TABLE "public"."shopping_items" TO "authenticated";
GRANT ALL ON TABLE "public"."shopping_items" TO "service_role";



GRANT ALL ON TABLE "public"."shopping_lists" TO "anon";
GRANT ALL ON TABLE "public"."shopping_lists" TO "authenticated";
GRANT ALL ON TABLE "public"."shopping_lists" TO "service_role";



GRANT ALL ON TABLE "public"."shopping_reminders" TO "anon";
GRANT ALL ON TABLE "public"."shopping_reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."shopping_reminders" TO "service_role";



GRANT ALL ON TABLE "public"."shopping_tasks" TO "anon";
GRANT ALL ON TABLE "public"."shopping_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."shopping_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."shopping_templates" TO "anon";
GRANT ALL ON TABLE "public"."shopping_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."shopping_templates" TO "service_role";



GRANT ALL ON TABLE "public"."space_invitations" TO "anon";
GRANT ALL ON TABLE "public"."space_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."space_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."space_members" TO "anon";
GRANT ALL ON TABLE "public"."space_members" TO "authenticated";
GRANT ALL ON TABLE "public"."space_members" TO "service_role";



GRANT ALL ON TABLE "public"."user_presence" TO "anon";
GRANT ALL ON TABLE "public"."user_presence" TO "authenticated";
GRANT ALL ON TABLE "public"."user_presence" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."space_members_with_presence" TO "anon";
GRANT ALL ON TABLE "public"."space_members_with_presence" TO "authenticated";
GRANT ALL ON TABLE "public"."space_members_with_presence" TO "service_role";



GRANT ALL ON TABLE "public"."spaces" TO "anon";
GRANT ALL ON TABLE "public"."spaces" TO "authenticated";
GRANT ALL ON TABLE "public"."spaces" TO "service_role";



GRANT ALL ON TABLE "public"."storage_usage" TO "anon";
GRANT ALL ON TABLE "public"."storage_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."storage_usage" TO "service_role";



GRANT ALL ON TABLE "public"."storage_warnings" TO "anon";
GRANT ALL ON TABLE "public"."storage_warnings" TO "authenticated";
GRANT ALL ON TABLE "public"."storage_warnings" TO "service_role";



GRANT ALL ON TABLE "public"."store_layouts" TO "anon";
GRANT ALL ON TABLE "public"."store_layouts" TO "authenticated";
GRANT ALL ON TABLE "public"."store_layouts" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_events" TO "anon";
GRANT ALL ON TABLE "public"."subscription_events" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_events" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."subtasks" TO "anon";
GRANT ALL ON TABLE "public"."subtasks" TO "authenticated";
GRANT ALL ON TABLE "public"."subtasks" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON TABLE "public"."task_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."task_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."task_activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."task_approvals" TO "anon";
GRANT ALL ON TABLE "public"."task_approvals" TO "authenticated";
GRANT ALL ON TABLE "public"."task_approvals" TO "service_role";



GRANT ALL ON TABLE "public"."task_assignments" TO "anon";
GRANT ALL ON TABLE "public"."task_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."task_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."task_attachments" TO "anon";
GRANT ALL ON TABLE "public"."task_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."task_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."task_calendar_events" TO "anon";
GRANT ALL ON TABLE "public"."task_calendar_events" TO "authenticated";
GRANT ALL ON TABLE "public"."task_calendar_events" TO "service_role";



GRANT ALL ON TABLE "public"."task_categories" TO "anon";
GRANT ALL ON TABLE "public"."task_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."task_categories" TO "service_role";



GRANT ALL ON TABLE "public"."task_comment_reactions" TO "anon";
GRANT ALL ON TABLE "public"."task_comment_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."task_comment_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."task_comments" TO "anon";
GRANT ALL ON TABLE "public"."task_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."task_comments" TO "service_role";



GRANT ALL ON TABLE "public"."task_dependencies" TO "anon";
GRANT ALL ON TABLE "public"."task_dependencies" TO "authenticated";
GRANT ALL ON TABLE "public"."task_dependencies" TO "service_role";



GRANT ALL ON TABLE "public"."task_handoffs" TO "anon";
GRANT ALL ON TABLE "public"."task_handoffs" TO "authenticated";
GRANT ALL ON TABLE "public"."task_handoffs" TO "service_role";



GRANT ALL ON TABLE "public"."task_reactions" TO "anon";
GRANT ALL ON TABLE "public"."task_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."task_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."task_reminders" TO "anon";
GRANT ALL ON TABLE "public"."task_reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."task_reminders" TO "service_role";



GRANT ALL ON TABLE "public"."task_snooze_history" TO "anon";
GRANT ALL ON TABLE "public"."task_snooze_history" TO "authenticated";
GRANT ALL ON TABLE "public"."task_snooze_history" TO "service_role";



GRANT ALL ON TABLE "public"."task_stats" TO "anon";
GRANT ALL ON TABLE "public"."task_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."task_stats" TO "service_role";



GRANT ALL ON TABLE "public"."task_tags" TO "anon";
GRANT ALL ON TABLE "public"."task_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."task_tags" TO "service_role";



GRANT ALL ON TABLE "public"."task_templates" TO "anon";
GRANT ALL ON TABLE "public"."task_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."task_templates" TO "service_role";



GRANT ALL ON TABLE "public"."task_time_entries" TO "anon";
GRANT ALL ON TABLE "public"."task_time_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."task_time_entries" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."typing_indicators" TO "anon";
GRANT ALL ON TABLE "public"."typing_indicators" TO "authenticated";
GRANT ALL ON TABLE "public"."typing_indicators" TO "service_role";



GRANT ALL ON TABLE "public"."unread_mentions" TO "anon";
GRANT ALL ON TABLE "public"."unread_mentions" TO "authenticated";
GRANT ALL ON TABLE "public"."unread_mentions" TO "service_role";



GRANT ALL ON TABLE "public"."upgrade_page_visits" TO "anon";
GRANT ALL ON TABLE "public"."upgrade_page_visits" TO "authenticated";
GRANT ALL ON TABLE "public"."upgrade_page_visits" TO "service_role";



GRANT ALL ON TABLE "public"."upgrade_conversion_stats" TO "anon";
GRANT ALL ON TABLE "public"."upgrade_conversion_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."upgrade_conversion_stats" TO "service_role";



GRANT ALL ON TABLE "public"."user_achievements" TO "anon";
GRANT ALL ON TABLE "public"."user_achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."user_achievements" TO "service_role";



GRANT ALL ON TABLE "public"."user_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."user_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."user_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."user_calendar_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_calendar_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_calendar_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_feedback" TO "anon";
GRANT ALL ON TABLE "public"."user_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."user_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."user_notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_privacy_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_privacy_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_privacy_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_progress" TO "service_role";



GRANT ALL ON TABLE "public"."user_sessions" TO "anon";
GRANT ALL ON TABLE "public"."user_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."vendor_spend_summary" TO "anon";
GRANT ALL ON TABLE "public"."vendor_spend_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_spend_summary" TO "service_role";



GRANT ALL ON TABLE "public"."vendors" TO "anon";
GRANT ALL ON TABLE "public"."vendors" TO "authenticated";
GRANT ALL ON TABLE "public"."vendors" TO "service_role";



GRANT ALL ON TABLE "public"."voice_note_templates" TO "anon";
GRANT ALL ON TABLE "public"."voice_note_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."voice_note_templates" TO "service_role";



GRANT ALL ON TABLE "public"."voice_transcriptions" TO "anon";
GRANT ALL ON TABLE "public"."voice_transcriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."voice_transcriptions" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";








-- ============================================================================
-- POST-DUMP SECURITY HARDENING
--
-- pg_dump captures explicit grants but Supabase has an event trigger that
-- auto-grants anon/authenticated to new functions on CREATE. Without this
-- block, the squashed migration would silently re-grant anon access to all
-- SECURITY DEFINER functions — undoing the security advisor cleanup that
-- migration 20260503150651_advisor_warn_cleanup.sql originally applied.
--
-- This block re-applies the same revocation pattern: REVOKE EXECUTE FROM
-- anon AND PUBLIC on every public.* SECURITY DEFINER function, then GRANT
-- explicitly to authenticated + service_role. Idempotent — safe to re-run.
-- ============================================================================

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure::text AS sig
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END $$;

-- quick_action_stats materialized view — anon must not have SELECT. Original
-- migration history granted only meaningless ops (INSERT/UPDATE/DELETE on a
-- MV are no-ops); the squash auto-granted ALL via Supabase's trigger which
-- includes SELECT. Restore the original posture.
REVOKE SELECT ON "public"."quick_action_stats" FROM anon;
