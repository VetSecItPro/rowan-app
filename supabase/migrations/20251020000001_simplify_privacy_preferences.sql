-- Simplify privacy preferences table for data minimization
-- Remove unnecessary columns to reduce attack surface and legal liability

-- Remove SMS marketing column (SMS functionality removed)
ALTER TABLE user_privacy_preferences
DROP COLUMN IF EXISTS marketing_sms_enabled;

-- Remove unused activity visibility column
ALTER TABLE user_privacy_preferences
DROP COLUMN IF EXISTS activity_status_visible;

-- Remove overly granular cookie preferences
ALTER TABLE user_privacy_preferences
DROP COLUMN IF EXISTS performance_cookies_enabled,
DROP COLUMN IF EXISTS advertising_cookies_enabled;

-- Remove unnecessary third-party sharing columns
ALTER TABLE user_privacy_preferences
DROP COLUMN IF EXISTS third_party_analytics_enabled,
DROP COLUMN IF EXISTS share_data_with_partners;

-- Keep only essential privacy preferences:
-- - ccpa_do_not_sell (legal requirement)
-- - marketing_emails_enabled (basic email marketing control)
-- - analytics_cookies_enabled (basic analytics control)
-- - share_anonymous_analytics (basic analytics preference)

-- Add comment explaining simplified approach
COMMENT ON TABLE user_privacy_preferences IS 'Simplified privacy preferences focusing on essential controls only - data minimization approach';

-- Clean up any references to removed columns in existing code
-- Note: Code cleanup required in:
-- - Marketing subscription API
-- - Cookie preferences component
-- - Any other privacy-related code