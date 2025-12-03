-- Create calendar_event_mappings table
-- One-to-one mapping between Rowan events and external calendar events

CREATE TABLE calendar_event_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rowan event reference
  rowan_event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Calendar connection reference
  connection_id UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,

  -- External event identifiers
  external_event_id TEXT NOT NULL, -- Provider's event ID
  external_calendar_id TEXT NOT NULL, -- Which calendar in the provider account

  -- Sync metadata
  sync_direction sync_direction_type NOT NULL DEFAULT 'bidirectional',
  rowan_etag TEXT, -- Rowan event version for conflict detection
  external_etag TEXT, -- External event version (Google: etag, CalDAV: etag)
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Conflict tracking
  has_conflict BOOLEAN NOT NULL DEFAULT FALSE,
  conflict_detected_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints: One Rowan event can map to one external event per connection
  CONSTRAINT unique_rowan_event_connection UNIQUE (rowan_event_id, connection_id),
  -- Constraint: One external event maps to exactly one Rowan event
  CONSTRAINT unique_external_event UNIQUE (connection_id, external_event_id)
);

-- Indexes for performance
CREATE INDEX idx_event_mappings_rowan_event ON calendar_event_mappings(rowan_event_id);
CREATE INDEX idx_event_mappings_connection ON calendar_event_mappings(connection_id);
CREATE INDEX idx_event_mappings_external_event ON calendar_event_mappings(external_event_id);
CREATE INDEX idx_event_mappings_conflicts ON calendar_event_mappings(has_conflict) WHERE has_conflict = TRUE;
CREATE INDEX idx_event_mappings_last_synced ON calendar_event_mappings(last_synced_at);

-- Updated timestamp trigger
CREATE TRIGGER update_calendar_event_mappings_updated_at
  BEFORE UPDATE ON calendar_event_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE calendar_event_mappings IS 'Maps Rowan events to external calendar events for bidirectional sync';
COMMENT ON COLUMN calendar_event_mappings.rowan_etag IS 'Rowan event version hash for detecting local changes';
COMMENT ON COLUMN calendar_event_mappings.external_etag IS 'External event ETag/version for detecting remote changes';
COMMENT ON COLUMN calendar_event_mappings.has_conflict IS 'TRUE when both Rowan and external event were modified';
