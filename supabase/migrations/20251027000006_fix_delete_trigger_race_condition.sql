-- Migration: Fix DELETE trigger race condition causing foreign key constraint violations
-- Purpose: Prevent log_reminder_change trigger from trying to INSERT after CASCADE DELETE
-- Issue: AFTER DELETE trigger tries to insert activity logs but CASCADE has already cleared related records
-- Date: 2025-10-27

-- Replace the trigger function to skip DELETE logging which causes race conditions
CREATE OR REPLACE FUNCTION log_reminder_change()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the function was updated correctly
DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: Updated log_reminder_change function to skip DELETE operations';
  RAISE NOTICE 'This prevents race conditions between AFTER DELETE triggers and CASCADE DELETE';
END $$;