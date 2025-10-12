-- =============================================
-- FIX RECIPES AND MEALS RLS POLICIES
-- Date: October 12, 2025
-- Purpose: Fix broken RLS policies for recipes and meals tables
--          that were using circular logic instead of proper space access checks
-- =============================================

-- Drop existing policies for recipes (try all possible names)
DROP POLICY IF EXISTS "Users can view recipes in their spaces" ON recipes;
DROP POLICY IF EXISTS "Users can create recipes in their spaces" ON recipes;
DROP POLICY IF EXISTS "Users can update recipes in their spaces" ON recipes;
DROP POLICY IF EXISTS "Users can delete recipes in their spaces" ON recipes;
DROP POLICY IF EXISTS recipes_select ON recipes;
DROP POLICY IF EXISTS recipes_insert ON recipes;
DROP POLICY IF EXISTS recipes_update ON recipes;
DROP POLICY IF EXISTS recipes_delete ON recipes;

-- Drop existing policies for meals (try all possible names)
DROP POLICY IF EXISTS "Users can view meals in their spaces" ON meals;
DROP POLICY IF EXISTS "Users can create meals in their spaces" ON meals;
DROP POLICY IF EXISTS "Users can update meals in their spaces" ON meals;
DROP POLICY IF EXISTS "Users can delete meals in their spaces" ON meals;
DROP POLICY IF EXISTS meals_select ON meals;
DROP POLICY IF EXISTS meals_insert ON meals;
DROP POLICY IF EXISTS meals_update ON meals;
DROP POLICY IF EXISTS meals_delete ON meals;

-- Create correct RLS policies for recipes using user_has_space_access function
CREATE POLICY recipes_select ON recipes FOR SELECT
  USING (user_has_space_access(space_id));

CREATE POLICY recipes_insert ON recipes FOR INSERT
  WITH CHECK (user_has_space_access(space_id));

CREATE POLICY recipes_update ON recipes FOR UPDATE
  USING (user_has_space_access(space_id));

CREATE POLICY recipes_delete ON recipes FOR DELETE
  USING (user_has_space_access(space_id));

-- Create correct RLS policies for meals using user_has_space_access function
CREATE POLICY meals_select ON meals FOR SELECT
  USING (user_has_space_access(space_id));

CREATE POLICY meals_insert ON meals FOR INSERT
  WITH CHECK (user_has_space_access(space_id));

CREATE POLICY meals_update ON meals FOR UPDATE
  USING (user_has_space_access(space_id));

CREATE POLICY meals_delete ON meals FOR DELETE
  USING (user_has_space_access(space_id));

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON recipes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON meals TO authenticated;
