-- Privacy & Data Management System
-- Migration: 20241019_privacy_data_system.sql

-- User privacy preferences table
CREATE TABLE IF NOT EXISTS user_privacy_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- Personal Privacy
  activity_status_visible BOOLEAN DEFAULT true,
  share_anonymous_analytics BOOLEAN DEFAULT false,

  -- Legal Compliance
  ccpa_do_not_sell BOOLEAN DEFAULT true,
  marketing_emails_enabled BOOLEAN DEFAULT false,
  marketing_sms_enabled BOOLEAN DEFAULT false,

  -- Cookie Preferences
  analytics_cookies_enabled BOOLEAN DEFAULT false,
  performance_cookies_enabled BOOLEAN DEFAULT true,
  advertising_cookies_enabled BOOLEAN DEFAULT false,

  -- Data Sharing
  share_data_with_partners BOOLEAN DEFAULT false,
  third_party_analytics_enabled BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Account deletion tracking
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_deletion_date TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_sent_7_days BOOLEAN DEFAULT false,
  reminder_sent_1_day BOOLEAN DEFAULT false,
  deletion_completed BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMP WITH TIME ZONE NULL,
  cancellation_reason TEXT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Privacy preference audit trail
CREATE TABLE IF NOT EXISTS privacy_preference_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  old_value BOOLEAN,
  new_value BOOLEAN NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data export requests
CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  export_format TEXT NOT NULL CHECK (export_format IN ('json', 'csv', 'pdf')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
  file_url TEXT NULL,
  file_size_bytes BIGINT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  error_message TEXT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email notification tracking
CREATE TABLE IF NOT EXISTS privacy_email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'deletion_confirmation',
    'deletion_reminder_7_days',
    'deletion_reminder_1_day',
    'deletion_completed',
    'deletion_cancelled',
    'data_export_ready',
    'privacy_settings_changed'
  )),
  email_address TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'failed', 'bounced')),
  email_provider_id TEXT NULL, -- Resend email ID

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_privacy_preferences_user_id ON user_privacy_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user_id ON account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_scheduled_date ON account_deletion_requests(scheduled_deletion_date) WHERE deletion_completed = false AND cancelled_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_privacy_preference_history_user_id ON privacy_preference_history(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_preference_history_changed_at ON privacy_preference_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_id ON data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON data_export_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_expires_at ON data_export_requests(expires_at) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_privacy_email_notifications_user_id ON privacy_email_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_email_notifications_type ON privacy_email_notifications(notification_type);

-- RLS Policies
ALTER TABLE user_privacy_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_preference_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_email_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only access their own privacy data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_privacy_preferences'
    AND policyname = 'Users can view own privacy preferences'
  ) THEN
    CREATE POLICY "Users can view own privacy preferences" ON user_privacy_preferences
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_privacy_preferences'
    AND policyname = 'Users can update own privacy preferences'
  ) THEN
    CREATE POLICY "Users can update own privacy preferences" ON user_privacy_preferences
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_privacy_preferences'
    AND policyname = 'Users can insert own privacy preferences'
  ) THEN
    CREATE POLICY "Users can insert own privacy preferences" ON user_privacy_preferences
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Account deletion policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'account_deletion_requests'
    AND policyname = 'Users can view own deletion requests'
  ) THEN
    CREATE POLICY "Users can view own deletion requests" ON account_deletion_requests
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'account_deletion_requests'
    AND policyname = 'Users can create own deletion requests'
  ) THEN
    CREATE POLICY "Users can create own deletion requests" ON account_deletion_requests
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'account_deletion_requests'
    AND policyname = 'Users can update own deletion requests'
  ) THEN
    CREATE POLICY "Users can update own deletion requests" ON account_deletion_requests
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- Privacy history policies (read-only for users)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'privacy_preference_history'
    AND policyname = 'Users can view own privacy history'
  ) THEN
    CREATE POLICY "Users can view own privacy history" ON privacy_preference_history
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- Data export policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'data_export_requests'
    AND policyname = 'Users can view own export requests'
  ) THEN
    CREATE POLICY "Users can view own export requests" ON data_export_requests
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'data_export_requests'
    AND policyname = 'Users can create own export requests'
  ) THEN
    CREATE POLICY "Users can create own export requests" ON data_export_requests
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Email notification policies (read-only for users)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'privacy_email_notifications'
    AND policyname = 'Users can view own email notifications'
  ) THEN
    CREATE POLICY "Users can view own email notifications" ON privacy_email_notifications
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Trigger to automatically create privacy preferences for new users
CREATE OR REPLACE FUNCTION create_default_privacy_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_privacy_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users (if it doesn't already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created_privacy'
  ) THEN
    CREATE TRIGGER on_auth_user_created_privacy
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION create_default_privacy_preferences();
  END IF;
END $$;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_user_privacy_preferences_updated_at'
  ) THEN
    CREATE TRIGGER update_user_privacy_preferences_updated_at
      BEFORE UPDATE ON user_privacy_preferences
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_account_deletion_requests_updated_at'
  ) THEN
    CREATE TRIGGER update_account_deletion_requests_updated_at
      BEFORE UPDATE ON account_deletion_requests
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_data_export_requests_updated_at'
  ) THEN
    CREATE TRIGGER update_data_export_requests_updated_at
      BEFORE UPDATE ON data_export_requests
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Function to log privacy preference changes
CREATE OR REPLACE FUNCTION log_privacy_preference_change()
RETURNS TRIGGER AS $$
DECLARE
  col_name TEXT;
  old_val BOOLEAN;
  new_val BOOLEAN;
BEGIN
  -- Get the IP address and user agent from the current request context
  -- Note: This would need to be set by the application layer

  -- Log changes for each boolean column
  FOR col_name IN
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'user_privacy_preferences'
    AND data_type = 'boolean'
    AND column_name NOT IN ('id', 'user_id', 'created_at', 'updated_at')
  LOOP
    EXECUTE format('SELECT ($1).%I, ($2).%I', col_name, col_name)
    INTO old_val, new_val
    USING OLD, NEW;

    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO privacy_preference_history (
        user_id, preference_key, old_value, new_value
      ) VALUES (
        NEW.user_id, col_name, old_val, new_val
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for privacy preference change logging
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'log_privacy_preference_changes'
  ) THEN
    CREATE TRIGGER log_privacy_preference_changes
      AFTER UPDATE ON user_privacy_preferences
      FOR EACH ROW EXECUTE FUNCTION log_privacy_preference_change();
  END IF;
END $$;

-- Create default privacy preferences for existing users
INSERT INTO user_privacy_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON TABLE user_privacy_preferences IS 'Stores user privacy preferences with GDPR/CCPA compliance';
COMMENT ON TABLE account_deletion_requests IS 'Tracks account deletion requests with 30-day grace period';
COMMENT ON TABLE privacy_preference_history IS 'Audit trail of all privacy preference changes';
COMMENT ON TABLE data_export_requests IS 'Tracks data export requests for GDPR Article 20 compliance';
COMMENT ON TABLE privacy_email_notifications IS 'Tracks all privacy-related email notifications sent to users';