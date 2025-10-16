-- =============================================
-- CREATE CUSTOM CATEGORIES AND TAGS SYSTEM
-- Date: October 16, 2025
-- Purpose: Allow users to create custom expense categories and tags
-- =============================================

-- Create custom categories table (user-defined categories)
CREATE TABLE IF NOT EXISTS custom_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

  -- Category details
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Lucide icon name (e.g., 'Coffee', 'Car', 'Home')
  color TEXT DEFAULT '#6366f1', -- Hex color code

  -- Parent category (for subcategories)
  parent_category_id UUID REFERENCES custom_categories(id) ON DELETE SET NULL,

  -- Budget allocation
  monthly_budget DECIMAL(10, 2),

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique names per space
  UNIQUE(space_id, name)
);

-- Create tags table (many-to-many with expenses)
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

  -- Tag details
  name TEXT NOT NULL,
  color TEXT DEFAULT '#8b5cf6', -- Hex color code
  description TEXT,

  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique tag names per space
  UNIQUE(space_id, name)
);

-- Create expense_tags junction table (many-to-many)
CREATE TABLE IF NOT EXISTS expense_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure an expense can't have the same tag twice
  UNIQUE(expense_id, tag_id)
);

-- Create goal_tags junction table (many-to-many)
CREATE TABLE IF NOT EXISTS goal_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure a goal can't have the same tag twice
  UNIQUE(goal_id, tag_id)
);

-- Create task_tags junction table (many-to-many)
CREATE TABLE IF NOT EXISTS task_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure a task can't have the same tag twice
  UNIQUE(task_id, tag_id)
);

-- Create indexes for performance
CREATE INDEX idx_custom_categories_space ON custom_categories(space_id);
CREATE INDEX idx_custom_categories_parent ON custom_categories(parent_category_id);
CREATE INDEX idx_custom_categories_active ON custom_categories(is_active) WHERE is_active = true;

CREATE INDEX idx_tags_space ON tags(space_id);
CREATE INDEX idx_tags_name ON tags(name);

CREATE INDEX idx_expense_tags_expense ON expense_tags(expense_id);
CREATE INDEX idx_expense_tags_tag ON expense_tags(tag_id);

CREATE INDEX idx_goal_tags_goal ON goal_tags(goal_id);
CREATE INDEX idx_goal_tags_tag ON goal_tags(tag_id);

CREATE INDEX idx_task_tags_task ON task_tags(task_id);
CREATE INDEX idx_task_tags_tag ON task_tags(tag_id);

-- Enable RLS
ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Custom Categories
CREATE POLICY "Users can view custom categories from their spaces"
ON custom_categories FOR SELECT TO authenticated
USING (
  space_id IN (
    SELECT spaces.id FROM spaces
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert custom categories in their spaces"
ON custom_categories FOR INSERT TO authenticated
WITH CHECK (
  space_id IN (
    SELECT spaces.id FROM spaces
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update custom categories in their spaces"
ON custom_categories FOR UPDATE TO authenticated
USING (
  space_id IN (
    SELECT spaces.id FROM spaces
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete custom categories in their spaces"
ON custom_categories FOR DELETE TO authenticated
USING (
  space_id IN (
    SELECT spaces.id FROM spaces
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

-- RLS Policies: Tags
CREATE POLICY "Users can view tags from their spaces"
ON tags FOR SELECT TO authenticated
USING (
  space_id IN (
    SELECT spaces.id FROM spaces
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert tags in their spaces"
ON tags FOR INSERT TO authenticated
WITH CHECK (
  space_id IN (
    SELECT spaces.id FROM spaces
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update tags in their spaces"
ON tags FOR UPDATE TO authenticated
USING (
  space_id IN (
    SELECT spaces.id FROM spaces
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete tags in their spaces"
ON tags FOR DELETE TO authenticated
USING (
  space_id IN (
    SELECT spaces.id FROM spaces
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

-- RLS Policies: Expense Tags (users can manage tags on expenses they can access)
CREATE POLICY "Users can view expense tags from their spaces"
ON expense_tags FOR SELECT TO authenticated
USING (
  expense_id IN (
    SELECT expenses.id FROM expenses
    INNER JOIN spaces ON expenses.space_id = spaces.id
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add tags to expenses in their spaces"
ON expense_tags FOR INSERT TO authenticated
WITH CHECK (
  expense_id IN (
    SELECT expenses.id FROM expenses
    INNER JOIN spaces ON expenses.space_id = spaces.id
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove tags from expenses in their spaces"
ON expense_tags FOR DELETE TO authenticated
USING (
  expense_id IN (
    SELECT expenses.id FROM expenses
    INNER JOIN spaces ON expenses.space_id = spaces.id
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

-- RLS Policies: Goal Tags
CREATE POLICY "Users can view goal tags from their spaces"
ON goal_tags FOR SELECT TO authenticated
USING (
  goal_id IN (
    SELECT goals.id FROM goals
    INNER JOIN spaces ON goals.space_id = spaces.id
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add tags to goals in their spaces"
ON goal_tags FOR INSERT TO authenticated
WITH CHECK (
  goal_id IN (
    SELECT goals.id FROM goals
    INNER JOIN spaces ON goals.space_id = spaces.id
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove tags from goals in their spaces"
ON goal_tags FOR DELETE TO authenticated
USING (
  goal_id IN (
    SELECT goals.id FROM goals
    INNER JOIN spaces ON goals.space_id = spaces.id
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

-- RLS Policies: Task Tags
CREATE POLICY "Users can view task tags from their spaces"
ON task_tags FOR SELECT TO authenticated
USING (
  task_id IN (
    SELECT tasks.id FROM tasks
    INNER JOIN spaces ON tasks.space_id = spaces.id
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add tags to tasks in their spaces"
ON task_tags FOR INSERT TO authenticated
WITH CHECK (
  task_id IN (
    SELECT tasks.id FROM tasks
    INNER JOIN spaces ON tasks.space_id = spaces.id
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove tags from tasks in their spaces"
ON task_tags FOR DELETE TO authenticated
USING (
  task_id IN (
    SELECT tasks.id FROM tasks
    INNER JOIN spaces ON tasks.space_id = spaces.id
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_custom_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_categories_updated_at
BEFORE UPDATE ON custom_categories
FOR EACH ROW
EXECUTE FUNCTION update_custom_categories_updated_at();

CREATE TRIGGER tags_updated_at
BEFORE UPDATE ON tags
FOR EACH ROW
EXECUTE FUNCTION update_custom_categories_updated_at();

-- Add comments for documentation
COMMENT ON TABLE custom_categories IS 'User-defined expense categories with icons and colors';
COMMENT ON TABLE tags IS 'Reusable tags that can be applied to expenses, goals, and tasks';
COMMENT ON TABLE expense_tags IS 'Junction table linking expenses to tags (many-to-many)';
COMMENT ON TABLE goal_tags IS 'Junction table linking goals to tags (many-to-many)';
COMMENT ON TABLE task_tags IS 'Junction table linking tasks to tags (many-to-many)';

COMMENT ON COLUMN custom_categories.parent_category_id IS 'For creating subcategories (hierarchical structure)';
COMMENT ON COLUMN custom_categories.icon IS 'Lucide icon name for visual representation';
COMMENT ON COLUMN custom_categories.monthly_budget IS 'Optional budget allocation for this category';
