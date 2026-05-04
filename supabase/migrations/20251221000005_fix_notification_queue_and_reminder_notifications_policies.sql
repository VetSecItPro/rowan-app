-- Wrap each table's policy operations in IF EXISTS guards so this
-- migration replays cleanly on a fresh DB even if one of these tables
-- got dropped or renamed in a later migration. (Prod has both tables;
-- this is a no-op there.)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='reminder_notifications') THEN
    EXECUTE 'DROP POLICY IF EXISTS "System can insert notifications" ON reminder_notifications';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert own reminder notifications" ON reminder_notifications';
    EXECUTE $cmd$
      CREATE POLICY "Users can insert own reminder notifications"
        ON reminder_notifications FOR INSERT
        WITH CHECK (user_id = auth.uid())
    $cmd$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='notification_queue') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Service role can manage notification queue" ON notification_queue';
    EXECUTE 'DROP POLICY IF EXISTS "System can insert notifications for users" ON notification_queue';
    EXECUTE 'DROP POLICY IF EXISTS "System can update notification status" ON notification_queue';
    EXECUTE 'DROP POLICY IF EXISTS "System can delete processed notifications" ON notification_queue';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own queued notifications" ON notification_queue';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert their own queued notifications" ON notification_queue';
    EXECUTE $cmd$
      CREATE POLICY "Service role can manage notification queue"
        ON notification_queue FOR ALL
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role')
    $cmd$;
    EXECUTE $cmd$
      CREATE POLICY "Users can view their own queued notifications"
        ON notification_queue FOR SELECT
        USING (user_id = auth.uid())
    $cmd$;
    EXECUTE $cmd$
      CREATE POLICY "Users can insert their own queued notifications"
        ON notification_queue FOR INSERT
        WITH CHECK (user_id = auth.uid())
    $cmd$;
  END IF;
END $$;
