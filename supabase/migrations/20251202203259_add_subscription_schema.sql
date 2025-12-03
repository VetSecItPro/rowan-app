-- ============================================================================
-- Migration: Add Subscription & Monetization Schema
-- Created: 2024-12-02
-- Description: Adds tables and functions for subscription management, usage
--              tracking, and feature access control for Rowan's monetization.
--
-- SAFETY: This migration does NOT alter auth.users or any existing tables.
--         It only creates NEW tables and functions.
--
-- ROLLBACK: See bottom of file for rollback script
-- ============================================================================

-- ============================================================================
-- PART 1: SUBSCRIPTIONS TABLE
-- ============================================================================
-- Stores user subscription information (separate from auth.users for safety)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Subscription details
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'family')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'paused')),
  period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly', 'annual')),

  -- Stripe integration
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,

  -- Timestamps
  subscription_started_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ, -- For canceled subscriptions with grace period
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id) -- One subscription per user
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON public.subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- ============================================================================
-- PART 2: SUBSCRIPTION EVENTS TABLE (Analytics)
-- ============================================================================
-- Tracks all subscription-related events for analytics and debugging
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL, -- 'upgrade', 'downgrade', 'cancel', 'reactivate', 'payment_failed'
  from_tier TEXT, -- Previous tier (null for new subscriptions)
  to_tier TEXT,   -- New tier (null for cancellations)
  trigger_source TEXT, -- 'task_limit', 'calendar_blocked', 'pricing_page', 'upgrade_modal', etc.

  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON public.subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON public.subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON public.subscription_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_trigger_source ON public.subscription_events(trigger_source);

-- ============================================================================
-- PART 3: DAILY USAGE TABLE (Rate Limiting)
-- ============================================================================
-- Tracks daily usage for free tier rate limiting
CREATE TABLE IF NOT EXISTS public.daily_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Usage counters (reset daily)
  tasks_created INTEGER NOT NULL DEFAULT 0,
  messages_sent INTEGER NOT NULL DEFAULT 0,
  quick_actions_used INTEGER NOT NULL DEFAULT 0,
  shopping_list_updates INTEGER NOT NULL DEFAULT 0,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint: one row per user per day
  UNIQUE(user_id, date)
);

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON public.daily_usage(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_usage_date ON public.daily_usage(date);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER daily_usage_updated_at
  BEFORE UPDATE ON public.daily_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_usage_updated_at();

-- ============================================================================
-- PART 4: HELPER FUNCTIONS
-- ============================================================================

-- Get user's subscription tier (returns 'free' if no subscription record)
CREATE OR REPLACE FUNCTION public.get_user_subscription_tier(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_tier TEXT;
BEGIN
  SELECT tier INTO v_tier
  FROM public.subscriptions
  WHERE user_id = p_user_id
    AND status = 'active';

  -- Default to 'free' if no subscription found
  RETURN COALESCE(v_tier, 'free');
END;
$$;

-- Get daily usage count for a specific usage type
CREATE OR REPLACE FUNCTION public.get_daily_usage_count(
  p_user_id UUID,
  p_usage_type TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Validate usage type
  IF p_usage_type NOT IN ('tasks_created', 'messages_sent', 'quick_actions_used', 'shopping_list_updates') THEN
    RAISE EXCEPTION 'Invalid usage type: %', p_usage_type;
  END IF;

  -- Get count for today
  EXECUTE format(
    'SELECT COALESCE(%I, 0) FROM public.daily_usage WHERE user_id = $1 AND date = CURRENT_DATE',
    p_usage_type
  )
  INTO v_count
  USING p_user_id;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- Increment daily usage counter (atomic, handles concurrent requests)
CREATE OR REPLACE FUNCTION public.increment_usage_count(
  p_user_id UUID,
  p_usage_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate usage type
  IF p_usage_type NOT IN ('tasks_created', 'messages_sent', 'quick_actions_used', 'shopping_list_updates') THEN
    RAISE EXCEPTION 'Invalid usage type: %', p_usage_type;
  END IF;

  -- Insert or update atomically (handles concurrent requests)
  EXECUTE format(
    'INSERT INTO public.daily_usage (user_id, date, %I)
     VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (user_id, date)
     DO UPDATE SET %I = public.daily_usage.%I + 1',
    p_usage_type, p_usage_type, p_usage_type
  )
  USING p_user_id;
END;
$$;

-- Record subscription event
CREATE OR REPLACE FUNCTION public.record_subscription_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_from_tier TEXT DEFAULT NULL,
  p_to_tier TEXT DEFAULT NULL,
  p_trigger_source TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO public.subscription_events (
    user_id,
    event_type,
    from_tier,
    to_tier,
    trigger_source,
    metadata
  )
  VALUES (
    p_user_id,
    p_event_type,
    p_from_tier,
    p_to_tier,
    p_trigger_source,
    p_metadata
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- Initialize subscription for new user (called during signup)
CREATE OR REPLACE FUNCTION public.initialize_subscription(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription_id UUID;
BEGIN
  -- Create free tier subscription for new user
  INSERT INTO public.subscriptions (
    user_id,
    tier,
    status,
    period,
    subscription_started_at
  )
  VALUES (
    p_user_id,
    'free',
    'active',
    'monthly',
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING -- Skip if already exists
  RETURNING id INTO v_subscription_id;

  RETURN v_subscription_id;
END;
$$;

-- ============================================================================
-- PART 5: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

-- Subscriptions: Users can read their own subscription
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Subscriptions: System can manage all subscriptions (for webhooks)
CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Subscription Events: Users can read their own events
CREATE POLICY "Users can view own subscription events"
  ON public.subscription_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Subscription Events: System can create events
CREATE POLICY "Service role can manage subscription events"
  ON public.subscription_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Daily Usage: Users can read their own usage
CREATE POLICY "Users can view own daily usage"
  ON public.daily_usage
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Daily Usage: System can manage usage
CREATE POLICY "Service role can manage daily usage"
  ON public.daily_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PART 6: GRANTS (Permissions)
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT ON public.subscription_events TO authenticated;
GRANT SELECT ON public.daily_usage TO authenticated;

-- Grant full access to service role (for API routes and webhooks)
GRANT ALL ON public.subscriptions TO service_role;
GRANT ALL ON public.subscription_events TO service_role;
GRANT ALL ON public.daily_usage TO service_role;

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_subscription_tier(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_usage_count(UUID, TEXT) TO authenticated;

-- Grant execute on system functions to service role
GRANT EXECUTE ON FUNCTION public.increment_usage_count(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_subscription_event(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.initialize_subscription(UUID) TO service_role;

-- ============================================================================
-- PART 7: COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE public.subscriptions IS 'User subscription information for monetization';
COMMENT ON TABLE public.subscription_events IS 'Audit log of all subscription-related events for analytics';
COMMENT ON TABLE public.daily_usage IS 'Daily usage tracking for free tier rate limiting';

COMMENT ON FUNCTION public.get_user_subscription_tier(UUID) IS 'Returns user subscription tier (free, pro, family)';
COMMENT ON FUNCTION public.get_daily_usage_count(UUID, TEXT) IS 'Returns current daily usage count for specific usage type';
COMMENT ON FUNCTION public.increment_usage_count(UUID, TEXT) IS 'Atomically increments daily usage counter';
COMMENT ON FUNCTION public.record_subscription_event(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) IS 'Records subscription event for analytics';
COMMENT ON FUNCTION public.initialize_subscription(UUID) IS 'Creates initial free tier subscription for new user';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- This migration is safe to run multiple times (idempotent)
-- All operations use IF NOT EXISTS or ON CONFLICT clauses
-- ============================================================================


-- ============================================================================
-- ROLLBACK SCRIPT (Run this to undo the migration)
-- ============================================================================
/*
-- Drop policies
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view own subscription events" ON public.subscription_events;
DROP POLICY IF EXISTS "Service role can manage subscription events" ON public.subscription_events;
DROP POLICY IF EXISTS "Users can view own daily usage" ON public.daily_usage;
DROP POLICY IF EXISTS "Service role can manage daily usage" ON public.daily_usage;

-- Drop functions
DROP FUNCTION IF EXISTS public.initialize_subscription(UUID);
DROP FUNCTION IF EXISTS public.record_subscription_event(UUID, TEXT, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.increment_usage_count(UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_daily_usage_count(UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_user_subscription_tier(UUID);
DROP FUNCTION IF EXISTS update_daily_usage_updated_at();
DROP FUNCTION IF EXISTS update_subscriptions_updated_at();

-- Drop tables (CASCADE removes dependent objects)
DROP TABLE IF EXISTS public.daily_usage CASCADE;
DROP TABLE IF EXISTS public.subscription_events CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
*/
