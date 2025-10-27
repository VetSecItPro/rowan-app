-- Migration: Rename reminder_activity to reminder_activities
-- Purpose: Fix table name inconsistency causing 400 errors in production
-- The Supabase client expects plural table names, but reminder_activity was singular
-- Date: 2025-10-27

-- Rename the table from reminder_activity to reminder_activities
ALTER TABLE reminder_activity RENAME TO reminder_activities;

-- Update all indexes to use the new table name
DROP INDEX IF EXISTS idx_reminder_activity_reminder_id;
DROP INDEX IF EXISTS idx_reminder_activity_user_id;
DROP INDEX IF EXISTS idx_reminder_activity_created_at;
DROP INDEX IF EXISTS idx_reminder_activity_action;
DROP INDEX IF EXISTS idx_reminder_activity_reminder_time;

-- Recreate indexes with new naming
CREATE INDEX IF NOT EXISTS idx_reminder_activities_reminder_id ON reminder_activities(reminder_id);
CREATE INDEX IF NOT EXISTS idx_reminder_activities_user_id ON reminder_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_activities_created_at ON reminder_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminder_activities_action ON reminder_activities(action);
CREATE INDEX IF NOT EXISTS idx_reminder_activities_reminder_time ON reminder_activities(reminder_id, created_at DESC);

-- Update RLS policies to use new table name
DROP POLICY IF EXISTS "Users can view activity for reminders in their space" ON reminder_activities;
DROP POLICY IF EXISTS "Users can insert activity for reminders in their space" ON reminder_activities;
DROP POLICY IF EXISTS "Activity logs are immutable" ON reminder_activities;
DROP POLICY IF EXISTS "Activity logs cannot be deleted" ON reminder_activities;

-- Recreate RLS policies for the renamed table
CREATE POLICY "Users can view activities for reminders in their space"
  ON reminder_activities FOR SELECT
  USING (
    reminder_id IN (
      SELECT r.id FROM reminders r
      INNER JOIN space_members sm ON sm.space_id = r.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert activities for reminders in their space"
  ON reminder_activities FOR INSERT
  WITH CHECK (
    reminder_id IN (
      SELECT r.id FROM reminders r
      INNER JOIN space_members sm ON sm.space_id = r.space_id
      WHERE sm.user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Activity logs are immutable"
  ON reminder_activities FOR UPDATE
  USING (false);

CREATE POLICY "Activity logs cannot be deleted"
  ON reminder_activities FOR DELETE
  USING (false);

-- Update functions to use the new table name
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
    action_type := 'deleted';
    change_metadata := jsonb_build_object(
      'title', OLD.title,
      'category', OLD.category
    );

    -- For DELETE, we use OLD record
    INSERT INTO reminder_activities (reminder_id, user_id, action, metadata)
    VALUES (OLD.id, auth.uid(), action_type, change_metadata);

    RETURN OLD;
  END IF;

  -- Insert activity log (for INSERT and UPDATE)
  INSERT INTO reminder_activities (reminder_id, user_id, action, metadata)
  VALUES (NEW.id, auth.uid(), action_type, change_metadata);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update comment logging function to use new table name
CREATE OR REPLACE FUNCTION log_reminder_comment_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO reminder_activities (reminder_id, user_id, action, metadata)
    VALUES (
      NEW.reminder_id,
      NEW.user_id,
      'commented',
      jsonb_build_object(
        'comment_id', NEW.id,
        'comment_preview', LEFT(NEW.content, 100)
      )
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.content != NEW.content THEN
    INSERT INTO reminder_activities (reminder_id, user_id, action, metadata)
    VALUES (
      NEW.reminder_id,
      NEW.user_id,
      'edited_comment',
      jsonb_build_object(
        'comment_id', NEW.id,
        'comment_preview', LEFT(NEW.content, 100)
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO reminder_activities (reminder_id, user_id, action, metadata)
    VALUES (
      OLD.reminder_id,
      OLD.user_id,
      'deleted_comment',
      jsonb_build_object(
        'comment_id', OLD.id
      )
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update permissions
GRANT SELECT ON reminder_activities TO authenticated;
GRANT INSERT ON reminder_activities TO authenticated;

-- Update table comment
COMMENT ON TABLE reminder_activities IS 'Immutable audit log of all reminder changes for transparency in shared spaces';