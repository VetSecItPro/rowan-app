-- Add chore calendar integration to match task calendar functionality

-- Add calendar display preference for chores to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS show_chores_on_calendar BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS calendar_chore_filter JSONB DEFAULT '{"categories": [], "frequencies": []}'::jsonb;

-- Add calendar_sync field to chores table
ALTER TABLE chores
  ADD COLUMN IF NOT EXISTS calendar_sync BOOLEAN DEFAULT FALSE;

-- Create chore_calendar_events table for syncing chores to calendar
CREATE TABLE IF NOT EXISTS chore_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_id UUID NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  is_synced BOOLEAN DEFAULT FALSE,
  sync_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(chore_id, event_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chore_calendar_events_chore ON chore_calendar_events(chore_id);
CREATE INDEX IF NOT EXISTS idx_chore_calendar_events_event ON chore_calendar_events(event_id);
CREATE INDEX IF NOT EXISTS idx_chore_calendar_events_synced ON chore_calendar_events(is_synced) WHERE is_synced = TRUE;

-- Add updated_at trigger for chore_calendar_events
CREATE OR REPLACE FUNCTION update_chore_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chore_calendar_events_updated_at_trigger
  BEFORE UPDATE ON chore_calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_chore_calendar_events_updated_at();

-- Function to auto-create calendar event when chore with due_date and calendar_sync is created/updated
CREATE OR REPLACE FUNCTION sync_chore_to_calendar()
RETURNS TRIGGER AS $$
DECLARE
  new_event_id UUID;
BEGIN
  -- If chore has due_date, calendar_sync is enabled, and no existing sync record
  IF NEW.due_date IS NOT NULL AND NEW.calendar_sync = TRUE THEN
    -- Check if sync record already exists
    IF NOT EXISTS (SELECT 1 FROM chore_calendar_events WHERE chore_id = NEW.id) THEN
      -- Create calendar event
      INSERT INTO events (
        space_id,
        title,
        description,
        event_type,
        start_time,
        end_time,
        category,
        status,
        is_recurring,
        assigned_to,
        created_by
      )
      VALUES (
        NEW.space_id,
        '🧹 ' || NEW.title,
        NEW.description,
        'chore',
        NEW.due_date::TIMESTAMPTZ,
        (NEW.due_date::TIMESTAMPTZ + INTERVAL '2 hours'),
        'personal',
        'not-started',
        (NEW.frequency != 'once'),
        NEW.assigned_to,
        NEW.created_by
      )
      RETURNING id INTO new_event_id;

      -- Create sync record
      INSERT INTO chore_calendar_events (chore_id, event_id, is_synced, sync_enabled)
      VALUES (NEW.id, new_event_id, TRUE, TRUE);
    END IF;
  -- If calendar_sync is disabled, remove any existing calendar events
  ELSIF NEW.calendar_sync = FALSE THEN
    -- Delete linked calendar events
    DELETE FROM events WHERE id IN (
      SELECT event_id FROM chore_calendar_events WHERE chore_id = NEW.id
    );
    -- Delete sync records
    DELETE FROM chore_calendar_events WHERE chore_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update existing calendar event when chore is updated
CREATE OR REPLACE FUNCTION update_calendar_event_from_chore()
RETURNS TRIGGER AS $$
BEGIN
  -- If chore is updated and has calendar sync enabled
  IF NEW.calendar_sync = TRUE AND NEW.due_date IS NOT NULL THEN
    -- Update existing calendar event
    UPDATE events SET
      title = '🧹 ' || NEW.title,
      description = NEW.description,
      start_time = NEW.due_date::TIMESTAMPTZ,
      end_time = (NEW.due_date::TIMESTAMPTZ + INTERVAL '2 hours'),
      updated_at = NOW()
    WHERE id = (
      SELECT event_id FROM chore_calendar_events WHERE chore_id = NEW.id LIMIT 1
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic calendar sync
CREATE TRIGGER sync_chore_to_calendar_on_insert
  AFTER INSERT ON chores
  FOR EACH ROW
  EXECUTE FUNCTION sync_chore_to_calendar();

CREATE TRIGGER sync_chore_to_calendar_on_update
  AFTER UPDATE ON chores
  FOR EACH ROW
  EXECUTE FUNCTION sync_chore_to_calendar();

CREATE TRIGGER update_calendar_event_from_chore_trigger
  AFTER UPDATE ON chores
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_event_from_chore();

-- Add Row Level Security (RLS) for chore_calendar_events
ALTER TABLE chore_calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access chore calendar events for chores in their spaces
CREATE POLICY "chore_calendar_events_access" ON chore_calendar_events
  USING (
    chore_id IN (
      SELECT c.id FROM chores c
      JOIN space_members sm ON c.space_id = sm.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON COLUMN users.show_chores_on_calendar IS 'User preference: Display chores with due dates on calendar';
COMMENT ON COLUMN users.calendar_chore_filter IS 'JSON filter for which chore categories/frequencies to show on calendar';
COMMENT ON COLUMN chores.calendar_sync IS 'Whether this chore should sync to calendar as events';
COMMENT ON TABLE chore_calendar_events IS 'Sync records between chores and calendar events';

-- Add constraint to ensure valid calendar_chore_filter structure
ALTER TABLE users ADD CONSTRAINT users_calendar_chore_filter_check
  CHECK (calendar_chore_filter ? 'categories' AND calendar_chore_filter ? 'frequencies');