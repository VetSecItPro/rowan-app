-- Add expiration tracking to beta_access_requests table
ALTER TABLE beta_access_requests
ADD COLUMN IF NOT EXISTS access_granted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS days_granted INTEGER DEFAULT 30;

-- Update existing records with granted access to have expiration dates
UPDATE beta_access_requests
SET 
  access_granted_at = created_at,
  access_expires_at = created_at + INTERVAL '30 days',
  days_granted = 30
WHERE access_granted = true 
  AND access_granted_at IS NULL;

-- Create a function to check if beta access is still valid
CREATE OR REPLACE FUNCTION is_beta_access_valid(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  beta_record RECORD;
  program_end_date TIMESTAMPTZ := '2025-12-31 20:00:00-06'::TIMESTAMPTZ; -- Dec 31, 2025 8PM Central
BEGIN
  -- Get the beta access record
  SELECT * INTO beta_record
  FROM beta_access_requests
  WHERE email = user_email
    AND access_granted = true
  LIMIT 1;

  -- No beta access found
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check if program has ended
  IF NOW() > program_end_date THEN
    RETURN false;
  END IF;

  -- Check if individual access has expired
  IF beta_record.access_expires_at IS NOT NULL AND NOW() > beta_record.access_expires_at THEN
    RETURN false;
  END IF;

  -- Access is still valid
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for admin dashboard showing beta user status
CREATE OR REPLACE VIEW admin_beta_users_status AS
SELECT 
  bar.id,
  bar.email,
  bar.created_at as requested_at,
  bar.access_granted,
  bar.access_granted_at,
  bar.access_expires_at,
  bar.days_granted,
  CASE 
    WHEN bar.access_expires_at IS NULL THEN NULL
    WHEN bar.access_expires_at > NOW() THEN 
      EXTRACT(EPOCH FROM (bar.access_expires_at - NOW())) / 86400
    ELSE 0
  END as days_remaining,
  CASE
    WHEN NOT bar.access_granted THEN 'pending'
    WHEN bar.access_expires_at IS NULL THEN 'active_no_expiry'
    WHEN NOW() > bar.access_expires_at THEN 'expired'
    WHEN NOW() > '2025-12-31 20:00:00-06'::TIMESTAMPTZ THEN 'program_ended'
    WHEN bar.access_expires_at - NOW() < INTERVAL '7 days' THEN 'expiring_soon'
    ELSE 'active'
  END as status,
  u.id as user_id,
  u.email as user_email,
  u.created_at as user_created_at
FROM beta_access_requests bar
LEFT JOIN auth.users u ON u.email = bar.email
WHERE bar.access_granted = true
ORDER BY bar.access_expires_at ASC NULLS LAST;

-- Grant access to the view
GRANT SELECT ON admin_beta_users_status TO authenticated;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_beta_access_expires_at 
  ON beta_access_requests(access_expires_at) 
  WHERE access_granted = true;

-- Create a function to extend beta access
CREATE OR REPLACE FUNCTION extend_beta_access(
  request_id UUID,
  additional_days INTEGER
)
RETURNS JSONB AS $$
DECLARE
  current_expiry TIMESTAMPTZ;
  new_expiry TIMESTAMPTZ;
  result JSONB;
BEGIN
  -- Get current expiration
  SELECT access_expires_at INTO current_expiry
  FROM beta_access_requests
  WHERE id = request_id
    AND access_granted = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Beta access request not found or not granted'
    );
  END IF;

  -- Calculate new expiry (from current expiry if exists, otherwise from now)
  IF current_expiry IS NOT NULL AND current_expiry > NOW() THEN
    new_expiry := current_expiry + (additional_days || ' days')::INTERVAL;
  ELSE
    new_expiry := NOW() + (additional_days || ' days')::INTERVAL;
  END IF;

  -- Don't allow extending beyond program end date
  IF new_expiry > '2025-12-31 20:00:00-06'::TIMESTAMPTZ THEN
    new_expiry := '2025-12-31 20:00:00-06'::TIMESTAMPTZ;
  END IF;

  -- Update the record
  UPDATE beta_access_requests
  SET 
    access_expires_at = new_expiry,
    days_granted = days_granted + additional_days
  WHERE id = request_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_expiry', new_expiry,
    'days_added', additional_days
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the beta program end date
COMMENT ON FUNCTION is_beta_access_valid IS 'Checks if beta access is valid. Program ends Dec 31, 2025 at 8PM Central Time.';
