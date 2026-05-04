-- Create public.profiles table.
--
-- Like space_invitations, this table was originally created in the
-- Supabase dashboard / Studio rather than via a migration file. It
-- exists in production but no migration ever defined its schema, so
-- `supabase db reset` (and Smart E2E) failed when later migrations
-- (e.g. 20260501004615_add_admin_query_indexes.sql) tried to index it.
--
-- This file backfills the missing CREATE TABLE so a fresh DB replays
-- to the same shape as production. CREATE TABLE IF NOT EXISTS makes
-- it a no-op on prod. Schema verified against prod via Management API
-- on 2026-05-04. Registered in supabase_migrations.schema_migrations
-- as already-applied so the deploy.yml drift-check passes.

CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY,  -- references auth.users(id) implicitly
  email        TEXT,
  full_name    TEXT,
  avatar_url   TEXT,
  phone        TEXT,
  timezone     TEXT DEFAULT 'America/New_York',
  notification_preferences JSONB DEFAULT '{"sms": false, "push": true, "email": true}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  name         TEXT,
  phone_number TEXT
);

-- Index for the admin "active in last N days" lookup added by
-- 20260501004615_add_admin_query_indexes.sql.
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at
  ON public.profiles(updated_at DESC);
