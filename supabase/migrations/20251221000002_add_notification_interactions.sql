-- Create notification interactions table for tracking user engagement

CREATE TABLE IF NOT EXISTS notification_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_id UUID REFERENCES in_app_notifications(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('dismissed', 'clicked', 'closed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_interactions_user_id
  ON notification_interactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_interactions_notification_id
  ON notification_interactions(notification_id);

ALTER TABLE notification_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own notification interactions" ON notification_interactions;
CREATE POLICY "Users can insert own notification interactions"
  ON notification_interactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own notification interactions" ON notification_interactions;
CREATE POLICY "Users can view own notification interactions"
  ON notification_interactions FOR SELECT
  USING (user_id = auth.uid());
