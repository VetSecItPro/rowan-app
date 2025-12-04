-- Database triggers for calendar integration
-- Automatically queues sync operations when events change in Rowan

-- ============================================================================
-- SYNC QUEUE TABLE (for outbound sync operations)
-- ============================================================================

CREATE TYPE queue_operation AS ENUM ('create', 'update', 'delete');
CREATE TYPE queue_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE calendar_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event and connection references
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
  mapping_id UUID REFERENCES calendar_event_mappings(id) ON DELETE SET NULL,

  -- Operation details
  operation queue_operation NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5, -- 1-10, lower = higher priority
  status queue_status NOT NULL DEFAULT 'pending',

  -- Event snapshot (for delete operations where event no longer exists)
  event_snapshot JSONB,

  -- Retry logic
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Indexes for queue processing
CREATE INDEX idx_sync_queue_pending ON calendar_sync_queue(priority ASC, created_at ASC)
  WHERE status = 'pending';
CREATE INDEX idx_sync_queue_retry ON calendar_sync_queue(next_retry_at)
  WHERE status = 'failed' AND retry_count < max_retries;
CREATE INDEX idx_sync_queue_connection ON calendar_sync_queue(connection_id, status);
CREATE INDEX idx_sync_queue_event ON calendar_sync_queue(event_id);

-- Updated timestamp trigger
CREATE TRIGGER update_calendar_sync_queue_updated_at
  BEFORE UPDATE ON calendar_sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE calendar_sync_queue IS 'Queue for outbound calendar sync operations (Rowan → External)';
COMMENT ON COLUMN calendar_sync_queue.priority IS '1-10: 1=urgent (event within 1hr), 5=normal, 7=background';
COMMENT ON COLUMN calendar_sync_queue.event_snapshot IS 'JSONB snapshot of event data for delete operations';

-- ============================================================================
-- PRIORITY CALCULATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_sync_priority(p_event_id UUID, p_operation queue_operation)
RETURNS INTEGER AS $$
DECLARE
  v_event_start TIMESTAMPTZ;
  v_hours_until_start DOUBLE PRECISION;
BEGIN
  -- Delete operations have higher priority
  IF p_operation = 'delete' THEN
    RETURN 2;
  END IF;

  -- Get event start time
  SELECT start_date INTO v_event_start FROM events WHERE id = p_event_id;

  IF v_event_start IS NULL THEN
    RETURN 5; -- Default priority
  END IF;

  -- Calculate hours until event starts
  v_hours_until_start := EXTRACT(EPOCH FROM (v_event_start - NOW())) / 3600;

  -- Priority based on time until event
  IF v_hours_until_start <= 1 THEN
    RETURN 1; -- Urgent: event within 1 hour
  ELSIF v_hours_until_start <= 24 THEN
    RETURN 3; -- High: event within 24 hours
  ELSIF v_hours_until_start <= 168 THEN
    RETURN 5; -- Normal: event within 7 days
  ELSE
    RETURN 7; -- Background: future events
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER FUNCTION: Queue sync when Rowan event changes
-- ============================================================================

CREATE OR REPLACE FUNCTION queue_calendar_sync_on_change()
RETURNS TRIGGER AS $$
DECLARE
  v_connection RECORD;
  v_operation queue_operation;
  v_priority INTEGER;
  v_event_snapshot JSONB;
BEGIN
  -- Determine operation type
  IF TG_OP = 'DELETE' THEN
    v_operation := 'delete';
    v_event_snapshot := row_to_json(OLD)::JSONB;
  ELSIF TG_OP = 'INSERT' THEN
    v_operation := 'create';
    v_event_snapshot := NULL;
  ELSE -- UPDATE
    v_operation := 'update';
    v_event_snapshot := NULL;
  END IF;

  -- Don't queue if event is currently locked for sync (prevents loops)
  IF (TG_OP = 'UPDATE' AND NEW.sync_locked = TRUE) OR
     (TG_OP = 'INSERT' AND NEW.sync_locked = TRUE) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Don't queue if this change came from external sync
  IF (TG_OP = 'UPDATE' AND OLD.last_external_sync IS NOT NULL AND
      NEW.last_external_sync = OLD.last_external_sync AND
      NEW.updated_at > OLD.last_external_sync) OR
     (TG_OP = 'UPDATE' AND NEW.last_external_sync > OLD.updated_at) THEN
    -- This change was from external sync, don't sync back
    RETURN NEW;
  END IF;

  -- Calculate priority
  IF TG_OP = 'DELETE' THEN
    v_priority := calculate_sync_priority(OLD.id, v_operation);
  ELSE
    v_priority := calculate_sync_priority(NEW.id, v_operation);
  END IF;

  -- Find all active connections for this event's space
  FOR v_connection IN
    SELECT id, provider
    FROM calendar_connections
    WHERE space_id = COALESCE(NEW.space_id, OLD.space_id)
      AND sync_status = 'active'
      AND (sync_direction = 'bidirectional' OR sync_direction = 'outbound_only')
  LOOP
    -- Queue sync operation for this connection
    INSERT INTO calendar_sync_queue (
      event_id,
      connection_id,
      mapping_id,
      operation,
      priority,
      event_snapshot
    ) VALUES (
      COALESCE(NEW.id, OLD.id),
      v_connection.id,
      (SELECT id FROM calendar_event_mappings
       WHERE rowan_event_id = COALESCE(NEW.id, OLD.id)
         AND connection_id = v_connection.id
       LIMIT 1),
      v_operation,
      v_priority,
      v_event_snapshot
    )
    ON CONFLICT DO NOTHING; -- Prevent duplicate queue entries

    RAISE LOG 'Queued % operation for event % to provider % (priority: %)',
      v_operation, COALESCE(NEW.id, OLD.id), v_connection.provider, v_priority;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to events table
CREATE TRIGGER trigger_queue_calendar_sync
  AFTER INSERT OR UPDATE OR DELETE ON events
  FOR EACH ROW
  EXECUTE FUNCTION queue_calendar_sync_on_change();

COMMENT ON FUNCTION queue_calendar_sync_on_change IS 'Queues outbound sync when Rowan event is created/updated/deleted';

-- ============================================================================
-- QUEUE PROCESSING FUNCTIONS
-- ============================================================================

-- Function to get next pending queue items
CREATE OR REPLACE FUNCTION get_pending_sync_queue_items(p_limit INTEGER DEFAULT 10)
RETURNS SETOF calendar_sync_queue AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM calendar_sync_queue
  WHERE status = 'pending'
    OR (status = 'failed' AND retry_count < max_retries AND next_retry_at <= NOW())
  ORDER BY priority ASC, created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to mark queue item as processing
CREATE OR REPLACE FUNCTION mark_queue_item_processing(p_queue_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE calendar_sync_queue
  SET status = 'processing', updated_at = NOW()
  WHERE id = p_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark queue item as completed
CREATE OR REPLACE FUNCTION mark_queue_item_completed(p_queue_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE calendar_sync_queue
  SET
    status = 'completed',
    processed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark queue item as failed with retry
CREATE OR REPLACE FUNCTION mark_queue_item_failed(
  p_queue_id UUID,
  p_error_message TEXT
)
RETURNS void AS $$
DECLARE
  v_retry_count INTEGER;
  v_max_retries INTEGER;
  v_next_retry TIMESTAMPTZ;
BEGIN
  -- Get current retry count
  SELECT retry_count, max_retries INTO v_retry_count, v_max_retries
  FROM calendar_sync_queue
  WHERE id = p_queue_id;

  -- Calculate next retry time (exponential backoff)
  IF v_retry_count = 0 THEN
    v_next_retry := NOW() + INTERVAL '1 minute';
  ELSIF v_retry_count = 1 THEN
    v_next_retry := NOW() + INTERVAL '5 minutes';
  ELSE
    v_next_retry := NOW() + INTERVAL '15 minutes';
  END IF;

  -- Update queue item
  UPDATE calendar_sync_queue
  SET
    status = 'failed',
    retry_count = retry_count + 1,
    last_error = p_error_message,
    next_retry_at = CASE WHEN retry_count + 1 < v_max_retries THEN v_next_retry ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON calendar_sync_queue TO service_role;
GRANT EXECUTE ON FUNCTION get_pending_sync_queue_items TO service_role;
GRANT EXECUTE ON FUNCTION mark_queue_item_processing TO service_role;
GRANT EXECUTE ON FUNCTION mark_queue_item_completed TO service_role;
GRANT EXECUTE ON FUNCTION mark_queue_item_failed TO service_role;
GRANT EXECUTE ON FUNCTION calculate_sync_priority TO service_role;

-- ============================================================================
-- CLEANUP FUNCTIONS
-- ============================================================================

-- Function to cleanup old completed queue items (retention: 7 days)
CREATE OR REPLACE FUNCTION cleanup_completed_queue_items()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM calendar_sync_queue
    WHERE status = 'completed'
      AND processed_at < NOW() - INTERVAL '7 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM deleted;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION cleanup_completed_queue_items TO service_role;

COMMENT ON FUNCTION cleanup_completed_queue_items IS 'Deletes completed queue items older than 7 days';

-- ============================================================================
-- RLS for sync queue
-- ============================================================================

ALTER TABLE calendar_sync_queue ENABLE ROW LEVEL SECURITY;

-- Users can view their own queue items
CREATE POLICY "Users can view own sync queue items"
  ON calendar_sync_queue FOR SELECT
  TO authenticated
  USING (
    connection_id IN (
      SELECT id FROM calendar_connections
      WHERE space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      )
    )
  );

-- Service role has full access
CREATE POLICY "Service role has full access to sync_queue"
  ON calendar_sync_queue FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ All 10 calendar integration migrations created successfully!';
  RAISE NOTICE 'Tables: calendar_connections, calendar_event_mappings, calendar_sync_logs, calendar_sync_conflicts, calendar_webhook_subscriptions, calendar_sync_queue';
  RAISE NOTICE 'Security: RLS enabled, Supabase Vault configured, space-based access control';
  RAISE NOTICE 'Next steps: Run migrations with: supabase db push';
END $$;
