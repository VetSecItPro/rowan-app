-- ============================================================================
-- Migration: Add Polar Payment Columns
-- Created: 2026-01-25
-- Description: Adds Polar customer and subscription ID columns for migration
--              from Stripe to Polar payment processing.
--
-- SAFETY: This migration only adds new columns, does not alter existing data.
-- ============================================================================

-- Add Polar columns to subscriptions table
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS polar_customer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT UNIQUE;

-- Add index for Polar customer lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_polar_customer
  ON public.subscriptions(polar_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_polar_subscription
  ON public.subscriptions(polar_subscription_id);

-- Add comments for documentation
COMMENT ON COLUMN public.subscriptions.polar_customer_id IS 'Polar customer ID for payment processing';
COMMENT ON COLUMN public.subscriptions.polar_subscription_id IS 'Polar subscription ID for recurring payments';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- This migration is safe to run multiple times (idempotent)
-- Uses IF NOT EXISTS clauses
-- ============================================================================

-- ============================================================================
-- ROLLBACK SCRIPT (Run this to undo the migration)
-- ============================================================================
/*
DROP INDEX IF EXISTS idx_subscriptions_polar_subscription;
DROP INDEX IF EXISTS idx_subscriptions_polar_customer;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS polar_subscription_id;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS polar_customer_id;
*/
