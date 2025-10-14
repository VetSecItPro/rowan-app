-- =============================================
-- REMINDERS COLLABORATION: COLLABORATIVE SNOOZE TRACKING
-- =============================================
-- This migration enhances the snooze functionality to track who snoozed
-- a reminder, providing transparency in shared spaces.

-- Add snoozed_by column to track who snoozed the reminder
ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS snoozed_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add index for snoozed_by lookups
CREATE INDEX IF NOT EXISTS idx_reminders_snoozed_by
  ON reminders(snoozed_by);

-- Update the log_reminder_change trigger to capture snooze user
CREATE OR REPLACE FUNCTION log_reminder_change()
RETURNS TRIGGER AS $$
DECLARE
  action_type TEXT;
  change_metadata JSONB := '{}';
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    -- Status changes
    IF OLD.status != NEW.status THEN
      IF NEW.status = 'completed' THEN
        action_type := 'completed';
      ELSIF NEW.status = 'snoozed' THEN
        action_type := 'snoozed';
        IF NEW.snooze_until IS NOT NULL THEN
          change_metadata := jsonb_build_object(
            'snooze_until', NEW.snooze_until,
            'snoozed_by', NEW.snoozed_by
          );
        END IF;
      ELSIF NEW.status = 'active' AND OLD.status = 'snoozed' THEN
        action_type := 'unsnoozed';
      END IF;
    -- Priority changes
    ELSIF OLD.priority != NEW.priority THEN
      action_type := 'priority_changed';
      change_metadata := jsonb_build_object(
        'old_priority', OLD.priority,
        'new_priority', NEW.priority
      );
    -- Assignment changes
    ELSIF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      IF NEW.assigned_to IS NOT NULL AND OLD.assigned_to IS NULL THEN
        action_type := 'assigned';
        change_metadata := jsonb_build_object('assigned_to', NEW.assigned_to);
      ELSIF NEW.assigned_to IS NULL AND OLD.assigned_to IS NOT NULL THEN
        action_type := 'unassigned';
        change_metadata := jsonb_build_object('unassigned_from', OLD.assigned_to);
      ELSE
        action_type := 'reassigned';
        change_metadata := jsonb_build_object(
          'old_assignee', OLD.assigned_to,
          'new_assignee', NEW.assigned_to
        );
      END IF;
    -- Title changes
    ELSIF OLD.title != NEW.title THEN
      action_type := 'edited';
      change_metadata := jsonb_build_object('field', 'title');
    -- Other edits
    ELSE
      action_type := 'edited';
    END IF;
  END IF;

  -- Insert activity log
  IF action_type IS NOT NULL THEN
    INSERT INTO reminder_activity (reminder_id, user_id, action, metadata)
    VALUES (NEW.id, auth.uid(), action_type, change_metadata);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON COLUMN reminders.snoozed_by IS 'User who snoozed the reminder (for collaborative transparency)';
