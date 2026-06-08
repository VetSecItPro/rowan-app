-- Fix dashboard task "in progress" count (status enum mismatch).
--
-- Found by the dashboard-RPC audit (8 June). get_dashboard_summary counted
-- tasks with status = 'in_progress' (underscore), but the app's Zod schema
-- creates tasks with status = 'in-progress' (HYPHEN) — so the dashboard's task
-- "in progress" count was always 0 for app-created tasks. The tasks CHECK
-- constraint actually allows BOTH spellings, so the robust fix counts both.
--
-- NOTE: projects/goals legitimately store 'in_progress' (underscore) per their
-- own CHECK constraints — those filters are correct and unchanged. Only the
-- TASKS block changes. Every other line is identical to migration
-- 20260608170000 (the calendar_events fix), which this supersedes.

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_space_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
                'inProgress', COUNT(*) FILTER (WHERE status IN ('in_progress', 'in-progress')),
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

        -- CALENDAR EVENTS  (canonical table is `events`; `calendar_events` was an empty orphan)
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
            FROM events WHERE space_id = p_space_id AND deleted_at IS NULL
        ),
        'nextEvent', (
            SELECT row_to_json(e)
            FROM (
                SELECT id, title, start_time, end_time, location, all_day
                FROM events
                WHERE space_id = p_space_id AND start_time >= v_now AND deleted_at IS NULL
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
$function$;;
