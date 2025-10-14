-- Create event_proposals table
CREATE TABLE IF NOT EXISTS event_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  category TEXT CHECK (category IN ('work', 'personal', 'family', 'health', 'social')),
  time_slots JSONB NOT NULL, -- Array of {start_time, end_time} objects
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'countered')),
  approved_slot_index INTEGER, -- Index of approved time slot
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Add created_event_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'event_proposals' AND column_name = 'created_event_id'
  ) THEN
    ALTER TABLE event_proposals ADD COLUMN created_event_id UUID REFERENCES events(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create event_proposal_votes table
CREATE TABLE IF NOT EXISTS event_proposal_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID NOT NULL REFERENCES event_proposals(id) ON DELETE CASCADE,
  time_slot_index INTEGER NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('preferred', 'available', 'unavailable')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proposal_id, time_slot_index, user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_event_proposals_space_id ON event_proposals(space_id);
CREATE INDEX IF NOT EXISTS idx_event_proposals_proposed_by ON event_proposals(proposed_by);
CREATE INDEX IF NOT EXISTS idx_event_proposals_status ON event_proposals(status);
CREATE INDEX IF NOT EXISTS idx_event_proposals_created_event ON event_proposals(created_event_id);

CREATE INDEX IF NOT EXISTS idx_proposal_votes_proposal_id ON event_proposal_votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_votes_user_id ON event_proposal_votes(user_id);

-- Enable RLS
ALTER TABLE event_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_proposal_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_proposals
DROP POLICY IF EXISTS "Users can view proposals in their space" ON event_proposals;
CREATE POLICY "Users can view proposals in their space"
  ON event_proposals FOR SELECT
  USING (
    space_id IN (
      SELECT space_id
      FROM space_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create proposals in their space" ON event_proposals;
CREATE POLICY "Users can create proposals in their space"
  ON event_proposals FOR INSERT
  WITH CHECK (
    space_id IN (
      SELECT space_id
      FROM space_members
      WHERE user_id = auth.uid()
    )
    AND proposed_by = auth.uid()
  );

DROP POLICY IF EXISTS "Proposal creators can update their proposals" ON event_proposals;
CREATE POLICY "Proposal creators can update their proposals"
  ON event_proposals FOR UPDATE
  USING (proposed_by = auth.uid())
  WITH CHECK (proposed_by = auth.uid());

DROP POLICY IF EXISTS "Proposal creators can delete their proposals" ON event_proposals;
CREATE POLICY "Proposal creators can delete their proposals"
  ON event_proposals FOR DELETE
  USING (proposed_by = auth.uid());

-- RLS Policies for event_proposal_votes
DROP POLICY IF EXISTS "Users can view votes in their space proposals" ON event_proposal_votes;
CREATE POLICY "Users can view votes in their space proposals"
  ON event_proposal_votes FOR SELECT
  USING (
    proposal_id IN (
      SELECT id FROM event_proposals
      WHERE space_id IN (
        SELECT space_id
        FROM space_members
        WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can vote on proposals in their space" ON event_proposal_votes;
CREATE POLICY "Users can vote on proposals in their space"
  ON event_proposal_votes FOR INSERT
  WITH CHECK (
    proposal_id IN (
      SELECT id FROM event_proposals
      WHERE space_id IN (
        SELECT space_id
        FROM space_members
        WHERE user_id = auth.uid()
      )
    )
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update their own votes" ON event_proposal_votes;
CREATE POLICY "Users can update their own votes"
  ON event_proposal_votes FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own votes" ON event_proposal_votes;
CREATE POLICY "Users can delete their own votes"
  ON event_proposal_votes FOR DELETE
  USING (user_id = auth.uid());

-- Add updated_at triggers
CREATE TRIGGER set_event_proposals_updated_at
  BEFORE UPDATE ON event_proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_event_proposal_votes_updated_at
  BEFORE UPDATE ON event_proposal_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
