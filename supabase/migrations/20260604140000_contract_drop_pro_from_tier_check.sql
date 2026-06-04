-- CONTRACT: drop legacy 'pro' from subscriptions_tier_check (4 June 2026)
--
-- Pairs with the EXPAND migration 20260603120000_rename_pro_to_plus.sql, which
-- (a) widened the CHECK to allow BOTH 'pro' and 'plus', (b) migrated all data
-- 'pro' -> 'plus', and (c) recreated the three tier-emitting functions to emit
-- 'plus'. This is the contract half: now that cutover is confirmed, tighten the
-- CHECK so 'pro' can never be written again.
--
-- Pre-flight verified against prod before shipping (4 June 2026):
--   subscriptions      tier='pro'      -> 0 rows
--   subscription_events from_tier='pro' -> 0 rows
--   subscription_events to_tier='pro'   -> 0 rows
--   distinct tiers in subscriptions     -> free, owner, plus  (no 'pro')
-- and no application code path writes 'pro' (only normalizeTier() reads it).
--
-- The normalizeTier() app shim (lib/types/subscription.ts) and the SQL-side
-- 'pro' -> 'plus' normalization in get_user_subscription_tier are intentionally
-- KEPT as read-boundary defense in depth — they cost nothing and protect reads
-- if a stray 'pro' ever reappears (e.g. a manual edit or a rollback window).

-- ---------------------------------------------------------------------------
-- 1. Self-healing safety net: re-run the data migration so this file is safe to
--    replay even if a stray 'pro' row exists at apply time. (Verified 0 in prod;
--    this guards a divergent dev DB or an out-of-order replay.) Without it, the
--    ADD CONSTRAINT below would fail validation against a leftover 'pro' row.
-- ---------------------------------------------------------------------------
UPDATE public.subscriptions      SET tier      = 'plus' WHERE tier      = 'pro';
UPDATE public.subscription_events SET from_tier = 'plus' WHERE from_tier = 'pro';
UPDATE public.subscription_events SET to_tier   = 'plus' WHERE to_tier   = 'pro';

-- ---------------------------------------------------------------------------
-- 2. Tighten the CHECK: 'pro' is no longer an allowed tier.
--    Idempotent (DROP IF EXISTS + ADD); the new constraint matches the prod
--    data set verified above, so it validates cleanly.
-- ---------------------------------------------------------------------------
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_tier_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_tier_check
  CHECK (tier = ANY (ARRAY['free'::text, 'plus'::text, 'family'::text, 'owner'::text]));
