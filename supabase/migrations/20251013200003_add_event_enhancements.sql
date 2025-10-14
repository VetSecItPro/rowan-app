-- Add custom_color and timezone fields to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS custom_color TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Create event_notes table for collaborative notes
CREATE TABLE IF NOT EXISTS event_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE UNIQUE,
  content TEXT,
  last_edited_by UUID REFERENCES auth.users(id),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create event_note_versions for history tracking
CREATE TABLE IF NOT EXISTS event_note_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES event_notes(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT,
  edited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create event_templates table
CREATE TABLE IF NOT EXISTS event_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  default_duration INTEGER, -- minutes
  category TEXT,
  is_public BOOLEAN DEFAULT false,
  template_data JSONB,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create availability_blocks table
CREATE TABLE IF NOT EXISTS availability_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  block_type TEXT NOT NULL CHECK (block_type IN ('work', 'sleep', 'busy', 'available')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create event_reminders table
CREATE TABLE IF NOT EXISTS event_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  remind_before_minutes INTEGER NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('email', 'push', 'sms', 'in_app')),
  custom_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create recurring_event_exceptions table
CREATE TABLE IF NOT EXISTS recurring_event_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  exception_type TEXT NOT NULL CHECK (exception_type IN ('deleted', 'modified', 'rescheduled')),
  modified_event_id UUID REFERENCES events(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(series_id, exception_date)
);

-- Create external_calendar_connections table
CREATE TABLE IF NOT EXISTS external_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'apple', 'outlook')),
  access_token TEXT,
  refresh_token TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  UNIQUE(user_id, provider)
);

-- Create calendar_sync_map table
CREATE TABLE IF NOT EXISTS calendar_sync_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rowan_event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  external_event_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rowan_event_id, provider)
);

-- Create event_share_links table
CREATE TABLE IF NOT EXISTS event_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Create event_audit_log table
CREATE TABLE IF NOT EXISTS event_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'status_changed')),
  changed_by UUID REFERENCES auth.users(id),
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_calendar_preferences table
CREATE TABLE IF NOT EXISTS user_calendar_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_view TEXT DEFAULT 'month' CHECK (default_view IN ('month', 'week', 'day', 'agenda', 'timeline')),
  show_completed BOOLEAN DEFAULT false,
  show_weekends BOOLEAN DEFAULT true,
  density TEXT DEFAULT 'normal' CHECK (density IN ('compact', 'normal', 'spacious')),
  visible_categories TEXT[],
  week_start_day INTEGER DEFAULT 0 CHECK (week_start_day >= 0 AND week_start_day <= 6),
  time_format TEXT DEFAULT '12h' CHECK (time_format IN ('12h', '24h')),
  theme_preset TEXT,
  custom_theme JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_events_custom_color ON events(custom_color) WHERE custom_color IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_timezone ON events(timezone);
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON events(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_notes_event_id ON event_notes(event_id);
CREATE INDEX IF NOT EXISTS idx_event_note_versions_note_id ON event_note_versions(note_id);
CREATE INDEX IF NOT EXISTS idx_event_templates_space_id ON event_templates(space_id);
CREATE INDEX IF NOT EXISTS idx_event_templates_created_by ON event_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_availability_blocks_user_id ON availability_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_event_id ON event_reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_recurring_exceptions_series_id ON recurring_event_exceptions(series_id);
CREATE INDEX IF NOT EXISTS idx_external_calendar_user_id ON external_calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_rowan_event_id ON calendar_sync_map(rowan_event_id);
CREATE INDEX IF NOT EXISTS idx_event_share_token ON event_share_links(token);
CREATE INDEX IF NOT EXISTS idx_event_audit_event_id ON event_audit_log(event_id);
CREATE INDEX IF NOT EXISTS idx_event_audit_created_at ON event_audit_log(created_at);

-- Enable RLS on all new tables
ALTER TABLE event_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_note_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_event_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_calendar_preferences ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON COLUMN events.custom_color IS 'Custom hex color for event (overrides category color)';
COMMENT ON COLUMN events.timezone IS 'Timezone for the event (e.g., America/New_York)';
COMMENT ON COLUMN events.deleted_at IS 'Soft delete timestamp (30-day retention)';
COMMENT ON TABLE event_notes IS 'Collaborative markdown notes for events';
COMMENT ON TABLE event_templates IS 'Reusable event templates';
COMMENT ON TABLE availability_blocks IS 'Recurring availability patterns (e.g., work hours)';
COMMENT ON TABLE event_reminders IS 'Multiple reminder options per event';
COMMENT ON TABLE event_audit_log IS 'Audit trail for all calendar operations';
