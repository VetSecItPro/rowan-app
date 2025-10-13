-- =============================================
-- FEATURE #17: CHORE ROTATION
-- =============================================
-- This migration creates a chore rotation system for fair task distribution.

CREATE TABLE IF NOT EXISTS chore_rotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_id UUID NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
  rotation_name TEXT NOT NULL,
  rotation_type TEXT DEFAULT 'round_robin' CHECK (rotation_type IN ('round_robin', 'random', 'custom')),

  -- Rotation configuration
  user_order JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of user_ids in rotation order
  current_index INTEGER DEFAULT 0, -- Current position in rotation
  rotation_frequency TEXT DEFAULT 'weekly' CHECK (rotation_frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),

  -- Rotation schedule
  next_rotation_date DATE NOT NULL,
  last_rotation_date DATE,
  last_assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,

  is_active BOOLEAN DEFAULT TRUE,
  skip_on_absence BOOLEAN DEFAULT FALSE, -- Skip user if they're marked as absent

  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chore_rotations_chore ON chore_rotations(chore_id);
CREATE INDEX IF NOT EXISTS idx_chore_rotations_active ON chore_rotations(is_active, next_rotation_date) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_chore_rotations_next_date ON chore_rotations(next_rotation_date);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_chore_rotations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chore_rotations_updated_at_trigger
  BEFORE UPDATE ON chore_rotations
  FOR EACH ROW
  EXECUTE FUNCTION update_chore_rotations_updated_at();

-- Function to get next user in rotation
CREATE OR REPLACE FUNCTION get_next_rotation_user(rotation_id UUID)
RETURNS UUID AS $$
DECLARE
  rotation_record RECORD;
  next_user_id UUID;
  user_list JSONB;
  list_length INTEGER;
BEGIN
  -- Get rotation record
  SELECT * INTO rotation_record
  FROM chore_rotations
  WHERE id = rotation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rotation not found: %', rotation_id;
  END IF;

  user_list := rotation_record.user_order;
  list_length := jsonb_array_length(user_list);

  IF list_length = 0 THEN
    RAISE EXCEPTION 'No users in rotation: %', rotation_id;
  END IF;

  -- Get next user based on rotation type
  IF rotation_record.rotation_type = 'round_robin' THEN
    -- Get user at current_index
    next_user_id := (user_list->>rotation_record.current_index)::UUID;

    -- Update current_index for next time (wrap around)
    UPDATE chore_rotations
    SET current_index = (current_index + 1) % list_length
    WHERE id = rotation_id;

  ELSIF rotation_record.rotation_type = 'random' THEN
    -- Pick random user
    next_user_id := (user_list->>floor(random() * list_length)::INTEGER)::UUID;

  ELSE
    RAISE EXCEPTION 'Unsupported rotation type: %', rotation_record.rotation_type;
  END IF;

  RETURN next_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to rotate chores (called by cron job)
CREATE OR REPLACE FUNCTION process_chore_rotations()
RETURNS void AS $$
DECLARE
  rotation_record RECORD;
  next_user_id UUID;
BEGIN
  -- Find rotations due today
  FOR rotation_record IN
    SELECT * FROM chore_rotations
    WHERE is_active = TRUE
      AND next_rotation_date <= CURRENT_DATE
  LOOP
    -- Get next user in rotation
    next_user_id := get_next_rotation_user(rotation_record.id);

    -- Update chore assignment
    UPDATE chores
    SET assigned_to = next_user_id
    WHERE id = rotation_record.chore_id;

    -- Update rotation record
    UPDATE chore_rotations
    SET
      last_rotation_date = CURRENT_DATE,
      last_assigned_to = next_user_id,
      next_rotation_date = CASE rotation_frequency
        WHEN 'daily' THEN CURRENT_DATE + INTERVAL '1 day'
        WHEN 'weekly' THEN CURRENT_DATE + INTERVAL '1 week'
        WHEN 'biweekly' THEN CURRENT_DATE + INTERVAL '2 weeks'
        WHEN 'monthly' THEN CURRENT_DATE + INTERVAL '1 month'
        ELSE CURRENT_DATE + INTERVAL '1 week'
      END
    WHERE id = rotation_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add rotation fields to chores table
ALTER TABLE chores
  ADD COLUMN IF NOT EXISTS has_rotation BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rotation_id UUID REFERENCES chore_rotations(id) ON DELETE SET NULL;

-- Add comments
COMMENT ON TABLE chore_rotations IS 'Automatic rotation system for fair chore distribution';
COMMENT ON COLUMN chore_rotations.user_order IS 'JSONB array of user_ids in rotation order';
COMMENT ON COLUMN chore_rotations.current_index IS 'Current position in round_robin rotation';
COMMENT ON COLUMN chore_rotations.rotation_type IS 'round_robin = sequential, random = random selection';
COMMENT ON COLUMN chore_rotations.skip_on_absence IS 'Skip user if marked as absent/unavailable';
