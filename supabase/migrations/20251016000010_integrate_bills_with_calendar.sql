-- =============================================
-- INTEGRATE BILLS WITH CALENDAR
-- =============================================
-- Links recurring bills to calendar events for unified due date management

-- ==========================================
-- 1. ADD EXPENSE_ID TO EVENTS TABLE
-- ==========================================
-- Allow events to be linked to expenses (bills)
ALTER TABLE events
ADD COLUMN IF NOT EXISTS expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_events_expense_id ON events(expense_id);

-- ==========================================
-- 2. ADD EVENT_ID AND RECURRING_FREQUENCY TO EXPENSES TABLE
-- ==========================================
-- Allow expenses to reference their calendar events and store recurrence pattern
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS recurring_frequency TEXT,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_expenses_event_id ON expenses(event_id);

-- Update existing recurring expenses to use is_recurring column
UPDATE expenses SET is_recurring = recurring WHERE recurring IS NOT NULL;

-- ==========================================
-- 3. FUNCTION: Create calendar event for recurring bill
-- ==========================================
CREATE OR REPLACE FUNCTION create_bill_calendar_event(p_expense_id UUID)
RETURNS UUID AS $$
DECLARE
  v_expense RECORD;
  v_event_id UUID;
  v_event_title TEXT;
  v_event_description TEXT;
BEGIN
  -- Get expense details
  SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id;

  IF NOT FOUND OR (NOT COALESCE(v_expense.is_recurring, FALSE) AND NOT COALESCE(v_expense.recurring, FALSE)) THEN
    RETURN NULL;
  END IF;

  -- Build event title and description
  v_event_title := '💰 Bill Due: ' || v_expense.description;
  v_event_description := 'Amount: $' || v_expense.amount || '\n' ||
                         'Category: ' || COALESCE(v_expense.category, 'Uncategorized') || '\n' ||
                         'Frequency: ' || COALESCE(v_expense.recurring_frequency, 'Unknown');

  IF v_expense.payment_method IS NOT NULL THEN
    v_event_description := v_event_description || '\nPayment Method: ' || v_expense.payment_method;
  END IF;

  -- Create calendar event
  INSERT INTO events (
    space_id,
    title,
    description,
    event_type,
    start_time,
    end_time,
    is_recurring,
    recurrence_pattern,
    expense_id,
    created_by
  )
  VALUES (
    v_expense.space_id,
    v_event_title,
    v_event_description,
    'bill_due',
    v_expense.date::TIMESTAMPTZ,
    v_expense.date::TIMESTAMPTZ + INTERVAL '1 hour',
    TRUE,
    v_expense.recurring_frequency,
    p_expense_id,
    v_expense.created_by
  )
  RETURNING id INTO v_event_id;

  -- Update expense with event_id
  UPDATE expenses
  SET event_id = v_event_id
  WHERE id = p_expense_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 4. TRIGGER: Auto-create calendar event for recurring bills
-- ==========================================
CREATE OR REPLACE FUNCTION auto_create_bill_calendar_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create event for recurring expenses
  IF (NEW.is_recurring = TRUE OR NEW.recurring = TRUE) AND NEW.event_id IS NULL THEN
    PERFORM create_bill_calendar_event(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_bill_event_trigger ON expenses;
CREATE TRIGGER auto_create_bill_event_trigger
  AFTER INSERT ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_bill_calendar_event();

-- ==========================================
-- 5. TRIGGER: Update calendar event when bill changes
-- ==========================================
CREATE OR REPLACE FUNCTION update_bill_calendar_event()
RETURNS TRIGGER AS $$
DECLARE
  v_event_title TEXT;
  v_event_description TEXT;
BEGIN
  -- If expense has an associated event, update it
  IF NEW.event_id IS NOT NULL THEN
    -- Build updated event title and description
    v_event_title := '💰 Bill Due: ' || NEW.description;
    v_event_description := 'Amount: $' || NEW.amount || '\n' ||
                           'Category: ' || COALESCE(NEW.category, 'Uncategorized') || '\n' ||
                           'Frequency: ' || COALESCE(NEW.recurring_frequency, 'Unknown');

    IF NEW.payment_method IS NOT NULL THEN
      v_event_description := v_event_description || '\nPayment Method: ' || NEW.payment_method;
    END IF;

    -- Update the associated calendar event
    UPDATE events
    SET
      title = v_event_title,
      description = v_event_description,
      start_time = NEW.date::TIMESTAMPTZ,
      end_time = NEW.date::TIMESTAMPTZ + INTERVAL '1 hour',
      recurrence_pattern = NEW.recurring_frequency,
      is_recurring = NEW.is_recurring
    WHERE id = NEW.event_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bill_event_trigger ON expenses;
CREATE TRIGGER update_bill_event_trigger
  AFTER UPDATE ON expenses
  FOR EACH ROW
  WHEN (OLD.description IS DISTINCT FROM NEW.description OR
        OLD.amount IS DISTINCT FROM NEW.amount OR
        OLD.date IS DISTINCT FROM NEW.date OR
        OLD.recurring_frequency IS DISTINCT FROM NEW.recurring_frequency OR
        OLD.is_recurring IS DISTINCT FROM NEW.is_recurring OR
        OLD.recurring IS DISTINCT FROM NEW.recurring)
  EXECUTE FUNCTION update_bill_calendar_event();

-- ==========================================
-- 6. TRIGGER: Delete calendar event when bill is deleted
-- ==========================================
CREATE OR REPLACE FUNCTION delete_bill_calendar_event()
RETURNS TRIGGER AS $$
BEGIN
  -- If expense has an associated event, delete it
  IF OLD.event_id IS NOT NULL THEN
    DELETE FROM events WHERE id = OLD.event_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS delete_bill_event_trigger ON expenses;
CREATE TRIGGER delete_bill_event_trigger
  BEFORE DELETE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION delete_bill_calendar_event();

-- ==========================================
-- 7. FUNCTION: Get upcoming bills from calendar
-- ==========================================
CREATE OR REPLACE FUNCTION get_upcoming_bills(p_space_id UUID, p_days_ahead INTEGER DEFAULT 30)
RETURNS TABLE (
  event_id UUID,
  expense_id UUID,
  title TEXT,
  amount NUMERIC,
  due_date TIMESTAMPTZ,
  category TEXT,
  payment_method TEXT,
  days_until_due INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id AS event_id,
    ex.id AS expense_id,
    e.title,
    ex.amount,
    e.start_time AS due_date,
    ex.category,
    ex.payment_method,
    EXTRACT(DAY FROM (e.start_time - NOW()))::INTEGER AS days_until_due
  FROM events e
  INNER JOIN expenses ex ON e.expense_id = ex.id
  WHERE e.space_id = p_space_id
    AND e.event_type = 'bill_due'
    AND e.start_time BETWEEN NOW() AND NOW() + (p_days_ahead || ' days')::INTERVAL
  ORDER BY e.start_time ASC;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 8. BACKFILL: Create events for existing recurring bills
-- ==========================================
DO $$
DECLARE
  v_expense RECORD;
BEGIN
  FOR v_expense IN
    SELECT id FROM expenses
    WHERE is_recurring = TRUE
      AND event_id IS NULL
  LOOP
    PERFORM create_bill_calendar_event(v_expense.id);
  END LOOP;
END $$;
