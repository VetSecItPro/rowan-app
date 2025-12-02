-- =============================================
-- CREATE MISSING TABLES
-- Date: December 2, 2025
-- Purpose: Create calendar_events and daily_check_ins tables
-- =============================================

-- CREATE calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  location TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CREATE daily_check_ins table
CREATE TABLE IF NOT EXISTS daily_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood TEXT CHECK (mood IN ('great', 'good', 'okay', 'bad', 'terrible')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_check_ins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_events
CREATE POLICY calendar_events_select ON calendar_events FOR SELECT TO authenticated
  USING (space_id IN (
    SELECT space_id FROM space_members WHERE user_id = auth.uid()
  ));

CREATE POLICY calendar_events_insert ON calendar_events FOR INSERT TO authenticated
  WITH CHECK (
    space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY calendar_events_update ON calendar_events FOR UPDATE TO authenticated
  USING (space_id IN (
    SELECT space_id FROM space_members WHERE user_id = auth.uid()
  ));

CREATE POLICY calendar_events_delete ON calendar_events FOR DELETE TO authenticated
  USING (
    space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

-- RLS Policies for daily_check_ins
CREATE POLICY daily_check_ins_select ON daily_check_ins FOR SELECT TO authenticated
  USING (space_id IN (
    SELECT space_id FROM space_members WHERE user_id = auth.uid()
  ));

CREATE POLICY daily_check_ins_insert ON daily_check_ins FOR INSERT TO authenticated
  WITH CHECK (
    space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY daily_check_ins_update ON daily_check_ins FOR UPDATE TO authenticated
  USING (
    space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY daily_check_ins_delete ON daily_check_ins FOR DELETE TO authenticated
  USING (
    space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
    AND user_id = auth.uid()
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_space_id ON calendar_events(space_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);

CREATE INDEX IF NOT EXISTS idx_daily_check_ins_space_id ON daily_check_ins(space_id);
CREATE INDEX IF NOT EXISTS idx_daily_check_ins_user_id ON daily_check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_check_ins_created_at ON daily_check_ins(created_at);
