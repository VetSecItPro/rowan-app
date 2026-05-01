-- Migration: Add admin-query indexes
-- Date: 2026-05-01
-- Reason: The admin dashboard's retention/DAU/MAU and "active users" queries
-- all filter by `created_at` or `updated_at` on these tables. Without indexes,
-- every query is a sequential scan. Today the tables are small enough that it
-- doesn't matter, but they grow continuously (feature_events especially).
--
-- All three indexes are DESC-ordered to match the access pattern: every admin
-- query is `WHERE created_at >= now() - interval ... ORDER BY created_at DESC`.
-- A descending index serves both the range filter and the order-by without a
-- separate sort step.
--
-- Idempotent: IF NOT EXISTS so re-running this migration is safe.
-- Not CONCURRENT: tables are small in the current snapshot and a brief lock
-- is acceptable. Switch to CONCURRENTLY in a follow-up migration if any of
-- these tables crosses ~1M rows.

CREATE INDEX IF NOT EXISTS idx_feature_events_created_at
  ON feature_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at
  ON subscription_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_updated_at
  ON profiles(updated_at DESC);
