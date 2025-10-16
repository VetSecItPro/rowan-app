-- Add threshold and notification fields to budgets table
-- Part of Phase 1: Smart Budget Alerts feature

ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS threshold_50_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS threshold_75_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS threshold_90_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "push": true, "toast": true}'::jsonb,
ADD COLUMN IF NOT EXISTS last_alert_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_alert_threshold INTEGER; -- Track which threshold (50, 75, 90) was last alerted

-- Add comment explaining the fields
COMMENT ON COLUMN budgets.threshold_50_enabled IS 'Enable alert when 50% of budget is spent';
COMMENT ON COLUMN budgets.threshold_75_enabled IS 'Enable alert when 75% of budget is spent';
COMMENT ON COLUMN budgets.threshold_90_enabled IS 'Enable alert when 90% of budget is spent';
COMMENT ON COLUMN budgets.notifications_enabled IS 'Master toggle for all budget notifications';
COMMENT ON COLUMN budgets.notification_preferences IS 'JSON object with notification channel preferences: {email, push, toast}';
COMMENT ON COLUMN budgets.last_alert_sent_at IS 'Timestamp of last alert sent (prevents duplicate alerts)';
COMMENT ON COLUMN budgets.last_alert_threshold IS 'Which threshold (50, 75, 90) triggered the last alert';
