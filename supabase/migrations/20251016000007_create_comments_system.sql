-- =============================================
-- CREATE COMMENTS AND ACTIVITY SYSTEM
-- Date: October 16, 2025
-- Purpose: Polymorphic comments, mentions, reactions, and activity logs
-- =============================================

-- Create enum for commentable types
CREATE TYPE commentable_type AS ENUM (
  'expense',
  'goal',
  'task',
  'project',
  'budget',
  'bill',
  'meal_plan',
  'shopping_list',
  'message'
);

-- Create enum for activity types
CREATE TYPE activity_type AS ENUM (
  'created',
  'updated',
  'deleted',
  'completed',
  'commented',
  'mentioned',
  'reacted',
  'shared',
  'assigned',
  'status_changed',
  'amount_changed',
  'date_changed'
);

-- Create comments table (polymorphic)
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

  -- Polymorphic relationship
  commentable_type commentable_type NOT NULL,
  commentable_id UUID NOT NULL,

  -- Comment content
  content TEXT NOT NULL CHECK (LENGTH(content) > 0),

  -- Hierarchy (for threaded comments)
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  thread_depth INTEGER DEFAULT 0 CHECK (thread_depth >= 0 AND thread_depth <= 5),

  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  edited_at TIMESTAMPTZ,
  is_edited BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,

  -- Soft delete
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create mentions table (@username in comments)
CREATE TABLE IF NOT EXISTS mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Notification tracking
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique mention per comment per user
  UNIQUE(comment_id, mentioned_user_id)
);

-- Create reactions table (emoji reactions to comments)
CREATE TABLE IF NOT EXISTS comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Emoji reaction (unicode emoji or :shortcode:)
  emoji TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One reaction type per user per comment
  UNIQUE(comment_id, user_id, emoji)
);

-- Create activity_logs table (audit trail)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

  -- What happened
  activity_type activity_type NOT NULL,

  -- To what entity
  entity_type commentable_type NOT NULL,
  entity_id UUID NOT NULL,

  -- Who did it
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- What changed
  description TEXT,
  metadata JSONB, -- Store additional context (old_value, new_value, etc.)

  -- Visibility
  is_system BOOLEAN DEFAULT false, -- System-generated vs user-generated

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_comments_commentable ON comments(commentable_type, commentable_id) WHERE is_deleted = false;
CREATE INDEX idx_comments_space ON comments(space_id);
CREATE INDEX idx_comments_created_by ON comments(created_by);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX idx_comments_pinned ON comments(is_pinned) WHERE is_pinned = true;

CREATE INDEX idx_mentions_user ON mentions(mentioned_user_id);
CREATE INDEX idx_mentions_comment ON mentions(comment_id);
CREATE INDEX idx_mentions_unread ON mentions(mentioned_user_id, is_read) WHERE is_read = false;

CREATE INDEX idx_reactions_comment ON comment_reactions(comment_id);
CREATE INDEX idx_reactions_user ON comment_reactions(user_id);
CREATE INDEX idx_reactions_emoji ON comment_reactions(emoji);

CREATE INDEX idx_activity_logs_space ON activity_logs(space_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Comments
CREATE POLICY "Users can view comments in their spaces"
ON comments FOR SELECT TO authenticated
USING (
  space_id IN (
    SELECT space_id FROM space_members WHERE user_id = auth.uid()
  )
  AND is_deleted = false
);

CREATE POLICY "Users can create comments in their spaces"
ON comments FOR INSERT TO authenticated
WITH CHECK (
  space_id IN (
    SELECT space_id FROM space_members WHERE user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update their own comments"
ON comments FOR UPDATE TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own comments"
ON comments FOR DELETE TO authenticated
USING (created_by = auth.uid());

-- RLS Policies: Mentions
CREATE POLICY "Users can view mentions in their spaces"
ON mentions FOR SELECT TO authenticated
USING (
  comment_id IN (
    SELECT id FROM comments WHERE space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Anyone can create mentions when commenting"
ON mentions FOR INSERT TO authenticated
WITH CHECK (
  comment_id IN (
    SELECT id FROM comments WHERE space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their own mention read status"
ON mentions FOR UPDATE TO authenticated
USING (mentioned_user_id = auth.uid());

-- RLS Policies: Comment Reactions
CREATE POLICY "Users can view reactions in their spaces"
ON comment_reactions FOR SELECT TO authenticated
USING (
  comment_id IN (
    SELECT id FROM comments WHERE space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can add reactions in their spaces"
ON comment_reactions FOR INSERT TO authenticated
WITH CHECK (
  comment_id IN (
    SELECT id FROM comments WHERE space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  )
  AND user_id = auth.uid()
);

CREATE POLICY "Users can remove their own reactions"
ON comment_reactions FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- RLS Policies: Activity Logs
CREATE POLICY "Users can view activity logs in their spaces"
ON activity_logs FOR SELECT TO authenticated
USING (
  space_id IN (
    SELECT space_id FROM space_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create activity logs in their spaces"
ON activity_logs FOR INSERT TO authenticated
WITH CHECK (
  space_id IN (
    SELECT space_id FROM space_members WHERE user_id = auth.uid()
  )
);

-- Function to extract mentions from comment content
CREATE OR REPLACE FUNCTION extract_mentions_from_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_mention TEXT;
  v_user_id UUID;
  v_mentions TEXT[];
BEGIN
  -- Extract @username patterns (e.g., @john, @jane.doe, @user_123)
  v_mentions := ARRAY(
    SELECT DISTINCT regexp_matches(NEW.content, '@([a-zA-Z0-9_.]+)', 'g')
  );

  -- For each mention, find the user and create mention record
  IF v_mentions IS NOT NULL THEN
    FOREACH v_mention IN ARRAY v_mentions
    LOOP
      -- Remove the @ symbol
      v_mention := substring(v_mention from 2);

      -- Find user by email prefix (simplified - could be enhanced)
      SELECT id INTO v_user_id
      FROM users
      WHERE email ILIKE v_mention || '%'
      LIMIT 1;

      -- Create mention record if user found
      IF v_user_id IS NOT NULL THEN
        INSERT INTO mentions (comment_id, mentioned_user_id)
        VALUES (NEW.id, v_user_id)
        ON CONFLICT (comment_id, mentioned_user_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-extract mentions from comments
DROP TRIGGER IF EXISTS trigger_extract_mentions ON comments;
CREATE TRIGGER trigger_extract_mentions
  AFTER INSERT OR UPDATE OF content ON comments
  FOR EACH ROW
  WHEN (NEW.is_deleted = false)
  EXECUTE FUNCTION extract_mentions_from_comment();

-- Function to log comment activity
CREATE OR REPLACE FUNCTION log_comment_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (
      space_id,
      activity_type,
      entity_type,
      entity_id,
      user_id,
      description,
      metadata
    ) VALUES (
      NEW.space_id,
      'commented',
      NEW.commentable_type,
      NEW.commentable_id,
      NEW.created_by,
      'Added a comment',
      jsonb_build_object('comment_id', NEW.id, 'content_preview', LEFT(NEW.content, 100))
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.content != OLD.content THEN
      INSERT INTO activity_logs (
        space_id,
        activity_type,
        entity_type,
        entity_id,
        user_id,
        description,
        metadata
      ) VALUES (
        NEW.space_id,
        'updated',
        NEW.commentable_type,
        NEW.commentable_id,
        NEW.created_by,
        'Updated a comment',
        jsonb_build_object('comment_id', NEW.id)
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs (
      space_id,
      activity_type,
      entity_type,
      entity_id,
      user_id,
      description,
      metadata
    ) VALUES (
      OLD.space_id,
      'deleted',
      OLD.commentable_type,
      OLD.commentable_id,
      OLD.created_by,
      'Deleted a comment',
      jsonb_build_object('comment_id', OLD.id)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to log comment activity
DROP TRIGGER IF EXISTS trigger_log_comment_activity ON comments;
CREATE TRIGGER trigger_log_comment_activity
  AFTER INSERT OR UPDATE OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION log_comment_activity();

-- Function to log mention activity
CREATE OR REPLACE FUNCTION log_mention_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_comment RECORD;
BEGIN
  -- Get comment details
  SELECT * INTO v_comment FROM comments WHERE id = NEW.comment_id;

  INSERT INTO activity_logs (
    space_id,
    activity_type,
    entity_type,
    entity_id,
    user_id,
    description,
    metadata
  ) VALUES (
    v_comment.space_id,
    'mentioned',
    v_comment.commentable_type,
    v_comment.commentable_id,
    v_comment.created_by,
    'Mentioned a user',
    jsonb_build_object('mentioned_user_id', NEW.mentioned_user_id, 'comment_id', NEW.comment_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to log mentions
DROP TRIGGER IF EXISTS trigger_log_mention_activity ON mentions;
CREATE TRIGGER trigger_log_mention_activity
  AFTER INSERT ON mentions
  FOR EACH ROW
  EXECUTE FUNCTION log_mention_activity();

-- Function to log reaction activity
CREATE OR REPLACE FUNCTION log_reaction_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_comment RECORD;
BEGIN
  -- Get comment details
  SELECT * INTO v_comment FROM comments WHERE id = NEW.comment_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (
      space_id,
      activity_type,
      entity_type,
      entity_id,
      user_id,
      description,
      metadata
    ) VALUES (
      v_comment.space_id,
      'reacted',
      v_comment.commentable_type,
      v_comment.commentable_id,
      NEW.user_id,
      'Reacted to a comment',
      jsonb_build_object('emoji', NEW.emoji, 'comment_id', NEW.comment_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to log reactions
DROP TRIGGER IF EXISTS trigger_log_reaction_activity ON comment_reactions;
CREATE TRIGGER trigger_log_reaction_activity
  AFTER INSERT ON comment_reactions
  FOR EACH ROW
  EXECUTE FUNCTION log_reaction_activity();

-- Add updated_at triggers
CREATE TRIGGER comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE comments IS 'Polymorphic comments system for all entities with threading support';
COMMENT ON TABLE mentions IS 'User mentions (@username) in comments with notification tracking';
COMMENT ON TABLE comment_reactions IS 'Emoji reactions to comments (like Slack/Discord)';
COMMENT ON TABLE activity_logs IS 'Comprehensive audit trail of all user actions';

COMMENT ON COLUMN comments.commentable_type IS 'Type of entity being commented on';
COMMENT ON COLUMN comments.commentable_id IS 'ID of entity being commented on';
COMMENT ON COLUMN comments.thread_depth IS 'Nesting level for threaded replies (max 5)';
COMMENT ON COLUMN comments.is_pinned IS 'Whether comment is pinned to top';
COMMENT ON COLUMN activity_logs.metadata IS 'JSON object with additional context (old_value, new_value, etc.)';

-- Create views for common queries
CREATE OR REPLACE VIEW comment_counts AS
SELECT
  commentable_type,
  commentable_id,
  COUNT(*) AS comment_count,
  COUNT(DISTINCT created_by) AS unique_commenters,
  MAX(created_at) AS last_comment_at
FROM comments
WHERE is_deleted = false
GROUP BY commentable_type, commentable_id;

CREATE OR REPLACE VIEW reaction_counts AS
SELECT
  comment_id,
  emoji,
  COUNT(*) AS reaction_count,
  ARRAY_AGG(user_id) AS user_ids
FROM comment_reactions
GROUP BY comment_id, emoji;

CREATE OR REPLACE VIEW unread_mentions AS
SELECT
  m.id,
  m.comment_id,
  m.mentioned_user_id,
  c.content AS comment_content,
  c.commentable_type,
  c.commentable_id,
  c.created_by AS comment_author_id,
  u.email AS comment_author_email,
  c.created_at
FROM mentions m
INNER JOIN comments c ON m.comment_id = c.id
INNER JOIN users u ON c.created_by = u.id
WHERE m.is_read = false
  AND c.is_deleted = false;

-- Grant view permissions
GRANT SELECT ON comment_counts TO authenticated;
GRANT SELECT ON comment_counts TO service_role;
GRANT SELECT ON reaction_counts TO authenticated;
GRANT SELECT ON reaction_counts TO service_role;
GRANT SELECT ON unread_mentions TO authenticated;
GRANT SELECT ON unread_mentions TO service_role;
