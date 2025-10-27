-- Migration: Comprehensive fix for shopping trip scheduling schema mismatches
-- Purpose: Add ALL missing columns for BOTH reminders AND events tables
-- Issue: Shopping trip scheduling creates calendar events + reminders, both missing columns
-- Date: 2025-10-27

-- COMPLETE DATA FLOW ANALYSIS:
-- Shopping Trip Scheduling creates:
-- 1. Calendar Event (via calendarService.createEvent)
-- 2. Reminder (via remindersService.createReminder)
-- 3. Links them via shopping integration tables

-- =============================================
-- PART 1: FIX EVENTS TABLE SCHEMA MISMATCH
-- =============================================

-- CreateEventInput expects but events table missing:
-- - category (enum: 'work' | 'personal' | 'family' | 'health' | 'social')
-- - custom_color (string)
-- - timezone (string)

ALTER TABLE events
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'personal'
  CHECK (category IN ('work', 'personal', 'family', 'health', 'social')),
ADD COLUMN IF NOT EXISTS custom_color TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Add indexes for events table
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_timezone ON events(timezone);

-- Update existing events to have proper defaults
UPDATE events
SET
  category = COALESCE(category, 'personal'),
  timezone = COALESCE(timezone, 'UTC')
WHERE category IS NULL OR timezone IS NULL;

-- =============================================
-- PART 2: FIX REMINDERS TABLE SCHEMA MISMATCH
-- =============================================

-- CreateReminderInput expects but reminders table missing:
-- - emoji (string)
-- - category (enum: 'bills' | 'health' | 'work' | 'personal' | 'household')
-- - reminder_type (enum: 'time' | 'location')
-- - location (string)
-- - priority (enum: 'low' | 'medium' | 'high' | 'urgent')
-- - status (enum: 'active' | 'completed' | 'snoozed')
-- - snooze_until (timestamp)
-- - reminder_time (timestamp) - maps to existing remind_at
-- - repeat_days (integer array)

ALTER TABLE reminders
ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '🔔',
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'personal'
  CHECK (category IN ('bills', 'health', 'work', 'personal', 'household')),
ADD COLUMN IF NOT EXISTS reminder_type TEXT DEFAULT 'time'
  CHECK (reminder_type IN ('time', 'location')),
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium'
  CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
  CHECK (status IN ('active', 'completed', 'snoozed')),
ADD COLUMN IF NOT EXISTS snooze_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reminder_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS repeat_days INTEGER[];

-- Add indexes for reminders table
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_priority ON reminders(priority);
CREATE INDEX IF NOT EXISTS idx_reminders_category ON reminders(category);
CREATE INDEX IF NOT EXISTS idx_reminders_reminder_type ON reminders(reminder_type);
CREATE INDEX IF NOT EXISTS idx_reminders_location ON reminders(location) WHERE location IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reminders_reminder_time ON reminders(reminder_time) WHERE reminder_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reminders_snooze_until ON reminders(snooze_until) WHERE snooze_until IS NOT NULL;

-- Update existing reminders to have proper defaults
UPDATE reminders
SET
  emoji = COALESCE(emoji, '🔔'),
  category = COALESCE(category, 'personal'),
  reminder_type = COALESCE(reminder_type, 'time'),
  priority = COALESCE(priority, 'medium'),
  status = CASE
    WHEN completed = true THEN 'completed'
    ELSE COALESCE(status, 'active')
  END,
  reminder_time = COALESCE(reminder_time, remind_at)
WHERE emoji IS NULL OR category IS NULL OR reminder_type IS NULL
   OR priority IS NULL OR status IS NULL OR reminder_time IS NULL;

-- =============================================
-- PART 3: ADD DOCUMENTATION
-- =============================================

-- Events table comments
COMMENT ON COLUMN events.category IS 'Event category: work, personal, family, health, social';
COMMENT ON COLUMN events.custom_color IS 'Custom hex color for calendar display (e.g., #FF5733)';
COMMENT ON COLUMN events.timezone IS 'Event timezone (e.g., America/New_York)';

-- Reminders table comments
COMMENT ON COLUMN reminders.emoji IS 'Emoji icon for the reminder (e.g., 🔔, 🛒, 💊)';
COMMENT ON COLUMN reminders.category IS 'Category: bills, health, work, personal, household';
COMMENT ON COLUMN reminders.reminder_type IS 'Type: time (scheduled) or location (geofenced)';
COMMENT ON COLUMN reminders.location IS 'Location for location-based reminders or context';
COMMENT ON COLUMN reminders.priority IS 'Priority level: low, medium, high, urgent';
COMMENT ON COLUMN reminders.status IS 'Current status: active, completed, snoozed';
COMMENT ON COLUMN reminders.snooze_until IS 'When a snoozed reminder should become active again';
COMMENT ON COLUMN reminders.reminder_time IS 'When the reminder should trigger (new field name)';
COMMENT ON COLUMN reminders.repeat_days IS 'Array of weekday numbers (0=Sunday) for recurring reminders';

-- =============================================
-- PART 4: VERIFICATION
-- =============================================

DO $$
DECLARE
    missing_events_columns TEXT[] := ARRAY[]::TEXT[];
    missing_reminders_columns TEXT[] := ARRAY[]::TEXT[];
    col_name TEXT;
BEGIN
    -- Check events table columns
    FOR col_name IN SELECT unnest(ARRAY['category', 'custom_color', 'timezone']) LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'events' AND column_name = col_name
        ) THEN
            missing_events_columns := array_append(missing_events_columns, col_name);
        END IF;
    END LOOP;

    -- Check reminders table columns
    FOR col_name IN SELECT unnest(ARRAY[
        'emoji', 'category', 'reminder_type', 'location',
        'priority', 'status', 'snooze_until', 'reminder_time', 'repeat_days'
    ]) LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'reminders' AND column_name = col_name
        ) THEN
            missing_reminders_columns := array_append(missing_reminders_columns, col_name);
        END IF;
    END LOOP;

    -- Report results
    IF array_length(missing_events_columns, 1) > 0 THEN
        RAISE EXCEPTION 'FAILED: Missing events columns: %', array_to_string(missing_events_columns, ', ');
    END IF;

    IF array_length(missing_reminders_columns, 1) > 0 THEN
        RAISE EXCEPTION 'FAILED: Missing reminders columns: %', array_to_string(missing_reminders_columns, ', ');
    END IF;

    RAISE NOTICE '🎉 SUCCESS: COMPREHENSIVE SCHEMA FIX COMPLETE';
    RAISE NOTICE '✅ Events table: All CreateEventInput fields supported';
    RAISE NOTICE '✅ Reminders table: All CreateReminderInput fields supported';
    RAISE NOTICE '✅ Shopping trip scheduling: Full data flow now supported';
    RAISE NOTICE '✅ No more schema mismatch errors expected';
END $$;