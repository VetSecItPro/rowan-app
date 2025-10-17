-- Add CCPA compliance tables for California Consumer Privacy Act
-- Implements CCPA Section 1798.135 - Right to Opt-Out of Sale of Personal Information

-- Table to track CCPA opt-out status for users
CREATE TABLE IF NOT EXISTS ccpa_opt_out_status (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opted_out boolean NOT NULL DEFAULT false,
  opt_out_date timestamptz,
  ip_address inet,
  user_agent text,
  california_resident boolean,
  verification_method text CHECK (verification_method IN ('geolocation', 'user_declaration', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Table for CCPA audit logging (retained permanently for compliance)
CREATE TABLE IF NOT EXISTS ccpa_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL, -- Not a foreign key since user might be deleted
  action text NOT NULL CHECK (action IN ('opt_out_enabled', 'opt_out_disabled', 'data_request', 'california_resident_verified')),
  action_details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE ccpa_opt_out_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccpa_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for ccpa_opt_out_status
CREATE POLICY "Users can view their own CCPA opt-out status"
  ON ccpa_opt_out_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own CCPA opt-out status"
  ON ccpa_opt_out_status FOR ALL
  USING (auth.uid() = user_id);

-- RLS policies for CCPA audit log
CREATE POLICY "Users can view their own CCPA audit logs"
  ON ccpa_audit_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage CCPA audit logs"
  ON ccpa_audit_log FOR ALL
  USING (current_user = 'service_role');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ccpa_opt_out_user_id ON ccpa_opt_out_status(user_id);
CREATE INDEX IF NOT EXISTS idx_ccpa_opt_out_status ON ccpa_opt_out_status(opted_out);
CREATE INDEX IF NOT EXISTS idx_ccpa_california_resident ON ccpa_opt_out_status(california_resident);
CREATE INDEX IF NOT EXISTS idx_ccpa_audit_user_id ON ccpa_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ccpa_audit_timestamp ON ccpa_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_ccpa_audit_action ON ccpa_audit_log(action);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ccpa_opt_out_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_ccpa_opt_out_status_updated_at
  BEFORE UPDATE ON ccpa_opt_out_status
  FOR EACH ROW
  EXECUTE FUNCTION update_ccpa_opt_out_updated_at();

-- Grant permissions
GRANT ALL ON ccpa_opt_out_status TO authenticated;
GRANT SELECT ON ccpa_audit_log TO authenticated;
GRANT ALL ON ccpa_audit_log TO service_role;

-- Insert default opt-out status for existing users (opted in by default, per CCPA)
INSERT INTO ccpa_opt_out_status (user_id, opted_out, california_resident, verification_method, created_at, updated_at)
SELECT
  id,
  false,
  null, -- Will be determined later via geolocation or user declaration
  'admin',
  now(),
  now()
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM ccpa_opt_out_status);