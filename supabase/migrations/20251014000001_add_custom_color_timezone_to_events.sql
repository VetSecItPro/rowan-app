-- Add custom_color and timezone fields to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS custom_color TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Add index for timezone queries
CREATE INDEX IF NOT EXISTS idx_events_timezone ON events(timezone);

-- Comment on columns
COMMENT ON COLUMN events.custom_color IS 'Custom hex color for event (overrides category color)';
COMMENT ON COLUMN events.timezone IS 'Timezone for the event (defaults to UTC)';
