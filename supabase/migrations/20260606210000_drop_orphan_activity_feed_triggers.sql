-- Drop the orphaned activity-feed triggers + functions that break goal,
-- check-in, and habit creation.
--
-- ROOT CAUSE (found by live prod QA, 6 June 2026): every INSERT into `goals`
-- failed in production with `function create_activity_feed_entry(uuid, uuid,
-- unknown, jsonb, uuid) does not exist`. The `activity_feed` table was one of
-- the 25 dropped in PR #344's cleanup (CLAUDE.md Database Cleanup Log,
-- 2026-03-16); its writer function `create_activity_feed_entry()` was dropped
-- with it, but four AFTER triggers still PERFORM that function on insert. Each
-- trigger function does NOTHING ELSE (confirmed via pg_proc: no other INSERT/
-- UPDATE) — they exist solely to feed the removed activity_feed, so dropping
-- them loses nothing.
--
-- Confirmed live on prod (pg_trigger + pg_proc): four orphan trigger functions,
-- all attached as ACTIVE triggers, all calling the missing function:
--   1. create_goal_activity()      -> trigger create_goal_activity_trigger
--        on `goals`           (AFTER INSERT) => breaks GOAL creation (the 500 we hit)
--   2. create_check_in_activity()  -> trigger create_check_in_activity_trigger
--        on `goal_check_ins`  (AFTER INSERT) => breaks goal CHECK-INS
--   3. create_milestone_activity() -> trigger create_milestone_activity_trigger
--        on `goal_check_ins`  (AFTER INSERT) => breaks goal CHECK-INS
--   4. create_habit_activity()     -> trigger create_habit_activity_trigger
--        on `habit_entries`   (AFTER INSERT) => breaks HABIT logging
--
-- Same class as the orphan task/shopping triggers (#425/#426,
-- 20260606190000 + 20260606200000) and the Oct-2025 silently-failed DROPs:
-- a table removed without its database-side writers. NOTE the #428 CI invariant
-- (checkNoOrphanTriggers) scans trigger bodies for writes to missing *tables* —
-- it does not catch calls to a missing *function*, which is why this slipped
-- through. A follow-up should extend that invariant to flag PERFORM/SELECT of
-- non-existent functions too.
--
-- Idempotent + safe: IF EXISTS no-ops on already-clean DBs (incl. fresh CI).
-- CASCADE on each function also drops its trigger under any naming drift.

DROP TRIGGER IF EXISTS create_goal_activity_trigger ON public.goals;
DROP TRIGGER IF EXISTS create_check_in_activity_trigger ON public.goal_check_ins;
DROP TRIGGER IF EXISTS create_milestone_activity_trigger ON public.goal_check_ins;
DROP TRIGGER IF EXISTS create_habit_activity_trigger ON public.habit_entries;

DROP FUNCTION IF EXISTS public.create_goal_activity() CASCADE;
DROP FUNCTION IF EXISTS public.create_check_in_activity() CASCADE;
DROP FUNCTION IF EXISTS public.create_milestone_activity() CASCADE;
DROP FUNCTION IF EXISTS public.create_habit_activity() CASCADE;
