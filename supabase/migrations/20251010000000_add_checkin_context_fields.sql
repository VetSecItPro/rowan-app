-- Add optional context fields to daily_checkins for smart prompts
-- These fields support the adaptive check-in experience

-- Add highlights field (for positive moods - what went well)
ALTER TABLE daily_checkins
ADD COLUMN IF NOT EXISTS highlights TEXT;

-- Add challenges field (for negative moods - what was difficult)
ALTER TABLE daily_checkins
ADD COLUMN IF NOT EXISTS challenges TEXT;

-- Add gratitude field (for gratitude prompts)
ALTER TABLE daily_checkins
ADD COLUMN IF NOT EXISTS gratitude TEXT;

-- Add comment for table documentation
COMMENT ON COLUMN daily_checkins.highlights IS 'Quick wins or positive moments from the day (shown for great/good moods)';
COMMENT ON COLUMN daily_checkins.challenges IS 'Difficulties or struggles from the day (shown for meh/rough moods)';
COMMENT ON COLUMN daily_checkins.gratitude IS 'What the user is grateful for today (optional gratitude prompt)';

-- No RLS changes needed - existing policies cover these new fields
-- No indexes needed - these are optional text fields for context only
