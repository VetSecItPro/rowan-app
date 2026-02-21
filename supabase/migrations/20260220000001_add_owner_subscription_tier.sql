-- Add 'owner' to the subscription tier CHECK constraint
-- Owner tier: full access, $0 price, excluded from MRR calculations
-- Admin-assigned only — not purchasable via Polar

-- Drop and recreate the CHECK constraint to include 'owner'
ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_tier_check;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_tier_check
  CHECK (tier IN ('free', 'pro', 'family', 'owner'));

-- Update the platform owner's subscription to 'owner' tier
UPDATE subscriptions
SET tier = 'owner',
    updated_at = now()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'vetsecitpro@gmail.com' LIMIT 1
);
