# Database Migration Instructions

The notification system requires three new database tables. Due to migration tracking conflicts with the Supabase CLI, please run these migrations manually via the Supabase dashboard.

## Quick Start

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/mhqpjprmpvigmwcghpzx
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste each migration file below (in order)
5. Click **Run** for each one

## Migration 1: Push Subscriptions Table

Copy this entire SQL block:

```sql
-- Add push subscriptions table for Web Push API
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,

  -- Web Push subscription data
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,

  -- Device/browser info
  user_agent TEXT,
  device_name TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  CONSTRAINT unique_user_endpoint UNIQUE (user_id, endpoint)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_space_id ON push_subscriptions(space_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can update their own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own push subscriptions" ON push_subscriptions;

-- RLS Policies
CREATE POLICY "Users can view their own push subscriptions"
  ON push_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions"
  ON push_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push subscriptions"
  ON push_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
  ON push_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE push_subscriptions IS 'Stores Web Push API subscription data for browser notifications';
```

✅ **Run this query, then proceed to Migration 2**

---

## Migration 2: Notification Queue Table

Copy this entire SQL block:

```sql
-- Add notification queue table for batching (hourly/daily digests)
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,

  -- Notification details
  notification_type TEXT NOT NULL,
  notification_data JSONB NOT NULL,

  -- Batching info
  delivery_method TEXT NOT NULL, -- 'instant', 'hourly', 'daily'
  scheduled_for TIMESTAMPTZ NOT NULL,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Quiet hours handling
  suppressed_by_quiet_hours BOOLEAN DEFAULT false,
  original_scheduled_for TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_delivery_method CHECK (delivery_method IN ('instant', 'hourly', 'daily')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'failed', 'cancelled'))
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_space_id ON notification_queue(space_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_queue_delivery ON notification_queue(delivery_method, scheduled_for) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can manage notification queue" ON notification_queue;
DROP POLICY IF EXISTS "Users can view their own queued notifications" ON notification_queue;

-- RLS Policies - Only allow service role to manage queue
CREATE POLICY "Service role can manage notification queue"
  ON notification_queue
  FOR ALL
  USING (auth.role() = 'service_role');

-- Users can view their own queued notifications (for debugging)
CREATE POLICY "Users can view their own queued notifications"
  ON notification_queue
  FOR SELECT
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_notification_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notification_queue_updated_at ON notification_queue;

CREATE TRIGGER notification_queue_updated_at
  BEFORE UPDATE ON notification_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_queue_updated_at();

-- Add comment
COMMENT ON TABLE notification_queue IS 'Queue for batched notifications (hourly/daily digests) and quiet hours management';
```

✅ **Run this query, then proceed to Migration 3**

---

## Migration 3: Helper Functions

Copy this entire SQL block:

```sql
-- Helper function to check if current time is within quiet hours
CREATE OR REPLACE FUNCTION is_in_quiet_hours(
  p_user_id UUID,
  p_space_id UUID DEFAULT NULL,
  p_check_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN AS $$
DECLARE
  v_prefs RECORD;
  v_current_time TIME;
  v_start_time TIME;
  v_end_time TIME;
  v_is_in_quiet_hours BOOLEAN;
BEGIN
  -- Get user preferences
  SELECT
    quiet_hours_enabled,
    quiet_hours_start,
    quiet_hours_end
  INTO v_prefs
  FROM user_notification_preferences
  WHERE user_id = p_user_id
    AND (space_id = p_space_id OR (space_id IS NULL AND p_space_id IS NULL))
  LIMIT 1;

  -- If no preferences found or quiet hours disabled, return false
  IF NOT FOUND OR NOT v_prefs.quiet_hours_enabled THEN
    RETURN FALSE;
  END IF;

  -- If start/end times not set, return false
  IF v_prefs.quiet_hours_start IS NULL OR v_prefs.quiet_hours_end IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Extract time component from check_time
  v_current_time := p_check_time::TIME;
  v_start_time := v_prefs.quiet_hours_start::TIME;
  v_end_time := v_prefs.quiet_hours_end::TIME;

  -- Check if current time is in quiet hours
  -- Handle cases where quiet hours span midnight
  IF v_start_time < v_end_time THEN
    -- Normal case: e.g., 22:00 to 08:00 next day
    v_is_in_quiet_hours := v_current_time >= v_start_time AND v_current_time < v_end_time;
  ELSE
    -- Spans midnight: e.g., 22:00 to 08:00
    v_is_in_quiet_hours := v_current_time >= v_start_time OR v_current_time < v_end_time;
  END IF;

  RETURN v_is_in_quiet_hours;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate next delivery time based on frequency
CREATE OR REPLACE FUNCTION calculate_next_delivery_time(
  p_frequency TEXT,
  p_base_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_next_time TIMESTAMPTZ;
BEGIN
  CASE p_frequency
    WHEN 'instant' THEN
      v_next_time := p_base_time;

    WHEN 'hourly' THEN
      -- Round up to next hour
      v_next_time := date_trunc('hour', p_base_time) + interval '1 hour';

    WHEN 'daily' THEN
      -- Schedule for next day at 9 AM
      v_next_time := (date_trunc('day', p_base_time) + interval '1 day' + interval '9 hours');

      -- If we're before 9 AM today, schedule for today at 9 AM
      IF p_base_time < (date_trunc('day', p_base_time) + interval '9 hours') THEN
        v_next_time := date_trunc('day', p_base_time) + interval '9 hours';
      END IF;

    WHEN 'never' THEN
      -- Far future, effectively never
      v_next_time := p_base_time + interval '100 years';

    ELSE
      v_next_time := p_base_time;
  END CASE;

  RETURN v_next_time;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to adjust delivery time for quiet hours
CREATE OR REPLACE FUNCTION adjust_for_quiet_hours(
  p_user_id UUID,
  p_space_id UUID,
  p_scheduled_time TIMESTAMPTZ
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_prefs RECORD;
  v_adjusted_time TIMESTAMPTZ;
  v_end_time TIME;
  v_scheduled_date DATE;
BEGIN
  -- Get user preferences
  SELECT
    quiet_hours_enabled,
    quiet_hours_start,
    quiet_hours_end
  INTO v_prefs
  FROM user_notification_preferences
  WHERE user_id = p_user_id
    AND (space_id = p_space_id OR (space_id IS NULL AND p_space_id IS NULL))
  LIMIT 1;

  -- If quiet hours not enabled, return original time
  IF NOT FOUND OR NOT v_prefs.quiet_hours_enabled THEN
    RETURN p_scheduled_time;
  END IF;

  -- If scheduled time is in quiet hours, adjust to end of quiet hours
  IF is_in_quiet_hours(p_user_id, p_space_id, p_scheduled_time) THEN
    v_scheduled_date := p_scheduled_time::DATE;
    v_end_time := v_prefs.quiet_hours_end::TIME;

    -- Create timestamp for end of quiet hours
    v_adjusted_time := (v_scheduled_date + v_end_time::TIME)::TIMESTAMPTZ;

    -- If end time is before scheduled time (spans midnight), add a day
    IF v_adjusted_time < p_scheduled_time THEN
      v_adjusted_time := v_adjusted_time + interval '1 day';
    END IF;

    RETURN v_adjusted_time;
  END IF;

  RETURN p_scheduled_time;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comments
COMMENT ON FUNCTION is_in_quiet_hours IS 'Checks if a given time falls within user quiet hours';
COMMENT ON FUNCTION calculate_next_delivery_time IS 'Calculates next delivery time based on notification frequency (instant/hourly/daily)';
COMMENT ON FUNCTION adjust_for_quiet_hours IS 'Adjusts scheduled delivery time if it falls within quiet hours';
```

✅ **Run this query to complete the migrations**

---

## Verify Migrations

After running all three migrations, verify they were created successfully:

```sql
-- Check tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('push_subscriptions', 'notification_queue');

-- Should return 2 rows

-- Check functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_in_quiet_hours', 'calculate_next_delivery_time', 'adjust_for_quiet_hours');

-- Should return 3 rows
```

## Done! 🎉

Once all migrations are complete, your notification system is fully set up and ready to use!

- Push notifications will work
- Quiet hours will be enforced
- Frequency batching will reduce email costs

Check `SETUP_NOTIFICATIONS.md` for full setup documentation.
