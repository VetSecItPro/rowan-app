-- =============================================
-- REMINDERS COLLABORATION: COMMENTS & CONVERSATIONS
-- =============================================
-- This migration creates the comment system for reminders,
-- enabling threaded conversations on each reminder.

-- Create reminder_comments table
CREATE TABLE IF NOT EXISTS reminder_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add CHECK constraint for content
ALTER TABLE reminder_comments
  ADD CONSTRAINT valid_comment_content CHECK (
    char_length(trim(content)) >= 1 AND char_length(content) <= 5000
  );

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_reminder_comments_reminder_id
  ON reminder_comments(reminder_id);

CREATE INDEX IF NOT EXISTS idx_reminder_comments_user_id
  ON reminder_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_reminder_comments_created_at
  ON reminder_comments(created_at DESC);

-- Composite index for common query pattern (get comments for reminder)
CREATE INDEX IF NOT EXISTS idx_reminder_comments_reminder_created
  ON reminder_comments(reminder_id, created_at DESC);

-- Enable RLS
ALTER TABLE reminder_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view comments on reminders in their spaces
CREATE POLICY "Users can view comments in their spaces"
  ON reminder_comments FOR SELECT
  USING (
    reminder_id IN (
      SELECT r.id FROM reminders r
      INNER JOIN space_members sm ON sm.space_id = r.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can create comments on reminders in their spaces
CREATE POLICY "Users can create comments in their spaces"
  ON reminder_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    reminder_id IN (
      SELECT r.id FROM reminders r
      INNER JOIN space_members sm ON sm.space_id = r.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON reminder_comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policy: Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON reminder_comments FOR DELETE
  USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reminder_comment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at on comment edits
DROP TRIGGER IF EXISTS update_reminder_comment_timestamp_trigger ON reminder_comments;
CREATE TRIGGER update_reminder_comment_timestamp_trigger
  BEFORE UPDATE ON reminder_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_reminder_comment_timestamp();

-- Function to log comment activity in reminder_activity table
CREATE OR REPLACE FUNCTION log_reminder_comment_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO reminder_activity (reminder_id, user_id, action, metadata)
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
    INSERT INTO reminder_activity (reminder_id, user_id, action, metadata)
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
    INSERT INTO reminder_activity (reminder_id, user_id, action, metadata)
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

-- Trigger to log comment activity
DROP TRIGGER IF EXISTS log_reminder_comment_activity_trigger ON reminder_comments;
CREATE TRIGGER log_reminder_comment_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reminder_comments
  FOR EACH ROW
  EXECUTE FUNCTION log_reminder_comment_activity();

-- Function to get comment count for a reminder
CREATE OR REPLACE FUNCTION get_reminder_comment_count(p_reminder_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM reminder_comments
  WHERE reminder_id = p_reminder_id;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Add comment count to reminders view (optional - for performance)
-- This can be queried dynamically or cached

-- Add comments for documentation
COMMENT ON TABLE reminder_comments IS 'Comments and conversations on reminders for collaborative discussions';
COMMENT ON FUNCTION get_reminder_comment_count IS 'Returns the total number of comments for a given reminder';

-- Grant usage
GRANT SELECT, INSERT, UPDATE, DELETE ON reminder_comments TO authenticated;
