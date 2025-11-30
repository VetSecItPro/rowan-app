-- =============================================
-- Add member assignment to Meals
-- Similar to Goals, Tasks, and Reminders pattern
-- =============================================

-- Add assigned_to column to meals table
ALTER TABLE meals
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for efficient filtering by assigned user
CREATE INDEX IF NOT EXISTS idx_meals_assigned_to ON meals(assigned_to);
CREATE INDEX IF NOT EXISTS idx_meals_space_assigned ON meals(space_id, assigned_to);

-- Add comment for documentation
COMMENT ON COLUMN meals.assigned_to IS 'User assigned to prepare/handle this meal (simple single-member assignment)';

-- Grant permissions (following existing pattern)
GRANT ALL ON meals TO authenticated;
GRANT ALL ON meals TO service_role;

-- Note: RLS policies already exist from 20251008000001_comprehensive_rls_policies.sql
-- The existing space-based RLS policies will automatically apply to this field
