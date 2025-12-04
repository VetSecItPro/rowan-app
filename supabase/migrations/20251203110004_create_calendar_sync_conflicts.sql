-- Create calendar_sync_conflicts table
-- Tracks conflicts and their resolution history

CREATE TYPE resolution_status AS ENUM ('detected', 'resolved', 'failed');
CREATE TYPE winning_source AS ENUM ('external', 'rowan', 'merged', 'manual');
CREATE TYPE resolution_strategy AS ENUM ('external_wins', 'rowan_wins', 'merge', 'manual_review');

CREATE TABLE calendar_sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  mapping_id UUID NOT NULL REFERENCES calendar_event_mappings(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,

  -- Conflict details
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_status resolution_status NOT NULL DEFAULT 'detected',

  -- Event versions at time of conflict
  rowan_version JSONB NOT NULL, -- Snapshot of Rowan event data
  external_version JSONB NOT NULL, -- Snapshot of external event data

  -- Resolution details
  winning_source winning_source,
  resolution_strategy resolution_strategy NOT NULL DEFAULT 'external_wins',
  resolved_by UUID REFERENCES auth.users(id), -- User ID if manually resolved
  resolution_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for queries
CREATE INDEX idx_sync_conflicts_mapping ON calendar_sync_conflicts(mapping_id);
CREATE INDEX idx_sync_conflicts_connection ON calendar_sync_conflicts(connection_id);
CREATE INDEX idx_sync_conflicts_status ON calendar_sync_conflicts(resolution_status);
CREATE INDEX idx_sync_conflicts_detected_at ON calendar_sync_conflicts(detected_at DESC);
CREATE INDEX idx_sync_conflicts_unresolved ON calendar_sync_conflicts(detected_at) WHERE resolution_status = 'detected';

-- Updated timestamp trigger
CREATE TRIGGER update_calendar_sync_conflicts_updated_at
  BEFORE UPDATE ON calendar_sync_conflicts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to mark conflict as resolved
CREATE OR REPLACE FUNCTION resolve_calendar_conflict(
  conflict_id UUID,
  p_winning_source winning_source,
  p_resolved_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS calendar_sync_conflicts AS $$
DECLARE
  result calendar_sync_conflicts;
BEGIN
  UPDATE calendar_sync_conflicts
  SET
    resolution_status = 'resolved',
    resolved_at = NOW(),
    winning_source = p_winning_source,
    resolved_by = p_resolved_by,
    resolution_notes = p_notes
  WHERE id = conflict_id
  RETURNING * INTO result;

  -- Also clear the conflict flag on the mapping
  UPDATE calendar_event_mappings
  SET has_conflict = FALSE
  WHERE id = result.mapping_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE calendar_sync_conflicts IS 'Tracks calendar sync conflicts and their resolution history';
COMMENT ON COLUMN calendar_sync_conflicts.rowan_version IS 'JSONB snapshot of Rowan event at time of conflict';
COMMENT ON COLUMN calendar_sync_conflicts.external_version IS 'JSONB snapshot of external event at time of conflict';
COMMENT ON FUNCTION resolve_calendar_conflict IS 'Helper function to mark a conflict as resolved and update mapping';
