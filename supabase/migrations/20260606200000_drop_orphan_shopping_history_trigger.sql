-- Drop the orphaned shopping-item-history trigger that breaks shopping-item writes.
--
-- ROOT CAUSE (found by live prod QA, 6 June 2026 — same class as the task-trigger
-- fix in 20260606190000): PR #344's "25 orphan tables" cleanup (2026-03-16) dropped
-- `shopping_item_history` based on zero *application code* references, but missed the
-- *database* reference — the `shopping_items` trigger `track_item_history`
-- (function `track_shopping_item_history()`) still does
-- `INSERT INTO shopping_item_history ...` on every shopping-item write. Drop the
-- table, leave the trigger → adding/updating a shopping-list item throws
-- `42P01: relation "shopping_item_history" does not exist`.
--
-- Found by a DB-wide scan for triggers whose function body references a
-- now-nonexistent table (after the same scan surfaced the three task triggers).
-- `track_shopping_item_history` is a pure purchase-frequency audit helper for a
-- feature removed with its table; nothing essential is lost.
--
-- Idempotent + safe: IF EXISTS no-ops on already-clean DBs (incl. CI). CASCADE on
-- the function drops its dependent trigger even under naming drift.

DROP TRIGGER IF EXISTS track_item_history ON public.shopping_items;
DROP FUNCTION IF EXISTS public.track_shopping_item_history() CASCADE;
