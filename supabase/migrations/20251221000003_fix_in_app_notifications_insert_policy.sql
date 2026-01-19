-- Restrict in-app notification inserts to the owning user.
-- Service role bypasses RLS and can still insert for any user.

DROP POLICY IF EXISTS "System can insert notifications" ON in_app_notifications;

CREATE POLICY "Users can insert own notifications"
  ON in_app_notifications FOR INSERT
  WITH CHECK (user_id = auth.uid());
