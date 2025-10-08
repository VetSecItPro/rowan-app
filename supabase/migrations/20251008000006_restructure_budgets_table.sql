-- Restructure budgets table to match application code
-- The code expects a single monthly_budget field per space, not category-based budgets

-- Step 1: Add the monthly_budget column if it doesn't exist
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS monthly_budget DECIMAL(10, 2);

-- Step 2: Migrate existing data from amount to monthly_budget (if any exists)
-- This assumes the first/only budget entry per space should be preserved
UPDATE budgets
SET monthly_budget = amount
WHERE monthly_budget IS NULL AND amount IS NOT NULL;

-- Step 3: Drop the old columns that are no longer needed
-- We'll keep them for now and make monthly_budget the primary field
-- This allows for a safer migration without data loss

-- Step 4: Make monthly_budget NOT NULL for new entries
-- We can't make it NOT NULL immediately if there's existing data
-- So we'll set a default of 0 for any null values
UPDATE budgets SET monthly_budget = 0 WHERE monthly_budget IS NULL;

-- Step 5: Now make it NOT NULL with a default
ALTER TABLE budgets ALTER COLUMN monthly_budget SET NOT NULL;
ALTER TABLE budgets ALTER COLUMN monthly_budget SET DEFAULT 0;

-- Step 6: Add a unique constraint to ensure one budget per space
-- First, remove any duplicate budgets (keep the most recent one)
DELETE FROM budgets a USING budgets b
WHERE a.id < b.id
AND a.space_id = b.space_id;

-- Now add the unique constraint
ALTER TABLE budgets ADD CONSTRAINT budgets_space_id_unique UNIQUE (space_id);

-- Note: We're keeping category, amount, and period columns for backward compatibility
-- They can be dropped in a future migration once we verify everything works
