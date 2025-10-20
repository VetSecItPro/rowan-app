-- Migration: Clean up duplicate notification preference tables
-- Date: October 20, 2025
-- Purpose: Remove the duplicate notification_preferences table and consolidate to user_notification_preferences

-- ==========================================
-- 1. DROP OLD TABLE AND RELATED OBJECTS
-- ==========================================
-- Since we're replacing the notification system with digest-only,
-- we can safely remove the old table without data migration

-- Drop the trigger first
DROP TRIGGER IF EXISTS set_notification_prefs_updated_at ON notification_preferences;

-- Drop the trigger function (only if it's not used elsewhere)
DROP FUNCTION IF EXISTS update_notification_prefs_updated_at();

-- Drop the user creation trigger that references the old table
DROP TRIGGER IF EXISTS create_notif_prefs_for_new_user ON users;

-- Drop the old function (the new one is create_default_notification_preferences)
-- This function might have conflicts with the newer one, so we'll recreate it properly
DROP FUNCTION IF EXISTS create_default_notification_preferences() CASCADE;

-- Recreate the function to work with the correct table name
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger for the correct table (if it doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_created_notification_preferences ON auth.users;
CREATE TRIGGER on_auth_user_created_notification_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_notification_preferences();

-- Drop the old notification_preferences table
DROP TABLE IF EXISTS notification_preferences CASCADE;

-- ==========================================
-- 3. CLEAN UP ORPHANED TABLES
-- ==========================================

-- Check for and remove any other notification tables that might be duplicates
-- These tables were created in various migrations but might not be needed

-- Keep push_subscriptions table as it's still used for push notifications
-- Keep notification_log table as it's used for logging
-- Remove notification_queue table if it exists and is not being used

-- Only remove notification_queue if it exists and is not actively used
DO $$
BEGIN
  -- Check if notification_queue exists and has no recent entries (last 30 days)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_queue') THEN
    -- Check if it has any recent activity
    IF NOT EXISTS (
      SELECT 1 FROM notification_queue
      WHERE created_at > NOW() - INTERVAL '30 days'
      LIMIT 1
    ) THEN
      DROP TABLE IF EXISTS notification_queue CASCADE;
    END IF;
  END IF;
END $$;

-- ==========================================
-- 4. UPDATE COMMENTS AND DOCUMENTATION
-- ==========================================

COMMENT ON TABLE user_notification_preferences IS
'Primary table for user notification preferences including email, push, digest, and quiet hours settings. This table replaced the old notification_preferences table.';

COMMENT ON TABLE push_subscriptions IS
'Web push notification subscriptions for browser notifications.';

COMMENT ON TABLE notification_log IS
'Log of all notifications sent to users for tracking and debugging purposes.';