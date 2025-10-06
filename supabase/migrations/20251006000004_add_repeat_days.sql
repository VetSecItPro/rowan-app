-- Add repeat_days to store specific days for weekly/monthly repeats
-- For weekly: stores day indices [0-6] where 0=Sunday, 6=Saturday
-- For monthly: stores day numbers [1-31]
ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS repeat_days JSONB DEFAULT '[]';
