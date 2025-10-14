-- Create checkin_reactions table for partner validation and support features
-- Part of Phase 2: Validation System

-- Ensure uuid extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS checkin_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checkin_id UUID NOT NULL REFERENCES daily_checkins(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('heart', 'hug', 'strength', 'custom')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(checkin_id, from_user_id)
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_checkin_reactions_checkin_id ON checkin_reactions(checkin_id);
CREATE INDEX IF NOT EXISTS idx_checkin_reactions_from_user_id ON checkin_reactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_checkin_reactions_created_at ON checkin_reactions(created_at DESC);

-- Enable RLS
ALTER TABLE checkin_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view reactions in their space" ON checkin_reactions;
DROP POLICY IF EXISTS "Users can react to partner check-ins" ON checkin_reactions;
DROP POLICY IF EXISTS "Users can delete own reactions" ON checkin_reactions;

-- Users can view reactions on check-ins from their space
CREATE POLICY "Users can view reactions in their space" ON checkin_reactions
  FOR SELECT
  USING (
    checkin_id IN (
      SELECT id FROM daily_checkins
      WHERE space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      )
    )
  );

-- Users can create reactions on check-ins in their space (but not their own check-ins)
CREATE POLICY "Users can react to partner check-ins" ON checkin_reactions
  FOR INSERT
  WITH CHECK (
    from_user_id = auth.uid()
    AND checkin_id IN (
      SELECT id FROM daily_checkins
      WHERE space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      )
      AND user_id != auth.uid() -- Cannot react to own check-in
    )
  );

-- Users can delete their own reactions
CREATE POLICY "Users can delete own reactions" ON checkin_reactions
  FOR DELETE
  USING (from_user_id = auth.uid());

-- Add comments for documentation
COMMENT ON TABLE checkin_reactions IS 'Stores reactions/validations that partners send to each other on daily check-ins';
COMMENT ON COLUMN checkin_reactions.reaction_type IS 'Type of reaction: heart (support), hug (comfort), strength (encouragement), custom (with message)';
COMMENT ON COLUMN checkin_reactions.message IS 'Optional custom message with the reaction';
