-- Bill Integration: Add linked fields for reminders and calendar events
-- This migration enables bills to auto-create linked reminders and calendar events

-- Add linked_bill_id to reminders table (cascade delete when bill is deleted)
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS linked_bill_id UUID REFERENCES bills(id) ON DELETE CASCADE;

-- Add linked_reminder_id to bills table (set null when reminder is deleted)
ALTER TABLE bills ADD COLUMN IF NOT EXISTS linked_reminder_id UUID REFERENCES reminders(id) ON DELETE SET NULL;

-- Add linked_calendar_event_id to bills table (set null when event is deleted)
ALTER TABLE bills ADD COLUMN IF NOT EXISTS linked_calendar_event_id UUID REFERENCES events(id) ON DELETE SET NULL;

-- Add linked_bill_id to events table (cascade delete when bill is deleted)
ALTER TABLE events ADD COLUMN IF NOT EXISTS linked_bill_id UUID REFERENCES bills(id) ON DELETE CASCADE;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_reminders_linked_bill ON reminders(linked_bill_id) WHERE linked_bill_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_linked_bill ON events(linked_bill_id) WHERE linked_bill_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bills_linked_reminder ON bills(linked_reminder_id) WHERE linked_reminder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bills_linked_calendar_event ON bills(linked_calendar_event_id) WHERE linked_calendar_event_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN reminders.linked_bill_id IS 'Foreign key to bills table. When a bill has reminder_enabled, a linked reminder is created.';
COMMENT ON COLUMN events.linked_bill_id IS 'Foreign key to bills table. Bills auto-create calendar events on their due date.';
COMMENT ON COLUMN bills.linked_reminder_id IS 'Foreign key to the auto-created reminder for this bill.';
COMMENT ON COLUMN bills.linked_calendar_event_id IS 'Foreign key to the auto-created calendar event for this bill.';
