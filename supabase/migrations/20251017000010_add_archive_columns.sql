-- Add archive functionality to tables
-- Supports GDPR data minimization by archiving old data

/**
 * GDPR COMPLIANCE - Article 5 (Data Minimization):
 * -------------------------------------------------
 * Instead of keeping all data active indefinitely, we archive old data
 * to reduce the amount of actively processed data while maintaining
 * records for compliance and user access.
 *
 * ARCHIVE POLICY:
 * ---------------
 * - Expenses: Can be archived after 1 year
 * - Tasks: Archived when completed and older than 90 days
 * - Calendar Events: Archived when ended and older than 90 days
 * - Archived data is still accessible to users but not in default views
 * - Archived data is included in data exports
 */

-- Add archived column to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Add archived column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Add archived column to calendar_events table
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for efficient querying of archived data
CREATE INDEX IF NOT EXISTS idx_expenses_archived ON expenses(archived, partnership_id);
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks(archived, partnership_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_archived ON calendar_events(archived, partnership_id);

-- Add comments
COMMENT ON COLUMN expenses.archived IS 'Whether this expense has been archived for data minimization';
COMMENT ON COLUMN tasks.archived IS 'Whether this task has been archived for data minimization';
COMMENT ON COLUMN calendar_events.archived IS 'Whether this event has been archived for data minimization';

-- Function to automatically archive old completed tasks (run monthly via cron)
CREATE OR REPLACE FUNCTION auto_archive_old_tasks()
RETURNS void AS $$
BEGIN
  UPDATE tasks
  SET archived = TRUE, archived_at = NOW()
  WHERE completed = TRUE
    AND completed_at < NOW() - INTERVAL '90 days'
    AND archived = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_archive_old_tasks IS 'Automatically archives completed tasks older than 90 days. Run monthly via cron job.';

-- Function to automatically archive old calendar events (run monthly via cron)
CREATE OR REPLACE FUNCTION auto_archive_old_events()
RETURNS void AS $$
BEGIN
  UPDATE calendar_events
  SET archived = TRUE, archived_at = NOW()
  WHERE end_time < NOW() - INTERVAL '90 days'
    AND archived = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_archive_old_events IS 'Automatically archives calendar events older than 90 days. Run monthly via cron job.';
