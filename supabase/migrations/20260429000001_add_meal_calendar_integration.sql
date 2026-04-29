-- Migration: Sync planned meals to calendar events.
-- Date: 2026-04-29
-- Phase 7.1 of consumer-wow backlog.
--
-- Pattern: mirrors the existing chore↔calendar integration in
-- 20251026180000_add_chore_calendar_integration.sql. A separate link table
-- (meal_calendar_events) joins meals to events so calendar_events itself
-- doesn't accumulate per-feature FKs. Triggers keep the two in sync on
-- INSERT/UPDATE/DELETE so the application layer doesn't have to.
--
-- Improvements over the chore pattern:
-- - Explicit BEFORE DELETE trigger on meals removes the linked event
--   (the chore version leaves orphaned events when a chore row is deleted).

-- =====================================================================
-- 1. User preference: show meals on calendar
-- =====================================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS show_meals_on_calendar BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN users.show_meals_on_calendar IS
  'User preference: display planned meals on the calendar view';

-- =====================================================================
-- 2. Per-meal sync flag
-- =====================================================================
ALTER TABLE meals
  ADD COLUMN IF NOT EXISTS calendar_sync BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN meals.calendar_sync IS
  'Whether this meal should sync to calendar as an event (default TRUE)';

-- =====================================================================
-- 3. Link table: meal ↔ event
-- =====================================================================
CREATE TABLE IF NOT EXISTS meal_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  is_synced BOOLEAN DEFAULT FALSE,
  sync_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meal_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_meal_calendar_events_meal
  ON meal_calendar_events(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_calendar_events_event
  ON meal_calendar_events(event_id);

COMMENT ON TABLE meal_calendar_events IS
  'Sync records linking meals to calendar events (Phase 7.1)';

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_meal_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meal_calendar_events_updated_at_trigger
  BEFORE UPDATE ON meal_calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_meal_calendar_events_updated_at();

-- =====================================================================
-- 4. Helpers — meal_type → time-of-day, duration, emoji, title
-- =====================================================================
CREATE OR REPLACE FUNCTION meal_type_default_time(p_meal_type TEXT)
RETURNS INTERVAL AS $$
BEGIN
  CASE p_meal_type
    WHEN 'breakfast' THEN RETURN INTERVAL '8 hours';
    WHEN 'lunch'     THEN RETURN INTERVAL '12 hours';
    WHEN 'dinner'    THEN RETURN INTERVAL '18 hours';
    WHEN 'snack'     THEN RETURN INTERVAL '15 hours';
    ELSE                  RETURN INTERVAL '12 hours';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION meal_type_duration(p_meal_type TEXT)
RETURNS INTERVAL AS $$
BEGIN
  CASE p_meal_type
    WHEN 'breakfast' THEN RETURN INTERVAL '30 minutes';
    WHEN 'lunch'     THEN RETURN INTERVAL '30 minutes';
    WHEN 'dinner'    THEN RETURN INTERVAL '60 minutes';
    WHEN 'snack'     THEN RETURN INTERVAL '15 minutes';
    ELSE                  RETURN INTERVAL '30 minutes';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION meal_type_emoji(p_meal_type TEXT)
RETURNS TEXT AS $$
BEGIN
  CASE p_meal_type
    WHEN 'breakfast' THEN RETURN '🍳';
    WHEN 'lunch'     THEN RETURN '🥗';
    WHEN 'dinner'    THEN RETURN '🍽️';
    WHEN 'snack'     THEN RETURN '🍎';
    ELSE                  RETURN '🍴';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION meal_event_title(p_meal_type TEXT, p_meal_name TEXT, p_recipe_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN meal_type_emoji(p_meal_type) || ' ' ||
    INITCAP(p_meal_type) || ': ' ||
    COALESCE(NULLIF(p_meal_name, ''), p_recipe_name, 'Untitled meal');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================================
-- 5. Sync triggers — INSERT, UPDATE, DELETE
-- =====================================================================

-- Create the linked event when a meal is inserted (or sync toggled on).
-- Delete the linked event when sync is toggled off.
CREATE OR REPLACE FUNCTION sync_meal_to_calendar()
RETURNS TRIGGER AS $$
DECLARE
  v_new_event_id UUID;
  v_recipe_name  TEXT;
  v_event_start  TIMESTAMPTZ;
  v_event_end    TIMESTAMPTZ;
BEGIN
  IF NEW.calendar_sync = TRUE AND NEW.scheduled_date IS NOT NULL THEN
    -- Skip if a sync record already exists (handled by the update trigger instead)
    IF NOT EXISTS (SELECT 1 FROM meal_calendar_events WHERE meal_id = NEW.id) THEN
      SELECT name INTO v_recipe_name FROM recipes WHERE id = NEW.recipe_id;
      v_event_start := DATE_TRUNC('day', NEW.scheduled_date) + meal_type_default_time(NEW.meal_type);
      v_event_end   := v_event_start + meal_type_duration(NEW.meal_type);

      INSERT INTO events (
        space_id, title, description,
        event_type, start_time, end_time,
        category, status, is_recurring,
        assigned_to, created_by
      )
      VALUES (
        NEW.space_id,
        meal_event_title(NEW.meal_type, NEW.name, v_recipe_name),
        NEW.notes,
        'meal',
        v_event_start,
        v_event_end,
        'family',
        'not-started',
        FALSE,
        NEW.assigned_to,
        NEW.created_by
      )
      RETURNING id INTO v_new_event_id;

      INSERT INTO meal_calendar_events (meal_id, event_id, is_synced, sync_enabled)
      VALUES (NEW.id, v_new_event_id, TRUE, TRUE);
    END IF;
  ELSIF NEW.calendar_sync = FALSE THEN
    -- Sync toggled off — remove the linked event and join row.
    DELETE FROM events WHERE id IN (
      SELECT event_id FROM meal_calendar_events WHERE meal_id = NEW.id
    );
    DELETE FROM meal_calendar_events WHERE meal_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the linked event's content when the meal changes.
CREATE OR REPLACE FUNCTION update_calendar_event_from_meal()
RETURNS TRIGGER AS $$
DECLARE
  v_recipe_name TEXT;
  v_event_start TIMESTAMPTZ;
  v_event_end   TIMESTAMPTZ;
BEGIN
  IF NEW.calendar_sync = TRUE AND NEW.scheduled_date IS NOT NULL THEN
    SELECT name INTO v_recipe_name FROM recipes WHERE id = NEW.recipe_id;
    v_event_start := DATE_TRUNC('day', NEW.scheduled_date) + meal_type_default_time(NEW.meal_type);
    v_event_end   := v_event_start + meal_type_duration(NEW.meal_type);

    UPDATE events SET
      title = meal_event_title(NEW.meal_type, NEW.name, v_recipe_name),
      description = NEW.notes,
      start_time = v_event_start,
      end_time = v_event_end,
      assigned_to = NEW.assigned_to,
      updated_at = NOW()
    WHERE id = (
      SELECT event_id FROM meal_calendar_events WHERE meal_id = NEW.id LIMIT 1
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cascade meal deletion to the linked event.
-- (FK ON DELETE CASCADE removes the join row but leaves the event orphaned.
--  This trigger handles the event side explicitly.)
CREATE OR REPLACE FUNCTION delete_calendar_event_for_meal()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM events WHERE id IN (
    SELECT event_id FROM meal_calendar_events WHERE meal_id = OLD.id
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_meal_to_calendar_on_insert
  AFTER INSERT ON meals
  FOR EACH ROW
  EXECUTE FUNCTION sync_meal_to_calendar();

CREATE TRIGGER sync_meal_to_calendar_on_update
  AFTER UPDATE ON meals
  FOR EACH ROW
  EXECUTE FUNCTION sync_meal_to_calendar();

CREATE TRIGGER update_calendar_event_from_meal_trigger
  AFTER UPDATE ON meals
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_event_from_meal();

CREATE TRIGGER delete_calendar_event_for_meal_trigger
  BEFORE DELETE ON meals
  FOR EACH ROW
  EXECUTE FUNCTION delete_calendar_event_for_meal();

-- =====================================================================
-- 6. RLS
-- =====================================================================
ALTER TABLE meal_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meal_calendar_events_access" ON meal_calendar_events
  USING (
    meal_id IN (
      SELECT m.id FROM meals m
      JOIN space_members sm ON m.space_id = sm.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- =====================================================================
-- 7. Backfill — sync any existing meals that don't yet have an event.
-- =====================================================================
-- This makes the migration idempotent for already-planned meals: every
-- meal with calendar_sync = TRUE (the new default) and a scheduled_date
-- gets an event the next time the trigger fires. Force the trigger to run
-- once per row by issuing a no-op UPDATE.
UPDATE meals SET calendar_sync = calendar_sync WHERE calendar_sync = TRUE;
