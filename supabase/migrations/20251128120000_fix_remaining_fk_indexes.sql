-- Fix remaining unindexed foreign keys (28 additional)
-- These were missed in the previous migration

-- activity_feed
CREATE INDEX IF NOT EXISTS idx_activity_feed_habit_template_id ON public.activity_feed(habit_template_id);

-- activity_log
CREATE INDEX IF NOT EXISTS idx_activity_log_space_id ON public.activity_log(space_id);

-- beta_feedback_comments
CREATE INDEX IF NOT EXISTS idx_beta_feedback_comments_feedback_id ON public.beta_feedback_comments(feedback_id);

-- chore_completions
CREATE INDEX IF NOT EXISTS idx_chore_completions_chore_id ON public.chore_completions(chore_id);

-- comments
CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON public.comments(parent_comment_id);

-- custom_categories
CREATE INDEX IF NOT EXISTS idx_custom_categories_parent_category_id ON public.custom_categories(parent_category_id);

-- event_comments
CREATE INDEX IF NOT EXISTS idx_event_comments_parent_comment_id ON public.event_comments(parent_comment_id);

-- event_note_versions
CREATE INDEX IF NOT EXISTS idx_event_note_versions_note_id ON public.event_note_versions(note_id);

-- events
CREATE INDEX IF NOT EXISTS idx_events_expense_id ON public.events(expense_id);

-- expense_tags
CREATE INDEX IF NOT EXISTS idx_expense_tags_tag_id ON public.expense_tags(tag_id);

-- expenses
CREATE INDEX IF NOT EXISTS idx_expenses_event_id ON public.expenses(event_id);
CREATE INDEX IF NOT EXISTS idx_expenses_line_item_id ON public.expenses(line_item_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON public.expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_receipt_id ON public.expenses(receipt_id);
CREATE INDEX IF NOT EXISTS idx_expenses_vendor_id ON public.expenses(vendor_id);

-- generated_reports
CREATE INDEX IF NOT EXISTS idx_generated_reports_template_id ON public.generated_reports(template_id);

-- goal_tags
CREATE INDEX IF NOT EXISTS idx_goal_tags_tag_id ON public.goal_tags(tag_id);

-- goals
CREATE INDEX IF NOT EXISTS idx_goals_created_by ON public.goals(created_by);

-- meal_plans
CREATE INDEX IF NOT EXISTS idx_meal_plans_space_id ON public.meal_plans(space_id);

-- project_line_items
CREATE INDEX IF NOT EXISTS idx_project_line_items_vendor_id ON public.project_line_items(vendor_id);

-- projects
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);

-- reminder_activities
CREATE INDEX IF NOT EXISTS idx_reminder_activities_user_id ON public.reminder_activities(user_id);

-- reminders
CREATE INDEX IF NOT EXISTS idx_reminders_snoozed_by ON public.reminders(snoozed_by);

-- task_activity_log
CREATE INDEX IF NOT EXISTS idx_task_activity_log_user_id ON public.task_activity_log(user_id);

-- task_tags
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON public.task_tags(tag_id);

-- user_notification_preferences
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_space_id ON public.user_notification_preferences(space_id);

-- voice_transcriptions
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_goal_check_in_id ON public.voice_transcriptions(goal_check_in_id);
