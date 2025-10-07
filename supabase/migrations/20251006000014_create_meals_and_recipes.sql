-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  ingredients JSONB DEFAULT '[]'::jsonb,
  instructions TEXT,
  prep_time INTEGER,
  cook_time INTEGER,
  servings INTEGER,
  image_url TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create meals table
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  scheduled_date TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recipes_space_id ON recipes(space_id);
CREATE INDEX IF NOT EXISTS idx_meals_space_id ON meals(space_id);
CREATE INDEX IF NOT EXISTS idx_meals_recipe_id ON meals(recipe_id);
CREATE INDEX IF NOT EXISTS idx_meals_scheduled_date ON meals(scheduled_date);

-- Enable RLS
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recipes
CREATE POLICY "Users can view recipes in their spaces"
ON recipes FOR SELECT
USING (
  space_id IN (
    SELECT id FROM spaces WHERE id = space_id
  )
);

CREATE POLICY "Users can create recipes in their spaces"
ON recipes FOR INSERT
WITH CHECK (
  space_id IN (
    SELECT id FROM spaces WHERE id = space_id
  )
);

CREATE POLICY "Users can update recipes in their spaces"
ON recipes FOR UPDATE
USING (
  space_id IN (
    SELECT id FROM spaces WHERE id = space_id
  )
);

CREATE POLICY "Users can delete recipes in their spaces"
ON recipes FOR DELETE
USING (
  space_id IN (
    SELECT id FROM spaces WHERE id = space_id
  )
);

-- RLS Policies for meals
CREATE POLICY "Users can view meals in their spaces"
ON meals FOR SELECT
USING (
  space_id IN (
    SELECT id FROM spaces WHERE id = space_id
  )
);

CREATE POLICY "Users can create meals in their spaces"
ON meals FOR INSERT
WITH CHECK (
  space_id IN (
    SELECT id FROM spaces WHERE id = space_id
  )
);

CREATE POLICY "Users can update meals in their spaces"
ON meals FOR UPDATE
USING (
  space_id IN (
    SELECT id FROM spaces WHERE id = space_id
  )
);

CREATE POLICY "Users can delete meals in their spaces"
ON meals FOR DELETE
USING (
  space_id IN (
    SELECT id FROM spaces WHERE id = space_id
  )
);
