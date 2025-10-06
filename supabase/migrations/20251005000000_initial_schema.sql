-- Rowan App Initial Database Schema
-- Phase 2: Database Schema WITHOUT RLS (RLS will be added in Phase 3 with authentication)
-- All timestamps use TIMESTAMPTZ for automatic UTC storage

-- =============================================
-- 1. USERS TABLE
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  pronouns TEXT,
  color_theme TEXT DEFAULT 'emerald',
  timezone TEXT DEFAULT 'America/New_York',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. SPACES TABLE
-- =============================================
CREATE TABLE spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. SPACE_MEMBERS TABLE
-- =============================================
CREATE TABLE space_members (
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (space_id, user_id)
);

-- =============================================
-- 4. TASKS TABLE
-- =============================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  due_date DATE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- =============================================
-- 5. EVENTS TABLE
-- =============================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  location TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 6. REMINDERS TABLE
-- =============================================
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  remind_at TIMESTAMPTZ NOT NULL,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 7. MESSAGES TABLE
-- =============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  thread_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 8. SHOPPING_LISTS TABLE
-- =============================================
CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 9. SHOPPING_ITEMS TABLE
-- =============================================
CREATE TABLE shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT,
  category TEXT,
  is_purchased BOOLEAN DEFAULT FALSE,
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  purchased_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 10. RECIPES TABLE
-- =============================================
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  ingredients JSONB,
  instructions TEXT,
  prep_time INTEGER,
  cook_time INTEGER,
  servings INTEGER,
  category TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 11. MEAL_PLANS TABLE
-- =============================================
CREATE TABLE meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  meal_date DATE NOT NULL,
  meal_type TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 12. CHORES TABLE
-- =============================================
CREATE TABLE chores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 13. CHORE_COMPLETIONS TABLE
-- =============================================
CREATE TABLE chore_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_id UUID REFERENCES chores(id) ON DELETE CASCADE,
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- =============================================
-- 14. EXPENSES TABLE
-- =============================================
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category TEXT,
  date DATE NOT NULL,
  paid_by UUID REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 15. BUDGETS TABLE
-- =============================================
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  period TEXT DEFAULT 'monthly',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 16. GOALS TABLE
-- =============================================
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  target_date DATE,
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- =============================================
-- 17. GOAL_MILESTONES TABLE
-- =============================================
CREATE TABLE goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 18. GOAL_UPDATES TABLE
-- =============================================
CREATE TABLE goal_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 19. DAILY_CHECKINS TABLE
-- =============================================
CREATE TABLE daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mood TEXT,
  highlights TEXT,
  challenges TEXT,
  gratitude TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, space_id, date)
);

-- =============================================
-- 20. ACTIVITY_LOG TABLE
-- =============================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);

-- Space members indexes
CREATE INDEX idx_space_members_space_id ON space_members(space_id);
CREATE INDEX idx_space_members_user_id ON space_members(user_id);

-- Tasks indexes
CREATE INDEX idx_tasks_space_id ON tasks(space_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- Events indexes
CREATE INDEX idx_events_space_id ON events(space_id);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_assigned_to ON events(assigned_to);

-- Reminders indexes
CREATE INDEX idx_reminders_space_id ON reminders(space_id);
CREATE INDEX idx_reminders_remind_at ON reminders(remind_at);
CREATE INDEX idx_reminders_assigned_to ON reminders(assigned_to);

-- Messages indexes
CREATE INDEX idx_messages_space_id ON messages(space_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Shopping lists indexes
CREATE INDEX idx_shopping_lists_space_id ON shopping_lists(space_id);

-- Shopping items indexes
CREATE INDEX idx_shopping_items_list_id ON shopping_items(list_id);
CREATE INDEX idx_shopping_items_is_purchased ON shopping_items(is_purchased);

-- Recipes indexes
CREATE INDEX idx_recipes_space_id ON recipes(space_id);
CREATE INDEX idx_recipes_category ON recipes(category);

-- Meal plans indexes
CREATE INDEX idx_meal_plans_space_id ON meal_plans(space_id);
CREATE INDEX idx_meal_plans_meal_date ON meal_plans(meal_date);

-- Chores indexes
CREATE INDEX idx_chores_space_id ON chores(space_id);
CREATE INDEX idx_chores_assigned_to ON chores(assigned_to);

-- Chore completions indexes
CREATE INDEX idx_chore_completions_chore_id ON chore_completions(chore_id);
CREATE INDEX idx_chore_completions_completed_at ON chore_completions(completed_at DESC);

-- Expenses indexes
CREATE INDEX idx_expenses_space_id ON expenses(space_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);

-- Budgets indexes
CREATE INDEX idx_budgets_space_id ON budgets(space_id);

-- Goals indexes
CREATE INDEX idx_goals_space_id ON goals(space_id);
CREATE INDEX idx_goals_status ON goals(status);

-- Goal milestones indexes
CREATE INDEX idx_goal_milestones_goal_id ON goal_milestones(goal_id);

-- Goal updates indexes
CREATE INDEX idx_goal_updates_goal_id ON goal_updates(goal_id);

-- Daily checkins indexes
CREATE INDEX idx_daily_checkins_user_id ON daily_checkins(user_id);
CREATE INDEX idx_daily_checkins_space_id ON daily_checkins(space_id);
CREATE INDEX idx_daily_checkins_date ON daily_checkins(date DESC);

-- Activity log indexes
CREATE INDEX idx_activity_log_space_id ON activity_log(space_id);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);

-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- APPLY TRIGGERS TO ALL TABLES WITH updated_at
-- =============================================
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON spaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_lists_updated_at BEFORE UPDATE ON shopping_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_items_updated_at BEFORE UPDATE ON shopping_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON meal_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chores_updated_at BEFORE UPDATE ON chores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goal_milestones_updated_at BEFORE UPDATE ON goal_milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_checkins_updated_at BEFORE UPDATE ON daily_checkins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TEST DATA
-- =============================================

-- Create test user
INSERT INTO users (id, email, name, timezone)
VALUES ('00000000-0000-0000-0000-000000000001', 'test@rowan.app', 'Test User', 'America/New_York');

-- Create test space
INSERT INTO spaces (id, name)
VALUES ('00000000-0000-0000-0000-000000000002', 'My Test Space');

-- Add user to space as owner
INSERT INTO space_members (space_id, user_id, role)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'owner');

-- Add sample task
INSERT INTO tasks (space_id, title, description, priority, status, assigned_to, created_by)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Welcome to Rowan',
  'Get started by exploring the features',
  'high',
  'pending',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
);

-- Add sample event
INSERT INTO events (space_id, title, description, start_time, end_time, created_by)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Team Planning Session',
  'Plan out the week ahead',
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '1 day' + INTERVAL '1 hour',
  '00000000-0000-0000-0000-000000000001'
);

-- Add sample shopping list
INSERT INTO shopping_lists (space_id, name, created_by)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Weekly Groceries',
  '00000000-0000-0000-0000-000000000001'
);

-- Add sample shopping items
INSERT INTO shopping_items (list_id, name, quantity, category, added_by)
SELECT
  id,
  'Milk',
  '1 gallon',
  'Dairy',
  '00000000-0000-0000-0000-000000000001'
FROM shopping_lists WHERE name = 'Weekly Groceries';

INSERT INTO shopping_items (list_id, name, quantity, category, added_by)
SELECT
  id,
  'Bread',
  '1 loaf',
  'Bakery',
  '00000000-0000-0000-0000-000000000001'
FROM shopping_lists WHERE name = 'Weekly Groceries';

-- Add sample goal
INSERT INTO goals (space_id, title, description, category, status, created_by)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Get Organized',
  'Use Rowan to manage our household effectively',
  'household',
  'active',
  '00000000-0000-0000-0000-000000000001'
);

-- NOTE: RLS (Row Level Security) is NOT enabled yet
-- RLS policies will be added in Phase 3 with authentication
