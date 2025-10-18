-- Create Achievement Badges system for gamification
-- This includes badge definitions and user achievements tracking

-- Create achievement_badges table (defines all available badges)
CREATE TABLE achievement_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('goals', 'milestones', 'streaks', 'social', 'special', 'seasonal')),
    icon TEXT NOT NULL, -- Icon name for UI (lucide-react icons)
    color TEXT NOT NULL DEFAULT 'indigo', -- Badge color theme
    criteria JSONB NOT NULL, -- Dynamic criteria for earning the badge
    points INTEGER DEFAULT 10 CHECK (points >= 0), -- Points awarded for earning this badge
    rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
    is_active BOOLEAN DEFAULT true,
    is_secret BOOLEAN DEFAULT false, -- Hidden badges that aren't shown until earned
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique badge names
    CONSTRAINT unique_badge_name UNIQUE (name)
);

-- Create user_achievements table (tracks earned badges)
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES achievement_badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    progress_data JSONB, -- Store progress/context data when badge was earned

    -- Prevent duplicate badge awards per user per space
    CONSTRAINT unique_user_badge_per_space UNIQUE (user_id, space_id, badge_id)
);

-- Create achievement_progress table (tracks progress toward badges)
CREATE TABLE achievement_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES achievement_badges(id) ON DELETE CASCADE,
    current_progress INTEGER DEFAULT 0,
    target_progress INTEGER NOT NULL,
    progress_data JSONB DEFAULT '{}', -- Additional context data
    last_updated TIMESTAMPTZ DEFAULT NOW(),

    -- One progress record per user per badge per space
    CONSTRAINT unique_user_badge_progress UNIQUE (user_id, space_id, badge_id)
);

-- Create indexes for performance
CREATE INDEX idx_achievement_badges_category ON achievement_badges(category);
CREATE INDEX idx_achievement_badges_active ON achievement_badges(is_active);
CREATE INDEX idx_user_achievements_user_space ON user_achievements(user_id, space_id);
CREATE INDEX idx_user_achievements_earned_at ON user_achievements(earned_at);
CREATE INDEX idx_achievement_progress_user_space ON achievement_progress(user_id, space_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_achievement_badges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER achievement_badges_updated_at
    BEFORE UPDATE ON achievement_badges
    FOR EACH ROW
    EXECUTE FUNCTION update_achievement_badges_updated_at();

-- Create trigger for achievement_progress last_updated
CREATE OR REPLACE FUNCTION update_achievement_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER achievement_progress_updated_at
    BEFORE UPDATE ON achievement_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_achievement_progress_updated_at();

-- Row Level Security (RLS)
ALTER TABLE achievement_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for achievement_badges (public read, admin write)
CREATE POLICY "Anyone can view active badges" ON achievement_badges
    FOR SELECT USING (is_active = true);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view achievements in their spaces" ON user_achievements
    FOR SELECT USING (
        space_id IN (
            SELECT space_id FROM space_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create achievements in their spaces" ON user_achievements
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        space_id IN (
            SELECT space_id FROM space_members WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for achievement_progress
CREATE POLICY "Users can view their progress" ON achievement_progress
    FOR SELECT USING (
        user_id = auth.uid() AND
        space_id IN (
            SELECT space_id FROM space_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their progress" ON achievement_progress
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        space_id IN (
            SELECT space_id FROM space_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can modify their progress" ON achievement_progress
    FOR UPDATE USING (
        user_id = auth.uid() AND
        space_id IN (
            SELECT space_id FROM space_members WHERE user_id = auth.uid()
        )
    );

-- Function to check badge criteria and award badges
CREATE OR REPLACE FUNCTION check_and_award_badges(
    p_user_id UUID,
    p_space_id UUID,
    p_trigger_type TEXT DEFAULT 'goal_completed'
) RETURNS JSON AS $$
DECLARE
    badge_record RECORD;
    criteria_met BOOLEAN;
    awarded_badges JSON[];
    badge_result JSON;
BEGIN
    awarded_badges := ARRAY[]::JSON[];

    -- Loop through all active badges
    FOR badge_record IN
        SELECT * FROM achievement_badges
        WHERE is_active = true
    LOOP
        -- Check if user already has this badge in this space
        IF EXISTS (
            SELECT 1 FROM user_achievements
            WHERE user_id = p_user_id
            AND space_id = p_space_id
            AND badge_id = badge_record.id
        ) THEN
            CONTINUE;
        END IF;

        -- Evaluate badge criteria (simplified for now - can be expanded)
        criteria_met := false;

        -- Goal completion badges
        IF badge_record.criteria->>'type' = 'goals_completed' THEN
            criteria_met := (
                SELECT COUNT(*) FROM goals
                WHERE space_id = p_space_id
                AND status = 'completed'
                AND EXISTS (
                    SELECT 1 FROM space_members
                    WHERE space_id = p_space_id AND user_id = p_user_id
                )
            ) >= (badge_record.criteria->>'count')::INTEGER;
        END IF;

        -- Milestone badges
        IF badge_record.criteria->>'type' = 'milestones_completed' THEN
            criteria_met := (
                SELECT COUNT(*) FROM goal_milestones gm
                JOIN goals g ON g.id = gm.goal_id
                WHERE g.space_id = p_space_id
                AND gm.completed = true
                AND EXISTS (
                    SELECT 1 FROM space_members
                    WHERE space_id = p_space_id AND user_id = p_user_id
                )
            ) >= (badge_record.criteria->>'count')::INTEGER;
        END IF;

        -- Streak badges (placeholder - would need streak tracking)
        IF badge_record.criteria->>'type' = 'goal_streak' THEN
            -- Would implement streak calculation here
            criteria_met := false;
        END IF;

        -- Award badge if criteria met
        IF criteria_met THEN
            INSERT INTO user_achievements (user_id, space_id, badge_id, progress_data)
            VALUES (p_user_id, p_space_id, badge_record.id,
                    json_build_object('trigger', p_trigger_type, 'awarded_at', NOW()));

            -- Add to result array
            badge_result := json_build_object(
                'id', badge_record.id,
                'name', badge_record.name,
                'description', badge_record.description,
                'category', badge_record.category,
                'icon', badge_record.icon,
                'color', badge_record.color,
                'points', badge_record.points,
                'rarity', badge_record.rarity
            );
            awarded_badges := awarded_badges || badge_result;
        END IF;
    END LOOP;

    RETURN json_build_object('badges_awarded', awarded_badges);
END;
$$ LANGUAGE plpgsql;

-- Insert default achievement badges
INSERT INTO achievement_badges (name, description, category, icon, color, criteria, points, rarity) VALUES
-- Goal Completion Badges
('First Steps', 'Complete your first goal', 'goals', 'Target', 'green', '{"type": "goals_completed", "count": 1}', 10, 'common'),
('Goal Getter', 'Complete 5 goals', 'goals', 'Trophy', 'blue', '{"type": "goals_completed", "count": 5}', 25, 'uncommon'),
('Achievement Hunter', 'Complete 10 goals', 'goals', 'Award', 'purple', '{"type": "goals_completed", "count": 10}', 50, 'rare'),
('Goal Master', 'Complete 25 goals', 'goals', 'Crown', 'yellow', '{"type": "goals_completed", "count": 25}', 100, 'epic'),
('Legendary Achiever', 'Complete 50 goals', 'goals', 'Star', 'orange', '{"type": "goals_completed", "count": 50}', 250, 'legendary'),

-- Milestone Badges
('Milestone Maker', 'Complete your first milestone', 'milestones', 'Flag', 'indigo', '{"type": "milestones_completed", "count": 1}', 10, 'common'),
('Step by Step', 'Complete 10 milestones', 'milestones', 'MapPin', 'cyan', '{"type": "milestones_completed", "count": 10}', 30, 'uncommon'),
('Progress Pro', 'Complete 25 milestones', 'milestones', 'TrendingUp', 'emerald', '{"type": "milestones_completed", "count": 25}', 75, 'rare'),

-- Streak Badges (placeholder)
('Consistent', 'Maintain a 7-day goal streak', 'streaks', 'Flame', 'red', '{"type": "goal_streak", "days": 7}', 35, 'uncommon'),
('Unstoppable', 'Maintain a 30-day goal streak', 'streaks', 'Zap', 'purple', '{"type": "goal_streak", "days": 30}', 100, 'epic'),

-- Social Badges (placeholder)
('Team Player', 'Complete a collaborative goal', 'social', 'Users', 'pink', '{"type": "collaborative_goal", "count": 1}', 20, 'uncommon'),

-- Special Badges
('Early Bird', 'Join during beta period', 'special', 'Sunrise', 'amber', '{"type": "early_adopter"}', 50, 'rare'),
('New Year New Goals', 'Set a goal in January', 'seasonal', 'Calendar', 'emerald', '{"type": "new_year_goal"}', 15, 'uncommon');

-- Comments for documentation
COMMENT ON TABLE achievement_badges IS 'Defines all available achievement badges in the system';
COMMENT ON TABLE user_achievements IS 'Tracks which badges users have earned in each space';
COMMENT ON TABLE achievement_progress IS 'Tracks user progress toward earning badges';
COMMENT ON COLUMN achievement_badges.criteria IS 'JSON object defining the requirements to earn this badge';
COMMENT ON COLUMN achievement_badges.is_secret IS 'Hidden badges that users don''t see until they earn them';
COMMENT ON FUNCTION check_and_award_badges IS 'Evaluates badge criteria and awards eligible badges to users';