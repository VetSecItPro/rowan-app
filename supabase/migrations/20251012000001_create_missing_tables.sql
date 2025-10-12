-- Migration: Create missing tables (budgets, expenses, projects, chores, daily_checkins)
-- Date: October 12, 2025
-- Purpose: Add tables that were referenced in code but never created

-- ==========================================
-- 1. BUDGETS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  monthly_budget NUMERIC NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one budget per space
  CONSTRAINT unique_budget_per_space UNIQUE (space_id)
);

-- Enable RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for budgets
CREATE POLICY "Users can view space budgets"
  ON budgets FOR SELECT
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert space budgets"
  ON budgets FOR INSERT
  WITH CHECK (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update space budgets"
  ON budgets FOR UPDATE
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete space budgets"
  ON budgets FOR DELETE
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

-- ==========================================
-- 2. EXPENSES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT,
  payment_method TEXT,
  paid_by TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  recurring BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expenses
CREATE POLICY "Users can view space expenses"
  ON expenses FOR SELECT
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert space expenses"
  ON expenses FOR INSERT
  WITH CHECK (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update space expenses"
  ON expenses FOR UPDATE
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete space expenses"
  ON expenses FOR DELETE
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

-- Create index for due_date ordering
CREATE INDEX idx_expenses_due_date ON expenses(due_date);

-- ==========================================
-- 3. PROJECTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'on_hold')),
  start_date DATE,
  target_date DATE,
  budget_amount NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view space projects"
  ON projects FOR SELECT
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert space projects"
  ON projects FOR INSERT
  WITH CHECK (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update space projects"
  ON projects FOR UPDATE
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete space projects"
  ON projects FOR DELETE
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

-- ==========================================
-- 4. CHORES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS chores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL DEFAULT 'once' CHECK (frequency IN ('daily', 'weekly', 'monthly', 'once')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE chores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chores
CREATE POLICY "Users can view space chores"
  ON chores FOR SELECT
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert space chores"
  ON chores FOR INSERT
  WITH CHECK (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update space chores"
  ON chores FOR UPDATE
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete space chores"
  ON chores FOR DELETE
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

-- ==========================================
-- 5. DAILY CHECK-INS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS daily_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mood TEXT NOT NULL,
  note TEXT,
  highlights TEXT,
  challenges TEXT,
  gratitude TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one check-in per user per day per space
  CONSTRAINT unique_checkin_per_user_per_day UNIQUE (user_id, space_id, date)
);

-- Enable RLS
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_checkins
CREATE POLICY "Users can view space check-ins"
  ON daily_checkins FOR SELECT
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own check-ins"
  ON daily_checkins FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own check-ins"
  ON daily_checkins FOR UPDATE
  USING (
    user_id = auth.uid() AND
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own check-ins"
  ON daily_checkins FOR DELETE
  USING (
    user_id = auth.uid() AND
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

-- Create index for date ordering
CREATE INDEX idx_daily_checkins_date ON daily_checkins(date DESC);
CREATE INDEX idx_daily_checkins_user_date ON daily_checkins(user_id, date DESC);

-- ==========================================
-- TRIGGERS FOR UPDATED_AT
-- ==========================================

-- Budgets
CREATE OR REPLACE FUNCTION update_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_budgets_updated_at();

-- Expenses
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_expenses_updated_at();

-- Projects
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at();

-- Chores
CREATE OR REPLACE FUNCTION update_chores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_chores_updated_at
  BEFORE UPDATE ON chores
  FOR EACH ROW
  EXECUTE FUNCTION update_chores_updated_at();

-- Daily Check-ins
CREATE OR REPLACE FUNCTION update_daily_checkins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_daily_checkins_updated_at
  BEFORE UPDATE ON daily_checkins
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_checkins_updated_at();
