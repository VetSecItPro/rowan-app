-- =============================================
-- Add member assignment to Goals
-- Similar to Tasks and Reminders pattern
-- =============================================

-- Add assigned_to column to goals table
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for efficient filtering by assigned user
CREATE INDEX IF NOT EXISTS idx_goals_assigned_to ON goals(assigned_to);
CREATE INDEX IF NOT EXISTS idx_goals_space_assigned ON goals(space_id, assigned_to);

-- Add comment for documentation
COMMENT ON COLUMN goals.assigned_to IS 'User assigned to work on this goal (simple single-member assignment)';

-- Grant permissions (following existing pattern)
GRANT ALL ON goals TO authenticated;
GRANT ALL ON goals TO service_role;

-- Note: RLS policies already exist from 20251008000001_comprehensive_rls_policies.sql
-- The existing space-based RLS policies will automatically apply to this field
