-- =============================================
-- FIX SECURITY ADVISOR ISSUES
-- Date: November 28, 2025
-- Purpose: Fix 27 security errors from Supabase Security Advisor
--   - 8 Security Definer Views -> Convert to Security Invoker
--   - 19 Tables with RLS Disabled -> Enable RLS + Add Policies
-- =============================================

-- =============================================
-- PART 1: FIX SECURITY DEFINER VIEWS
-- Recreate views with SECURITY INVOKER so they run with
-- the querying user's permissions, not the view creator's
-- =============================================

-- 1. comment_counts view
DROP VIEW IF EXISTS comment_counts CASCADE;
CREATE VIEW comment_counts
WITH (security_invoker = true)
AS
SELECT
  commentable_type,
  commentable_id,
  COUNT(*) AS comment_count,
  COUNT(DISTINCT created_by) AS unique_commenters,
  MAX(created_at) AS last_comment_at
FROM comments
WHERE is_deleted = false
GROUP BY commentable_type, commentable_id;

GRANT SELECT ON comment_counts TO authenticated;
GRANT SELECT ON comment_counts TO service_role;

-- 2. reaction_counts view
DROP VIEW IF EXISTS reaction_counts CASCADE;
CREATE VIEW reaction_counts
WITH (security_invoker = true)
AS
SELECT
  comment_id,
  emoji,
  COUNT(*) AS reaction_count,
  ARRAY_AGG(user_id) AS user_ids
FROM comment_reactions
GROUP BY comment_id, emoji;

GRANT SELECT ON reaction_counts TO authenticated;
GRANT SELECT ON reaction_counts TO service_role;

-- 3. unread_mentions view
DROP VIEW IF EXISTS unread_mentions CASCADE;
CREATE VIEW unread_mentions
WITH (security_invoker = true)
AS
SELECT
  m.id,
  m.comment_id,
  m.mentioned_user_id,
  c.content AS comment_content,
  c.commentable_type,
  c.commentable_id,
  c.created_by AS comment_author_id,
  u.email AS comment_author_email,
  c.created_at
FROM mentions m
INNER JOIN comments c ON m.comment_id = c.id
INNER JOIN users u ON c.created_by = u.id
WHERE m.is_read = false
  AND c.is_deleted = false;

GRANT SELECT ON unread_mentions TO authenticated;
GRANT SELECT ON unread_mentions TO service_role;

-- 4. vendor_spend_summary view
DROP VIEW IF EXISTS vendor_spend_summary CASCADE;
CREATE VIEW vendor_spend_summary
WITH (security_invoker = true)
AS
SELECT
  v.id AS vendor_id,
  v.space_id,
  v.name,
  v.company_name,
  v.trade,
  v.rating,
  v.is_preferred,
  COUNT(DISTINCT e.project_id) AS project_count,
  COUNT(DISTINCT e.id) AS expense_count,
  COALESCE(SUM(e.amount), 0) AS total_spent,
  MIN(e.date) AS first_transaction_date,
  MAX(e.date) AS last_transaction_date
FROM vendors v
LEFT JOIN expenses e ON v.id = e.vendor_id
GROUP BY v.id;

GRANT SELECT ON vendor_spend_summary TO authenticated;
GRANT SELECT ON vendor_spend_summary TO service_role;

-- 5. project_summary view
DROP VIEW IF EXISTS project_summary CASCADE;
CREATE VIEW project_summary
WITH (security_invoker = true)
AS
SELECT
  p.id AS project_id,
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
  COUNT(DISTINCT pli.id) AS line_item_count,
  COUNT(DISTINCT e.id) AS expense_count,
  COUNT(DISTINCT pp.id) AS photo_count,
  COUNT(DISTINCT v.id) AS vendor_count,
  ARRAY_AGG(DISTINCT v.name) FILTER (WHERE v.name IS NOT NULL) AS vendor_names,
  p.created_by,
  p.created_at,
  p.updated_at
FROM projects p
LEFT JOIN project_line_items pli ON p.id = pli.project_id
LEFT JOIN expenses e ON p.id = e.project_id
LEFT JOIN project_photos pp ON p.id = pp.project_id
LEFT JOIN vendors v ON pli.vendor_id = v.id OR e.vendor_id = v.id
GROUP BY p.id;

GRANT SELECT ON project_summary TO authenticated;
GRANT SELECT ON project_summary TO service_role;

-- 6. goal_contribution_stats view
DROP VIEW IF EXISTS goal_contribution_stats CASCADE;
CREATE VIEW goal_contribution_stats
WITH (security_invoker = true)
AS
SELECT
  gc.goal_id,
  COUNT(gc.id) AS contribution_count,
  COUNT(DISTINCT gc.user_id) AS contributor_count,
  SUM(gc.amount) AS total_contributed,
  AVG(gc.amount) AS avg_contribution,
  MIN(gc.contribution_date) AS first_contribution_date,
  MAX(gc.contribution_date) AS last_contribution_date,
  g.target_amount,
  g.current_amount,
  g.target_date,
  CASE
    WHEN g.target_amount > 0 THEN
      ROUND(((g.current_amount / g.target_amount) * 100)::NUMERIC, 2)
    ELSE NULL
  END AS completion_percentage,
  CASE
    WHEN g.target_amount > g.current_amount THEN
      g.target_amount - g.current_amount
    ELSE 0
  END AS amount_remaining
FROM goal_contributions gc
INNER JOIN goals g ON gc.goal_id = g.id
GROUP BY gc.goal_id, g.target_amount, g.current_amount, g.target_date;

GRANT SELECT ON goal_contribution_stats TO authenticated;
GRANT SELECT ON goal_contribution_stats TO service_role;

-- 7. space_members_with_presence view
DROP VIEW IF EXISTS space_members_with_presence CASCADE;
CREATE VIEW space_members_with_presence
WITH (security_invoker = true)
AS
SELECT
  sm.space_id,
  sm.user_id,
  sm.role,
  sm.joined_at,
  u.name,
  u.email,
  u.avatar_url,
  COALESCE(up.status, 'offline') as presence_status,
  up.last_activity,
  up.updated_at as presence_updated_at
FROM space_members sm
LEFT JOIN users u ON sm.user_id = u.id
LEFT JOIN user_presence up ON sm.user_id = up.user_id AND sm.space_id = up.space_id
ORDER BY
  CASE WHEN COALESCE(up.status, 'offline') = 'online' THEN 1 ELSE 2 END,
  sm.role,
  u.name;

GRANT SELECT ON space_members_with_presence TO authenticated;

-- 8. project_cost_breakdown view
DROP VIEW IF EXISTS project_cost_breakdown CASCADE;
CREATE VIEW project_cost_breakdown
WITH (security_invoker = true)
AS
SELECT
  pli.project_id,
  pli.category,
  COUNT(pli.id) AS line_item_count,
  SUM(pli.estimated_cost) AS total_estimated,
  SUM(pli.actual_cost) AS total_actual,
  SUM(pli.estimated_cost - pli.actual_cost) AS variance,
  CASE
    WHEN SUM(pli.estimated_cost) > 0 THEN
      ROUND((((SUM(pli.estimated_cost) - SUM(pli.actual_cost)) / SUM(pli.estimated_cost)) * 100)::NUMERIC, 2)
    ELSE 0
  END AS variance_percentage
FROM project_line_items pli
GROUP BY pli.project_id, pli.category;

GRANT SELECT ON project_cost_breakdown TO authenticated;
GRANT SELECT ON project_cost_breakdown TO service_role;


-- =============================================
-- PART 2: ENABLE RLS ON TABLES WITHOUT IT
-- =============================================

-- 1. task_templates (has space_id)
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_templates_select" ON task_templates;
CREATE POLICY "task_templates_select" ON task_templates FOR SELECT TO authenticated
USING (space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "task_templates_insert" ON task_templates;
CREATE POLICY "task_templates_insert" ON task_templates FOR INSERT TO authenticated
WITH CHECK (space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "task_templates_update" ON task_templates;
CREATE POLICY "task_templates_update" ON task_templates FOR UPDATE TO authenticated
USING (space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "task_templates_delete" ON task_templates;
CREATE POLICY "task_templates_delete" ON task_templates FOR DELETE TO authenticated
USING (space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid()));


-- 2. subtasks (references tasks which has space_id)
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subtasks_select" ON subtasks;
CREATE POLICY "subtasks_select" ON subtasks FOR SELECT TO authenticated
USING (parent_task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "subtasks_insert" ON subtasks;
CREATE POLICY "subtasks_insert" ON subtasks FOR INSERT TO authenticated
WITH CHECK (parent_task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "subtasks_update" ON subtasks;
CREATE POLICY "subtasks_update" ON subtasks FOR UPDATE TO authenticated
USING (parent_task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "subtasks_delete" ON subtasks;
CREATE POLICY "subtasks_delete" ON subtasks FOR DELETE TO authenticated
USING (parent_task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));


-- 3. task_time_entries (references tasks)
ALTER TABLE task_time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_time_entries_select" ON task_time_entries;
CREATE POLICY "task_time_entries_select" ON task_time_entries FOR SELECT TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_time_entries_insert" ON task_time_entries;
CREATE POLICY "task_time_entries_insert" ON task_time_entries FOR INSERT TO authenticated
WITH CHECK (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_time_entries_update" ON task_time_entries;
CREATE POLICY "task_time_entries_update" ON task_time_entries FOR UPDATE TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_time_entries_delete" ON task_time_entries;
CREATE POLICY "task_time_entries_delete" ON task_time_entries FOR DELETE TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));


-- 4. task_dependencies (references tasks)
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_dependencies_select" ON task_dependencies;
CREATE POLICY "task_dependencies_select" ON task_dependencies FOR SELECT TO authenticated
USING (
  task_id IN (SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid()))
  OR depends_on_task_id IN (SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS "task_dependencies_insert" ON task_dependencies;
CREATE POLICY "task_dependencies_insert" ON task_dependencies FOR INSERT TO authenticated
WITH CHECK (
  task_id IN (SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS "task_dependencies_update" ON task_dependencies;
CREATE POLICY "task_dependencies_update" ON task_dependencies FOR UPDATE TO authenticated
USING (task_id IN (SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS "task_dependencies_delete" ON task_dependencies;
CREATE POLICY "task_dependencies_delete" ON task_dependencies FOR DELETE TO authenticated
USING (task_id IN (SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())));


-- 5. task_categories (has space_id)
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_categories_select" ON task_categories;
CREATE POLICY "task_categories_select" ON task_categories FOR SELECT TO authenticated
USING (space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "task_categories_insert" ON task_categories;
CREATE POLICY "task_categories_insert" ON task_categories FOR INSERT TO authenticated
WITH CHECK (space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "task_categories_update" ON task_categories;
CREATE POLICY "task_categories_update" ON task_categories FOR UPDATE TO authenticated
USING (space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "task_categories_delete" ON task_categories;
CREATE POLICY "task_categories_delete" ON task_categories FOR DELETE TO authenticated
USING (space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid()));


-- 6. task_attachments (references tasks)
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_attachments_select" ON task_attachments;
CREATE POLICY "task_attachments_select" ON task_attachments FOR SELECT TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_attachments_insert" ON task_attachments;
CREATE POLICY "task_attachments_insert" ON task_attachments FOR INSERT TO authenticated
WITH CHECK (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_attachments_update" ON task_attachments;
CREATE POLICY "task_attachments_update" ON task_attachments FOR UPDATE TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_attachments_delete" ON task_attachments;
CREATE POLICY "task_attachments_delete" ON task_attachments FOR DELETE TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));


-- 7. task_comments (references tasks)
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_comments_select" ON task_comments;
CREATE POLICY "task_comments_select" ON task_comments FOR SELECT TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_comments_insert" ON task_comments;
CREATE POLICY "task_comments_insert" ON task_comments FOR INSERT TO authenticated
WITH CHECK (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_comments_update" ON task_comments;
CREATE POLICY "task_comments_update" ON task_comments FOR UPDATE TO authenticated
USING (user_id = auth.uid()); -- Users can only edit their own comments

DROP POLICY IF EXISTS "task_comments_delete" ON task_comments;
CREATE POLICY "task_comments_delete" ON task_comments FOR DELETE TO authenticated
USING (user_id = auth.uid()); -- Users can only delete their own comments


-- 8. task_approvals (references tasks)
ALTER TABLE task_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_approvals_select" ON task_approvals;
CREATE POLICY "task_approvals_select" ON task_approvals FOR SELECT TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_approvals_insert" ON task_approvals;
CREATE POLICY "task_approvals_insert" ON task_approvals FOR INSERT TO authenticated
WITH CHECK (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_approvals_update" ON task_approvals;
CREATE POLICY "task_approvals_update" ON task_approvals FOR UPDATE TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_approvals_delete" ON task_approvals;
CREATE POLICY "task_approvals_delete" ON task_approvals FOR DELETE TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));


-- 9. meal_plan_tasks (references meal_plans -> space_id or tasks)
ALTER TABLE meal_plan_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meal_plan_tasks_select" ON meal_plan_tasks;
CREATE POLICY "meal_plan_tasks_select" ON meal_plan_tasks FOR SELECT TO authenticated
USING (
  meal_plan_id IN (SELECT id FROM meal_plans WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS "meal_plan_tasks_insert" ON meal_plan_tasks;
CREATE POLICY "meal_plan_tasks_insert" ON meal_plan_tasks FOR INSERT TO authenticated
WITH CHECK (
  meal_plan_id IN (SELECT id FROM meal_plans WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS "meal_plan_tasks_update" ON meal_plan_tasks;
CREATE POLICY "meal_plan_tasks_update" ON meal_plan_tasks FOR UPDATE TO authenticated
USING (
  meal_plan_id IN (SELECT id FROM meal_plans WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS "meal_plan_tasks_delete" ON meal_plan_tasks;
CREATE POLICY "meal_plan_tasks_delete" ON meal_plan_tasks FOR DELETE TO authenticated
USING (
  meal_plan_id IN (SELECT id FROM meal_plans WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid()))
);


-- 10. task_assignments (references tasks)
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_assignments_select" ON task_assignments;
CREATE POLICY "task_assignments_select" ON task_assignments FOR SELECT TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_assignments_insert" ON task_assignments;
CREATE POLICY "task_assignments_insert" ON task_assignments FOR INSERT TO authenticated
WITH CHECK (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_assignments_update" ON task_assignments;
CREATE POLICY "task_assignments_update" ON task_assignments FOR UPDATE TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_assignments_delete" ON task_assignments;
CREATE POLICY "task_assignments_delete" ON task_assignments FOR DELETE TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));


-- 11. task_comment_reactions (references task_comments -> tasks)
ALTER TABLE task_comment_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_comment_reactions_select" ON task_comment_reactions;
CREATE POLICY "task_comment_reactions_select" ON task_comment_reactions FOR SELECT TO authenticated
USING (comment_id IN (
  SELECT tc.id FROM task_comments tc
  INNER JOIN tasks t ON tc.task_id = t.id
  WHERE t.space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_comment_reactions_insert" ON task_comment_reactions;
CREATE POLICY "task_comment_reactions_insert" ON task_comment_reactions FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND comment_id IN (
    SELECT tc.id FROM task_comments tc
    INNER JOIN tasks t ON tc.task_id = t.id
    WHERE t.space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "task_comment_reactions_delete" ON task_comment_reactions;
CREATE POLICY "task_comment_reactions_delete" ON task_comment_reactions FOR DELETE TO authenticated
USING (user_id = auth.uid()); -- Users can only delete their own reactions


-- 12. task_reactions (references tasks)
ALTER TABLE task_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_reactions_select" ON task_reactions;
CREATE POLICY "task_reactions_select" ON task_reactions FOR SELECT TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_reactions_insert" ON task_reactions;
CREATE POLICY "task_reactions_insert" ON task_reactions FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND task_id IN (SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS "task_reactions_delete" ON task_reactions;
CREATE POLICY "task_reactions_delete" ON task_reactions FOR DELETE TO authenticated
USING (user_id = auth.uid()); -- Users can only delete their own reactions


-- 13. quick_action_usage (has user_id, track user's own usage)
ALTER TABLE quick_action_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quick_action_usage_select" ON quick_action_usage;
CREATE POLICY "quick_action_usage_select" ON quick_action_usage FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "quick_action_usage_insert" ON quick_action_usage;
CREATE POLICY "quick_action_usage_insert" ON quick_action_usage FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "quick_action_usage_update" ON quick_action_usage;
CREATE POLICY "quick_action_usage_update" ON quick_action_usage FOR UPDATE TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "quick_action_usage_delete" ON quick_action_usage;
CREATE POLICY "quick_action_usage_delete" ON quick_action_usage FOR DELETE TO authenticated
USING (user_id = auth.uid());


-- 14. task_calendar_events (references tasks)
ALTER TABLE task_calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_calendar_events_select" ON task_calendar_events;
CREATE POLICY "task_calendar_events_select" ON task_calendar_events FOR SELECT TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_calendar_events_insert" ON task_calendar_events;
CREATE POLICY "task_calendar_events_insert" ON task_calendar_events FOR INSERT TO authenticated
WITH CHECK (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_calendar_events_update" ON task_calendar_events;
CREATE POLICY "task_calendar_events_update" ON task_calendar_events FOR UPDATE TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_calendar_events_delete" ON task_calendar_events;
CREATE POLICY "task_calendar_events_delete" ON task_calendar_events FOR DELETE TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));


-- 15. task_snooze_history (references tasks)
ALTER TABLE task_snooze_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_snooze_history_select" ON task_snooze_history;
CREATE POLICY "task_snooze_history_select" ON task_snooze_history FOR SELECT TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_snooze_history_insert" ON task_snooze_history;
CREATE POLICY "task_snooze_history_insert" ON task_snooze_history FOR INSERT TO authenticated
WITH CHECK (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_snooze_history_update" ON task_snooze_history;
CREATE POLICY "task_snooze_history_update" ON task_snooze_history FOR UPDATE TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_snooze_history_delete" ON task_snooze_history;
CREATE POLICY "task_snooze_history_delete" ON task_snooze_history FOR DELETE TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));


-- 16. task_reminders (references tasks)
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_reminders_select" ON task_reminders;
CREATE POLICY "task_reminders_select" ON task_reminders FOR SELECT TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_reminders_insert" ON task_reminders;
CREATE POLICY "task_reminders_insert" ON task_reminders FOR INSERT TO authenticated
WITH CHECK (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_reminders_update" ON task_reminders;
CREATE POLICY "task_reminders_update" ON task_reminders FOR UPDATE TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_reminders_delete" ON task_reminders;
CREATE POLICY "task_reminders_delete" ON task_reminders FOR DELETE TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));


-- 17. task_handoffs (references tasks)
ALTER TABLE task_handoffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_handoffs_select" ON task_handoffs;
CREATE POLICY "task_handoffs_select" ON task_handoffs FOR SELECT TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_handoffs_insert" ON task_handoffs;
CREATE POLICY "task_handoffs_insert" ON task_handoffs FOR INSERT TO authenticated
WITH CHECK (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_handoffs_update" ON task_handoffs;
CREATE POLICY "task_handoffs_update" ON task_handoffs FOR UPDATE TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_handoffs_delete" ON task_handoffs;
CREATE POLICY "task_handoffs_delete" ON task_handoffs FOR DELETE TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));


-- 18. chore_rotations (references chores -> space_id)
ALTER TABLE chore_rotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chore_rotations_select" ON chore_rotations;
CREATE POLICY "chore_rotations_select" ON chore_rotations FOR SELECT TO authenticated
USING (chore_id IN (
  SELECT id FROM chores WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "chore_rotations_insert" ON chore_rotations;
CREATE POLICY "chore_rotations_insert" ON chore_rotations FOR INSERT TO authenticated
WITH CHECK (chore_id IN (
  SELECT id FROM chores WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "chore_rotations_update" ON chore_rotations;
CREATE POLICY "chore_rotations_update" ON chore_rotations FOR UPDATE TO authenticated
USING (chore_id IN (
  SELECT id FROM chores WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "chore_rotations_delete" ON chore_rotations;
CREATE POLICY "chore_rotations_delete" ON chore_rotations FOR DELETE TO authenticated
USING (chore_id IN (
  SELECT id FROM chores WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));


-- 19. task_activity_log (references tasks)
ALTER TABLE task_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_activity_log_select" ON task_activity_log;
CREATE POLICY "task_activity_log_select" ON task_activity_log FOR SELECT TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

DROP POLICY IF EXISTS "task_activity_log_insert" ON task_activity_log;
CREATE POLICY "task_activity_log_insert" ON task_activity_log FOR INSERT TO authenticated
WITH CHECK (task_id IN (
  SELECT id FROM tasks WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));


-- =============================================
-- PART 3: SERVICE ROLE BYPASS POLICIES
-- Allow service_role to bypass RLS for server-side operations
-- =============================================

-- Add service_role bypass for all new RLS-enabled tables
CREATE POLICY "service_role_bypass_task_templates" ON task_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_subtasks" ON subtasks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_task_time_entries" ON task_time_entries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_task_dependencies" ON task_dependencies FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_task_categories" ON task_categories FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_task_attachments" ON task_attachments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_task_comments" ON task_comments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_task_approvals" ON task_approvals FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_meal_plan_tasks" ON meal_plan_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_task_assignments" ON task_assignments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_task_comment_reactions" ON task_comment_reactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_task_reactions" ON task_reactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_quick_action_usage" ON quick_action_usage FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_task_calendar_events" ON task_calendar_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_task_snooze_history" ON task_snooze_history FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_task_reminders" ON task_reminders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_task_handoffs" ON task_handoffs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_chore_rotations" ON chore_rotations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass_task_activity_log" ON task_activity_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Add comment
COMMENT ON SCHEMA public IS 'Security Advisor issues fixed on 2025-11-28: 8 SECURITY DEFINER views converted to SECURITY INVOKER, 19 tables now have RLS enabled with proper policies';
