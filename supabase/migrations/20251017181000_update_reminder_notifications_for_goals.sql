-- Update reminder_notifications table to support goal check-ins

-- Add goal_id column to support goal notifications
ALTER TABLE reminder_notifications
ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES goals(id) ON DELETE CASCADE;

-- Add title and message columns for custom notification content
ALTER TABLE reminder_notifications
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS message TEXT;

-- Update the existing constraint to make reminder_id nullable
ALTER TABLE reminder_notifications
ALTER COLUMN reminder_id DROP NOT NULL;

-- Add a check constraint to ensure either reminder_id or goal_id is provided
ALTER TABLE reminder_notifications
ADD CONSTRAINT reminder_notifications_entity_check
CHECK ((reminder_id IS NOT NULL) OR (goal_id IS NOT NULL));

-- Add index for goal_id
CREATE INDEX IF NOT EXISTS idx_reminder_notifications_goal_id ON reminder_notifications(goal_id);

-- Update RLS policies to include goal access

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can view their notifications" ON reminder_notifications;
DROP POLICY IF EXISTS "Users can manage their notifications" ON reminder_notifications;

-- Create comprehensive policies for both reminders and goals
CREATE POLICY "Users can view their reminder notifications"
  ON reminder_notifications
  FOR SELECT
  USING (
    user_id = auth.uid()
    AND (
      -- For reminder notifications: user has access to the reminder
      (reminder_id IS NOT NULL AND reminder_id IN (
        SELECT r.id FROM reminders r
        JOIN space_members sm ON r.space_id = sm.space_id
        WHERE sm.user_id = auth.uid()
      ))
      OR
      -- For goal notifications: user has access to the goal
      (goal_id IS NOT NULL AND goal_id IN (
        SELECT g.id FROM goals g
        JOIN space_members sm ON g.space_id = sm.space_id
        WHERE sm.user_id = auth.uid()
      ))
    )
  );

-- Policy for creating notifications (used by system/cron jobs)
CREATE POLICY "System can create notifications"
  ON reminder_notifications
  FOR INSERT
  WITH CHECK (
    user_id IS NOT NULL
    AND (
      -- For reminder notifications: reminder exists and user has access
      (reminder_id IS NOT NULL AND reminder_id IN (
        SELECT r.id FROM reminders r
        JOIN space_members sm ON r.space_id = sm.space_id
        WHERE sm.user_id = user_id
      ))
      OR
      -- For goal notifications: goal exists and user has access
      (goal_id IS NOT NULL AND goal_id IN (
        SELECT g.id FROM goals g
        JOIN space_members sm ON g.space_id = sm.space_id
        WHERE sm.user_id = user_id
      ))
    )
  );

-- Policy for updating notifications (marking as read, etc.)
CREATE POLICY "Users can update their notifications"
  ON reminder_notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- Policy for deleting notifications
CREATE POLICY "Users can delete their notifications"
  ON reminder_notifications
  FOR DELETE
  USING (user_id = auth.uid());

-- Grant permissions
GRANT ALL ON reminder_notifications TO authenticated;
GRANT ALL ON reminder_notifications TO service_role;