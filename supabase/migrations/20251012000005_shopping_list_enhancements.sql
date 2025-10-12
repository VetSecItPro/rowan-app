-- Migration: Shopping List Enhancements
-- Date: October 12, 2025
-- Purpose: Add fields for meal plan integration and public sharing

-- ==========================================
-- 1. ADD FIELDS TO SHOPPING_LISTS TABLE
-- ==========================================

-- Add share token for public links
ALTER TABLE shopping_lists
ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- Add meal plan references (stores array of meal plan IDs used to generate list)
ALTER TABLE shopping_lists
ADD COLUMN IF NOT EXISTS meal_ids JSONB DEFAULT '[]'::jsonb;

-- Add public sharing flag
ALTER TABLE shopping_lists
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Add timestamp for when list was shared
ALTER TABLE shopping_lists
ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;

-- Add flag to indicate if list was auto-generated from meals
ALTER TABLE shopping_lists
ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT FALSE;

-- Create index on share_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_shopping_lists_share_token ON shopping_lists(share_token);

-- Create index on is_public for filtering public lists
CREATE INDEX IF NOT EXISTS idx_shopping_lists_is_public ON shopping_lists(is_public);

-- ==========================================
-- 2. ADD FIELDS TO SHOPPING_ITEMS TABLE
-- ==========================================

-- Add recipe reference to track which recipe an ingredient came from
ALTER TABLE shopping_items
ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL;

-- Add notes field for additional item details
ALTER TABLE shopping_items
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add unit field for ingredient measurements
ALTER TABLE shopping_items
ADD COLUMN IF NOT EXISTS unit TEXT;

-- Create index on recipe_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_shopping_items_recipe_id ON shopping_items(recipe_id);

-- ==========================================
-- 3. RLS POLICY FOR PUBLIC SHOPPING LISTS
-- ==========================================

-- Allow anyone to view public shopping lists via share token
DROP POLICY IF EXISTS "Anyone can view public shopping lists" ON shopping_lists;
CREATE POLICY "Anyone can view public shopping lists"
  ON shopping_lists FOR SELECT
  USING (is_public = TRUE);

-- Allow anyone to view items in public shopping lists
DROP POLICY IF EXISTS "Anyone can view public shopping items" ON shopping_items;
CREATE POLICY "Anyone can view public shopping items"
  ON shopping_items FOR SELECT
  USING (
    list_id IN (
      SELECT id FROM shopping_lists WHERE is_public = TRUE
    )
  );

-- ==========================================
-- 4. FUNCTION TO GENERATE SHARE TOKEN
-- ==========================================

-- Ensure all existing lists have a share token
UPDATE shopping_lists
SET share_token = gen_random_uuid()
WHERE share_token IS NULL;

-- Function to update shared_at timestamp when list becomes public
CREATE OR REPLACE FUNCTION update_shared_at()
RETURNS TRIGGER AS $$
BEGIN
  -- If list is being made public and wasn't public before
  IF NEW.is_public = TRUE AND (OLD.is_public IS NULL OR OLD.is_public = FALSE) THEN
    NEW.shared_at = NOW();
  END IF;

  -- If list is being made private
  IF NEW.is_public = FALSE AND OLD.is_public = TRUE THEN
    NEW.shared_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update shared_at
DROP TRIGGER IF EXISTS set_shopping_list_shared_at ON shopping_lists;
CREATE TRIGGER set_shopping_list_shared_at
  BEFORE UPDATE ON shopping_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_shared_at();

-- ==========================================
-- 5. COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON COLUMN shopping_lists.share_token IS 'Unique token for public sharing via URL';
COMMENT ON COLUMN shopping_lists.meal_ids IS 'Array of meal plan IDs used to generate this list';
COMMENT ON COLUMN shopping_lists.is_public IS 'Whether this list can be accessed via public share link';
COMMENT ON COLUMN shopping_lists.shared_at IS 'Timestamp when list was first shared publicly';
COMMENT ON COLUMN shopping_lists.auto_generated IS 'Whether this list was auto-generated from meal plans';
COMMENT ON COLUMN shopping_items.recipe_id IS 'Reference to recipe this ingredient came from';
COMMENT ON COLUMN shopping_items.notes IS 'Additional notes or details about the item';
COMMENT ON COLUMN shopping_items.unit IS 'Measurement unit for the item (cups, lbs, etc.)';
