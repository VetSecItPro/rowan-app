-- Create event_proposals table for collaborative event scheduling
CREATE TABLE IF NOT EXISTS event_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  time_slots JSONB NOT NULL, -- Array of proposed date/time options
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'countered')),
  counter_proposal_id UUID REFERENCES event_proposals(id),
  approved_slot_index INTEGER, -- Which time slot was chosen (if approved)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create event_proposal_votes table for voting on time slots
CREATE TABLE IF NOT EXISTS event_proposal_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES event_proposals(id) ON DELETE CASCADE,
  time_slot_index INTEGER NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  vote TEXT NOT NULL CHECK (vote IN ('available', 'unavailable', 'preferred')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proposal_id, time_slot_index, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_event_proposals_event_id ON event_proposals(event_id);
CREATE INDEX IF NOT EXISTS idx_event_proposals_space_id ON event_proposals(space_id);
CREATE INDEX IF NOT EXISTS idx_event_proposals_proposed_by ON event_proposals(proposed_by);
CREATE INDEX IF NOT EXISTS idx_event_proposals_status ON event_proposals(status);
CREATE INDEX IF NOT EXISTS idx_event_proposal_votes_proposal_id ON event_proposal_votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_event_proposal_votes_user_id ON event_proposal_votes(user_id);

-- Enable RLS
ALTER TABLE event_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_proposal_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_proposals
CREATE POLICY "Users can view proposals in their space"
  ON event_proposals FOR SELECT
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create proposals in their space"
  ON event_proposals FOR INSERT
  WITH CHECK (
    proposed_by = auth.uid() AND
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own proposals"
  ON event_proposals FOR UPDATE
  USING (proposed_by = auth.uid())
  WITH CHECK (proposed_by = auth.uid());

CREATE POLICY "Users can delete their own proposals"
  ON event_proposals FOR DELETE
  USING (proposed_by = auth.uid());

-- RLS Policies for event_proposal_votes
CREATE POLICY "Users can view votes on proposals in their space"
  ON event_proposal_votes FOR SELECT
  USING (
    proposal_id IN (
      SELECT id FROM event_proposals
      WHERE space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can add votes to proposals in their space"
  ON event_proposal_votes FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    proposal_id IN (
      SELECT id FROM event_proposals
      WHERE space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own votes"
  ON event_proposal_votes FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own votes"
  ON event_proposal_votes FOR DELETE
  USING (user_id = auth.uid());

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_event_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_proposals_updated_at_trigger
BEFORE UPDATE ON event_proposals
FOR EACH ROW
EXECUTE FUNCTION update_event_proposals_updated_at();

CREATE TRIGGER event_proposal_votes_updated_at_trigger
BEFORE UPDATE ON event_proposal_votes
FOR EACH ROW
EXECUTE FUNCTION update_event_proposals_updated_at();

-- Comments
COMMENT ON TABLE event_proposals IS 'Stores event scheduling proposals with multiple time slot options';
COMMENT ON TABLE event_proposal_votes IS 'Stores votes/responses to event proposals';
