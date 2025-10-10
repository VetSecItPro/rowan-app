-- Create user_progress table to track onboarding completion
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  partnership_id UUID REFERENCES partnerships(id),

  -- Track completion of guided flows
  first_task_created BOOLEAN DEFAULT FALSE,
  first_event_created BOOLEAN DEFAULT FALSE,
  first_reminder_created BOOLEAN DEFAULT FALSE,
  first_message_sent BOOLEAN DEFAULT FALSE,
  first_shopping_item_added BOOLEAN DEFAULT FALSE,
  first_meal_planned BOOLEAN DEFAULT FALSE,
  first_household_task_created BOOLEAN DEFAULT FALSE,
  first_goal_set BOOLEAN DEFAULT FALSE,

  -- Onboarding status
  onboarding_completed BOOLEAN DEFAULT FALSE,
  partnership_setup_completed BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one record per user
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own progress"
ON user_progress FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own progress"
ON user_progress FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own progress"
ON user_progress FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);

-- Create updated_at trigger
CREATE TRIGGER update_user_progress_updated_at
BEFORE UPDATE ON user_progress
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
