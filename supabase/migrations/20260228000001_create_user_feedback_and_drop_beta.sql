-- Migration: Create user_feedback table + drop remaining beta remnants
-- Date: 2026-02-28

-- ============================================
-- 1. Create user_feedback table
-- ============================================

CREATE TABLE IF NOT EXISTS user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('bug_report', 'feature_request', 'general')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 2000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'deleted')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_category ON user_feedback(category);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_user_feedback_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_user_feedback_updated_at
  BEFORE UPDATE ON user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_user_feedback_updated_at();

-- RLS
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON user_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own feedback
CREATE POLICY "Users can read own feedback"
  ON user_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Service role has full access (for admin API routes)
CREATE POLICY "Service role full access"
  ON user_feedback FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 2. Drop remaining beta tables
-- ============================================

DROP TABLE IF EXISTS beta_feedback_comments CASCADE;
DROP TABLE IF EXISTS beta_feedback_votes CASCADE;
DROP TABLE IF EXISTS beta_feedback CASCADE;
DROP TABLE IF EXISTS beta_tester_activity CASCADE;
DROP TABLE IF EXISTS beta_expiration_notifications CASCADE;

-- ============================================
-- 3. Drop orphaned beta functions/views
-- ============================================

DROP FUNCTION IF EXISTS get_beta_feedback_stats() CASCADE;
DROP FUNCTION IF EXISTS get_beta_tester_stats() CASCADE;
DROP FUNCTION IF EXISTS update_feedback_vote_counts() CASCADE;
DROP FUNCTION IF EXISTS get_enhanced_beta_feedback_stats() CASCADE;
DROP FUNCTION IF EXISTS is_beta_access_valid(TEXT) CASCADE;
DROP FUNCTION IF EXISTS extend_beta_access(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_expiring_beta_users(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS has_expiration_notification_sent(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS record_expiration_notification(TEXT, TEXT) CASCADE;
DROP VIEW IF EXISTS admin_beta_users_status CASCADE;
