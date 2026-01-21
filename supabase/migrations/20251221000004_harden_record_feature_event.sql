-- Harden record_feature_event against spoofing and search_path issues
CREATE OR REPLACE FUNCTION record_feature_event(
  p_user_id UUID,
  p_space_id UUID,
  p_feature TEXT,
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}',
  p_device_type TEXT DEFAULT NULL,
  p_browser TEXT DEFAULT NULL,
  p_os TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
  effective_user_id UUID;
BEGIN
  IF auth.role() = 'service_role' THEN
    effective_user_id := p_user_id;
  ELSE
    effective_user_id := auth.uid();
    IF effective_user_id IS NULL THEN
      RAISE EXCEPTION 'Not authenticated';
    END IF;
    IF p_user_id IS NOT NULL AND p_user_id <> effective_user_id THEN
      RAISE EXCEPTION 'User ID mismatch';
    END IF;
  END IF;

  IF p_space_id IS NOT NULL AND auth.role() <> 'service_role' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM space_members
      WHERE user_id = effective_user_id
        AND space_id = p_space_id
    ) THEN
      RAISE EXCEPTION 'User is not a member of this space';
    END IF;
  END IF;

  INSERT INTO feature_events (
    user_id,
    space_id,
    feature,
    action,
    metadata,
    device_type,
    browser,
    os,
    session_id
  ) VALUES (
    effective_user_id,
    p_space_id,
    p_feature,
    p_action,
    p_metadata,
    p_device_type,
    p_browser,
    p_os,
    p_session_id
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;
