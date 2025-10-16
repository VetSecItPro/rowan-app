-- Create bills table for tracking recurring and one-time bills
-- Part of Phase 1: Bill Management & Payment Reminders feature

CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

  -- Bill details
  name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category TEXT,
  payee TEXT,
  notes TEXT,

  -- Due date and frequency
  due_date DATE NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('one-time', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'semi-annual', 'annual')),

  -- Payment tracking
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'paid', 'overdue', 'cancelled')),
  auto_pay BOOLEAN DEFAULT false,
  last_paid_date DATE,
  next_due_date DATE,

  -- Links
  linked_expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  linked_calendar_event_id UUID REFERENCES events(id) ON DELETE SET NULL,

  -- Reminders
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_days_before INTEGER DEFAULT 3 CHECK (reminder_days_before >= 0 AND reminder_days_before <= 30),
  last_reminder_sent_at TIMESTAMPTZ,

  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_bills_space_id ON bills(space_id);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date);
CREATE INDEX IF NOT EXISTS idx_bills_next_due_date ON bills(next_due_date);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_frequency ON bills(frequency);
CREATE INDEX IF NOT EXISTS idx_bills_space_status ON bills(space_id, status);

-- Enable RLS
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Space members can access bills
CREATE POLICY "Space members can view bills"
  ON bills
  FOR SELECT
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Space members can create bills"
  ON bills
  FOR INSERT
  WITH CHECK (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Space members can update bills"
  ON bills
  FOR UPDATE
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Space members can delete bills"
  ON bills
  FOR DELETE
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

-- Function to calculate next due date based on frequency
CREATE OR REPLACE FUNCTION calculate_next_due_date(
  current_due_date DATE,
  bill_frequency TEXT
) RETURNS DATE AS $$
BEGIN
  RETURN CASE bill_frequency
    WHEN 'one-time' THEN NULL
    WHEN 'weekly' THEN current_due_date + INTERVAL '1 week'
    WHEN 'bi-weekly' THEN current_due_date + INTERVAL '2 weeks'
    WHEN 'monthly' THEN current_due_date + INTERVAL '1 month'
    WHEN 'quarterly' THEN current_due_date + INTERVAL '3 months'
    WHEN 'semi-annual' THEN current_due_date + INTERVAL '6 months'
    WHEN 'annual' THEN current_due_date + INTERVAL '1 year'
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to automatically update next_due_date on insert
CREATE OR REPLACE FUNCTION set_initial_next_due_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Set next_due_date based on frequency
  IF NEW.frequency != 'one-time' THEN
    NEW.next_due_date := calculate_next_due_date(NEW.due_date, NEW.frequency);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_set_initial_next_due_date
  BEFORE INSERT ON bills
  FOR EACH ROW
  EXECUTE FUNCTION set_initial_next_due_date();

-- Function to automatically mark bills as overdue
CREATE OR REPLACE FUNCTION mark_bills_overdue()
RETURNS void AS $$
BEGIN
  UPDATE bills
  SET status = 'overdue'
  WHERE status = 'scheduled'
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bills_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bills_updated_at
  BEFORE UPDATE ON bills
  FOR EACH ROW
  EXECUTE FUNCTION update_bills_updated_at();

-- Grant permissions
GRANT ALL ON bills TO authenticated;
GRANT ALL ON bills TO service_role;

-- Add helpful comments
COMMENT ON TABLE bills IS 'Tracks recurring and one-time bills with payment status and reminders';
COMMENT ON COLUMN bills.frequency IS 'How often the bill recurs: one-time, weekly, bi-weekly, monthly, quarterly, semi-annual, annual';
COMMENT ON COLUMN bills.status IS 'Current payment status: scheduled (upcoming), paid, overdue, cancelled';
COMMENT ON COLUMN bills.next_due_date IS 'Automatically calculated next due date for recurring bills';
COMMENT ON COLUMN bills.linked_expense_id IS 'Links to expense record when bill is paid';
COMMENT ON COLUMN bills.linked_calendar_event_id IS 'Links to calendar event for due date reminder';
