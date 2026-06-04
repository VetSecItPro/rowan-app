-- Add missing space_id indexes (Phase 14.2 / 19.1, 3 June 2026)
--
-- These six space-scoped tables had no index on space_id. Every RLS policy and
-- nearly every read filters by space_id, so without an index Postgres falls back
-- to a sequential scan. `tags` and `task_categories` are read on almost every
-- render, so this is the first query to slow down under real load. The tables
-- are small/empty today, so a plain (non-CONCURRENT) CREATE INDEX inside the
-- migration transaction is safe and fast.
--
-- IF NOT EXISTS keeps this idempotent (re-runnable without error).

CREATE INDEX IF NOT EXISTS idx_budgets_space_id           ON public.budgets (space_id);
CREATE INDEX IF NOT EXISTS idx_budget_categories_space_id ON public.budget_categories (space_id);
CREATE INDEX IF NOT EXISTS idx_custom_categories_space_id ON public.custom_categories (space_id);
CREATE INDEX IF NOT EXISTS idx_tags_space_id              ON public.tags (space_id);
CREATE INDEX IF NOT EXISTS idx_task_categories_space_id   ON public.task_categories (space_id);
CREATE INDEX IF NOT EXISTS idx_task_stats_space_id        ON public.task_stats (space_id);
