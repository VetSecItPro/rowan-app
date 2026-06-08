-- Retire the late-penalty feature (DB side).
--
-- DECISION (2026-06-07): the late-penalty feature is being fully retired. A
-- post-launch audit found its backend was live (penalties applied on chore
-- completion) but its only UI (LatePenaltySettings/PenaltyHistory) was never
-- wired to any route - users couldn't configure or review penalties. Rather than
-- build the missing UI, the feature is removed end to end: API routes, service,
-- AI tools (get_user_penalties/forgive_penalty/get_penalty_settings/
-- update_penalty_settings), UI components, types, and now this DB surface.
--
-- Drops, all guarded with IF EXISTS so the migration is idempotent and no-ops on
-- already-clean DBs (incl. fresh CI built from the squash baseline). Per the
-- 2025-10 lesson (DROPs that silently failed in prod), each statement is atomic
-- and individually guarded rather than bundled.
--
-- Surface removed:
--   - table  public.late_penalties              (penalty ledger)
--   - column public.chores.late_penalty_enabled
--   - column public.chores.late_penalty_points
--   - column public.chores.grace_period_hours   (penalty-only; not used elsewhere)
--   - column public.chores.penalty_applied_at
--   - column public.chores.penalty_points_deducted
--   - column public.spaces.late_penalty_settings (per-space penalty config JSON)

DROP TABLE IF EXISTS public.late_penalties;

ALTER TABLE public.chores DROP COLUMN IF EXISTS late_penalty_enabled;
ALTER TABLE public.chores DROP COLUMN IF EXISTS late_penalty_points;
ALTER TABLE public.chores DROP COLUMN IF EXISTS grace_period_hours;
ALTER TABLE public.chores DROP COLUMN IF EXISTS penalty_applied_at;
ALTER TABLE public.chores DROP COLUMN IF EXISTS penalty_points_deducted;

ALTER TABLE public.spaces DROP COLUMN IF EXISTS late_penalty_settings;
