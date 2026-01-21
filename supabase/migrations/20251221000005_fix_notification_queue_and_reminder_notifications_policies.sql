-- Restrict reminder_notifications inserts to self and service role
DROP POLICY IF EXISTS "System can insert notifications" ON reminder_notifications;
DROP POLICY IF EXISTS "Users can insert own reminder notifications" ON reminder_notifications;
CREATE POLICY "Users can insert own reminder notifications"
  ON reminder_notifications FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Tighten notification_queue policies
DROP POLICY IF EXISTS "Service role can manage notification queue" ON notification_queue;
DROP POLICY IF EXISTS "System can insert notifications for users" ON notification_queue;
DROP POLICY IF EXISTS "System can update notification status" ON notification_queue;
DROP POLICY IF EXISTS "System can delete processed notifications" ON notification_queue;
DROP POLICY IF EXISTS "Users can view their own queued notifications" ON notification_queue;
DROP POLICY IF EXISTS "Users can insert their own queued notifications" ON notification_queue;

CREATE POLICY "Service role can manage notification queue"
  ON notification_queue
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can view their own queued notifications"
  ON notification_queue
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own queued notifications"
  ON notification_queue
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
