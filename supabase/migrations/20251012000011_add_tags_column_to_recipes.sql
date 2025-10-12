-- =============================================
-- ADD TAGS COLUMN TO RECIPES TABLE
-- Date: October 12, 2025
-- Purpose: Add missing tags column for recipe categorization
-- =============================================

-- Add tags column if it doesn't exist
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_recipes_tags ON recipes USING GIN (tags);

-- Add comment explaining the column
COMMENT ON COLUMN recipes.tags IS 'Array of tags for recipe categorization (e.g., cuisine type, source API, etc.)';
