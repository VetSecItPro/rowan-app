-- =============================================
-- REMINDERS EFFICIENCY: QUICK ACTIONS & TEMPLATES
-- =============================================
-- This migration creates the template system for reminders,
-- allowing users to save and reuse common reminder configurations.

-- Create reminder_templates table
CREATE TABLE IF NOT EXISTS reminder_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE, -- Nullable for system templates
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '🔔',
  category TEXT DEFAULT 'personal',
  priority TEXT DEFAULT 'medium',
  template_title TEXT NOT NULL,
  template_description TEXT,
  reminder_type TEXT DEFAULT 'time',
  default_time_offset_minutes INTEGER, -- e.g., 60 = 1 hour from now
  default_location TEXT,
  repeat_pattern TEXT,
  repeat_days INTEGER[],
  is_system_template BOOLEAN DEFAULT FALSE, -- System templates available to all
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_category CHECK (category IN ('bills', 'health', 'work', 'personal', 'household')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT valid_reminder_type CHECK (reminder_type IN ('time', 'location'))
);

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_reminder_templates_space_id
  ON reminder_templates(space_id);

CREATE INDEX IF NOT EXISTS idx_reminder_templates_created_by
  ON reminder_templates(created_by);

CREATE INDEX IF NOT EXISTS idx_reminder_templates_is_system
  ON reminder_templates(is_system_template);

CREATE INDEX IF NOT EXISTS idx_reminder_templates_usage_count
  ON reminder_templates(usage_count DESC);

-- Composite index for getting templates for a space
CREATE INDEX IF NOT EXISTS idx_reminder_templates_space_usage
  ON reminder_templates(space_id, usage_count DESC);

-- Enable RLS
ALTER TABLE reminder_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view templates in their spaces + system templates
CREATE POLICY "Users can view space and system templates"
  ON reminder_templates FOR SELECT
  USING (
    is_system_template = true OR
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can create templates in their spaces
CREATE POLICY "Users can create templates in their spaces"
  ON reminder_templates FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    is_system_template = false AND
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update their own templates (not system templates)
CREATE POLICY "Users can update their own templates"
  ON reminder_templates FOR UPDATE
  USING (created_by = auth.uid() AND is_system_template = false)
  WITH CHECK (created_by = auth.uid() AND is_system_template = false);

-- RLS Policy: Users can delete their own templates (not system templates)
CREATE POLICY "Users can delete their own templates"
  ON reminder_templates FOR DELETE
  USING (created_by = auth.uid() AND is_system_template = false);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reminder_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_reminder_template_timestamp_trigger ON reminder_templates;
CREATE TRIGGER update_reminder_template_timestamp_trigger
  BEFORE UPDATE ON reminder_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_reminder_template_timestamp();

-- Function to increment template usage count
CREATE OR REPLACE FUNCTION increment_template_usage(p_template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE reminder_templates
  SET usage_count = usage_count + 1
  WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert system templates (available to all users)
INSERT INTO reminder_templates (
  name,
  description,
  emoji,
  category,
  priority,
  template_title,
  template_description,
  reminder_type,
  default_time_offset_minutes,
  is_system_template
) VALUES
  (
    'Pay Bill',
    'Reminder to pay a recurring bill',
    '💰',
    'bills',
    'high',
    'Pay [bill name]',
    'Due date: [date]. Amount: $[amount]. Account: [account].',
    'time',
    1440, -- 1 day before
    true
  ),
  (
    'Doctor Appointment',
    'Medical appointment reminder',
    '💊',
    'health',
    'medium',
    'Doctor appointment: [specialty]',
    'Location: [clinic/hospital]. Phone: [phone]. Bring: [items].',
    'time',
    1440, -- 1 day before
    true
  ),
  (
    'Take Medication',
    'Daily medication reminder',
    '💊',
    'health',
    'high',
    'Take [medication name]',
    'Dosage: [dosage]. Notes: [notes].',
    'time',
    0, -- At specified time
    true
  ),
  (
    'Call Someone',
    'Reminder to make a phone call',
    '📞',
    'personal',
    'medium',
    'Call [person]',
    'About: [topic]. Phone: [phone number].',
    'time',
    60, -- 1 hour from now
    true
  ),
  (
    'Buy Groceries',
    'Grocery shopping reminder',
    '🛒',
    'household',
    'medium',
    'Buy groceries',
    'Items needed: [items]. Store: [store name].',
    'location',
    NULL,
    true
  ),
  (
    'Household Chore',
    'General household task',
    '🏠',
    'household',
    'low',
    '[chore name]',
    'Details: [details].',
    'time',
    60,
    true
  ),
  (
    'Work Meeting',
    'Work meeting reminder',
    '💼',
    'work',
    'high',
    'Meeting: [meeting name]',
    'Attendees: [attendees]. Location: [location]. Agenda: [agenda].',
    'time',
    30, -- 30 minutes before
    true
  ),
  (
    'Submit Work',
    'Work deadline reminder',
    '📋',
    'work',
    'urgent',
    'Submit [project/report name]',
    'Details: [details]. To: [recipient].',
    'time',
    1440, -- 1 day before
    true
  )
ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE reminder_templates IS 'Reusable reminder templates for quick creation';
COMMENT ON FUNCTION increment_template_usage IS 'Increments usage count when template is used';
COMMENT ON COLUMN reminder_templates.is_system_template IS 'System templates are available to all users';
COMMENT ON COLUMN reminder_templates.usage_count IS 'Tracks how often template is used for popularity sorting';

-- Grant usage
GRANT SELECT, INSERT, UPDATE, DELETE ON reminder_templates TO authenticated;
