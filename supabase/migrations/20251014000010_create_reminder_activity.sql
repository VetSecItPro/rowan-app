-- =============================================
-- REMINDERS COLLABORATION: ACTIVITY TRACKING
-- =============================================
-- This migration creates an immutable activity log for all reminder changes,
-- providing full transparency and audit trail for collaborative spaces.

-- Create reminder_activity table
CREATE TABLE IF NOT EXISTS reminder_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add CHECK constraint for valid action types
ALTER TABLE reminder_activity
  ADD CONSTRAINT valid_action_type CHECK (
    action IN (
      'created',
      'updated',
      'completed',
      'uncompleted',
      'snoozed',
      'unsnoozed',
      'assigned',
      'unassigned',
      'deleted',
      'commented',
      'status_changed',
      'priority_changed',
      'category_changed'
    )
  );

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_reminder_activity_reminder_id ON reminder_activity(reminder_id);
CREATE INDEX IF NOT EXISTS idx_reminder_activity_user_id ON reminder_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_activity_created_at ON reminder_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminder_activity_action ON reminder_activity(action);

-- Composite index for common query pattern (get activity for reminder, sorted by time)
CREATE INDEX IF NOT EXISTS idx_reminder_activity_reminder_time
  ON reminder_activity(reminder_id, created_at DESC);

-- Enable RLS
ALTER TABLE reminder_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view activity for reminders in their spaces
CREATE POLICY "Users can view activity for reminders in their space"
  ON reminder_activity FOR SELECT
  USING (
    reminder_id IN (
      SELECT r.id FROM reminders r
      INNER JOIN space_members sm ON sm.space_id = r.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert activity for reminders in their spaces
CREATE POLICY "Users can insert activity for reminders in their space"
  ON reminder_activity FOR INSERT
  WITH CHECK (
    reminder_id IN (
      SELECT r.id FROM reminders r
      INNER JOIN space_members sm ON sm.space_id = r.space_id
      WHERE sm.user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- RLS Policy: No updates allowed (immutable log)
-- Activity logs should never be modified for audit trail integrity
CREATE POLICY "Activity logs are immutable"
  ON reminder_activity FOR UPDATE
  USING (false);

-- RLS Policy: No deletes allowed (immutable log)
-- Activity logs should never be deleted for audit trail integrity
CREATE POLICY "Activity logs cannot be deleted"
  ON reminder_activity FOR DELETE
  USING (false);

-- Create function to automatically log reminder changes
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
    INSERT INTO reminder_activity (reminder_id, user_id, action, metadata)
    VALUES (OLD.id, auth.uid(), action_type, change_metadata);

    RETURN OLD;
  END IF;

  -- Insert activity log (for INSERT and UPDATE)
  INSERT INTO reminder_activity (reminder_id, user_id, action, metadata)
  VALUES (NEW.id, auth.uid(), action_type, change_metadata);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-log all reminder changes
DROP TRIGGER IF EXISTS log_reminder_change_trigger ON reminders;
CREATE TRIGGER log_reminder_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION log_reminder_change();

-- Add comments for documentation
COMMENT ON TABLE reminder_activity IS 'Immutable audit log of all reminder changes for transparency in shared spaces';
COMMENT ON COLUMN reminder_activity.action IS 'Type of change: created, updated, completed, snoozed, assigned, etc.';
COMMENT ON COLUMN reminder_activity.metadata IS 'JSON object with change details specific to the action type';
COMMENT ON COLUMN reminder_activity.user_id IS 'User who performed the action';

-- Grant usage on the table (RLS will still apply)
GRANT SELECT ON reminder_activity TO authenticated;
GRANT INSERT ON reminder_activity TO authenticated;
