-- Create space_invitations table.
--
-- This table was originally created in the Supabase dashboard / Studio
-- before migrations were the source of truth. It exists in production
-- but no migration file ever defined its schema, which broke
-- `supabase db reset` (subsequent migrations like
-- 20251022200000_add_role_to_space_invitations.sql tried to ALTER it
-- before it existed).
--
-- This file backfills the missing CREATE TABLE so a fresh DB replays
-- to the same shape that production already has. CREATE TABLE
-- IF NOT EXISTS makes it a no-op on prod — the existing table is
-- preserved as-is. Schema verified against prod via Management API
-- on 2026-05-04.

CREATE TABLE IF NOT EXISTS public.space_invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id     UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  invited_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token        TEXT NOT NULL,
  status       TEXT DEFAULT 'pending',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  expires_at   TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  -- role and updated_at are added by 20251022200000_add_role_to_space_invitations.sql
  -- and the canonical updated_at trigger; we leave them off here so that
  -- migration's ADD COLUMN runs cleanly on a fresh DB.
  accepted_at  TIMESTAMPTZ
);

-- Token must be unique (used in invite links)
CREATE UNIQUE INDEX IF NOT EXISTS space_invitations_token_key
  ON public.space_invitations(token);

-- Common lookups
CREATE INDEX IF NOT EXISTS space_invitations_space_id_idx
  ON public.space_invitations(space_id);
CREATE INDEX IF NOT EXISTS space_invitations_email_idx
  ON public.space_invitations(email);
