-- ============================================================================
-- Migration: Enable pgcrypto extension
-- Date: 2026-05-07
--
-- WHY:
-- generate_secure_share_token() (created in 20251129180001) calls
-- gen_random_bytes(32) which is provided by the pgcrypto extension.
-- Production has the extension enabled (presumably via Supabase dashboard
-- "Database / Extensions" UI during initial setup), but no migration
-- declares the dependency — so CI's local Supabase rebuilds from
-- migrations alone and the function fails with:
--   ERROR: function gen_random_bytes(integer) does not exist (42883)
-- when any shopping_list INSERT/UPDATE triggers the share_token DEFAULT.
--
-- This is the SAME pattern as the increment_daily_usage RPC + digest
-- columns + notification_preferences orphan table issues from earlier
-- in 2026-05 — production state diverged from migration history.
--
-- IDEMPOTENT: CREATE EXTENSION IF NOT EXISTS — safe on prod (no-op,
-- already exists) and CI (creates it).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

DO $$
BEGIN
  RAISE NOTICE '✅ pgcrypto extension ensured (provides gen_random_bytes for share-token generation)';
END
$$;
