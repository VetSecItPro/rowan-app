-- GDPR and CCPA Compliance Tables
-- Tracks data processing agreements and user privacy preferences

/**
 * GDPR COMPLIANCE:
 * ----------------
 * - Article 6: Legal Basis for Processing
 * - Article 7: Conditions for Consent
 * - Article 13-14: Information to be Provided
 * - Article 28: Data Processing Agreements
 *
 * CCPA COMPLIANCE:
 * ----------------
 * - Right to Know: Users can see what data is collected
 * - Right to Delete: Users can delete their data
 * - Right to Opt-Out: Do Not Sell My Personal Information
 * - Notice at Collection: Users are informed at signup
 */

-- Data Processing Agreements Table
-- Tracks user consent for different types of data processing
CREATE TABLE IF NOT EXISTS data_processing_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Agreement details
  agreement_type TEXT NOT NULL, -- 'terms_of_service', 'privacy_policy', 'marketing_consent', 'analytics_consent'
  agreement_version TEXT NOT NULL, -- Version of the agreement (e.g., '1.0', '2.0')
  legal_basis TEXT NOT NULL, -- GDPR legal basis: 'consent', 'contract', 'legitimate_interest', etc.

  -- Consent tracking
  consented BOOLEAN NOT NULL DEFAULT FALSE,
  consent_date TIMESTAMP WITH TIME ZONE,
  consent_method TEXT, -- 'signup', 'settings_update', 'email_link'
  consent_ip_address TEXT,
  consent_user_agent TEXT,

  -- Withdrawal tracking
  withdrawn BOOLEAN DEFAULT FALSE,
  withdrawal_date TIMESTAMP WITH TIME ZONE,
  withdrawal_reason TEXT,

  -- Processing details
  processing_purposes TEXT[], -- Array of purposes: ['service_delivery', 'analytics', 'marketing']
  data_categories TEXT[], -- Array of data categories: ['profile_data', 'usage_data', 'financial_data']
  retention_period TEXT, -- e.g., '2_years', 'until_account_deletion', 'indefinite'

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CCPA Do Not Sell Preferences Table
-- Tracks user preferences for data selling (CCPA compliance)
CREATE TABLE IF NOT EXISTS ccpa_do_not_sell (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Do Not Sell preference
  do_not_sell BOOLEAN NOT NULL DEFAULT FALSE,
  opted_out_at TIMESTAMP WITH TIME ZONE,
  opted_out_method TEXT, -- 'settings', 'email_link', 'customer_support'
  opted_out_ip_address TEXT,

  -- Opt-in tracking (if user later opts back in)
  opted_in_at TIMESTAMP WITH TIME ZONE,
  opted_in_method TEXT,

  -- Current status
  current_status TEXT NOT NULL DEFAULT 'opted_in', -- 'opted_in', 'opted_out'

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one record per user
  UNIQUE(user_id)
);

-- Privacy Preferences Table
-- Centralized privacy settings for users
CREATE TABLE IF NOT EXISTS user_privacy_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Marketing preferences
  marketing_emails_enabled BOOLEAN DEFAULT FALSE,
  marketing_sms_enabled BOOLEAN DEFAULT FALSE,

  -- Analytics preferences
  analytics_cookies_enabled BOOLEAN DEFAULT TRUE,
  performance_cookies_enabled BOOLEAN DEFAULT TRUE,
  advertising_cookies_enabled BOOLEAN DEFAULT FALSE,

  -- Data sharing preferences
  share_data_with_partners BOOLEAN DEFAULT FALSE,
  allow_third_party_analytics BOOLEAN DEFAULT TRUE,

  -- Location tracking
  location_tracking_enabled BOOLEAN DEFAULT FALSE,

  -- CCPA/GDPR Rights
  ccpa_do_not_sell BOOLEAN DEFAULT TRUE, -- Default to Do Not Sell
  gdpr_automated_decision_making_opt_out BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one record per user
  UNIQUE(user_id)
);

-- Compliance Events Log
-- Tracks all compliance-related events for audit purposes
CREATE TABLE IF NOT EXISTS compliance_events_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL, -- 'consent_given', 'consent_withdrawn', 'data_exported', 'data_deleted', 'do_not_sell_opted_out', etc.
  event_category TEXT NOT NULL, -- 'gdpr', 'ccpa', 'general_privacy'

  -- Context
  description TEXT,
  metadata JSONB, -- Additional event details
  ip_address TEXT,
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_data_processing_agreements_user_id ON data_processing_agreements(user_id);
CREATE INDEX idx_data_processing_agreements_type ON data_processing_agreements(agreement_type, user_id);
CREATE INDEX idx_ccpa_do_not_sell_user_id ON ccpa_do_not_sell(user_id);
CREATE INDEX idx_user_privacy_preferences_user_id ON user_privacy_preferences(user_id);
CREATE INDEX idx_compliance_events_log_user_id ON compliance_events_log(user_id);
CREATE INDEX idx_compliance_events_log_type ON compliance_events_log(event_type, user_id);
CREATE INDEX idx_compliance_events_log_created_at ON compliance_events_log(created_at DESC);

-- RLS Policies
ALTER TABLE data_processing_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccpa_do_not_sell ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_privacy_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_events_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own agreements and preferences
CREATE POLICY "Users can view own processing agreements"
  ON data_processing_agreements
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own CCPA preferences"
  ON ccpa_do_not_sell
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own privacy preferences"
  ON user_privacy_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own compliance events"
  ON compliance_events_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own privacy preferences"
  ON user_privacy_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own CCPA preferences"
  ON ccpa_do_not_sell
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Service can insert records
CREATE POLICY "Service can insert agreements"
  ON data_processing_agreements
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can insert CCPA preferences"
  ON ccpa_do_not_sell
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can insert privacy preferences"
  ON user_privacy_preferences
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can insert compliance events"
  ON compliance_events_log
  FOR INSERT
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE data_processing_agreements IS 'GDPR Article 28: Data Processing Agreements and consent tracking';
COMMENT ON TABLE ccpa_do_not_sell IS 'CCPA: Do Not Sell My Personal Information preferences';
COMMENT ON TABLE user_privacy_preferences IS 'Centralized user privacy preferences for GDPR and CCPA compliance';
COMMENT ON TABLE compliance_events_log IS 'Audit log of all compliance-related events';

-- Function to log compliance events automatically
CREATE OR REPLACE FUNCTION log_compliance_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Log to compliance_events_log when certain tables are updated
  IF TG_TABLE_NAME = 'ccpa_do_not_sell' THEN
    IF NEW.do_not_sell = TRUE AND OLD.do_not_sell = FALSE THEN
      INSERT INTO compliance_events_log (user_id, event_type, event_category, description)
      VALUES (NEW.user_id, 'do_not_sell_opted_out', 'ccpa', 'User opted out of data selling');
    ELSIF NEW.do_not_sell = FALSE AND OLD.do_not_sell = TRUE THEN
      INSERT INTO compliance_events_log (user_id, event_type, event_category, description)
      VALUES (NEW.user_id, 'do_not_sell_opted_in', 'ccpa', 'User opted back in to data selling');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically log compliance events
CREATE TRIGGER log_ccpa_preference_changes
  AFTER UPDATE ON ccpa_do_not_sell
  FOR EACH ROW
  EXECUTE FUNCTION log_compliance_event();

-- Function to initialize default privacy preferences for new users
CREATE OR REPLACE FUNCTION initialize_user_privacy_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default privacy preferences when user signs up
  INSERT INTO user_privacy_preferences (user_id, ccpa_do_not_sell)
  VALUES (NEW.id, TRUE) -- Default to Do Not Sell
  ON CONFLICT (user_id) DO NOTHING;

  -- Create default CCPA preference
  INSERT INTO ccpa_do_not_sell (user_id, do_not_sell, current_status)
  VALUES (NEW.id, TRUE, 'opted_out')
  ON CONFLICT (user_id) DO NOTHING;

  -- Log signup event
  INSERT INTO compliance_events_log (user_id, event_type, event_category, description)
  VALUES (NEW.id, 'account_created', 'general_privacy', 'User account created with default privacy preferences');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize preferences for new users
CREATE TRIGGER init_privacy_preferences_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_privacy_preferences();
