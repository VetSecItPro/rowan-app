-- =============================================
-- CREATE PROJECTS TABLE
-- Date: October 8, 2025
-- Purpose: Create standalone projects tracking table
-- =============================================

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'on_hold')),
  start_date TIMESTAMPTZ,
  target_date TIMESTAMPTZ,
  budget_amount DECIMAL(10, 2),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for space_id lookups
CREATE INDEX IF NOT EXISTS projects_space_id_idx ON projects(space_id);

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
-- SELECT: Users can view projects in their spaces
CREATE POLICY projects_select ON projects FOR SELECT
  USING (
    space_id IN (
      SELECT space_id FROM space_members
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: Users can create projects in their spaces
CREATE POLICY projects_insert ON projects FOR INSERT
  WITH CHECK (
    space_id IN (
      SELECT space_id FROM space_members
      WHERE user_id = auth.uid()
    )
  );

-- UPDATE: Users can update projects in their spaces
CREATE POLICY projects_update ON projects FOR UPDATE
  USING (
    space_id IN (
      SELECT space_id FROM space_members
      WHERE user_id = auth.uid()
    )
  );

-- DELETE: Users can delete projects in their spaces
CREATE POLICY projects_delete ON projects FOR DELETE
  USING (
    space_id IN (
      SELECT space_id FROM space_members
      WHERE user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON projects TO authenticated;

-- Add project_id to expenses table (optional link)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Create index for project_id lookups on expenses
CREATE INDEX IF NOT EXISTS expenses_project_id_idx ON expenses(project_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at_trigger
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at();
