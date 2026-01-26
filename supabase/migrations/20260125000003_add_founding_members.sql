-- Migration: Add Founding Members Program
-- First 1000 Pro/Family subscribers lock in their price forever

-- Add founding member columns to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS is_founding_member BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS founding_member_number INTEGER,
ADD COLUMN IF NOT EXISTS founding_member_locked_price_id TEXT;

-- Add unique constraint on founding_member_number (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_founding_member_number
ON subscriptions(founding_member_number)
WHERE founding_member_number IS NOT NULL;

-- Add index for founding member lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_is_founding_member
ON subscriptions(is_founding_member)
WHERE is_founding_member = TRUE;

-- Create a table to track the founding member counter atomically
CREATE TABLE IF NOT EXISTS founding_member_counter (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Singleton row
  current_count INTEGER NOT NULL DEFAULT 0,
  max_count INTEGER NOT NULL DEFAULT 1000,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the initial counter row
INSERT INTO founding_member_counter (id, current_count, max_count)
VALUES (1, 0, 1000)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the counter table
ALTER TABLE founding_member_counter ENABLE ROW LEVEL SECURITY;

-- Allow service role to read/update the counter (for webhooks)
CREATE POLICY "Service role can manage founding member counter"
ON founding_member_counter
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to read the counter (for displaying count on pricing page)
CREATE POLICY "Authenticated users can read founding member counter"
ON founding_member_counter
FOR SELECT
TO authenticated
USING (true);

-- Allow anon users to read the counter (for public pricing page)
CREATE POLICY "Anon users can read founding member counter"
ON founding_member_counter
FOR SELECT
TO anon
USING (true);

-- Function to claim a founding member number atomically
-- Returns the claimed number or NULL if limit reached
CREATE OR REPLACE FUNCTION claim_founding_member_number()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  claimed_number INTEGER;
BEGIN
  -- Lock the counter row and increment if under limit
  UPDATE founding_member_counter
  SET
    current_count = current_count + 1,
    updated_at = NOW()
  WHERE id = 1 AND current_count < max_count
  RETURNING current_count INTO claimed_number;

  RETURN claimed_number;
END;
$$;

-- Grant execute on the function to service_role (for webhooks)
GRANT EXECUTE ON FUNCTION claim_founding_member_number() TO service_role;

-- Function to get remaining founding member spots
CREATE OR REPLACE FUNCTION get_founding_member_spots_remaining()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT max_count - current_count FROM founding_member_counter WHERE id = 1;
$$;

-- Grant execute to all roles (public info)
GRANT EXECUTE ON FUNCTION get_founding_member_spots_remaining() TO authenticated;
GRANT EXECUTE ON FUNCTION get_founding_member_spots_remaining() TO anon;
GRANT EXECUTE ON FUNCTION get_founding_member_spots_remaining() TO service_role;

-- Add comment for documentation
COMMENT ON TABLE founding_member_counter IS 'Tracks the count of founding members (first 1000 paid subscribers who lock in their price forever)';
COMMENT ON COLUMN subscriptions.is_founding_member IS 'True if this user is a founding member (first 1000 paid subscribers)';
COMMENT ON COLUMN subscriptions.founding_member_number IS 'Sequential number (1-1000) for founding members';
COMMENT ON COLUMN subscriptions.founding_member_locked_price_id IS 'The Polar product ID that this founding member locked in';
