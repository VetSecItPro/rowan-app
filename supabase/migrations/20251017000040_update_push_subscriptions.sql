-- Update existing push_subscriptions table to match new schema
-- This migration adds missing columns and renames existing ones

-- Add new columns
ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS device_name TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Rename columns to match new schema
ALTER TABLE push_subscriptions
  RENAME COLUMN p256dh_key TO p256dh;

ALTER TABLE push_subscriptions
  RENAME COLUMN auth_key TO auth;

-- Add new indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_space_id ON push_subscriptions(space_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;

-- Update RLS policies to handle space_id (old policies still exist, just adding context)
-- The existing RLS policies from 20251012000003_create_notification_system.sql are sufficient

-- Add comment
COMMENT ON TABLE push_subscriptions IS 'Stores Web Push API subscription data for browser notifications (updated with space support)';
