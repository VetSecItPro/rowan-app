-- Fix meal scheduled_date timezone issues
-- Change scheduled_date from TIMESTAMPTZ to DATE to avoid timezone conversion problems

-- Meals scheduled for "Dec 3rd" in user's local time were being stored as UTC timestamps,
-- causing them to appear on "Dec 2nd" when viewed from different timezones.
-- Using DATE type ensures dates are stored and displayed consistently regardless of timezone.

ALTER TABLE meals
  ALTER COLUMN scheduled_date TYPE DATE USING scheduled_date::DATE;

-- Add comment explaining the column type
COMMENT ON COLUMN meals.scheduled_date IS 'Date when the meal is scheduled (DATE type to avoid timezone conversion)';
