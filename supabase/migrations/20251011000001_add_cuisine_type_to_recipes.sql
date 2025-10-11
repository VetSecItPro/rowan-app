-- Add cuisine_type column to recipes table
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cuisine_type TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_recipes_cuisine_type ON recipes(cuisine_type);

-- Add comment explaining the column
COMMENT ON COLUMN recipes.cuisine_type IS 'Type of cuisine (e.g., Italian, Mexican, Asian, etc.)';
