-- Create habits table for tracking user habits
CREATE TABLE IF NOT EXISTS habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  frequency_type VARCHAR(20) NOT NULL CHECK (frequency_type IN ('daily', 'weekdays', 'weekends', 'weekly', 'biweekly', 'monthly', 'custom')),
  frequency_value INTEGER DEFAULT 1,
  target_count INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create habit entries table for tracking daily habit completions
CREATE TABLE IF NOT EXISTS habit_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  completed_count INTEGER DEFAULT 1,
  target_count INTEGER NOT NULL,
  completion_percentage INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(habit_id, user_id, completed_date)
);

-- Create habit streaks table for tracking streaks
CREATE TABLE IF NOT EXISTS habit_streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_completed_date DATE,
  streak_start_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(habit_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_habits_space_id ON habits(space_id);
CREATE INDEX IF NOT EXISTS idx_habits_created_by ON habits(created_by);
CREATE INDEX IF NOT EXISTS idx_habits_category ON habits(category);
CREATE INDEX IF NOT EXISTS idx_habits_is_active ON habits(is_active);

CREATE INDEX IF NOT EXISTS idx_habit_entries_habit_id ON habit_entries(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_entries_user_id ON habit_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_entries_completed_date ON habit_entries(completed_date);

CREATE INDEX IF NOT EXISTS idx_habit_streaks_habit_id ON habit_streaks(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_streaks_user_id ON habit_streaks(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_streaks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for habits
CREATE POLICY "Space members can view habits" ON habits
FOR SELECT USING (
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Space members can create habits" ON habits
FOR INSERT WITH CHECK (
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  ) AND created_by = auth.uid()
);

CREATE POLICY "Habit creators can update their habits" ON habits
FOR UPDATE USING (
  created_by = auth.uid() AND
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Habit creators can delete their habits" ON habits
FOR DELETE USING (
  created_by = auth.uid() AND
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  )
);

-- Create RLS policies for habit_entries
CREATE POLICY "Users can view their habit entries" ON habit_entries
FOR SELECT USING (
  user_id = auth.uid() AND
  habit_id IN (
    SELECT id FROM habits WHERE space_id IN (
      SELECT space_id FROM space_members
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create their habit entries" ON habit_entries
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  habit_id IN (
    SELECT id FROM habits WHERE space_id IN (
      SELECT space_id FROM space_members
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their habit entries" ON habit_entries
FOR UPDATE USING (
  user_id = auth.uid() AND
  habit_id IN (
    SELECT id FROM habits WHERE space_id IN (
      SELECT space_id FROM space_members
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete their habit entries" ON habit_entries
FOR DELETE USING (
  user_id = auth.uid() AND
  habit_id IN (
    SELECT id FROM habits WHERE space_id IN (
      SELECT space_id FROM space_members
      WHERE user_id = auth.uid()
    )
  )
);

-- Create RLS policies for habit_streaks
CREATE POLICY "Users can view their habit streaks" ON habit_streaks
FOR SELECT USING (
  user_id = auth.uid() AND
  habit_id IN (
    SELECT id FROM habits WHERE space_id IN (
      SELECT space_id FROM space_members
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create their habit streaks" ON habit_streaks
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  habit_id IN (
    SELECT id FROM habits WHERE space_id IN (
      SELECT space_id FROM space_members
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their habit streaks" ON habit_streaks
FOR UPDATE USING (
  user_id = auth.uid() AND
  habit_id IN (
    SELECT id FROM habits WHERE space_id IN (
      SELECT space_id FROM space_members
      WHERE user_id = auth.uid()
    )
  )
);

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON habits
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_habit_entries_updated_at BEFORE UPDATE ON habit_entries
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_habit_streaks_updated_at BEFORE UPDATE ON habit_streaks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE habits IS 'Stores user-defined habits with frequency and target settings';
COMMENT ON TABLE habit_entries IS 'Tracks daily habit completions and progress';
COMMENT ON TABLE habit_streaks IS 'Tracks current and longest streaks for habits';