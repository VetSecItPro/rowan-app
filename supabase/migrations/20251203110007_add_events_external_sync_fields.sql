-- Add external sync fields to events table
-- Tracks which events came from external calendars and prevents sync loops

-- Add new columns to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS external_source calendar_provider,
ADD COLUMN IF NOT EXISTS sync_locked BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_external_sync TIMESTAMPTZ;

-- Create indexes for sync queries
CREATE INDEX IF NOT EXISTS idx_events_external_source ON events(external_source) WHERE external_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_sync_locked ON events(sync_locked) WHERE sync_locked = TRUE;
CREATE INDEX IF NOT EXISTS idx_events_last_external_sync ON events(last_external_sync) WHERE last_external_sync IS NOT NULL;

-- Composite index for finding events to sync
CREATE INDEX IF NOT EXISTS idx_events_sync_eligible ON events(space_id, updated_at)
  WHERE deleted_at IS NULL AND sync_locked = FALSE;

-- Comments
COMMENT ON COLUMN events.external_source IS 'Which provider this event originated from (google, apple, cozi), NULL if created in Rowan';
COMMENT ON COLUMN events.sync_locked IS 'TRUE when sync is in progress to prevent concurrent modifications';
COMMENT ON COLUMN events.last_external_sync IS 'Timestamp of last successful sync with external calendar';

-- Function to lock event for sync (prevents race conditions)
CREATE OR REPLACE FUNCTION lock_event_for_sync(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_locked BOOLEAN;
BEGIN
  UPDATE events
  SET sync_locked = TRUE
  WHERE id = p_event_id AND sync_locked = FALSE
  RETURNING TRUE INTO v_locked;

  RETURN COALESCE(v_locked, FALSE);
END;
$$;

-- Function to unlock event after sync
CREATE OR REPLACE FUNCTION unlock_event_after_sync(
  p_event_id UUID,
  p_mark_synced BOOLEAN DEFAULT TRUE
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE events
  SET
    sync_locked = FALSE,
    last_external_sync = CASE WHEN p_mark_synced THEN NOW() ELSE last_external_sync END
  WHERE id = p_event_id;
END;
$$;

-- Function to unlock all locked events (recovery mechanism)
CREATE OR REPLACE FUNCTION unlock_all_sync_locked_events()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Unlock events locked for more than 5 minutes (likely failed sync)
  WITH unlocked AS (
    UPDATE events
    SET sync_locked = FALSE
    WHERE sync_locked = TRUE
      AND updated_at < NOW() - INTERVAL '5 minutes'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM unlocked;

  RETURN v_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION lock_event_for_sync TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION unlock_event_after_sync TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION unlock_all_sync_locked_events TO service_role;

-- Comments for functions
COMMENT ON FUNCTION lock_event_for_sync IS 'Atomically locks event for sync, returns TRUE if successful';
COMMENT ON FUNCTION unlock_event_after_sync IS 'Unlocks event after sync and optionally updates last_external_sync';
COMMENT ON FUNCTION unlock_all_sync_locked_events IS 'Recovery: unlocks events locked for >5 minutes (failed syncs)';
