-- Create beta testing system tables
-- Migration: 20241122000000_create_beta_testing_system.sql

-- Add beta tester fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_beta_tester BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS beta_signup_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS beta_status TEXT DEFAULT 'pending' CHECK (beta_status IN ('pending', 'approved', 'rejected', 'completed'));

-- Create beta_feedback table
CREATE TABLE IF NOT EXISTS beta_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('bug', 'feature_request', 'ui_ux', 'performance', 'other')),
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    priority TEXT NOT NULL CHECK (priority IN ('must_have', 'should_have', 'could_have', 'wont_have')),
    page_url TEXT,
    browser_info JSONB,
    screenshot_url TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    admin_response TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create beta_tester_activity table for tracking usage
CREATE TABLE IF NOT EXISTS beta_tester_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    page_url TEXT,
    feature_used TEXT,
    session_duration INTEGER, -- in seconds
    device_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_beta_feedback_user_id ON beta_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_status ON beta_feedback(status);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_category ON beta_feedback(category);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_severity ON beta_feedback(severity);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_created_at ON beta_feedback(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_beta_tester_activity_user_id ON beta_tester_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_beta_tester_activity_created_at ON beta_tester_activity(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_beta_tester ON users(is_beta_tester) WHERE is_beta_tester = TRUE;

-- Enable RLS (Row Level Security)
ALTER TABLE beta_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_tester_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for beta_feedback
CREATE POLICY "Users can view own feedback" ON beta_feedback
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own feedback" ON beta_feedback
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own feedback" ON beta_feedback
    FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for beta_tester_activity
CREATE POLICY "Users can insert own activity" ON beta_tester_activity
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own activity" ON beta_tester_activity
    FOR SELECT USING (user_id = auth.uid());

-- Admin policies (you'll need to adjust this based on your admin setup)
-- For now, we'll create a function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    -- This is a placeholder - you'll need to implement proper admin checking
    -- For now, we'll check if the user email contains 'admin' or specific admin emails
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = user_id
        AND (email ILIKE '%admin%' OR email = 'admin@rowanapp.com')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin policies for beta_feedback
CREATE POLICY "Admins can view all feedback" ON beta_feedback
    FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update all feedback" ON beta_feedback
    FOR UPDATE USING (is_admin());

-- Admin policies for beta_tester_activity
CREATE POLICY "Admins can view all activity" ON beta_tester_activity
    FOR SELECT USING (is_admin());

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_beta_feedback_updated_at
    BEFORE UPDATE ON beta_feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a function to get feedback stats
CREATE OR REPLACE FUNCTION get_beta_feedback_stats()
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
        'avg_response_time', AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400) -- in days
    ) INTO result
    FROM beta_feedback;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get beta tester stats
CREATE OR REPLACE FUNCTION get_beta_tester_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_beta_testers', COUNT(*),
        'active_testers', COUNT(*) FILTER (WHERE beta_status = 'approved'),
        'pending_approval', COUNT(*) FILTER (WHERE beta_status = 'pending'),
        'signup_this_week', COUNT(*) FILTER (WHERE beta_signup_date >= NOW() - INTERVAL '7 days')
    ) INTO result
    FROM users
    WHERE is_beta_tester = TRUE;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert some sample data for testing (optional)
-- You can remove this section if you don't want sample data
/*
-- Sample beta tester (replace with real data later)
INSERT INTO users (email, is_beta_tester, beta_status, beta_signup_date)
VALUES
    ('beta1@example.com', TRUE, 'approved', NOW() - INTERVAL '5 days'),
    ('beta2@example.com', TRUE, 'pending', NOW() - INTERVAL '2 days')
ON CONFLICT (email) DO NOTHING;
*/

-- Comments for documentation
COMMENT ON TABLE beta_feedback IS 'Stores feedback submissions from beta testers';
COMMENT ON TABLE beta_tester_activity IS 'Tracks beta tester usage and activity for analytics';
COMMENT ON COLUMN users.is_beta_tester IS 'Whether this user is part of the beta testing program';
COMMENT ON COLUMN users.beta_status IS 'Status of beta tester: pending, approved, rejected, completed';
COMMENT ON COLUMN beta_feedback.severity IS 'Bug severity: critical, high, medium, low';
COMMENT ON COLUMN beta_feedback.category IS 'Feedback category: bug, feature_request, ui_ux, performance, other';
COMMENT ON COLUMN beta_feedback.browser_info IS 'JSON object containing browser, OS, and device information';

-- Grant appropriate permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;