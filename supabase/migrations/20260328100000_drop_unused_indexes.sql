-- Drop unused indexes: 0 scans over 73 days of monitoring (2026-01-14 to 2026-03-28)
-- These are custom indexes that have never been used by any query plan.
-- Primary key and unique constraint indexes are intentionally preserved.

DROP INDEX IF EXISTS public.idx_site_visits_visitor_hash;
DROP INDEX IF EXISTS public.idx_site_visits_path;
DROP INDEX IF EXISTS public.idx_project_milestones_space_id;
DROP INDEX IF EXISTS public.idx_project_milestones_project_id;
DROP INDEX IF EXISTS public.idx_sm_content_published_date;
DROP INDEX IF EXISTS public.idx_sm_contact_inquiries_email;
DROP INDEX IF EXISTS public.idx_messages_pinned_by;
DROP INDEX IF EXISTS public.idx_reminders_linked_bill_id;
DROP INDEX IF EXISTS public.idx_shopping_items_recipe_id;
DROP INDEX IF EXISTS public.idx_subscriptions_founding_member_number;
DROP INDEX IF EXISTS public.idx_subscriptions_is_founding_member;
DROP INDEX IF EXISTS public.idx_monetization_logs_user_id;
DROP INDEX IF EXISTS public.idx_event_templates_created_by;
DROP INDEX IF EXISTS public.idx_rewards_catalog_space_id;
DROP INDEX IF EXISTS public.idx_messages_thread_id;
DROP INDEX IF EXISTS public.idx_goal_milestones_goal_id;
DROP INDEX IF EXISTS public.idx_reminder_notifications_goal_id;
DROP INDEX IF EXISTS public.idx_calendar_events_created_by;
DROP INDEX IF EXISTS public.idx_shopping_tasks_source_recipe_id;
DROP INDEX IF EXISTS public.idx_reminders_assigned_to;
DROP INDEX IF EXISTS public.idx_projects_created_by;
DROP INDEX IF EXISTS public.idx_chores_overdue_check;
DROP INDEX IF EXISTS public.idx_bills_linked_calendar_event_id;
DROP INDEX IF EXISTS public.idx_admin_users_granted_by;
DROP INDEX IF EXISTS public.idx_goals_space_status_target;
DROP INDEX IF EXISTS public.idx_ai_messages_conversation;

-- NOTE: Run manually after migration: VACUUM ANALYZE public.users;
-- The users table has 35x bloat (272KB dead tuples).
-- VACUUM cannot run inside a transaction block (which migrations use).
