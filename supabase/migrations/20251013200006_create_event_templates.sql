-- Drop existing table if it exists (with wrong structure)
DROP TABLE IF EXISTS event_templates CASCADE;

-- Create event_templates table
CREATE TABLE event_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Template metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'personal',
  icon VARCHAR(10), -- Emoji icon
  is_system_template BOOLEAN DEFAULT FALSE, -- System templates vs user-created

  -- Template event data (default values for creating events)
  default_duration INTEGER, -- Duration in minutes
  default_location VARCHAR(255),
  default_attendees UUID[], -- Array of user IDs
  default_reminders JSONB, -- Array of reminder settings
  default_color VARCHAR(50),
  default_recurrence JSONB, -- Recurrence pattern if applicable

  -- Usage tracking
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_event_templates_space ON event_templates(space_id);
CREATE INDEX idx_event_templates_category ON event_templates(category);
CREATE INDEX idx_event_templates_system ON event_templates(is_system_template);
CREATE INDEX idx_event_templates_created_by ON event_templates(created_by);

-- Enable RLS
ALTER TABLE event_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view templates in their space"
  ON event_templates FOR SELECT
  USING (
    space_id IN (
      SELECT space_id
      FROM space_members
      WHERE user_id = auth.uid()
    )
    OR is_system_template = TRUE -- Everyone can see system templates
  );

CREATE POLICY "Users can create templates in their space"
  ON event_templates FOR INSERT
  WITH CHECK (
    space_id IN (
      SELECT space_id
      FROM space_members
      WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their own templates"
  ON event_templates FOR UPDATE
  USING (
    created_by = auth.uid()
    AND space_id IN (
      SELECT space_id
      FROM space_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own templates"
  ON event_templates FOR DELETE
  USING (
    created_by = auth.uid()
    AND space_id IN (
      SELECT space_id
      FROM space_members
      WHERE user_id = auth.uid()
    )
  );

-- Note: System templates will be inserted per-space by the application
-- rather than in the migration, since we need valid space_id references

-- Add trigger for updated_at
CREATE TRIGGER update_event_templates_updated_at
  BEFORE UPDATE ON event_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
