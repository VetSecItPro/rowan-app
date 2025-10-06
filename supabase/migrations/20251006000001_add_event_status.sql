-- Add status field to events table for three-state checkbox (not-started, in-progress, completed)
ALTER TABLE events
  ADD COLUMN status TEXT DEFAULT 'not-started' CHECK (status IN ('not-started', 'in-progress', 'completed'));

-- Update existing events to have default status
UPDATE events SET status = 'not-started' WHERE status IS NULL;
