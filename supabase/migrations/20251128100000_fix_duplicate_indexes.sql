-- Fix duplicate indexes identified by Supabase Performance Advisor
-- Each pair of indexes is identical; we drop one to save space and improve write performance

-- 1. activity_log: drop idx_activity_log_space, keep idx_activity_log_space_id
DROP INDEX IF EXISTS public.idx_activity_log_space;

-- 2. beta_access_requests: drop older naming convention
DROP INDEX IF EXISTS public.idx_beta_access_granted;
DROP INDEX IF EXISTS public.idx_beta_access_email;

-- 3. chore_completions: drop idx_chore_completions_chore, keep idx_chore_completions_chore_id
DROP INDEX IF EXISTS public.idx_chore_completions_chore;

-- 4. chores: drop idx_chores_space, keep idx_chores_space_id
DROP INDEX IF EXISTS public.idx_chores_space;

-- 5. conversations: drop idx_conversations_space, keep idx_conversations_space_id
DROP INDEX IF EXISTS public.idx_conversations_space;

-- 6. daily_checkins: drop idx_daily_checkins_space, keep idx_daily_checkins_space_id
DROP INDEX IF EXISTS public.idx_daily_checkins_space;

-- 7. deleted_accounts: drop idx_deleted_accounts_deletion_time, keep idx_deleted_accounts_permanent_deletion_at
DROP INDEX IF EXISTS public.idx_deleted_accounts_deletion_time;

-- 8. event_comments: drop idx_event_comments_parent, keep idx_event_comments_parent_id
DROP INDEX IF EXISTS public.idx_event_comments_parent;

-- 9. event_proposal_votes: drop idx_event_proposal_votes_*, keep idx_proposal_votes_*
DROP INDEX IF EXISTS public.idx_event_proposal_votes_proposal_id;
DROP INDEX IF EXISTS public.idx_event_proposal_votes_user_id;

-- 10. events: drop idx_events_space, keep idx_events_space_id
DROP INDEX IF EXISTS public.idx_events_space;

-- 11. expenses: drop idx_expenses_space, keep idx_expenses_space_id
DROP INDEX IF EXISTS public.idx_expenses_space;

-- 12. goal_milestones: drop idx_goal_milestones_goal, keep idx_goal_milestones_goal_id
DROP INDEX IF EXISTS public.idx_goal_milestones_goal;

-- 13. goal_updates: drop idx_goal_updates_goal, keep idx_goal_updates_goal_id
DROP INDEX IF EXISTS public.idx_goal_updates_goal;

-- 14. goals: drop idx_goals_space, keep idx_goals_space_id
DROP INDEX IF EXISTS public.idx_goals_space;

-- 15. habit_entries: drop idx_habit_entries_template, keep idx_habit_entries_template_id
DROP INDEX IF EXISTS public.idx_habit_entries_template;

-- 16. meal_plans: drop idx_meal_plans_space, keep idx_meal_plans_space_id
DROP INDEX IF EXISTS public.idx_meal_plans_space;

-- 17. meals: drop idx_meals_space, keep idx_meals_space_id
DROP INDEX IF EXISTS public.idx_meals_space;

-- 18. messages: drop idx_messages_conversation, keep idx_messages_conversation_id
DROP INDEX IF EXISTS public.idx_messages_conversation;

-- 19. projects: drop idx_projects_space and idx_projects_status, keep projects_space_id_idx and projects_status_idx
DROP INDEX IF EXISTS public.idx_projects_space;
DROP INDEX IF EXISTS public.idx_projects_status;

-- 20. recipes: drop idx_recipes_space, keep idx_recipes_space_id
DROP INDEX IF EXISTS public.idx_recipes_space;

-- 21. recurring_goal_templates: drop idx_recurring_goal_templates_*, keep idx_recurring_templates_*
DROP INDEX IF EXISTS public.idx_recurring_goal_templates_is_habit;
DROP INDEX IF EXISTS public.idx_recurring_goal_templates_space_id;

-- 22. reminders: drop idx_reminders_space, keep idx_reminders_space_id
DROP INDEX IF EXISTS public.idx_reminders_space;

-- 23. shopping_items: drop idx_shopping_items_list, keep idx_shopping_items_list_id
DROP INDEX IF EXISTS public.idx_shopping_items_list;

-- 24. shopping_lists: drop idx_shopping_lists_space, keep idx_shopping_lists_space_id
DROP INDEX IF EXISTS public.idx_shopping_lists_space;

-- 25. tasks: drop idx_tasks_space, keep idx_tasks_space_id
DROP INDEX IF EXISTS public.idx_tasks_space;
