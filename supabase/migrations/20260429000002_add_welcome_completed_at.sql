-- Migration: Add welcome_completed_at to users
-- Date: 2026-04-29
-- Purpose: Track whether a user has finished the post-signup /welcome step
-- where they confirm or edit the auto-derived display name + household name.
--
-- Context: PR #324 simplified signup to email + password + age + ToS only and
-- now auto-derives `name` (title-cased email local-part) and `space_name`
-- ({firstName}'s Space) server-side. The /welcome page surfaces those values
-- so the user can correct them in one screen if the heuristic guessed wrong.
-- We persist a timestamp (not a boolean) so future analytics can join on
-- when a user passed onboarding without an extra column.
--
-- NULL = user hasn't seen /welcome yet (new account, redirect them there)
-- non-NULL = user confirmed or skipped (never redirect again)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS welcome_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN users.welcome_completed_at IS
  'Timestamp when the user finished or skipped the post-signup /welcome step. NULL means they have not been through it yet and should be redirected on next dashboard visit.';

-- Backfill: any existing user pre-dating this feature has already been
-- using the app, so mark them as completed (avoids redirecting long-time
-- users to a welcome screen for a feature they never needed).
UPDATE users
SET welcome_completed_at = COALESCE(updated_at, created_at, NOW())
WHERE welcome_completed_at IS NULL;
