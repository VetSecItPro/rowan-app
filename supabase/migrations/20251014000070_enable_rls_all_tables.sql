-- Enable Row-Level Security on all tables
-- Security Fix: Addresses CRITICAL vulnerability from Artemis audit
-- Prevents cross-space data access at database level
--
-- Note: RLS policies already exist from previous migrations.
-- This migration only enables RLS enforcement on tables where it was disabled.

-- Enable RLS on conversations table
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Enable RLS on recipes table
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on meals table
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

-- Enable RLS on chores table
ALTER TABLE chores ENABLE ROW LEVEL SECURITY;

-- Enable RLS on expenses table
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Enable RLS on budgets table
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Enable RLS on task_stats table
ALTER TABLE task_stats ENABLE ROW LEVEL SECURITY;
