-- Add skip tracking fields for guided tours
-- These fields track when users explicitly skip a guided flow

ALTER TABLE user_progress
ADD COLUMN IF NOT EXISTS skipped_task_guide BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS skipped_event_guide BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS skipped_reminder_guide BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS skipped_message_guide BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS skipped_shopping_guide BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS skipped_meal_guide BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS skipped_household_guide BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS skipped_goal_guide BOOLEAN DEFAULT FALSE;

-- Add comment explaining the purpose
COMMENT ON COLUMN user_progress.skipped_task_guide IS 'True if user clicked "Skip for now" on task guided flow';
COMMENT ON COLUMN user_progress.skipped_event_guide IS 'True if user clicked "Skip for now" on event guided flow';
COMMENT ON COLUMN user_progress.skipped_reminder_guide IS 'True if user clicked "Skip for now" on reminder guided flow';
COMMENT ON COLUMN user_progress.skipped_message_guide IS 'True if user clicked "Skip for now" on message guided flow';
COMMENT ON COLUMN user_progress.skipped_shopping_guide IS 'True if user clicked "Skip for now" on shopping guided flow';
COMMENT ON COLUMN user_progress.skipped_meal_guide IS 'True if user clicked "Skip for now" on meal guided flow';
COMMENT ON COLUMN user_progress.skipped_household_guide IS 'True if user clicked "Skip for now" on household guided flow';
COMMENT ON COLUMN user_progress.skipped_goal_guide IS 'True if user clicked "Skip for now" on goal guided flow';
