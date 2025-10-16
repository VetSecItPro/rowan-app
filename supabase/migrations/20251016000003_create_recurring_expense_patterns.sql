-- =============================================
-- CREATE RECURRING EXPENSE PATTERNS TABLE
-- Date: October 16, 2025
-- Purpose: Track detected recurring expense patterns for auto-suggestions
-- =============================================

-- Create enum for recurrence frequency
CREATE TYPE recurrence_frequency AS ENUM (
  'daily',
  'weekly',
  'bi-weekly',
  'monthly',
  'bi-monthly',
  'quarterly',
  'semi-annual',
  'annual'
);

-- Create recurring expense patterns table
CREATE TABLE IF NOT EXISTS recurring_expense_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

  -- Pattern identification
  pattern_name TEXT NOT NULL, -- e.g., "Netflix Subscription", "Weekly Groceries"
  merchant_name TEXT, -- Common merchant name across instances
  category TEXT, -- Common category

  -- Pattern details
  frequency recurrence_frequency NOT NULL,
  average_amount DECIMAL(10, 2) NOT NULL,
  amount_variance DECIMAL(10, 2) DEFAULT 0, -- How much the amount varies

  -- Pattern confidence
  confidence_score DECIMAL(5, 2) NOT NULL, -- 0-100 score
  detection_method TEXT, -- 'amount_and_date', 'merchant_and_date', 'ml_prediction'

  -- Historical data
  first_occurrence DATE NOT NULL,
  last_occurrence DATE NOT NULL,
  occurrence_count INTEGER DEFAULT 1,
  expense_ids UUID[], -- Array of expense IDs that match this pattern

  -- Next occurrence prediction
  next_expected_date DATE,
  next_expected_amount DECIMAL(10, 2),

  -- User interaction
  user_confirmed BOOLEAN DEFAULT false,
  user_ignored BOOLEAN DEFAULT false,
  auto_created BOOLEAN DEFAULT true, -- Whether this was auto-detected or user-created

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_recurring_patterns_space ON recurring_expense_patterns(space_id);
CREATE INDEX idx_recurring_patterns_next_date ON recurring_expense_patterns(next_expected_date) WHERE user_ignored = false;
CREATE INDEX idx_recurring_patterns_confidence ON recurring_expense_patterns(confidence_score DESC);
CREATE INDEX idx_recurring_patterns_merchant ON recurring_expense_patterns(merchant_name);

-- Enable RLS
ALTER TABLE recurring_expense_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access patterns from their spaces
CREATE POLICY "Users can view patterns from their spaces"
ON recurring_expense_patterns FOR SELECT TO authenticated
USING (
  space_id IN (
    SELECT spaces.id FROM spaces
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert patterns in their spaces"
ON recurring_expense_patterns FOR INSERT TO authenticated
WITH CHECK (
  space_id IN (
    SELECT spaces.id FROM spaces
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update patterns in their spaces"
ON recurring_expense_patterns FOR UPDATE TO authenticated
USING (
  space_id IN (
    SELECT spaces.id FROM spaces
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete patterns in their spaces"
ON recurring_expense_patterns FOR DELETE TO authenticated
USING (
  space_id IN (
    SELECT spaces.id FROM spaces
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_recurring_patterns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recurring_patterns_updated_at
BEFORE UPDATE ON recurring_expense_patterns
FOR EACH ROW
EXECUTE FUNCTION update_recurring_patterns_updated_at();

-- Add comments for documentation
COMMENT ON TABLE recurring_expense_patterns IS 'Stores detected recurring expense patterns for auto-suggestions and duplicate detection';
COMMENT ON COLUMN recurring_expense_patterns.frequency IS 'How often this expense recurs';
COMMENT ON COLUMN recurring_expense_patterns.confidence_score IS '0-100 confidence that this is a valid recurring pattern';
COMMENT ON COLUMN recurring_expense_patterns.detection_method IS 'Method used to detect this pattern';
COMMENT ON COLUMN recurring_expense_patterns.expense_ids IS 'Array of expense IDs that match this pattern';
COMMENT ON COLUMN recurring_expense_patterns.user_confirmed IS 'Whether user has confirmed this is a valid recurring expense';
COMMENT ON COLUMN recurring_expense_patterns.user_ignored IS 'Whether user has marked this pattern to be ignored';
