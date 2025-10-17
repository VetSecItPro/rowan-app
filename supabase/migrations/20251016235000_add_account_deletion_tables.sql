-- Add account deletion system tables for GDPR compliance

-- Table to track accounts marked for deletion (30-day grace period)
CREATE TABLE IF NOT EXISTS deleted_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deletion_requested_at timestamptz NOT NULL DEFAULT now(),
  permanent_deletion_at timestamptz NOT NULL,
  partnership_ids uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Table for audit logging of deletion actions (retained permanently for compliance)
CREATE TABLE IF NOT EXISTS account_deletion_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL, -- Not a foreign key since user might be deleted
  action text NOT NULL CHECK (action IN ('initiated', 'cancelled', 'permanent', 'email_sent')),
  action_details jsonb DEFAULT '{}',
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE deleted_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_deletion_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for deleted_accounts
CREATE POLICY "Users can view their own deletion records"
  ON deleted_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deletion records"
  ON deleted_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deletion records (cancel)"
  ON deleted_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for audit log (admin/system access only)
CREATE POLICY "Service role can manage audit logs"
  ON account_deletion_audit_log FOR ALL
  USING (current_user = 'service_role');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deleted_accounts_user_id ON deleted_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_deleted_accounts_deletion_time ON deleted_accounts(permanent_deletion_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON account_deletion_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON account_deletion_audit_log(timestamp);

-- Grant permissions
GRANT ALL ON deleted_accounts TO authenticated;
GRANT ALL ON account_deletion_audit_log TO service_role;