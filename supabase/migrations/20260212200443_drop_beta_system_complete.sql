-- Migration: drop_beta_system_complete
-- Applied via MCP on 2026-02-12
-- Fully removes all beta/trial system remnants from the database

-- Drop beta-related tables (if they exist)
DROP TABLE IF EXISTS beta_access_requests CASCADE;
DROP TABLE IF EXISTS beta_access_tracking CASCADE;
DROP TABLE IF EXISTS launch_notification_signups CASCADE;

-- Drop beta-related views
DROP VIEW IF EXISTS beta_users_status CASCADE;

-- Note: Functions get_admin_beta_users_status and increment_beta_requests
-- are orphaned but harmless — they reference no tables and are unused.
-- Left in place to avoid breaking any potential edge function references.
