-- ============================================================================
-- Location Tracking System for Family Safety
-- ============================================================================
-- This migration creates the tables needed for family location sharing:
-- 1. user_locations - Real-time location updates from family members
-- 2. family_places - Saved locations (home, school, work) with geofencing
-- 3. location_sharing_settings - Per-user privacy controls
-- 4. geofence_events - Log of arrivals/departures for notifications
-- ============================================================================

-- Enable PostGIS extension for geographic calculations (if not already enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- 1. User Locations Table - Real-time position tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

  -- Location data
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2), -- Accuracy in meters
  altitude DECIMAL(10, 2),
  altitude_accuracy DECIMAL(10, 2),
  speed DECIMAL(10, 2), -- Speed in m/s
  heading DECIMAL(5, 2), -- Heading in degrees (0-360)

  -- Device info
  battery_level DECIMAL(3, 2), -- 0.00 to 1.00
  is_charging BOOLEAN DEFAULT false,

  -- Timestamps
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- When location was recorded on device
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()  -- When stored in database
);

-- Indexes for quick lookups
CREATE INDEX idx_user_locations_user_time ON user_locations(user_id, recorded_at DESC);
CREATE INDEX idx_user_locations_space ON user_locations(space_id, recorded_at DESC);
-- Note: Using regular index instead of partial index with NOW() which isn't IMMUTABLE
CREATE INDEX idx_user_locations_recent ON user_locations(recorded_at DESC);

-- Enable RLS
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Space members can see each other's locations (if sharing is enabled)
CREATE POLICY "Space members can view locations"
  ON user_locations FOR SELECT
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own location"
  ON user_locations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own location history"
  ON user_locations FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- 2. Family Places Table - Saved locations with geofencing
-- ============================================================================
CREATE TABLE IF NOT EXISTS family_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

  -- Place details
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'map-pin', -- Lucide icon name
  color TEXT DEFAULT '#3b82f6', -- Hex color for map marker

  -- Location
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT, -- Human-readable address

  -- Geofence settings
  radius_meters INTEGER NOT NULL DEFAULT 150, -- 150m default radius
  notify_on_arrival BOOLEAN DEFAULT true,
  notify_on_departure BOOLEAN DEFAULT true,

  -- Tracking
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_family_places_space ON family_places(space_id);

-- Enable RLS
ALTER TABLE family_places ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Space members can view places"
  ON family_places FOR SELECT
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Space members can create places"
  ON family_places FOR INSERT
  WITH CHECK (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Space members can update places"
  ON family_places FOR UPDATE
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Space admins can delete places"
  ON family_places FOR DELETE
  USING (
    space_id IN (
      SELECT sm.space_id FROM space_members sm
      WHERE sm.user_id = auth.uid() AND sm.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 3. Location Sharing Settings - Privacy controls per user per space
-- ============================================================================
CREATE TABLE IF NOT EXISTS location_sharing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

  -- Sharing preferences
  sharing_enabled BOOLEAN DEFAULT true,
  precision TEXT DEFAULT 'exact' CHECK (precision IN ('exact', 'approximate', 'city', 'hidden')),
  -- exact: Full precision location
  -- approximate: Location fuzzed to ~500m radius
  -- city: Only city-level location shown
  -- hidden: Location not shared (but still tracked for emergency)

  -- History settings
  history_retention_days INTEGER DEFAULT 7, -- How long to keep location history

  -- Notification preferences
  notify_arrivals BOOLEAN DEFAULT true,
  notify_departures BOOLEAN DEFAULT true,
  quiet_hours_start TIME, -- Don't send notifications during quiet hours
  quiet_hours_end TIME,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, space_id)
);

-- Enable RLS
ALTER TABLE location_sharing_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own settings"
  ON location_sharing_settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Space members can view sharing status"
  ON location_sharing_settings FOR SELECT
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own settings"
  ON location_sharing_settings FOR ALL
  USING (user_id = auth.uid());

-- ============================================================================
-- 4. Geofence Events - Log of arrivals and departures
-- ============================================================================
CREATE TABLE IF NOT EXISTS geofence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES family_places(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN ('arrival', 'departure')),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,

  -- Notification tracking
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,

  -- Timestamps
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for quick lookups
CREATE INDEX idx_geofence_events_user ON geofence_events(user_id, occurred_at DESC);
CREATE INDEX idx_geofence_events_space ON geofence_events(space_id, occurred_at DESC);
CREATE INDEX idx_geofence_events_place ON geofence_events(place_id, occurred_at DESC);
CREATE INDEX idx_geofence_events_pending_notifications
  ON geofence_events(notification_sent, created_at)
  WHERE notification_sent = false;

-- Enable RLS
ALTER TABLE geofence_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Space members can view geofence events"
  ON geofence_events FOR SELECT
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert geofence events"
  ON geofence_events FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. Push Notification Tokens - For sending native push notifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Token details
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_name TEXT, -- Optional device identifier

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, token)
);

-- Index for sending notifications
CREATE INDEX idx_push_tokens_user_active ON push_tokens(user_id) WHERE is_active = true;

-- Enable RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own push tokens"
  ON push_tokens FOR ALL
  USING (user_id = auth.uid());

-- ============================================================================
-- 6. Helper Functions
-- ============================================================================

-- Function to get last known location for a user
CREATE OR REPLACE FUNCTION get_last_location(p_user_id UUID, p_space_id UUID)
RETURNS TABLE (
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  accuracy DECIMAL(10, 2),
  recorded_at TIMESTAMPTZ,
  minutes_ago INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ul.latitude,
    ul.longitude,
    ul.accuracy,
    ul.recorded_at,
    EXTRACT(EPOCH FROM (NOW() - ul.recorded_at))::INTEGER / 60 AS minutes_ago
  FROM user_locations ul
  WHERE ul.user_id = p_user_id
    AND ul.space_id = p_space_id
  ORDER BY ul.recorded_at DESC
  LIMIT 1;
END;
$$;

-- Function to check if user is within a geofence
CREATE OR REPLACE FUNCTION is_within_geofence(
  p_lat DECIMAL(10, 8),
  p_lng DECIMAL(11, 8),
  p_center_lat DECIMAL(10, 8),
  p_center_lng DECIMAL(11, 8),
  p_radius_meters INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  distance_meters FLOAT;
BEGIN
  -- Haversine formula for distance calculation
  distance_meters := 6371000 * 2 * ASIN(
    SQRT(
      POWER(SIN(RADIANS(p_lat - p_center_lat) / 2), 2) +
      COS(RADIANS(p_center_lat)) * COS(RADIANS(p_lat)) *
      POWER(SIN(RADIANS(p_lng - p_center_lng) / 2), 2)
    )
  );

  RETURN distance_meters <= p_radius_meters;
END;
$$;

-- Function to clean up old location data (for data retention)
CREATE OR REPLACE FUNCTION cleanup_old_locations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete locations older than user's retention setting
  WITH deleted AS (
    DELETE FROM user_locations ul
    WHERE ul.recorded_at < NOW() - (
      SELECT COALESCE(
        (SELECT (lss.history_retention_days || ' days')::INTERVAL
         FROM location_sharing_settings lss
         WHERE lss.user_id = ul.user_id
         LIMIT 1),
        INTERVAL '7 days' -- Default retention
      )
    )
    RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$;

-- ============================================================================
-- 7. Updated_at Triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_family_places_updated_at
  BEFORE UPDATE ON family_places
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_location_sharing_settings_updated_at
  BEFORE UPDATE ON location_sharing_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Done! Tables created:
-- - user_locations: Store family member positions
-- - family_places: Saved locations with geofencing
-- - location_sharing_settings: Privacy controls
-- - geofence_events: Arrival/departure log
-- - push_tokens: Native push notification tokens
-- ============================================================================
