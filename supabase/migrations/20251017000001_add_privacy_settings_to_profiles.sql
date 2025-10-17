-- Add privacy settings column to profiles table
-- Stores user privacy preferences as JSONB

-- Check if profiles table exists and add privacy_settings column
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    -- Add privacy_settings column to profiles table
    ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{
      "profileVisibility": true,
      "activityStatus": true,
      "readReceipts": true,
      "analytics": true
    }'::jsonb;

    -- Create index for efficient privacy settings queries
    CREATE INDEX IF NOT EXISTS idx_profiles_privacy_settings
    ON profiles USING GIN (privacy_settings);

    -- Update existing profiles with default privacy settings if they don't have any
    UPDATE profiles
    SET privacy_settings = '{
      "profileVisibility": true,
      "activityStatus": true,
      "readReceipts": true,
      "analytics": true
    }'::jsonb
    WHERE privacy_settings IS NULL;
  END IF;
END $$;