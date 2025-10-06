-- Add checked column to shopping_items table
ALTER TABLE shopping_items
  ADD COLUMN IF NOT EXISTS checked BOOLEAN DEFAULT FALSE;
