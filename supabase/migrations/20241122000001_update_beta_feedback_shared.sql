-- Update beta testing system for shared feedback with voting and comments
-- Migration: 20241122000001_update_beta_feedback_shared.sql

-- Add voting and commenting tables for beta feedback

-- Create feedback votes table
CREATE TABLE IF NOT EXISTS beta_feedback_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID NOT NULL REFERENCES beta_feedback(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(feedback_id, user_id) -- One vote per user per feedback
);

-- Create feedback comments table
CREATE TABLE IF NOT EXISTS beta_feedback_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID NOT NULL REFERENCES beta_feedback(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add vote count columns to beta_feedback table
ALTER TABLE beta_feedback
ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_beta_feedback_votes_feedback_id ON beta_feedback_votes(feedback_id);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_votes_user_id ON beta_feedback_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_comments_feedback_id ON beta_feedback_comments(feedback_id);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_comments_created_at ON beta_feedback_comments(created_at DESC);

-- Enable RLS for new tables
ALTER TABLE beta_feedback_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_feedback_comments ENABLE ROW LEVEL SECURITY;

-- UPDATE RLS Policies for shared feedback model

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users can view own feedback" ON beta_feedback;
DROP POLICY IF EXISTS "Users can update own feedback" ON beta_feedback;

-- NEW: Allow ALL beta testers to view all feedback (shared model)
CREATE POLICY "Beta testers can view all feedback" ON beta_feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND is_beta_tester = TRUE
        )
    );

-- Keep: Users can only update their own feedback
CREATE POLICY "Users can update own feedback only" ON beta_feedback
    FOR UPDATE USING (user_id = auth.uid());

-- Voting policies: Beta testers can vote on any feedback
CREATE POLICY "Beta testers can view all votes" ON beta_feedback_votes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND is_beta_tester = TRUE
        )
    );

CREATE POLICY "Beta testers can insert votes" ON beta_feedback_votes
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND is_beta_tester = TRUE
        )
    );

CREATE POLICY "Users can update their own votes" ON beta_feedback_votes
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own votes" ON beta_feedback_votes
    FOR DELETE USING (user_id = auth.uid());

-- Comments policies: Beta testers can comment on any feedback
CREATE POLICY "Beta testers can view all comments" ON beta_feedback_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND is_beta_tester = TRUE
        )
    );

CREATE POLICY "Beta testers can insert comments" ON beta_feedback_comments
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND is_beta_tester = TRUE
        )
    );

CREATE POLICY "Users can update their own comments" ON beta_feedback_comments
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON beta_feedback_comments
    FOR DELETE USING (user_id = auth.uid());

-- Admin policies for new tables (admins can see and manage everything)
CREATE POLICY "Admins can manage all votes" ON beta_feedback_votes
    FOR ALL USING (is_admin());

CREATE POLICY "Admins can manage all comments" ON beta_feedback_comments
    FOR ALL USING (is_admin());

-- Function to update vote counts
CREATE OR REPLACE FUNCTION update_feedback_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update vote counts for the feedback
    UPDATE beta_feedback
    SET
        upvotes = (
            SELECT COUNT(*) FROM beta_feedback_votes
            WHERE feedback_id = COALESCE(NEW.feedback_id, OLD.feedback_id)
            AND vote_type = 'up'
        ),
        downvotes = (
            SELECT COUNT(*) FROM beta_feedback_votes
            WHERE feedback_id = COALESCE(NEW.feedback_id, OLD.feedback_id)
            AND vote_type = 'down'
        )
    WHERE id = COALESCE(NEW.feedback_id, OLD.feedback_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update vote counts
CREATE TRIGGER update_feedback_votes_on_insert
    AFTER INSERT ON beta_feedback_votes
    FOR EACH ROW EXECUTE FUNCTION update_feedback_vote_counts();

CREATE TRIGGER update_feedback_votes_on_update
    AFTER UPDATE ON beta_feedback_votes
    FOR EACH ROW EXECUTE FUNCTION update_feedback_vote_counts();

CREATE TRIGGER update_feedback_votes_on_delete
    AFTER DELETE ON beta_feedback_votes
    FOR EACH ROW EXECUTE FUNCTION update_feedback_vote_counts();

-- Trigger for comment timestamps
CREATE TRIGGER update_beta_feedback_comments_updated_at
    BEFORE UPDATE ON beta_feedback_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Updated function to get enhanced feedback stats
CREATE OR REPLACE FUNCTION get_enhanced_beta_feedback_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_feedback', COUNT(*),
        'open_feedback', COUNT(*) FILTER (WHERE status = 'open'),
        'critical_issues', COUNT(*) FILTER (WHERE severity = 'critical'),
        'bug_reports', COUNT(*) FILTER (WHERE category = 'bug'),
        'feature_requests', COUNT(*) FILTER (WHERE category = 'feature_request'),
        'avg_response_time', AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400),
        'total_votes', (SELECT COUNT(*) FROM beta_feedback_votes),
        'total_comments', (SELECT COUNT(*) FROM beta_feedback_comments),
        'most_upvoted', (SELECT title FROM beta_feedback ORDER BY upvotes DESC LIMIT 1)
    ) INTO result
    FROM beta_feedback;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for new tables
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON beta_feedback_votes TO anon, authenticated;
GRANT ALL ON beta_feedback_comments TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Comments for documentation
COMMENT ON TABLE beta_feedback_votes IS 'Votes (up/down) on beta feedback submissions';
COMMENT ON TABLE beta_feedback_comments IS 'Comments and discussions on beta feedback';
COMMENT ON COLUMN beta_feedback.upvotes IS 'Number of upvotes for this feedback';
COMMENT ON COLUMN beta_feedback.downvotes IS 'Number of downvotes for this feedback';