-- Add category field to events table with predefined options
ALTER TABLE events
  ADD COLUMN category TEXT DEFAULT 'personal' CHECK (category IN ('work', 'personal', 'family', 'health', 'social'));

-- Update existing events to have default category
UPDATE events SET category = 'personal' WHERE category IS NULL;
