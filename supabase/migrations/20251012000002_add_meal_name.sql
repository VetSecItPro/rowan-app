-- Add name column to meals table for custom meal titles
ALTER TABLE meals ADD COLUMN IF NOT EXISTS name TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN meals.name IS 'Custom name for meals without recipes. Falls back to recipe name if not provided.';
