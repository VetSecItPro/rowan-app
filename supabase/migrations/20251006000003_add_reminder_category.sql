-- Add category field to reminders table
ALTER TABLE reminders
  ADD COLUMN category TEXT DEFAULT 'personal' CHECK (category IN ('bills', 'health', 'work', 'personal', 'household'));

-- Add emoji field to reminders table
ALTER TABLE reminders
  ADD COLUMN emoji TEXT DEFAULT '🔔';

-- Add missing fields from service interface
ALTER TABLE reminders
  ADD COLUMN priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

ALTER TABLE reminders
  ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'snoozed'));

ALTER TABLE reminders
  ADD COLUMN snooze_until TIMESTAMPTZ;

ALTER TABLE reminders
  ADD COLUMN repeat_pattern TEXT;

-- Add reminder_time to match service interface (we'll keep remind_at for backwards compatibility)
ALTER TABLE reminders
  ADD COLUMN reminder_time TIMESTAMPTZ;

-- Copy data from remind_at to reminder_time for existing records
UPDATE reminders SET reminder_time = remind_at WHERE reminder_time IS NULL;

-- Rename completed to align with status field
-- Note: We'll keep both for now to avoid data loss
-- The service will use status, UI can migrate gradually

-- Set default category for existing reminders
UPDATE reminders SET category = 'personal' WHERE category IS NULL;
