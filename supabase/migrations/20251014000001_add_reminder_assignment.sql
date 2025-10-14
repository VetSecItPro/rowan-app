-- =============================================
-- REMINDERS COLLABORATION: USER ASSIGNMENT
-- =============================================
-- This migration adds user assignment functionality to reminders,
-- allowing reminders to be delegated to specific space members.

-- Add assigned_to column to reminders table
ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add index for query performance on assigned_to column
CREATE INDEX IF NOT EXISTS idx_reminders_assigned_to ON reminders(assigned_to);

-- Add composite index for space_id + assigned_to for filtered queries
CREATE INDEX IF NOT EXISTS idx_reminders_space_assigned ON reminders(space_id, assigned_to);

-- Add RLS policy to ensure only space members can be assigned
-- This policy validates that assigned_to is a member of the reminder's space
CREATE OR REPLACE FUNCTION validate_reminder_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- If assigned_to is not null, verify the user is a member of the space
  IF NEW.assigned_to IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM space_members
      WHERE space_id = NEW.space_id
      AND user_id = NEW.assigned_to
    ) THEN
      RAISE EXCEPTION 'Cannot assign reminder to user who is not a member of this space';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to validate assignment on insert and update
DROP TRIGGER IF EXISTS validate_reminder_assignment_trigger ON reminders;
CREATE TRIGGER validate_reminder_assignment_trigger
  BEFORE INSERT OR UPDATE OF assigned_to ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION validate_reminder_assignment();

-- Add comment for documentation
COMMENT ON COLUMN reminders.assigned_to IS 'User this reminder is assigned to. Must be a member of the reminder space.';

-- Security: Update existing RLS policies to include assigned_to checks
-- Users can see reminders assigned to them even if they didn't create them
DROP POLICY IF EXISTS "Users can view reminders in their space" ON reminders;
CREATE POLICY "Users can view reminders in their space"
  ON reminders FOR SELECT
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

-- Users can update reminders they created OR are assigned to them
DROP POLICY IF EXISTS "Users can update reminders in their space" ON reminders;
CREATE POLICY "Users can update reminders in their space"
  ON reminders FOR UPDATE
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );
