-- =============================================
-- CREATE PROJECT COST TRACKING SYSTEM
-- Date: October 16, 2025
-- Purpose: Track home improvement/renovation projects with budgets, vendors, and photos
-- =============================================

-- Create enum for project status (IF NOT EXISTS pattern)
DO $$ BEGIN
  CREATE TYPE project_status AS ENUM (
    'planning',
    'in-progress',
    'on-hold',
    'completed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for project priority (IF NOT EXISTS pattern)
DO $$ BEGIN
  CREATE TYPE project_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create projects table (or alter existing)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status project_status DEFAULT 'planning';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS priority project_priority DEFAULT 'medium';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_completion_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS actual_completion_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_budget DECIMAL(12, 2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS actual_cost DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget_variance DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS variance_percentage DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Create vendors/contractors table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

  -- Vendor details
  name TEXT NOT NULL,
  company_name TEXT,
  trade TEXT, -- e.g., 'Plumber', 'Electrician', 'General Contractor'

  -- Contact information
  email TEXT,
  phone TEXT,
  address TEXT,
  website TEXT,

  -- Business details
  license_number TEXT,
  insurance_verified BOOLEAN DEFAULT false,

  -- Rating and notes
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,

  -- Status
  is_preferred BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create project line items table (budgeted costs)
CREATE TABLE IF NOT EXISTS project_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,

  -- Line item details
  category TEXT NOT NULL, -- 'Labor', 'Materials', 'Permits', 'Equipment Rental', etc.
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) DEFAULT 1,
  unit_price DECIMAL(10, 2),

  -- Budget
  estimated_cost DECIMAL(10, 2) NOT NULL CHECK (estimated_cost >= 0),
  actual_cost DECIMAL(10, 2) DEFAULT 0,

  -- Status
  is_paid BOOLEAN DEFAULT false,
  paid_date DATE,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create project photos table
CREATE TABLE IF NOT EXISTS project_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Photo details
  title TEXT,
  description TEXT,
  photo_url TEXT NOT NULL, -- Supabase Storage URL

  -- Photo metadata
  photo_type TEXT DEFAULT 'progress', -- 'before', 'during', 'after', 'progress', 'receipt', 'damage'
  taken_date DATE DEFAULT CURRENT_DATE,

  -- Ordering
  display_order INTEGER DEFAULT 0,

  -- Metadata
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link expenses to projects
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS line_item_id UUID REFERENCES project_line_items(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_space ON projects(space_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);
CREATE INDEX IF NOT EXISTS idx_projects_dates ON projects(start_date, estimated_completion_date);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

CREATE INDEX IF NOT EXISTS idx_vendors_space ON vendors(space_id);
CREATE INDEX IF NOT EXISTS idx_vendors_trade ON vendors(trade);
CREATE INDEX IF NOT EXISTS idx_vendors_preferred ON vendors(is_preferred) WHERE is_preferred = true;
CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_project_line_items_project ON project_line_items(project_id);
CREATE INDEX IF NOT EXISTS idx_project_line_items_vendor ON project_line_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_project_line_items_category ON project_line_items(category);

CREATE INDEX IF NOT EXISTS idx_project_photos_project ON project_photos(project_id);
CREATE INDEX IF NOT EXISTS idx_project_photos_type ON project_photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_project_photos_order ON project_photos(project_id, display_order);

CREATE INDEX IF NOT EXISTS idx_expenses_project ON expenses(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_vendor ON expenses(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_line_item ON expenses(line_item_id) WHERE line_item_id IS NOT NULL;

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Projects
CREATE POLICY "Users can view projects in their spaces"
ON projects FOR SELECT TO authenticated
USING (
  space_id IN (
    SELECT space_id FROM space_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create projects in their spaces"
ON projects FOR INSERT TO authenticated
WITH CHECK (
  space_id IN (
    SELECT space_id FROM space_members WHERE user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update projects in their spaces"
ON projects FOR UPDATE TO authenticated
USING (
  space_id IN (
    SELECT space_id FROM space_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own projects"
ON projects FOR DELETE TO authenticated
USING (created_by = auth.uid());

-- RLS Policies: Vendors
CREATE POLICY "Users can view vendors in their spaces"
ON vendors FOR SELECT TO authenticated
USING (
  space_id IN (
    SELECT space_id FROM space_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage vendors in their spaces"
ON vendors FOR ALL TO authenticated
USING (
  space_id IN (
    SELECT space_id FROM space_members WHERE user_id = auth.uid()
  )
);

-- RLS Policies: Project Line Items
CREATE POLICY "Users can view line items for their projects"
ON project_line_items FOR SELECT TO authenticated
USING (
  project_id IN (
    SELECT id FROM projects WHERE space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can manage line items for their projects"
ON project_line_items FOR ALL TO authenticated
USING (
  project_id IN (
    SELECT id FROM projects WHERE space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  )
);

-- RLS Policies: Project Photos
CREATE POLICY "Users can view photos for their projects"
ON project_photos FOR SELECT TO authenticated
USING (
  project_id IN (
    SELECT id FROM projects WHERE space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can manage photos for their projects"
ON project_photos FOR ALL TO authenticated
USING (
  project_id IN (
    SELECT id FROM projects WHERE space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  )
);

-- Function to update project actual cost from expenses
CREATE OR REPLACE FUNCTION update_project_actual_cost()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
  v_total_cost DECIMAL(12, 2);
  v_estimated_budget DECIMAL(12, 2);
BEGIN
  -- Get project_id from expense
  v_project_id := COALESCE(NEW.project_id, OLD.project_id);

  IF v_project_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Calculate total actual cost from expenses
  SELECT COALESCE(SUM(amount), 0) INTO v_total_cost
  FROM expenses
  WHERE project_id = v_project_id;

  -- Get estimated budget
  SELECT estimated_budget INTO v_estimated_budget
  FROM projects
  WHERE id = v_project_id;

  -- Update project
  UPDATE projects
  SET
    actual_cost = v_total_cost,
    budget_variance = COALESCE(v_estimated_budget, 0) - v_total_cost,
    variance_percentage = CASE
      WHEN v_estimated_budget > 0 THEN
        ROUND((((v_estimated_budget - v_total_cost) / v_estimated_budget) * 100)::NUMERIC, 2)
      ELSE 0
    END
  WHERE id = v_project_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to keep project costs in sync
DROP TRIGGER IF EXISTS trigger_update_project_cost_on_expense_insert ON expenses;
CREATE TRIGGER trigger_update_project_cost_on_expense_insert
  AFTER INSERT ON expenses
  FOR EACH ROW
  WHEN (NEW.project_id IS NOT NULL)
  EXECUTE FUNCTION update_project_actual_cost();

DROP TRIGGER IF EXISTS trigger_update_project_cost_on_expense_update ON expenses;
CREATE TRIGGER trigger_update_project_cost_on_expense_update
  AFTER UPDATE ON expenses
  FOR EACH ROW
  WHEN (NEW.project_id IS NOT NULL OR OLD.project_id IS NOT NULL)
  EXECUTE FUNCTION update_project_actual_cost();

DROP TRIGGER IF EXISTS trigger_update_project_cost_on_expense_delete ON expenses;
CREATE TRIGGER trigger_update_project_cost_on_expense_delete
  AFTER DELETE ON expenses
  FOR EACH ROW
  WHEN (OLD.project_id IS NOT NULL)
  EXECUTE FUNCTION update_project_actual_cost();

-- Function to update line item actual cost from expenses
CREATE OR REPLACE FUNCTION update_line_item_actual_cost()
RETURNS TRIGGER AS $$
DECLARE
  v_line_item_id UUID;
  v_total_cost DECIMAL(12, 2);
BEGIN
  -- Get line_item_id from expense
  v_line_item_id := COALESCE(NEW.line_item_id, OLD.line_item_id);

  IF v_line_item_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Calculate total actual cost from expenses
  SELECT COALESCE(SUM(amount), 0) INTO v_total_cost
  FROM expenses
  WHERE line_item_id = v_line_item_id;

  -- Update line item
  UPDATE project_line_items
  SET actual_cost = v_total_cost
  WHERE id = v_line_item_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for line item cost tracking
DROP TRIGGER IF EXISTS trigger_update_line_item_cost_on_expense_insert ON expenses;
CREATE TRIGGER trigger_update_line_item_cost_on_expense_insert
  AFTER INSERT ON expenses
  FOR EACH ROW
  WHEN (NEW.line_item_id IS NOT NULL)
  EXECUTE FUNCTION update_line_item_actual_cost();

DROP TRIGGER IF EXISTS trigger_update_line_item_cost_on_expense_update ON expenses;
CREATE TRIGGER trigger_update_line_item_cost_on_expense_update
  AFTER UPDATE ON expenses
  FOR EACH ROW
  WHEN (NEW.line_item_id IS NOT NULL OR OLD.line_item_id IS NOT NULL)
  EXECUTE FUNCTION update_line_item_actual_cost();

DROP TRIGGER IF EXISTS trigger_update_line_item_cost_on_expense_delete ON expenses;
CREATE TRIGGER trigger_update_line_item_cost_on_expense_delete
  AFTER DELETE ON expenses
  FOR EACH ROW
  WHEN (OLD.line_item_id IS NOT NULL)
  EXECUTE FUNCTION update_line_item_actual_cost();

-- Add updated_at triggers
CREATE TRIGGER projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER vendors_updated_at
BEFORE UPDATE ON vendors
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER project_line_items_updated_at
BEFORE UPDATE ON project_line_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER project_photos_updated_at
BEFORE UPDATE ON project_photos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE projects IS 'Home improvement and renovation projects with budget tracking';
COMMENT ON TABLE vendors IS 'Contractors and vendors database';
COMMENT ON TABLE project_line_items IS 'Individual cost line items for project budgets';
COMMENT ON TABLE project_photos IS 'Project photo gallery with before/during/after photos';

COMMENT ON COLUMN projects.budget_variance IS 'Positive = under budget, Negative = over budget';
COMMENT ON COLUMN projects.variance_percentage IS 'Percentage variance from estimated budget';
COMMENT ON COLUMN vendors.is_preferred IS 'Flag for preferred/trusted vendors';
COMMENT ON COLUMN project_photos.photo_type IS 'before, during, after, progress, receipt, or damage';

-- Create views for common queries
CREATE OR REPLACE VIEW project_summary AS
SELECT
  p.id AS project_id,
  p.space_id,
  p.name,
  p.status,
  p.priority,
  p.estimated_budget,
  p.actual_cost,
  p.budget_variance,
  p.variance_percentage,
  p.start_date,
  p.estimated_completion_date,
  p.actual_completion_date,
  COUNT(DISTINCT pli.id) AS line_item_count,
  COUNT(DISTINCT e.id) AS expense_count,
  COUNT(DISTINCT pp.id) AS photo_count,
  COUNT(DISTINCT v.id) AS vendor_count,
  ARRAY_AGG(DISTINCT v.name) FILTER (WHERE v.name IS NOT NULL) AS vendor_names,
  p.created_by,
  p.created_at,
  p.updated_at
FROM projects p
LEFT JOIN project_line_items pli ON p.id = pli.project_id
LEFT JOIN expenses e ON p.id = e.project_id
LEFT JOIN project_photos pp ON p.id = pp.project_id
LEFT JOIN vendors v ON pli.vendor_id = v.id OR e.vendor_id = v.id
GROUP BY p.id;

CREATE OR REPLACE VIEW vendor_spend_summary AS
SELECT
  v.id AS vendor_id,
  v.space_id,
  v.name,
  v.company_name,
  v.trade,
  v.rating,
  v.is_preferred,
  COUNT(DISTINCT e.project_id) AS project_count,
  COUNT(DISTINCT e.id) AS expense_count,
  COALESCE(SUM(e.amount), 0) AS total_spent,
  MIN(e.date) AS first_transaction_date,
  MAX(e.date) AS last_transaction_date
FROM vendors v
LEFT JOIN expenses e ON v.id = e.vendor_id
GROUP BY v.id;

CREATE OR REPLACE VIEW project_cost_breakdown AS
SELECT
  pli.project_id,
  pli.category,
  COUNT(pli.id) AS line_item_count,
  SUM(pli.estimated_cost) AS total_estimated,
  SUM(pli.actual_cost) AS total_actual,
  SUM(pli.estimated_cost - pli.actual_cost) AS variance,
  CASE
    WHEN SUM(pli.estimated_cost) > 0 THEN
      ROUND((((SUM(pli.estimated_cost) - SUM(pli.actual_cost)) / SUM(pli.estimated_cost)) * 100)::NUMERIC, 2)
    ELSE 0
  END AS variance_percentage
FROM project_line_items pli
GROUP BY pli.project_id, pli.category;

-- Grant view permissions
GRANT SELECT ON project_summary TO authenticated;
GRANT SELECT ON project_summary TO service_role;
GRANT SELECT ON vendor_spend_summary TO authenticated;
GRANT SELECT ON vendor_spend_summary TO service_role;
GRANT SELECT ON project_cost_breakdown TO authenticated;
GRANT SELECT ON project_cost_breakdown TO service_role;
