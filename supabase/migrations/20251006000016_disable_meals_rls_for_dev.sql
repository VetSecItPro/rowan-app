-- Temporarily disable RLS for development
-- Security is maintained through application-level space_id filtering
ALTER TABLE recipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE meals DISABLE ROW LEVEL SECURITY;

-- Note: RLS policies remain defined and can be re-enabled for production
