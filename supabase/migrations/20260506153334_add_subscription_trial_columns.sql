-- ============================================================================
-- Migration: Add missing trial_started_at / trial_ends_at columns to subscriptions
-- Date: 2026-05-06
--
-- WHY:
-- The original 20251202203259_add_subscription_schema migration created
-- subscriptions without trial_* columns. Subsequent migrations (notably
-- 20260219000001_restore_14_day_pro_trial) reference these columns inside
-- function bodies and defensive UPDATEs, but no migration ever ALTER TABLEs
-- them in. Production DB has the columns (presumably from squashed history);
-- a fresh Supabase boot from migrations alone does NOT — CI's local Supabase
-- crashed every subscription query with "column trial_started_at does not
-- exist (code: 42703)", which surfaced as the broken-baseline page-load
-- failures (test-pro tier resolved to 'free' → FeatureGateBlockedPage
-- rendered → tests asserting <h1>Expenses</h1> saw <h1>Expense Tracking</h1>
-- instead).
--
-- IDEMPOTENT: ADD COLUMN IF NOT EXISTS — safe to apply on prod (where the
-- columns already exist as no-op) and on local CI (where they're missing).
--
-- Also stamps a comment so future drift checks know the columns are
-- intentionally tracked here.
-- ============================================================================

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

COMMENT ON COLUMN public.subscriptions.trial_started_at IS
  'When a free-trial began. NULL when user has no trial. Used by getUserTier() to detect expired trials and downgrade to free.';

COMMENT ON COLUMN public.subscriptions.trial_ends_at IS
  'When a free-trial expires. NULL when user has no trial. provision_new_user() sets this to NOW() + 14 days for new signups.';

DO $$
BEGIN
  RAISE NOTICE '✅ subscriptions.trial_started_at + trial_ends_at columns ensured';
END
$$;
