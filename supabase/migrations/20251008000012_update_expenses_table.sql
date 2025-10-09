-- =============================================
-- UPDATE EXPENSES TABLE - Add Missing Columns
-- Date: October 8, 2025
-- Purpose: Add status, due_date, paid_at, recurring, payment_method, created_by columns
-- =============================================

-- Add missing columns to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue'));
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurring BOOLEAN DEFAULT false;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Rename 'date' to keep it for backwards compatibility, but we'll use due_date going forward
-- Copy existing date values to due_date
UPDATE expenses SET due_date = date WHERE due_date IS NULL;

-- Update existing expenses to have created_by set to paid_by if not set
UPDATE expenses SET created_by = paid_by WHERE created_by IS NULL AND paid_by IS NOT NULL;

-- Add comment to table for documentation
COMMENT ON COLUMN expenses.status IS 'Expense status: pending, paid, or overdue';
COMMENT ON COLUMN expenses.due_date IS 'Due date for the expense (when it needs to be paid)';
COMMENT ON COLUMN expenses.paid_at IS 'Timestamp when expense was marked as paid';
COMMENT ON COLUMN expenses.recurring IS 'Whether this is a recurring expense';
COMMENT ON COLUMN expenses.payment_method IS 'How the expense was/will be paid';
COMMENT ON COLUMN expenses.created_by IS 'User who created this expense';
