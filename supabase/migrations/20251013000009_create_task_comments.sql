-- =============================================
-- FEATURE #10: COMMENTS & REACTIONS
-- =============================================
-- This migration creates tables for task comments and emoji reactions.

-- Task Comments
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES task_comments(id) ON DELETE CASCADE, -- For threaded replies

  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Comment Reactions (emoji reactions like 👍, ❤️, 🎉)
CREATE TABLE IF NOT EXISTS task_comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES task_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL, -- Unicode emoji character

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(comment_id, user_id, emoji) -- One reaction type per user per comment
);

-- Task Reactions (emoji reactions on tasks themselves)
CREATE TABLE IF NOT EXISTS task_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL, -- Unicode emoji character

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(task_id, user_id, emoji) -- One reaction type per user per task
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_comments_user ON task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_parent ON task_comments(parent_comment_id);

CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment ON task_comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user ON task_comment_reactions(user_id);

CREATE INDEX IF NOT EXISTS idx_task_reactions_task ON task_reactions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reactions_user ON task_reactions(user_id);

-- Add updated_at trigger for comments
CREATE OR REPLACE FUNCTION update_task_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.content != OLD.content THEN
    NEW.is_edited = TRUE;
    NEW.edited_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_comments_updated_at_trigger
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_task_comments_updated_at();

-- Add comment_count to tasks table
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- Function to update comment_count on tasks
CREATE OR REPLACE FUNCTION update_task_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tasks
    SET comment_count = comment_count + 1
    WHERE id = NEW.task_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tasks
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE id = OLD.task_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_comments_count_trigger
  AFTER INSERT OR DELETE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_task_comment_count();

-- Add comments
COMMENT ON TABLE task_comments IS 'Comments and discussions on tasks';
COMMENT ON TABLE task_comment_reactions IS 'Emoji reactions on task comments';
COMMENT ON TABLE task_reactions IS 'Emoji reactions on tasks';
COMMENT ON COLUMN task_comments.parent_comment_id IS 'For threaded replies to comments';
COMMENT ON COLUMN tasks.comment_count IS 'Cached count of comments for quick display';
