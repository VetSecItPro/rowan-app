-- =============================================
-- FEATURE #8: COLOR-CODED CATEGORIES
-- =============================================
-- This migration adds color theming to task categories.

-- Create task_categories table for managing custom categories with colors
CREATE TABLE IF NOT EXISTS task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL, -- Color name from Tailwind palette (e.g., 'blue', 'emerald', 'purple')
  icon TEXT, -- Emoji or icon name
  description TEXT,
  sort_order INTEGER DEFAULT 0,

  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(space_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_categories_space ON task_categories(space_id);
CREATE INDEX IF NOT EXISTS idx_task_categories_sort_order ON task_categories(space_id, sort_order);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_task_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_categories_updated_at_trigger
  BEFORE UPDATE ON task_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_task_categories_updated_at();

-- Add color field to tasks table
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS color TEXT; -- Override category color if needed

-- Insert default categories for existing spaces
INSERT INTO task_categories (space_id, name, color, icon, description, sort_order, created_by)
SELECT
  s.id,
  category_data.name,
  category_data.color,
  category_data.icon,
  category_data.description,
  category_data.sort_order,
  (SELECT user_id FROM space_members WHERE space_id = s.id ORDER BY joined_at ASC LIMIT 1) as created_by
FROM spaces s
CROSS JOIN (
  VALUES
    ('Personal', 'blue', '👤', 'Personal tasks and errands', 0),
    ('Work', 'indigo', '💼', 'Work-related tasks', 1),
    ('Home', 'emerald', '🏡', 'Home maintenance and chores', 2),
    ('Family', 'purple', '👨‍👩‍👧‍👦', 'Family activities and tasks', 3),
    ('Health', 'pink', '💪', 'Health and fitness tasks', 4),
    ('Finance', 'amber', '💰', 'Financial tasks and bills', 5),
    ('Shopping', 'green', '🛒', 'Shopping and errands', 6),
    ('Other', 'gray', '📝', 'Miscellaneous tasks', 7)
) AS category_data(name, color, icon, description, sort_order)
WHERE EXISTS (SELECT 1 FROM space_members WHERE space_id = s.id) -- Only insert if space has members
ON CONFLICT (space_id, name) DO NOTHING;

-- Add comments
COMMENT ON TABLE task_categories IS 'Custom categories with color themes for tasks';
COMMENT ON COLUMN task_categories.color IS 'Tailwind color name (blue, emerald, purple, etc.)';
COMMENT ON COLUMN tasks.color IS 'Optional color override for individual tasks';
