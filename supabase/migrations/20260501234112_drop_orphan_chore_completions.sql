-- Drop orphan table chore_completions
--
-- Background: this table dates back to a defunct chore-rewards integration
-- that was reshaped before launch. The current chore-completion model lives
-- entirely on `chores` (last_completed_at) + `chore_rotations` (who's next),
-- and `chore_completions` was never wired into the app.
--
-- Verification before drop (2026-05-01 audit):
--   - 0 rows
--   - Zero .from('chore_completions') calls in lib/, app/, components/
--   - Zero .rpc(...) calls referencing it
--   - Zero nested-select joins (`x:chore_completions(...)`)
--   - Zero references in SQL function bodies (pg_proc.prosrc ILIKE search)
--   - No incoming FKs from other tables (only outgoing to chores + users,
--     dropped automatically by CASCADE)
--
-- Continues the prior cleanup pattern from 2026-03-16 (25 orphans dropped)
-- and 2026-04-26 (4 location tables dropped after feature removal).

BEGIN;

DROP TABLE IF EXISTS public.chore_completions CASCADE;

COMMIT;
