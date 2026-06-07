-- Drop six orphan functions that reference tables removed in the 2026-03-16
-- cleanup. The "function flavor" of the orphan-reference class behind #425/#426
-- (orphan triggers) and #429 (orphan trigger->function calls).
--
-- ROOT CAUSE (found by the post-#431 follow-up orphan audit, 2026-06-07): the
-- 2026-03-16 cleanup (CLAUDE.md Database Cleanup Log) dropped `daily_analytics`,
-- `meal_plan_tasks`, and `reminder_mentions` (and `beta_access_requests` was
-- dropped separately), but six functions that read/write those tables were left
-- behind. Each 500s the instant it executes ("relation ... does not exist").
--
-- WHY THIS SLIPPED PAST THE #428/#429 GUARDS: those invariants
-- (checkNoOrphanTriggers, checkNoOrphanTriggerFunctionCalls) scan ACTIVE
-- TRIGGER function bodies only. These six are NOT attached to any trigger, NOT
-- called by any other function, and NOT called by the app via .rpc() (all three
-- verified live against prod). So no user flow reaches them -> LOW severity.
--
-- REACHABILITY THAT REMAINS: PostgREST auto-exposes every public-schema function
-- with an EXECUTE grant as POST /rest/v1/rpc/<name>. Five of these were granted
-- to anon/PUBLIC; get_unread_mentions is SECURITY DEFINER granted to
-- authenticated. So they are live-but-broken REST endpoints (error on call,
-- noise in logs, needless attack surface). Dropping them removes the endpoints.
--
-- NO read-scanning CI invariant is added: empirically a regex matcher over
-- function bodies throws ~15 false positives (CTE names, set-returning funcs,
-- and plpgsql variables are indistinguishable from tables after FROM/JOIN). The
-- existing trigger guards + deploy drift-check already cover every reachable
-- case; the non-trigger function tail is cleared here and any reintroduction
-- arrives via a reviewed migration.
--
-- The six orphans (verified live: pg_proc body + grants; no callers):
--   1. check_meal_plan_task_uniqueness()            reads  meal_plan_tasks
--   2. get_analytics_range(date, date)              reads  daily_analytics
--   3. get_or_create_daily_analytics(date)          writes daily_analytics
--   4. get_yesterday_metrics()                      reads  daily_analytics + beta_access_requests
--   5. update_daily_active_users(integer, date)     writes daily_analytics
--   6. get_unread_mentions(uuid)  [SECURITY DEFINER] reads reminder_mentions
--
-- Defense-in-depth: REVOKE the PostgREST grants BEFORE the DROP. REVOKE-then-DROP
-- is redundant on full success (DROP removes the grants anyway), but if the
-- migration ever partially applies, the endpoints are de-authorized before the
-- function is removed -- strictly safer than the current state.
--
-- NOTE: unlike DROP, REVOKE has no IF EXISTS and ERRORS on a missing function.
-- On fresh CI DBs (squash baseline) these six never existed, so each REVOKE runs
-- inside its own sub-block that swallows `undefined_function` -- keeping the
-- migration idempotent on already-clean DBs while still revoking on prod.

DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.check_meal_plan_task_uniqueness()',
    'public.get_analytics_range(date, date)',
    'public.get_or_create_daily_analytics(date)',
    'public.get_yesterday_metrics()',
    'public.update_daily_active_users(integer, date)',
    'public.get_unread_mentions(uuid)'
  ] LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      NULL; -- already absent (fresh CI / re-run): nothing to revoke
    END;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.check_meal_plan_task_uniqueness();
DROP FUNCTION IF EXISTS public.get_analytics_range(date, date);
DROP FUNCTION IF EXISTS public.get_or_create_daily_analytics(date);
DROP FUNCTION IF EXISTS public.get_yesterday_metrics();
DROP FUNCTION IF EXISTS public.update_daily_active_users(integer, date);
DROP FUNCTION IF EXISTS public.get_unread_mentions(uuid);
