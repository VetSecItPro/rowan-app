-- =============================================
-- DAILY CHECK-INS ENHANCEMENTS
-- =============================================
-- Adds note field and RLS policies for daily check-ins

-- Add note field to daily_checkins table
ALTER TABLE daily_checkins
ADD COLUMN IF NOT EXISTS note TEXT;

-- Enable RLS
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view check-ins in their space" ON daily_checkins;
    DROP POLICY IF EXISTS "Users can create their own check-ins" ON daily_checkins;
    DROP POLICY IF EXISTS "Users can update their own check-ins" ON daily_checkins;
    DROP POLICY IF EXISTS "Users can delete their own check-ins" ON daily_checkins;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some policies may not exist yet, continuing...';
END $$;

-- RLS Policies - Users can view all check-ins in their space (see partner's check-ins)
CREATE POLICY "Users can view check-ins in their space"
ON daily_checkins FOR SELECT
USING (
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  )
);

-- Users can only create their own check-ins
CREATE POLICY "Users can create their own check-ins"
ON daily_checkins FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  )
);

-- Users can only update their own check-ins
CREATE POLICY "Users can update their own check-ins"
ON daily_checkins FOR UPDATE
USING (
  user_id = auth.uid()
  AND space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  )
);

-- Users can only delete their own check-ins
CREATE POLICY "Users can delete their own check-ins"
ON daily_checkins FOR DELETE
USING (
  user_id = auth.uid()
  AND space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date ON daily_checkins(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_space_date ON daily_checkins(space_id, date DESC);

-- Add update trigger for updated_at column (if not exists)
DROP TRIGGER IF EXISTS update_daily_checkins_updated_at ON daily_checkins;
CREATE TRIGGER update_daily_checkins_updated_at
    BEFORE UPDATE ON daily_checkins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
