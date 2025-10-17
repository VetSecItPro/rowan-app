-- =============================================
-- MILESTONE CELEBRATION SYSTEM
-- =============================================
-- Automatically creates percentage milestones (25%, 50%, 75%, 100%)
-- and sends notifications when they are reached

-- ==========================================
-- 1. FUNCTION: Create automatic percentage milestones for financial goals
-- ==========================================
CREATE OR REPLACE FUNCTION create_financial_goal_milestones()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create milestones for financial goals
  IF NEW.is_financial = TRUE AND NEW.target_amount IS NOT NULL THEN
    -- Create 25% milestone
    INSERT INTO goal_milestones (goal_id, title, description, type, target_value)
    VALUES (
      NEW.id,
      '25% Complete',
      'Reached 25% of your goal!',
      'percentage',
      25
    );

    -- Create 50% milestone
    INSERT INTO goal_milestones (goal_id, title, description, type, target_value)
    VALUES (
      NEW.id,
      'Halfway There!',
      'You have reached 50% of your goal!',
      'percentage',
      50
    );

    -- Create 75% milestone
    INSERT INTO goal_milestones (goal_id, title, description, type, target_value)
    VALUES (
      NEW.id,
      '75% Complete',
      'Almost there! 75% of your goal achieved!',
      'percentage',
      75
    );

    -- Create 100% milestone
    INSERT INTO goal_milestones (goal_id, title, description, type, target_value)
    VALUES (
      NEW.id,
      'Goal Complete!',
      'Congratulations! You have reached your goal!',
      'percentage',
      100
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create milestones when a financial goal is created
DROP TRIGGER IF EXISTS create_goal_milestones_trigger ON goals;
CREATE TRIGGER create_goal_milestones_trigger
  AFTER INSERT ON goals
  FOR EACH ROW
  EXECUTE FUNCTION create_financial_goal_milestones();

-- ==========================================
-- 2. FUNCTION: Check and mark milestones as complete
-- ==========================================
CREATE OR REPLACE FUNCTION check_milestone_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_goal RECORD;
  v_milestone RECORD;
  v_current_percentage NUMERIC;
  v_space_id UUID;
  v_goal_title TEXT;
BEGIN
  -- Get goal details
  SELECT g.*, g.space_id, g.title INTO v_goal
  FROM goals g
  WHERE g.id = NEW.goal_id;

  -- Only process financial goals
  IF v_goal.is_financial = TRUE AND v_goal.target_amount IS NOT NULL AND v_goal.target_amount > 0 THEN
    -- Calculate current completion percentage
    v_current_percentage := (v_goal.current_amount / v_goal.target_amount) * 100;

    -- Check all percentage milestones for this goal
    FOR v_milestone IN
      SELECT * FROM goal_milestones
      WHERE goal_id = NEW.goal_id
        AND type = 'percentage'
        AND completed = FALSE
        AND target_value <= v_current_percentage
    LOOP
      -- Mark milestone as complete
      UPDATE goal_milestones
      SET completed = TRUE,
          completed_at = NOW()
      WHERE id = v_milestone.id;

      -- Create notification for all space members
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        link,
        space_id,
        created_at
      )
      SELECT
        sm.user_id,
        'goal_milestone',
        '🎉 Goal Milestone Reached!',
        v_goal.title || ' - ' || v_milestone.title,
        '/goals/' || NEW.goal_id,
        v_goal.space_id,
        NOW()
      FROM space_members sm
      WHERE sm.space_id = v_goal.space_id;

    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check milestone completion after goal updates (when contributions are added)
DROP TRIGGER IF EXISTS check_milestone_completion_on_update ON goals;
CREATE TRIGGER check_milestone_completion_on_update
  AFTER UPDATE OF current_amount ON goals
  FOR EACH ROW
  WHEN (NEW.current_amount IS DISTINCT FROM OLD.current_amount)
  EXECUTE FUNCTION check_milestone_completion();

-- ==========================================
-- 3. NOTIFICATIONS TABLE (if not exists)
-- ==========================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_space_id ON notifications(space_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- System can insert notifications (no user insert policy - handled by triggers)

-- ==========================================
-- 4. FUNCTION: Get recent milestone celebrations
-- ==========================================
CREATE OR REPLACE FUNCTION get_recent_milestone_celebrations(p_space_id UUID, p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  milestone_id UUID,
  goal_id UUID,
  goal_title TEXT,
  milestone_title TEXT,
  milestone_description TEXT,
  completed_at TIMESTAMPTZ,
  percentage_reached NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gm.id AS milestone_id,
    g.id AS goal_id,
    g.title AS goal_title,
    gm.title AS milestone_title,
    gm.description AS milestone_description,
    gm.completed_at,
    gm.target_value AS percentage_reached
  FROM goal_milestones gm
  INNER JOIN goals g ON gm.goal_id = g.id
  WHERE g.space_id = p_space_id
    AND gm.completed = TRUE
    AND gm.completed_at >= NOW() - INTERVAL '1 day' * p_days
  ORDER BY gm.completed_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 5. ADD NOTIFICATION CATEGORY FOR GOAL MILESTONES
-- ==========================================
-- Update notification_log category constraint to include goal milestones
ALTER TABLE notification_log DROP CONSTRAINT IF EXISTS notification_log_category_check;
ALTER TABLE notification_log ADD CONSTRAINT notification_log_category_check
  CHECK (category IN ('reminder', 'task', 'shopping', 'meal', 'event', 'message', 'digest', 'goal_milestone'));

-- ==========================================
-- 6. BACKFILL: Create milestones for existing financial goals
-- ==========================================
-- This will create milestones for any existing financial goals that don't have them
DO $$
DECLARE
  v_goal RECORD;
BEGIN
  FOR v_goal IN
    SELECT id, title, target_amount
    FROM goals
    WHERE is_financial = TRUE
      AND target_amount IS NOT NULL
      AND id NOT IN (SELECT DISTINCT goal_id FROM goal_milestones WHERE type = 'percentage')
  LOOP
    -- Create percentage milestones for this existing goal
    INSERT INTO goal_milestones (goal_id, title, description, type, target_value)
    VALUES
      (v_goal.id, '25% Complete', 'Reached 25% of your goal!', 'percentage', 25),
      (v_goal.id, 'Halfway There!', 'You have reached 50% of your goal!', 'percentage', 50),
      (v_goal.id, '75% Complete', 'Almost there! 75% of your goal achieved!', 'percentage', 75),
      (v_goal.id, 'Goal Complete!', 'Congratulations! You have reached your goal!', 'percentage', 100);
  END LOOP;
END $$;

-- ==========================================
-- 7. MANUALLY CHECK AND MARK EXISTING COMPLETED MILESTONES
-- ==========================================
-- For existing goals that have already passed milestones, mark them as complete
DO $$
DECLARE
  v_goal RECORD;
  v_milestone RECORD;
  v_current_percentage NUMERIC;
BEGIN
  FOR v_goal IN
    SELECT id, current_amount, target_amount, space_id, title
    FROM goals
    WHERE is_financial = TRUE
      AND target_amount IS NOT NULL
      AND target_amount > 0
      AND current_amount IS NOT NULL
  LOOP
    -- Calculate current completion percentage
    v_current_percentage := (v_goal.current_amount / v_goal.target_amount) * 100;

    -- Mark milestones as complete if already reached
    UPDATE goal_milestones
    SET completed = TRUE,
        completed_at = NOW()
    WHERE goal_id = v_goal.id
      AND type = 'percentage'
      AND completed = FALSE
      AND target_value <= v_current_percentage;
  END LOOP;
END $$;
