-- =============================================
-- FEATURE #2: TASK TEMPLATES
-- =============================================
-- This migration creates a task_templates table for saving reusable task configurations.

CREATE TABLE IF NOT EXISTS task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  -- Template task data (mirrors tasks table structure)
  title TEXT NOT NULL,
  task_description TEXT,
  category TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  estimated_duration INTEGER, -- in minutes

  -- Recurrence defaults (can be applied when creating from template)
  default_recurrence_pattern TEXT CHECK (default_recurrence_pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
  default_recurrence_interval INTEGER DEFAULT 1,
  default_recurrence_days_of_week JSONB DEFAULT '[]'::jsonb,

  -- Default assignments
  default_assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Template metadata
  use_count INTEGER DEFAULT 0, -- Track how often template is used
  is_favorite BOOLEAN DEFAULT FALSE,
  tags JSONB DEFAULT '[]'::jsonb, -- Array of tag strings for categorization

  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_templates_space ON task_templates(space_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_created_by ON task_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_task_templates_favorite ON task_templates(is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_task_templates_use_count ON task_templates(use_count DESC);
CREATE INDEX IF NOT EXISTS idx_task_templates_tags ON task_templates USING GIN(tags);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_task_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_templates_updated_at_trigger
  BEFORE UPDATE ON task_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_task_templates_updated_at();

-- Add comments
COMMENT ON TABLE task_templates IS 'Reusable task templates for quick task creation';
COMMENT ON COLUMN task_templates.use_count IS 'Tracks popularity of template';
COMMENT ON COLUMN task_templates.tags IS 'Array of strings for categorization and filtering';
