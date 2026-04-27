-- Migration: Add covering indexes for unindexed foreign keys
-- Date: 2026-04-27
-- Source: Supabase Performance Advisor finding (19 FKs without covering indexes)
-- Surfaced by direct pg_constraint/pg_index query during /monitor follow-up.
--
-- Why this matters:
-- - Cascade DELETEs scan the referencing table; without an index on the FK
--   column the planner uses a sequential scan (slow on large tables).
-- - JOINs and lookups by FK column are also helped.
--
-- Scope: Only Rowan-owned tables. Shared sm_* tables (sm_deals, sm_invoices,
-- sm_invoice_items) are excluded per the DB isolation rules in CLAUDE.md.
--
-- Naming: idx_<table>_<column> — matches existing convention in
-- 20251128120000_fix_remaining_fk_indexes.sql.

-- Admin domain
CREATE INDEX IF NOT EXISTS idx_admin_goals_created_by ON public.admin_goals(created_by);
CREATE INDEX IF NOT EXISTS idx_admin_users_granted_by ON public.admin_users(granted_by);

-- AI / messages
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON public.ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_pinned_by ON public.messages(pinned_by);

-- Bills / reminders / events linkage
CREATE INDEX IF NOT EXISTS idx_bills_linked_calendar_event_id ON public.bills(linked_calendar_event_id);
CREATE INDEX IF NOT EXISTS idx_reminders_linked_bill_id ON public.reminders(linked_bill_id);
CREATE INDEX IF NOT EXISTS idx_reminder_notifications_goal_id ON public.reminder_notifications(goal_id);

-- Calendar / events
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON public.calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_event_templates_created_by ON public.event_templates(created_by);

-- Goals
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id ON public.goal_milestones(goal_id);

-- Investor summary
CREATE INDEX IF NOT EXISTS idx_investor_summary_tokens_created_by ON public.investor_summary_tokens(created_by);

-- Monetization
CREATE INDEX IF NOT EXISTS idx_monetization_logs_user_id ON public.monetization_logs(user_id);

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON public.project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_space_id ON public.project_milestones(space_id);

-- Rewards
CREATE INDEX IF NOT EXISTS idx_rewards_catalog_space_id ON public.rewards_catalog(space_id);

-- Recipes / shopping
CREATE INDEX IF NOT EXISTS idx_shopping_items_recipe_id ON public.shopping_items(recipe_id);
CREATE INDEX IF NOT EXISTS idx_shopping_tasks_source_recipe_id ON public.shopping_tasks(source_recipe_id);
