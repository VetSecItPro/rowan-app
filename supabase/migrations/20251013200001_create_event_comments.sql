-- Create event_comments table for collaborative discussions
CREATE TABLE IF NOT EXISTS event_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  mentions UUID[], -- Array of mentioned user IDs
  parent_comment_id UUID REFERENCES event_comments(id) ON DELETE CASCADE, -- For threading/replies
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_comments_event_id ON event_comments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_user_id ON event_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_parent_id ON event_comments(parent_comment_id);

-- Enable RLS
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view comments on events in their space
CREATE POLICY "Users can view comments on events in their space"
  ON event_comments FOR SELECT
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can add comments to events in their space
CREATE POLICY "Users can add comments to events in their space"
  ON event_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    event_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON event_comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policy: Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON event_comments FOR DELETE
  USING (user_id = auth.uid());

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_event_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_comments_updated_at_trigger
BEFORE UPDATE ON event_comments
FOR EACH ROW
EXECUTE FUNCTION update_event_comments_updated_at();

-- Comment
COMMENT ON TABLE event_comments IS 'Stores comments and discussions on calendar events with @mention support';
