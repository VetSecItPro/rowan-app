-- Fix type casting issues in get_dashboard_summary RPC
-- Replace DATE comparisons with proper TIMESTAMPTZ::DATE comparisons

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(
    p_space_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

COMMENT ON FUNCTION public.get_dashboard_summary IS 'Optimized dashboard summary aggregation - replaces 18+ individual queries with single RPC call. Fixed date casting issues.';
