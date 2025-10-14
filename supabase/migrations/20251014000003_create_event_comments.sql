-- Create event_comments table
CREATE TABLE IF NOT EXISTS event_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions UUID[], -- Array of mentioned user IDs
  parent_comment_id UUID REFERENCES event_comments(id) ON DELETE CASCADE,
  edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add space_id column if it doesn't exist (for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'event_comments' AND column_name = 'space_id'
  ) THEN
    -- Add column without NOT NULL first
    ALTER TABLE event_comments ADD COLUMN space_id UUID REFERENCES spaces(id) ON DELETE CASCADE;

    -- Populate space_id from events table for existing rows
    UPDATE event_comments ec
    SET space_id = e.space_id
    FROM events e
    WHERE ec.event_id = e.id AND ec.space_id IS NULL;

    -- Make it NOT NULL after populating
    ALTER TABLE event_comments ALTER COLUMN space_id SET NOT NULL;
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_event_comments_event_id ON event_comments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_space_id ON event_comments(space_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_user_id ON event_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_parent ON event_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_mentions ON event_comments USING GIN(mentions);

-- Enable RLS
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view comments in their space" ON event_comments;
CREATE POLICY "Users can view comments in their space"
  ON event_comments FOR SELECT
  USING (
    space_id IN (
      SELECT space_id
      FROM space_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create comments in their space" ON event_comments;
CREATE POLICY "Users can create comments in their space"
  ON event_comments FOR INSERT
  WITH CHECK (
    space_id IN (
      SELECT space_id
      FROM space_members
      WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update their own comments" ON event_comments;
CREATE POLICY "Users can update their own comments"
  ON event_comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own comments" ON event_comments;
CREATE POLICY "Users can delete their own comments"
  ON event_comments FOR DELETE
  USING (user_id = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER set_event_comments_updated_at
  BEFORE UPDATE ON event_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
