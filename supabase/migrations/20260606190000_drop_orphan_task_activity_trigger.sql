-- Drop the orphaned task audit triggers + functions that break task operations.
--
-- ROOT CAUSE (found by live prod QA, 6 June 2026): every INSERT into `tasks`
-- failed in production with `ERR 42P01: relation "task_activity_log" does not
-- exist`. PR #344's "25 orphan tables" cleanup (CLAUDE.md Database Cleanup Log,
-- 2026-03-16) dropped `task_activity_log`, `task_handoffs`, and `task_assignments`
-- because they had zero *application code* references — but it missed the
-- *database* references: AFTER triggers on `tasks` still write to those dropped
-- tables. Drop the tables, leave the triggers → task operations throw 42P01.
--
-- Confirmed live on prod (pg_proc): three orphan audit functions reference the
-- dropped tables, two of them attached as ACTIVE triggers on `tasks`:
--   1. log_task_changes()       -> task_activity_log  (trigger tasks_activity_log_trigger,
--                                  AFTER INSERT)  => breaks task CREATION (the 500 we hit)
--   2. record_task_handoff()    -> task_handoffs      (trigger tasks_handoff_tracking_trigger,
--                                  AFTER UPDATE)  => breaks task REASSIGNMENT (assigned_to change)
--   3. sync_task_primary_assignment() -> task_assignments  (its trigger died with the dropped
--                                  task_assignments table; now a dangling, never-called function)
-- All three are pure audit/sync helpers for features removed with their tables —
-- nothing essential is lost by dropping them.
--
-- The squash baseline (20260509004730) already represents (1) as removed for
-- fresh CI DBs, but the squash was never applied to prod, so prod still carries
-- the orphans. This migration reconciles prod. Same class as the Oct-2025
-- silently-failed DROP migrations.
--
-- Idempotent + safe: IF EXISTS no-ops on already-clean DBs (incl. CI). CASCADE on
-- each function drops its dependent trigger even under naming drift.

DROP TRIGGER IF EXISTS tasks_activity_log_trigger ON public.tasks;
DROP TRIGGER IF EXISTS tasks_handoff_tracking_trigger ON public.tasks;
DROP FUNCTION IF EXISTS public.log_task_changes() CASCADE;
DROP FUNCTION IF EXISTS public.record_task_handoff() CASCADE;
DROP FUNCTION IF EXISTS public.sync_task_primary_assignment() CASCADE;
