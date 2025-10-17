-- Add privacy settings column to users table
-- Stores user privacy preferences as JSONB

-- Add privacy_settings column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{
  "profileVisibility": true,
  "activityStatus": true,
  "readReceipts": true,
  "analytics": true
}'::jsonb;

-- Create index for efficient privacy settings queries
CREATE INDEX IF NOT EXISTS idx_users_privacy_settings
ON users USING GIN (privacy_settings);

-- Update existing users with default privacy settings if they don't have any
UPDATE users
SET privacy_settings = '{
  "profileVisibility": true,
  "activityStatus": true,
  "readReceipts": true,
  "analytics": true
}'::jsonb
WHERE privacy_settings IS NULL;