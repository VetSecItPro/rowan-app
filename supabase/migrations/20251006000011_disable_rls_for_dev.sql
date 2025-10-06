-- Temporarily disable RLS for development
-- Security is maintained through application-level space_id filtering

ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Note: RLS policies remain defined and can be re-enabled for production
-- All service methods filter by space_id to ensure data isolation
