-- =============================================
-- Storage Tracking & Management
-- =============================================
-- Purpose: Track storage usage per space, enable quota enforcement,
--          and support storage warning dismissals
-- Created: 2024-12-03

-- =============================================
-- TABLE: storage_usage
-- =============================================
-- Tracks current storage usage per space
CREATE TABLE IF NOT EXISTS storage_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

  -- Storage metrics (in bytes)
  total_bytes BIGINT NOT NULL DEFAULT 0,
  file_count INTEGER NOT NULL DEFAULT 0,

  -- Last calculated
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(space_id)
);

-- Enable RLS
ALTER TABLE storage_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view storage for spaces they're members of
CREATE POLICY "space_members_view_storage"
  ON storage_usage
  FOR SELECT
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_storage_usage_space ON storage_usage(space_id);
CREATE INDEX idx_storage_usage_total ON storage_usage(total_bytes);

-- =============================================
-- TABLE: storage_warnings
-- =============================================
-- Track when users dismiss storage warnings
CREATE TABLE IF NOT EXISTS storage_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

  -- Warning details
  warning_type TEXT NOT NULL CHECK (warning_type IN ('80_percent', '90_percent', '100_percent')),
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Context at time of dismissal
  storage_bytes BIGINT NOT NULL,
  storage_limit_bytes BIGINT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, space_id, warning_type)
);

-- Enable RLS
ALTER TABLE storage_warnings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can manage their own warning dismissals
CREATE POLICY "users_manage_own_warnings"
  ON storage_warnings
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_storage_warnings_user_space ON storage_warnings(user_id, space_id);
CREATE INDEX idx_storage_warnings_type ON storage_warnings(warning_type);

-- =============================================
-- FUNCTION: calculate_space_storage
-- =============================================
-- Calculate total storage used by a space
-- NOTE: This will be called after file uploads/deletions
CREATE OR REPLACE FUNCTION calculate_space_storage(p_space_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_bytes BIGINT;
  v_file_count INTEGER;
BEGIN
  -- Calculate from Supabase Storage
  -- This is a placeholder - actual implementation will query storage.objects
  SELECT
    COALESCE(SUM(metadata->>'size')::BIGINT, 0),
    COUNT(*)
  INTO v_total_bytes, v_file_count
  FROM storage.objects
  WHERE bucket_id = 'space-files'
    AND (metadata->>'space_id')::UUID = p_space_id;

  -- Upsert into storage_usage
  INSERT INTO storage_usage (space_id, total_bytes, file_count, last_calculated_at)
  VALUES (p_space_id, v_total_bytes, v_file_count, NOW())
  ON CONFLICT (space_id)
  DO UPDATE SET
    total_bytes = EXCLUDED.total_bytes,
    file_count = EXCLUDED.file_count,
    last_calculated_at = EXCLUDED.last_calculated_at,
    updated_at = NOW();

  RETURN v_total_bytes;
END;
$$;

-- =============================================
-- FUNCTION: check_storage_quota
-- =============================================
-- Check if space has enough storage quota for upload
CREATE OR REPLACE FUNCTION check_storage_quota(
  p_space_id UUID,
  p_file_size_bytes BIGINT
)
RETURNS TABLE(
  allowed BOOLEAN,
  current_bytes BIGINT,
  limit_bytes BIGINT,
  available_bytes BIGINT,
  percentage_used NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_bytes BIGINT;
  v_limit_gb NUMERIC;
  v_limit_bytes BIGINT;
  v_tier TEXT;
BEGIN
  -- Get current usage
  SELECT COALESCE(total_bytes, 0)
  INTO v_current_bytes
  FROM storage_usage
  WHERE space_id = p_space_id;

  -- Get space's subscription tier storage limit
  SELECT
    COALESCE(s.tier, 'free')
  INTO v_tier
  FROM spaces sp
  LEFT JOIN subscriptions s ON s.user_id = sp.owner_id AND s.status = 'active'
  WHERE sp.id = p_space_id;

  -- Convert tier to GB limit
  v_limit_gb := CASE v_tier
    WHEN 'free' THEN 0.5
    WHEN 'pro' THEN 5
    WHEN 'family' THEN 15
    ELSE 0.5
  END;

  -- Convert to bytes
  v_limit_bytes := (v_limit_gb * 1024 * 1024 * 1024)::BIGINT;

  -- Return check results
  RETURN QUERY SELECT
    (v_current_bytes + p_file_size_bytes) <= v_limit_bytes as allowed,
    v_current_bytes as current_bytes,
    v_limit_bytes as limit_bytes,
    v_limit_bytes - v_current_bytes as available_bytes,
    ROUND((v_current_bytes::NUMERIC / v_limit_bytes::NUMERIC) * 100, 2) as percentage_used;
END;
$$;

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE storage_usage IS 'Tracks current storage usage per space for quota enforcement';
COMMENT ON TABLE storage_warnings IS 'Tracks user dismissals of storage warnings to avoid spam';
COMMENT ON FUNCTION calculate_space_storage IS 'Calculates and updates total storage used by a space';
COMMENT ON FUNCTION check_storage_quota IS 'Checks if a space has enough quota for a file upload';
