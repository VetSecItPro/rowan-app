-- Fix remaining projects table duplicate policies
DROP POLICY IF EXISTS "Users can delete space projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view space projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update space projects" ON public.projects;

-- =====================================================
-- ADD INDEXES FOR UNINDEXED FOREIGN KEYS (87 total)
-- These improve JOIN performance on foreign key lookups
-- =====================================================

-- account_deletion_audit_log
CREATE INDEX IF NOT EXISTS idx_account_deletion_audit_log_performed_by ON public.account_deletion_audit_log(performed_by);

-- achievement_progress
CREATE INDEX IF NOT EXISTS idx_achievement_progress_badge_id ON public.achievement_progress(badge_id);
CREATE INDEX IF NOT EXISTS idx_achievement_progress_space_id ON public.achievement_progress(space_id);

-- activity_feed
CREATE INDEX IF NOT EXISTS idx_activity_feed_check_in_id ON public.activity_feed(check_in_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_habit_entry_id ON public.activity_feed(habit_entry_id);

-- admin_users
CREATE INDEX IF NOT EXISTS idx_admin_users_granted_by ON public.admin_users(granted_by);

-- beta_feedback_comments
CREATE INDEX IF NOT EXISTS idx_beta_feedback_comments_user_id ON public.beta_feedback_comments(user_id);

-- bills
CREATE INDEX IF NOT EXISTS idx_bills_created_by ON public.bills(created_by);
CREATE INDEX IF NOT EXISTS idx_bills_linked_calendar_event_id ON public.bills(linked_calendar_event_id);
CREATE INDEX IF NOT EXISTS idx_bills_linked_expense_id ON public.bills(linked_expense_id);

-- chore_completions
CREATE INDEX IF NOT EXISTS idx_chore_completions_completed_by ON public.chore_completions(completed_by);

-- chore_rotations
CREATE INDEX IF NOT EXISTS idx_chore_rotations_created_by ON public.chore_rotations(created_by);
CREATE INDEX IF NOT EXISTS idx_chore_rotations_last_assigned_to ON public.chore_rotations(last_assigned_to);

-- chores
CREATE INDEX IF NOT EXISTS idx_chores_created_by ON public.chores(created_by);
CREATE INDEX IF NOT EXISTS idx_chores_rotation_id ON public.chores(rotation_id);

-- comments
CREATE INDEX IF NOT EXISTS idx_comments_deleted_by ON public.comments(deleted_by);

-- custom_categories
CREATE INDEX IF NOT EXISTS idx_custom_categories_created_by ON public.custom_categories(created_by);

-- event_audit_log
CREATE INDEX IF NOT EXISTS idx_event_audit_log_changed_by ON public.event_audit_log(changed_by);

-- event_note_versions
CREATE INDEX IF NOT EXISTS idx_event_note_versions_edited_by ON public.event_note_versions(edited_by);

-- event_notes
CREATE INDEX IF NOT EXISTS idx_event_notes_last_edited_by ON public.event_notes(last_edited_by);

-- event_proposals
CREATE INDEX IF NOT EXISTS idx_event_proposals_counter_proposal_id ON public.event_proposals(counter_proposal_id);

-- event_share_links
CREATE INDEX IF NOT EXISTS idx_event_share_links_event_id ON public.event_share_links(event_id);

-- events
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_deleted_by ON public.events(deleted_by);

-- generated_reports
CREATE INDEX IF NOT EXISTS idx_generated_reports_generated_by ON public.generated_reports(generated_by);

-- goal_activities
CREATE INDEX IF NOT EXISTS idx_goal_activities_check_in_id ON public.goal_activities(check_in_id);
CREATE INDEX IF NOT EXISTS idx_goal_activities_milestone_id ON public.goal_activities(milestone_id);

-- goal_check_ins
CREATE INDEX IF NOT EXISTS idx_goal_check_ins_voice_template ON public.goal_check_ins(voice_note_template_id);

-- goal_collaborators
CREATE INDEX IF NOT EXISTS idx_goal_collaborators_invited_by ON public.goal_collaborators(invited_by);

-- goal_contributions
CREATE INDEX IF NOT EXISTS idx_goal_contributions_created_by ON public.goal_contributions(created_by);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_expense_id ON public.goal_contributions(expense_id);

-- goal_dependencies
CREATE INDEX IF NOT EXISTS idx_goal_dependencies_bypassed_by ON public.goal_dependencies(bypassed_by);
CREATE INDEX IF NOT EXISTS idx_goal_dependencies_created_by ON public.goal_dependencies(created_by);

-- goal_nudge_tracking
CREATE INDEX IF NOT EXISTS idx_goal_nudge_tracking_user_id ON public.goal_nudge_tracking(user_id);

-- goal_templates
CREATE INDEX IF NOT EXISTS idx_goal_templates_created_by ON public.goal_templates(created_by);

-- goal_updates
CREATE INDEX IF NOT EXISTS idx_goal_updates_user_id ON public.goal_updates(user_id);

-- goals
CREATE INDEX IF NOT EXISTS idx_goals_template_id ON public.goals(template_id);

-- in_app_notifications
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_sender_id ON public.in_app_notifications(sender_id);

-- meal_plans
CREATE INDEX IF NOT EXISTS idx_meal_plans_created_by ON public.meal_plans(created_by);
CREATE INDEX IF NOT EXISTS idx_meal_plans_recipe_id ON public.meal_plans(recipe_id);

-- message_mentions
CREATE INDEX IF NOT EXISTS idx_message_mentions_mentioned_by_user_id ON public.message_mentions(mentioned_by_user_id);

-- messages
CREATE INDEX IF NOT EXISTS idx_messages_pinned_by ON public.messages(pinned_by);

-- nudge_history
CREATE INDEX IF NOT EXISTS idx_nudge_history_goal_id ON public.nudge_history(goal_id);
CREATE INDEX IF NOT EXISTS idx_nudge_history_space_id ON public.nudge_history(space_id);
CREATE INDEX IF NOT EXISTS idx_nudge_history_template_id ON public.nudge_history(template_id);
CREATE INDEX IF NOT EXISTS idx_nudge_history_user_id ON public.nudge_history(user_id);

-- nudge_settings
CREATE INDEX IF NOT EXISTS idx_nudge_settings_space_id ON public.nudge_settings(space_id);

-- project_photos
CREATE INDEX IF NOT EXISTS idx_project_photos_uploaded_by ON public.project_photos(uploaded_by);

-- receipts
CREATE INDEX IF NOT EXISTS idx_receipts_created_by ON public.receipts(created_by);

-- recipes
CREATE INDEX IF NOT EXISTS idx_recipes_created_by ON public.recipes(created_by);

-- recurring_event_exceptions
CREATE INDEX IF NOT EXISTS idx_recurring_event_exceptions_modified_event_id ON public.recurring_event_exceptions(modified_event_id);

-- reminders
CREATE INDEX IF NOT EXISTS idx_reminders_created_by ON public.reminders(created_by);

-- report_favorites
CREATE INDEX IF NOT EXISTS idx_report_favorites_report_id ON public.report_favorites(report_id);
CREATE INDEX IF NOT EXISTS idx_report_favorites_template_id ON public.report_favorites(template_id);

-- report_schedules
CREATE INDEX IF NOT EXISTS idx_report_schedules_created_by ON public.report_schedules(created_by);
CREATE INDEX IF NOT EXISTS idx_report_schedules_template_id ON public.report_schedules(template_id);

-- report_templates
CREATE INDEX IF NOT EXISTS idx_report_templates_created_by ON public.report_templates(created_by);

-- shopping_items
CREATE INDEX IF NOT EXISTS idx_shopping_items_added_by ON public.shopping_items(added_by);
CREATE INDEX IF NOT EXISTS idx_shopping_items_purchased_by ON public.shopping_items(purchased_by);

-- shopping_lists
CREATE INDEX IF NOT EXISTS idx_shopping_lists_created_by ON public.shopping_lists(created_by);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_last_modified_by ON public.shopping_lists(last_modified_by);

-- shopping_tasks
CREATE INDEX IF NOT EXISTS idx_shopping_tasks_source_recipe_id ON public.shopping_tasks(source_recipe_id);

-- space_invitations
CREATE INDEX IF NOT EXISTS idx_space_invitations_invited_by ON public.space_invitations(invited_by);

-- spaces
CREATE INDEX IF NOT EXISTS idx_spaces_created_by ON public.spaces(created_by);

-- store_layouts
CREATE INDEX IF NOT EXISTS idx_store_layouts_created_by ON public.store_layouts(created_by);

-- subtasks
CREATE INDEX IF NOT EXISTS idx_subtasks_completed_by ON public.subtasks(completed_by);
CREATE INDEX IF NOT EXISTS idx_subtasks_created_by ON public.subtasks(created_by);

-- tags
CREATE INDEX IF NOT EXISTS idx_tags_created_by ON public.tags(created_by);

-- task_approvals
CREATE INDEX IF NOT EXISTS idx_task_approvals_requested_by ON public.task_approvals(requested_by);

-- task_assignments
CREATE INDEX IF NOT EXISTS idx_task_assignments_assigned_by ON public.task_assignments(assigned_by);

-- task_categories
CREATE INDEX IF NOT EXISTS idx_task_categories_created_by ON public.task_categories(created_by);

-- task_dependencies
CREATE INDEX IF NOT EXISTS idx_task_dependencies_created_by ON public.task_dependencies(created_by);

-- task_handoffs
CREATE INDEX IF NOT EXISTS idx_task_handoffs_performed_by ON public.task_handoffs(performed_by);

-- task_reminders
CREATE INDEX IF NOT EXISTS idx_task_reminders_created_by ON public.task_reminders(created_by);

-- task_templates
CREATE INDEX IF NOT EXISTS idx_task_templates_default_assigned_to ON public.task_templates(default_assigned_to);

-- tasks
CREATE INDEX IF NOT EXISTS idx_tasks_approved_by ON public.tasks(approved_by);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_snoozed_by ON public.tasks(snoozed_by);

-- user_achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_badge_id ON public.user_achievements(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_space_id ON public.user_achievements(space_id);

-- user_progress
CREATE INDEX IF NOT EXISTS idx_user_progress_space_id ON public.user_progress(space_id);

-- vendors
CREATE INDEX IF NOT EXISTS idx_vendors_created_by ON public.vendors(created_by);

-- voice_note_templates
CREATE INDEX IF NOT EXISTS idx_voice_note_templates_created_by ON public.voice_note_templates(created_by);

-- voice_transcriptions
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_voice_note_template_id ON public.voice_transcriptions(voice_note_template_id);


-- =====================================================
-- REMOVE UNUSED INDEXES (~200 total)
-- These indexes have never been used and waste space
-- =====================================================

-- Note: Keeping some indexes that might be useful for future features
-- Only removing clearly unused ones that overlap or are truly unnecessary

-- beta_access_requests (duplicates already handled)
DROP INDEX IF EXISTS public.idx_beta_access_requests_email;
DROP INDEX IF EXISTS public.idx_beta_access_requests_access_granted;
DROP INDEX IF EXISTS public.idx_beta_access_requests_user_id;
DROP INDEX IF EXISTS public.idx_beta_access_created;
DROP INDEX IF EXISTS public.idx_beta_access_ip;

-- users - rarely used indexes
DROP INDEX IF EXISTS public.idx_users_online;
DROP INDEX IF EXISTS public.idx_users_last_seen;
DROP INDEX IF EXISTS public.idx_users_privacy_settings;
DROP INDEX IF EXISTS public.idx_users_activity;
DROP INDEX IF EXISTS public.idx_users_beta_tester;

-- recurring_goal_templates
DROP INDEX IF EXISTS public.idx_recurring_templates_type;
DROP INDEX IF EXISTS public.idx_recurring_templates_habits;
DROP INDEX IF EXISTS public.idx_recurring_templates_active;

-- events
DROP INDEX IF EXISTS public.idx_events_expense_id;
DROP INDEX IF EXISTS public.idx_events_start_time;
DROP INDEX IF EXISTS public.idx_events_custom_color;
DROP INDEX IF EXISTS public.idx_events_timezone;
DROP INDEX IF EXISTS public.idx_events_deleted_at;
DROP INDEX IF EXISTS public.idx_events_category;

-- expenses
DROP INDEX IF EXISTS public.idx_expenses_event_id;
DROP INDEX IF EXISTS public.idx_expenses_date;
DROP INDEX IF EXISTS public.idx_expenses_category;
DROP INDEX IF EXISTS public.idx_expenses_receipt_id;
DROP INDEX IF EXISTS public.idx_expenses_project;
DROP INDEX IF EXISTS public.idx_expenses_vendor;
DROP INDEX IF EXISTS public.idx_expenses_line_item;
DROP INDEX IF EXISTS public.expenses_project_id_idx;

-- habit_entries
DROP INDEX IF EXISTS public.idx_habit_entries_completed;
DROP INDEX IF EXISTS public.idx_habit_entries_template_id;

-- space_invitations
DROP INDEX IF EXISTS public.idx_space_invitations_email;
DROP INDEX IF EXISTS public.idx_space_invitations_token;
DROP INDEX IF EXISTS public.idx_space_invitations_role;

-- goals
DROP INDEX IF EXISTS public.idx_goals_created_at;
DROP INDEX IF EXISTS public.idx_goals_status;
DROP INDEX IF EXISTS public.idx_goals_visibility;
DROP INDEX IF EXISTS public.idx_goals_created_by;
DROP INDEX IF EXISTS public.idx_goals_priority;
DROP INDEX IF EXISTS public.idx_goals_pinned;
DROP INDEX IF EXISTS public.idx_goals_financial;
DROP INDEX IF EXISTS public.idx_goals_target_date;

-- goal_milestones
DROP INDEX IF EXISTS public.idx_goal_milestones_completed;

-- event_comments
DROP INDEX IF EXISTS public.idx_event_comments_mentions;
DROP INDEX IF EXISTS public.idx_event_comments_parent_id;

-- admin_users
DROP INDEX IF EXISTS public.idx_admin_users_active;

-- event_proposal_votes
DROP INDEX IF EXISTS public.idx_proposal_votes_proposal_id;

-- spaces
DROP INDEX IF EXISTS public.idx_spaces_auto_created;

-- reminder_templates
DROP INDEX IF EXISTS public.idx_reminder_templates_space_id;
DROP INDEX IF EXISTS public.idx_reminder_templates_is_system;

-- checkin_reactions
DROP INDEX IF EXISTS public.idx_checkin_reactions_created_at;

-- account_deletion_audit_log
DROP INDEX IF EXISTS public.idx_audit_log_timestamp;
DROP INDEX IF EXISTS public.idx_audit_log_user_id;
DROP INDEX IF EXISTS public.idx_audit_log_action;
DROP INDEX IF EXISTS public.idx_audit_log_created_at;

-- tasks
DROP INDEX IF EXISTS public.idx_tasks_status;
DROP INDEX IF EXISTS public.idx_tasks_due_date;
DROP INDEX IF EXISTS public.idx_tasks_recurring;
DROP INDEX IF EXISTS public.idx_tasks_recurrence_template;
DROP INDEX IF EXISTS public.idx_tasks_due_date_recurring;
DROP INDEX IF EXISTS public.idx_tasks_sort_order;
DROP INDEX IF EXISTS public.idx_tasks_snoozed;
DROP INDEX IF EXISTS public.idx_tasks_calendar_sync;
DROP INDEX IF EXISTS public.idx_tasks_tags;
DROP INDEX IF EXISTS public.idx_tasks_estimated_hours;
DROP INDEX IF EXISTS public.idx_tasks_quick_note;

-- reminders
DROP INDEX IF EXISTS public.idx_reminders_remind_at;
DROP INDEX IF EXISTS public.idx_reminders_snoozed_by;
DROP INDEX IF EXISTS public.idx_reminders_category;
DROP INDEX IF EXISTS public.idx_reminders_reminder_type;
DROP INDEX IF EXISTS public.idx_reminders_location;
DROP INDEX IF EXISTS public.idx_reminders_reminder_time;
DROP INDEX IF EXISTS public.idx_reminders_snooze_until;
DROP INDEX IF EXISTS public.idx_reminders_status;
DROP INDEX IF EXISTS public.idx_reminders_priority;

-- messages
DROP INDEX IF EXISTS public.idx_messages_created_at;

-- shopping_items
DROP INDEX IF EXISTS public.idx_shopping_items_is_purchased;
DROP INDEX IF EXISTS public.idx_shopping_items_category;

-- recipes
DROP INDEX IF EXISTS public.idx_recipes_category;
DROP INDEX IF EXISTS public.idx_recipes_difficulty;
DROP INDEX IF EXISTS public.idx_recipes_cuisine_type;
DROP INDEX IF EXISTS public.idx_recipes_tags;

-- meal_plans
DROP INDEX IF EXISTS public.idx_meal_plans_space_id;
DROP INDEX IF EXISTS public.idx_meal_plans_meal_date;

-- chore_completions
DROP INDEX IF EXISTS public.idx_chore_completions_chore_id;
DROP INDEX IF EXISTS public.idx_chore_completions_completed_at;

-- chores
DROP INDEX IF EXISTS public.idx_chores_due_date;

-- daily_checkins
DROP INDEX IF EXISTS public.idx_daily_checkins_space_id;
DROP INDEX IF EXISTS public.idx_daily_checkins_date;

-- activity_log
DROP INDEX IF EXISTS public.idx_activity_log_space_id;
DROP INDEX IF EXISTS public.idx_activity_log_created_at;

-- password_reset_tokens
DROP INDEX IF EXISTS public.idx_password_reset_tokens_token;
DROP INDEX IF EXISTS public.idx_password_reset_tokens_expires_at;

-- reminder_attachments
DROP INDEX IF EXISTS public.idx_reminder_attachments_type;
DROP INDEX IF EXISTS public.idx_reminder_attachments_created_at;

-- deleted_accounts
DROP INDEX IF EXISTS public.idx_deleted_accounts_user_id;
DROP INDEX IF EXISTS public.idx_deleted_accounts_permanent_deletion_at;

-- conversations
DROP INDEX IF EXISTS public.idx_conversations_type;
DROP INDEX IF EXISTS public.idx_conversations_last_message;

-- goal_dependencies
DROP INDEX IF EXISTS public.idx_goal_dependencies_space_id;
DROP INDEX IF EXISTS public.idx_goal_dependencies_status;

-- projects
DROP INDEX IF EXISTS public.projects_status_idx;
DROP INDEX IF EXISTS public.idx_projects_priority;
DROP INDEX IF EXISTS public.idx_projects_dates;
DROP INDEX IF EXISTS public.idx_projects_created_by;

-- magic_link_tokens
DROP INDEX IF EXISTS public.idx_magic_link_tokens_token;
DROP INDEX IF EXISTS public.idx_magic_link_tokens_expires_at;

-- reminder_notifications
DROP INDEX IF EXISTS public.idx_reminder_notifications_user_id;
DROP INDEX IF EXISTS public.idx_reminder_notifications_is_read;
DROP INDEX IF EXISTS public.idx_reminder_notifications_created_at;

-- meals
DROP INDEX IF EXISTS public.idx_meals_scheduled_date;

-- user_notification_preferences
DROP INDEX IF EXISTS public.idx_user_notification_preferences_space_id;

-- task_stats
DROP INDEX IF EXISTS public.idx_task_stats_space_id;
DROP INDEX IF EXISTS public.idx_task_stats_month;

-- push_subscriptions
DROP INDEX IF EXISTS public.idx_push_subs_endpoint;
DROP INDEX IF EXISTS public.idx_push_subscriptions_active;

-- notification_log
DROP INDEX IF EXISTS public.idx_notif_log_status;
DROP INDEX IF EXISTS public.idx_notif_log_category;

-- shopping_lists
DROP INDEX IF EXISTS public.idx_shopping_lists_is_public;
DROP INDEX IF EXISTS public.idx_shopping_lists_store;
DROP INDEX IF EXISTS public.idx_shopping_lists_modified;
DROP INDEX IF EXISTS public.idx_shopping_lists_share_token;

-- store_layouts
DROP INDEX IF EXISTS public.idx_store_layouts_store_name;

-- reminder_comments
DROP INDEX IF EXISTS public.idx_reminder_comments_reminder_id;
DROP INDEX IF EXISTS public.idx_reminder_comments_created_at;

-- shopping_item_history
DROP INDEX IF EXISTS public.idx_item_history_space;
DROP INDEX IF EXISTS public.idx_item_history_name;
DROP INDEX IF EXISTS public.idx_item_history_frequency;

-- task_templates
DROP INDEX IF EXISTS public.idx_task_templates_favorite;
DROP INDEX IF EXISTS public.idx_task_templates_use_count;
DROP INDEX IF EXISTS public.idx_task_templates_tags;

-- subtasks
DROP INDEX IF EXISTS public.idx_subtasks_status;
DROP INDEX IF EXISTS public.idx_subtasks_parent_task;
DROP INDEX IF EXISTS public.idx_subtasks_due_date;

-- task_attachments
DROP INDEX IF EXISTS public.idx_task_attachments_type;
DROP INDEX IF EXISTS public.idx_task_attachments_uploaded_at;

-- task_time_entries
DROP INDEX IF EXISTS public.idx_time_entries_start_time;
DROP INDEX IF EXISTS public.idx_time_entries_duration;

-- task_dependencies
DROP INDEX IF EXISTS public.idx_task_dependencies_type;

-- task_categories
DROP INDEX IF EXISTS public.idx_task_categories_space;

-- task_assignments
DROP INDEX IF EXISTS public.idx_task_assignments_role;
DROP INDEX IF EXISTS public.idx_task_assignments_primary;

-- check_in_reactions
DROP INDEX IF EXISTS public.idx_check_in_reactions_check_in;

-- notifications
DROP INDEX IF EXISTS public.idx_notifications_type;
DROP INDEX IF EXISTS public.idx_notifications_user_id;
DROP INDEX IF EXISTS public.idx_notifications_created_at;
DROP INDEX IF EXISTS public.idx_notifications_read;

-- task_calendar_events
DROP INDEX IF EXISTS public.idx_task_calendar_events_synced;

-- quick_action_stats
DROP INDEX IF EXISTS public.idx_quick_action_stats_space_user;

-- task_reminders
DROP INDEX IF EXISTS public.idx_task_reminders_pending;
DROP INDEX IF EXISTS public.idx_task_reminders_sent;

-- task_handoffs
DROP INDEX IF EXISTS public.idx_task_handoffs_performed_at;

-- task_approvals
DROP INDEX IF EXISTS public.idx_task_approvals_status;
DROP INDEX IF EXISTS public.idx_task_approvals_pending;

-- meal_plan_tasks
DROP INDEX IF EXISTS public.idx_meal_plan_tasks_meal_plan;
DROP INDEX IF EXISTS public.idx_meal_plan_tasks_date_type;

-- chore_rotations
DROP INDEX IF EXISTS public.idx_chore_rotations_active;
DROP INDEX IF EXISTS public.idx_chore_rotations_next_date;

-- shopping_tasks
DROP INDEX IF EXISTS public.idx_shopping_tasks_auto_delete;
DROP INDEX IF EXISTS public.idx_shopping_tasks_auto_complete;

-- task_activity_log
DROP INDEX IF EXISTS public.idx_task_activity_log_user;
DROP INDEX IF EXISTS public.idx_task_activity_log_action;
DROP INDEX IF EXISTS public.idx_task_activity_log_created_at;

-- reminder_mentions
DROP INDEX IF EXISTS public.idx_reminder_mentions_mentioned_user;
DROP INDEX IF EXISTS public.idx_reminder_mentions_created_at;

-- achievement_badges
DROP INDEX IF EXISTS public.idx_achievement_badges_category;
DROP INDEX IF EXISTS public.idx_achievement_badges_active;

-- message_attachments
DROP INDEX IF EXISTS public.idx_message_attachments_created_at;

-- user_achievements
DROP INDEX IF EXISTS public.idx_user_achievements_earned_at;

-- message_mentions
DROP INDEX IF EXISTS public.idx_message_mentions_unread;

-- event_note_versions
DROP INDEX IF EXISTS public.idx_event_note_versions_note_id;

-- event_share_links
DROP INDEX IF EXISTS public.idx_event_share_token;

-- event_audit_log
DROP INDEX IF EXISTS public.idx_event_audit_event_id;
DROP INDEX IF EXISTS public.idx_event_audit_created_at;

-- event_templates
DROP INDEX IF EXISTS public.idx_event_templates_category;
DROP INDEX IF EXISTS public.idx_event_templates_system;

-- recurring_expense_patterns
DROP INDEX IF EXISTS public.idx_recurring_patterns_merchant;
DROP INDEX IF EXISTS public.idx_recurring_patterns_next_date;
DROP INDEX IF EXISTS public.idx_recurring_patterns_confidence;

-- bills
DROP INDEX IF EXISTS public.idx_bills_space_id;
DROP INDEX IF EXISTS public.idx_bills_due_date;
DROP INDEX IF EXISTS public.idx_bills_next_due_date;
DROP INDEX IF EXISTS public.idx_bills_status;
DROP INDEX IF EXISTS public.idx_bills_frequency;

-- goal_contributions
DROP INDEX IF EXISTS public.idx_goal_contributions_date;

-- receipts
DROP INDEX IF EXISTS public.idx_receipts_merchant_name;
DROP INDEX IF EXISTS public.idx_receipts_receipt_date;
DROP INDEX IF EXISTS public.idx_receipts_created_at;

-- custom_categories
DROP INDEX IF EXISTS public.idx_custom_categories_parent;
DROP INDEX IF EXISTS public.idx_custom_categories_active;

-- tags
DROP INDEX IF EXISTS public.idx_tags_name;

-- expense_tags
DROP INDEX IF EXISTS public.idx_expense_tags_tag;

-- goal_tags
DROP INDEX IF EXISTS public.idx_goal_tags_tag;

-- task_tags
DROP INDEX IF EXISTS public.idx_task_tags_tag;

-- vendors
DROP INDEX IF EXISTS public.idx_vendors_trade;
DROP INDEX IF EXISTS public.idx_vendors_preferred;
DROP INDEX IF EXISTS public.idx_vendors_active;

-- comments
DROP INDEX IF EXISTS public.idx_comments_parent;
DROP INDEX IF EXISTS public.idx_comments_commentable;
DROP INDEX IF EXISTS public.idx_comments_created_at;
DROP INDEX IF EXISTS public.idx_comments_pinned;

-- mentions
DROP INDEX IF EXISTS public.idx_mentions_comment;
DROP INDEX IF EXISTS public.idx_mentions_unread;

-- comment_reactions
DROP INDEX IF EXISTS public.idx_reactions_comment;
DROP INDEX IF EXISTS public.idx_reactions_emoji;

-- user_sessions
DROP INDEX IF EXISTS public.user_sessions_last_active_idx;
DROP INDEX IF EXISTS public.user_sessions_is_current_idx;

-- activity_logs
DROP INDEX IF EXISTS public.idx_activity_logs_entity;
DROP INDEX IF EXISTS public.idx_activity_logs_type;
DROP INDEX IF EXISTS public.idx_activity_logs_created_at;

-- project_line_items
DROP INDEX IF EXISTS public.idx_project_line_items_vendor;
DROP INDEX IF EXISTS public.idx_project_line_items_category;

-- project_photos
DROP INDEX IF EXISTS public.idx_project_photos_project;
DROP INDEX IF EXISTS public.idx_project_photos_type;

-- goal_activities
DROP INDEX IF EXISTS public.idx_goal_activities_created_at;
DROP INDEX IF EXISTS public.idx_goal_activities_type;

-- user_audit_log
DROP INDEX IF EXISTS public.idx_user_audit_log_timestamp;
DROP INDEX IF EXISTS public.idx_user_audit_log_action_category;
DROP INDEX IF EXISTS public.idx_user_audit_log_created_at;

-- ccpa_opt_out_status
DROP INDEX IF EXISTS public.idx_ccpa_opt_out_status;
DROP INDEX IF EXISTS public.idx_ccpa_california_resident;

-- ccpa_audit_log
DROP INDEX IF EXISTS public.idx_ccpa_audit_user_id;
DROP INDEX IF EXISTS public.idx_ccpa_audit_timestamp;
DROP INDEX IF EXISTS public.idx_ccpa_audit_action;

-- in_app_notifications
DROP INDEX IF EXISTS public.idx_in_app_notifs_user_id;
DROP INDEX IF EXISTS public.idx_in_app_notifs_type;
DROP INDEX IF EXISTS public.idx_in_app_notifs_priority;
DROP INDEX IF EXISTS public.idx_in_app_notifs_partnership;

-- voice_transcriptions
DROP INDEX IF EXISTS public.idx_voice_transcriptions_check_in;
DROP INDEX IF EXISTS public.idx_voice_transcriptions_category;
DROP INDEX IF EXISTS public.idx_voice_transcriptions_search;

-- voice_note_templates
DROP INDEX IF EXISTS public.idx_voice_note_templates_category;

-- activity_feed
DROP INDEX IF EXISTS public.idx_activity_feed_habit;
DROP INDEX IF EXISTS public.idx_activity_feed_created_at;
DROP INDEX IF EXISTS public.idx_activity_feed_type;

-- report_templates
DROP INDEX IF EXISTS public.idx_report_templates_category;

-- generated_reports
DROP INDEX IF EXISTS public.idx_generated_reports_template_id;
DROP INDEX IF EXISTS public.idx_generated_reports_date_range;
DROP INDEX IF EXISTS public.idx_generated_reports_share_token;

-- report_schedules
DROP INDEX IF EXISTS public.idx_report_schedules_next_run;

-- account_deletion_requests
DROP INDEX IF EXISTS public.idx_account_deletion_requests_scheduled_date;

-- privacy_preference_history
DROP INDEX IF EXISTS public.idx_privacy_preference_history_changed_at;

-- data_export_requests
DROP INDEX IF EXISTS public.idx_data_export_requests_status;
DROP INDEX IF EXISTS public.idx_data_export_requests_expires_at;

-- privacy_email_notifications
DROP INDEX IF EXISTS public.idx_privacy_email_notifications_type;

-- user_presence
DROP INDEX IF EXISTS public.idx_user_presence_last_activity;

-- reminder_activities
DROP INDEX IF EXISTS public.idx_reminder_activities_reminder_id;
DROP INDEX IF EXISTS public.idx_reminder_activities_user_id;
DROP INDEX IF EXISTS public.idx_reminder_activities_created_at;
DROP INDEX IF EXISTS public.idx_reminder_activities_action;

-- launch_notifications
DROP INDEX IF EXISTS public.idx_launch_notifications_email;
DROP INDEX IF EXISTS public.idx_launch_notifications_subscribed;
DROP INDEX IF EXISTS public.idx_launch_notifications_source;
DROP INDEX IF EXISTS public.idx_launch_notifications_active;

-- daily_analytics
DROP INDEX IF EXISTS public.idx_daily_analytics_created;
DROP INDEX IF EXISTS public.idx_daily_analytics_new_users;
DROP INDEX IF EXISTS public.idx_daily_analytics_active_users;

-- habit_streaks
DROP INDEX IF EXISTS public.idx_habit_streaks_template_id;
DROP INDEX IF EXISTS public.idx_habit_streaks_user_id;
DROP INDEX IF EXISTS public.idx_habit_streaks_type;
DROP INDEX IF EXISTS public.idx_habit_streaks_active;

-- recurring_goal_instances
DROP INDEX IF EXISTS public.idx_recurring_goal_instances_template_id;

-- habit_analytics
DROP INDEX IF EXISTS public.idx_habit_analytics_template_id;
DROP INDEX IF EXISTS public.idx_habit_analytics_user_id;

-- beta_tester_activity
DROP INDEX IF EXISTS public.idx_beta_tester_activity_created_at;

-- beta_feedback
DROP INDEX IF EXISTS public.idx_beta_feedback_status;
DROP INDEX IF EXISTS public.idx_beta_feedback_category;
DROP INDEX IF EXISTS public.idx_beta_feedback_severity;
DROP INDEX IF EXISTS public.idx_beta_feedback_created_at;

-- beta_feedback_votes
DROP INDEX IF EXISTS public.idx_beta_feedback_votes_feedback_id;

-- beta_feedback_comments
DROP INDEX IF EXISTS public.idx_beta_feedback_comments_feedback_id;
DROP INDEX IF EXISTS public.idx_beta_feedback_comments_created_at;
