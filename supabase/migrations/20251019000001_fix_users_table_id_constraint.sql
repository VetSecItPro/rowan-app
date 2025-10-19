-- Fix users table to allow manual ID insertion for Supabase Auth integration
-- Remove the auto-generation default and just keep UUID type with manual insertion

-- Remove the DEFAULT constraint that auto-generates UUIDs
-- This allows us to manually insert user IDs from Supabase Auth
ALTER TABLE users ALTER COLUMN id DROP DEFAULT;

-- Ensure the table can handle manual UUID insertion
-- The table will now require explicit ID values (from Supabase Auth)