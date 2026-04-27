-- Migration: Add push notification preferences to user_notification_preferences
-- Date: 2026-04-27
-- Purpose: Mirror the email/in_app axis for push channel so the
-- PushNotificationSettings UI categories map directly to schema columns
-- (event-type axis: due reminders / assignments / mentions / comments).
--
-- Context: PushNotificationSettings.tsx previously had an unwired UI with
-- categories on a feature-area axis (location/messages/tasks/calendar/goals)
-- that didn't match this table. This migration adds the missing columns so
-- the toggles can persist. The legacy feature-area columns from the dropped
-- notification_preferences table (push_reminders, push_tasks, push_messages,
-- push_shopping_updates, push_events) are NOT brought back — that table was
-- consolidated away in 20251020000002.

ALTER TABLE user_notification_preferences
  ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS push_due_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS push_assignments BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS push_mentions BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS push_comments BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN user_notification_preferences.push_enabled IS 'Master toggle for native/web push delivery channel';
COMMENT ON COLUMN user_notification_preferences.push_due_reminders IS 'Push: tasks and events due-date reminders';
COMMENT ON COLUMN user_notification_preferences.push_assignments IS 'Push: when user is assigned a task, chore, or shopping item';
COMMENT ON COLUMN user_notification_preferences.push_mentions IS 'Push: when user is @-mentioned in a message or comment';
COMMENT ON COLUMN user_notification_preferences.push_comments IS 'Push: replies on items the user owns or follows (off by default — high volume)';
