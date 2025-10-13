-- =============================================
-- FEATURE #13: SNOOZE/POSTPONE TASKS
-- =============================================
-- This migration adds snooze/postpone functionality to tasks.

-- Add snooze fields to tasks table
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_snoozed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS snoozed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS snooze_count INTEGER DEFAULT 0;

-- Create snooze history table for tracking
CREATE TABLE IF NOT EXISTS task_snooze_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  snoozed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  snoozed_from_date DATE,
  snoozed_to_date DATE,
  snooze_duration_minutes INTEGER,
  reason TEXT, -- Optional reason for snoozing

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tasks_snoozed ON tasks(is_snoozed, snoozed_until) WHERE is_snoozed = TRUE;
CREATE INDEX IF NOT EXISTS idx_task_snooze_history_task ON task_snooze_history(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_snooze_history_user ON task_snooze_history(snoozed_by);

-- Function to auto-unsnooze tasks when time expires
CREATE OR REPLACE FUNCTION auto_unsnooze_expired_tasks()
RETURNS void AS $$
BEGIN
  UPDATE tasks
  SET
    is_snoozed = FALSE,
    snoozed_until = NULL,
    snoozed_by = NULL
  WHERE is_snoozed = TRUE
    AND snoozed_until IS NOT NULL
    AND snoozed_until <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to track snooze in history when task is snoozed
CREATE OR REPLACE FUNCTION record_task_snooze()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_snoozed = TRUE AND (OLD.is_snoozed IS NULL OR OLD.is_snoozed = FALSE) THEN
    -- Increment snooze count
    NEW.snooze_count = COALESCE(OLD.snooze_count, 0) + 1;

    -- Record in history
    INSERT INTO task_snooze_history (
      task_id,
      snoozed_by,
      snoozed_from_date,
      snoozed_to_date,
      snooze_duration_minutes
    ) VALUES (
      NEW.id,
      NEW.snoozed_by,
      NEW.due_date,
      CASE
        WHEN NEW.snoozed_until IS NOT NULL
        THEN NEW.snoozed_until::DATE
        ELSE NULL
      END,
      CASE
        WHEN NEW.snoozed_until IS NOT NULL AND NEW.due_date IS NOT NULL
        THEN EXTRACT(EPOCH FROM (NEW.snoozed_until - NEW.due_date::TIMESTAMPTZ)) / 60
        ELSE NULL
      END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_snooze_tracking_trigger
  BEFORE UPDATE OF is_snoozed ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION record_task_snooze();

-- Add comments
COMMENT ON COLUMN tasks.is_snoozed IS 'True if task is currently snoozed/hidden';
COMMENT ON COLUMN tasks.snoozed_until IS 'Timestamp when task should reappear';
COMMENT ON COLUMN tasks.snooze_count IS 'Total number of times this task has been snoozed';
COMMENT ON TABLE task_snooze_history IS 'History of all snooze actions for analytics';
