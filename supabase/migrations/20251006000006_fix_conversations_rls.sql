-- Drop existing policies
DROP POLICY IF EXISTS "Users can view space conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create space conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update space conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete space conversations" ON conversations;

-- Temporarily disable RLS for testing
-- In production, you should implement proper RLS policies
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
