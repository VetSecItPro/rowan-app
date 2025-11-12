-- Remove guided creation fields from user_progress table
-- This migration cleans up unused guided creation functionality

-- Drop guided flow completion tracking columns
ALTER TABLE user_progress
DROP COLUMN IF EXISTS first_task_created,
DROP COLUMN IF EXISTS first_event_created,
DROP COLUMN IF EXISTS first_reminder_created,
DROP COLUMN IF EXISTS first_message_sent,
DROP COLUMN IF EXISTS first_shopping_item_added,
DROP COLUMN IF EXISTS first_meal_planned,
DROP COLUMN IF EXISTS first_household_task_created,
DROP COLUMN IF EXISTS first_goal_set;

-- Drop guided flow skip tracking columns
ALTER TABLE user_progress
DROP COLUMN IF EXISTS skipped_task_guide,
DROP COLUMN IF EXISTS skipped_event_guide,
DROP COLUMN IF EXISTS skipped_reminder_guide,
DROP COLUMN IF EXISTS skipped_message_guide,
DROP COLUMN IF EXISTS skipped_shopping_guide,
DROP COLUMN IF EXISTS skipped_meal_guide,
DROP COLUMN IF EXISTS skipped_household_guide,
DROP COLUMN IF EXISTS skipped_goal_guide;