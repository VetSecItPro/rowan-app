-- =============================================
-- FEATURE #16: APPROVAL WORKFLOW
-- =============================================
-- This migration creates an approval workflow system for tasks.

CREATE TABLE IF NOT EXISTS task_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'changes_requested')),

  -- Approval/rejection details
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  changes_requested TEXT, -- Specific changes needed if status is 'changes_requested'

  -- Who requested the approval
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_approvals_task ON task_approvals(task_id);
CREATE INDEX IF NOT EXISTS idx_task_approvals_approver ON task_approvals(approver_id, status);
CREATE INDEX IF NOT EXISTS idx_task_approvals_status ON task_approvals(status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_approvals_pending ON task_approvals(approver_id, requested_at DESC) WHERE status = 'pending';

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_task_approvals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status != OLD.status AND NEW.status != 'pending' THEN
    NEW.reviewed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_approvals_updated_at_trigger
  BEFORE UPDATE ON task_approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_task_approvals_updated_at();

-- Add approval fields to tasks table
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approval_status TEXT CHECK (approval_status IN ('not_required', 'pending', 'approved', 'rejected', 'changes_requested')),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Function to update task approval status when approval record changes
CREATE OR REPLACE FUNCTION update_task_approval_status()
RETURNS TRIGGER AS $$
DECLARE
  total_approvers INTEGER;
  approved_count INTEGER;
  rejected_count INTEGER;
  changes_requested_count INTEGER;
BEGIN
  -- Count approval statuses for this task
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'approved'),
    COUNT(*) FILTER (WHERE status = 'rejected'),
    COUNT(*) FILTER (WHERE status = 'changes_requested')
  INTO total_approvers, approved_count, rejected_count, changes_requested_count
  FROM task_approvals
  WHERE task_id = NEW.task_id;

  -- Update task based on approval states
  IF rejected_count > 0 THEN
    UPDATE tasks
    SET approval_status = 'rejected'
    WHERE id = NEW.task_id;
  ELSIF changes_requested_count > 0 THEN
    UPDATE tasks
    SET approval_status = 'changes_requested'
    WHERE id = NEW.task_id;
  ELSIF approved_count = total_approvers AND total_approvers > 0 THEN
    UPDATE tasks
    SET
      approval_status = 'approved',
      approved_at = NOW(),
      approved_by = NEW.approver_id
    WHERE id = NEW.task_id;
  ELSE
    UPDATE tasks
    SET approval_status = 'pending'
    WHERE id = NEW.task_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_approvals_update_status_trigger
  AFTER INSERT OR UPDATE OF status ON task_approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_task_approval_status();

-- Function to auto-complete task when approved (if configured)
CREATE OR REPLACE FUNCTION auto_complete_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approval_status = 'approved' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'approved') THEN
    -- Check if task should auto-complete on approval (based on metadata)
    IF (NEW.metadata->>'auto_complete_on_approval')::BOOLEAN = TRUE THEN
      NEW.status = 'completed';
      NEW.completed_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_auto_complete_on_approval_trigger
  BEFORE UPDATE OF approval_status ON tasks
  FOR EACH ROW
  WHEN (NEW.approval_status = 'approved')
  EXECUTE FUNCTION auto_complete_on_approval();

-- Add metadata field to tasks for configuration
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add comments
COMMENT ON TABLE task_approvals IS 'Approval workflow for tasks requiring review before completion';
COMMENT ON COLUMN task_approvals.changes_requested IS 'Specific feedback on what needs to be changed';
COMMENT ON COLUMN tasks.requires_approval IS 'True if task needs approval before being marked complete';
COMMENT ON COLUMN tasks.approval_status IS 'Current approval state of the task';
COMMENT ON COLUMN tasks.metadata IS 'JSON metadata for task configuration (e.g., auto_complete_on_approval)';
