-- Add difficulty and source_url columns to recipes table
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS difficulty TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_recipes_difficulty ON recipes(difficulty);

-- Add comments explaining the columns
COMMENT ON COLUMN recipes.difficulty IS 'Recipe difficulty level (e.g., easy, medium, hard)';
COMMENT ON COLUMN recipes.source_url IS 'URL to the original recipe source';
