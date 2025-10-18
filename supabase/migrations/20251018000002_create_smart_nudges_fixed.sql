-- Smart Nudges System for Goals
-- Provides intelligent reminders and motivational prompts

-- Nudge Settings per user/space
CREATE TABLE IF NOT EXISTS nudge_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

    -- Global nudge preferences
    nudges_enabled BOOLEAN DEFAULT true,
    daily_nudges_enabled BOOLEAN DEFAULT true,
    weekly_summary_enabled BOOLEAN DEFAULT true,
    milestone_reminders_enabled BOOLEAN DEFAULT true,
    deadline_alerts_enabled BOOLEAN DEFAULT true,
    motivation_quotes_enabled BOOLEAN DEFAULT true,

    -- Timing preferences
    preferred_nudge_time TIME DEFAULT '09:00:00',
    preferred_timezone TEXT DEFAULT 'UTC',
    nudge_frequency_days INTEGER DEFAULT 1, -- How often to send nudges

    -- Advanced settings
    max_daily_nudges INTEGER DEFAULT 3,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '07:00:00',
    weekend_nudges_enabled BOOLEAN DEFAULT false,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    UNIQUE(user_id, space_id)
);

-- Nudge Templates for different scenarios
CREATE TABLE IF NOT EXISTS nudge_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template metadata
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'reminder', 'motivation', 'milestone', 'deadline', 'celebration'
    trigger_type TEXT NOT NULL, -- 'overdue', 'upcoming_deadline', 'stagnant', 'milestone_reached', 'weekly_summary'

    -- Template content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_text TEXT,
    icon TEXT,

    -- Targeting criteria
    goal_categories TEXT[], -- Target specific goal categories
    days_before_deadline INTEGER, -- For deadline nudges
    days_since_activity INTEGER, -- For stagnant goal nudges

    -- Template properties
    priority INTEGER DEFAULT 1, -- 1=low, 2=normal, 3=high
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT true, -- System vs user-created

    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Nudge History for tracking sent nudges
CREATE TABLE IF NOT EXISTS nudge_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
    template_id UUID REFERENCES nudge_templates(id) ON DELETE SET NULL,

    -- Nudge content (stored for history)
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT NOT NULL,
    trigger_type TEXT NOT NULL,

    -- Delivery metadata
    delivery_method TEXT DEFAULT 'in_app', -- 'in_app', 'email', 'push'
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    read_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE,

    -- Analytics
    was_effective BOOLEAN, -- Did user take action after nudge?
    effectiveness_score INTEGER, -- 1-5 rating

    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Goal Nudge Tracking for per-goal nudge state
CREATE TABLE IF NOT EXISTS goal_nudge_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Tracking state
    last_nudge_sent_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    nudge_count INTEGER DEFAULT 0,
    is_snoozed BOOLEAN DEFAULT false,
    snoozed_until TIMESTAMP WITH TIME ZONE,

    -- Nudge preferences for this specific goal
    custom_nudge_enabled BOOLEAN DEFAULT true,
    custom_nudge_frequency_days INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    UNIQUE(goal_id, user_id)
);

-- Enable RLS
ALTER TABLE nudge_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE nudge_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE nudge_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_nudge_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for nudge_settings
CREATE POLICY "Users can view their own nudge settings" ON nudge_settings
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own nudge settings" ON nudge_settings
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own nudge settings" ON nudge_settings
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own nudge settings" ON nudge_settings
    FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for nudge_templates (read-only for users, system templates)
CREATE POLICY "Anyone can view active nudge templates" ON nudge_templates
    FOR SELECT USING (is_active = true);

-- RLS Policies for nudge_history
CREATE POLICY "Users can view their own nudge history" ON nudge_history
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert nudge history" ON nudge_history
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own nudge history" ON nudge_history
    FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for goal_nudge_tracking
CREATE POLICY "Users can view their own goal nudge tracking" ON goal_nudge_tracking
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own goal nudge tracking" ON goal_nudge_tracking
    FOR ALL USING (user_id = auth.uid());

-- Insert default nudge templates
INSERT INTO nudge_templates (name, category, trigger_type, title, message, action_text, icon, priority) VALUES
-- Reminder nudges
('Daily Goal Check-in', 'reminder', 'daily_checkin', 'Time for your daily goal check-in! 🎯', 'Take a moment to review your active goals and update your progress. Small steps lead to big achievements!', 'Review Goals', 'target', 2),
('Goal Progress Update', 'reminder', 'stagnant', 'Your goal needs some attention! 📈', 'It''s been a while since you updated "{goal_title}". Even small progress counts - what can you do today?', 'Update Progress', 'trending-up', 2),
('Upcoming Deadline', 'reminder', 'upcoming_deadline', 'Deadline approaching! ⏰', 'Your goal "{goal_title}" is due in {days_remaining} days. Let''s make sure you''re on track to finish strong!', 'View Goal', 'clock', 3),

-- Motivation nudges
('Weekly Inspiration', 'motivation', 'weekly_inspiration', 'You''re making great progress! ✨', 'This week you''ve been working on {goal_count} goals. Remember: "A goal is a dream with a deadline." Keep pushing forward!', 'View Goals', 'star', 1),
('Progress Celebration', 'motivation', 'progress_milestone', 'Amazing progress! 🎉', 'You''ve made significant progress on "{goal_title}"! You''re {progress}% of the way there. Your dedication is paying off!', 'Keep Going', 'trophy', 2),
('Momentum Builder', 'motivation', 'momentum', 'Build on your momentum! 🚀', 'You''ve been consistently working on your goals. This is how success happens - one step at a time. What''s your next move?', 'Take Action', 'zap', 2),

-- Milestone nudges
('Milestone Achieved', 'celebration', 'milestone_reached', 'Milestone unlocked! 🏆', 'Congratulations! You''ve reached a milestone for "{goal_title}". Take a moment to celebrate this achievement!', 'Celebrate', 'award', 3),
('Milestone Approaching', 'milestone', 'milestone_approaching', 'You''re so close! 🎯', 'You''re almost at your next milestone for "{goal_title}". Just a little more effort and you''ll be there!', 'Push Forward', 'target', 2),

-- Deadline nudges
('Overdue Goal', 'reminder', 'overdue', 'Goal needs attention ⚠️', 'Your goal "{goal_title}" was due {days_overdue} days ago. It''s not too late to get back on track. What''s your plan?', 'Review Goal', 'alert-triangle', 3),
('Final Week', 'reminder', 'final_week', 'Final week countdown! 🏁', 'You''re in the final week for "{goal_title}". Time to give it your all and finish strong!', 'Final Push', 'flag', 3),

-- Summary nudges
('Weekly Summary', 'summary', 'weekly_summary', 'Your weekly goal summary 📊', 'This week: {completed_goals} goals completed, {active_goals} in progress. You''re {overall_progress}% of the way to your targets!', 'View Details', 'bar-chart', 1),
('Monthly Reflection', 'summary', 'monthly_summary', 'Monthly goal reflection 🤔', 'Let''s reflect on this month''s progress. You''ve accomplished a lot! Time to plan your next steps.', 'View Progress', 'calendar', 1);

-- Function to get smart nudges for a user
CREATE OR REPLACE FUNCTION get_smart_nudges(
    p_user_id UUID,
    p_space_id UUID,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    nudge_id UUID,
    goal_id UUID,
    goal_title TEXT,
    template_name TEXT,
    category TEXT,
    title TEXT,
    message TEXT,
    action_text TEXT,
    icon TEXT,
    priority INTEGER,
    days_since_activity INTEGER,
    days_until_deadline INTEGER,
    should_send BOOLEAN
) AS $$
DECLARE
    user_settings RECORD;
    current_ts TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get user's nudge settings
    SELECT * INTO user_settings
    FROM nudge_settings
    WHERE user_id = p_user_id AND space_id = p_space_id;

    -- If no settings found, use defaults
    IF user_settings IS NULL THEN
        INSERT INTO nudge_settings (user_id, space_id)
        VALUES (p_user_id, p_space_id)
        RETURNING * INTO user_settings;
    END IF;

    -- Skip if nudges disabled
    IF NOT user_settings.nudges_enabled THEN
        RETURN;
    END IF;

    current_ts := NOW();

    RETURN QUERY
    WITH goal_analysis AS (
        SELECT
            g.id as goal_id,
            g.title as goal_title,
            g.status,
            g.progress,
            g.target_date,
            g.updated_at,
            gnt.last_nudge_sent_at,
            gnt.last_activity_at,
            gnt.nudge_count,
            gnt.is_snoozed,
            gnt.snoozed_until,
            EXTRACT(days FROM (current_ts - COALESCE(gnt.last_activity_at, g.updated_at)))::INTEGER as days_since_activity,
            CASE
                WHEN g.target_date IS NOT NULL
                THEN EXTRACT(days FROM (g.target_date::timestamp - current_ts))::INTEGER
                ELSE NULL
            END as days_until_deadline,
            CASE
                WHEN g.target_date IS NOT NULL AND g.target_date::timestamp < current_ts
                THEN EXTRACT(days FROM (current_ts - g.target_date::timestamp))::INTEGER
                ELSE 0
            END as days_overdue
        FROM goals g
        LEFT JOIN goal_nudge_tracking gnt ON g.id = gnt.goal_id AND gnt.user_id = p_user_id
        WHERE g.space_id = p_space_id
        AND g.status IN ('active', 'paused')
        AND (gnt.is_snoozed = false OR gnt.snoozed_until < current_ts OR gnt.is_snoozed IS NULL)
    ),

    nudge_candidates AS (
        SELECT DISTINCT
            gen_random_uuid() as nudge_id,
            ga.goal_id,
            ga.goal_title,
            nt.name as template_name,
            nt.category,
            REPLACE(REPLACE(nt.title, '{goal_title}', ga.goal_title), '{days_remaining}', COALESCE(ga.days_until_deadline::text, 'unknown')) as title,
            REPLACE(REPLACE(REPLACE(nt.message, '{goal_title}', ga.goal_title), '{days_remaining}', COALESCE(ga.days_until_deadline::text, 'unknown')), '{progress}', ga.progress::text) as message,
            nt.action_text,
            nt.icon,
            nt.priority,
            ga.days_since_activity,
            ga.days_until_deadline,
            CASE
                -- Overdue goals (high priority)
                WHEN nt.trigger_type = 'overdue' AND ga.days_overdue > 0 THEN true
                -- Upcoming deadlines
                WHEN nt.trigger_type = 'upcoming_deadline' AND ga.days_until_deadline BETWEEN 1 AND 7 THEN true
                -- Stagnant goals (no activity for configured days)
                WHEN nt.trigger_type = 'stagnant' AND ga.days_since_activity >= COALESCE(nt.days_since_activity, 3) THEN true
                -- Daily check-in (if enabled and not sent today)
                WHEN nt.trigger_type = 'daily_checkin' AND user_settings.daily_nudges_enabled
                     AND (ga.last_nudge_sent_at IS NULL OR ga.last_nudge_sent_at::date < current_ts::date) THEN true
                -- Weekly summary (once per week)
                WHEN nt.trigger_type = 'weekly_summary' AND user_settings.weekly_summary_enabled
                     AND (ga.last_nudge_sent_at IS NULL OR ga.last_nudge_sent_at < current_ts - INTERVAL '7 days') THEN true
                ELSE false
            END as should_send
        FROM goal_analysis ga
        CROSS JOIN nudge_templates nt
        WHERE nt.is_active = true
        AND (
            -- Match specific triggers
            (nt.trigger_type = 'overdue' AND ga.days_overdue > 0) OR
            (nt.trigger_type = 'upcoming_deadline' AND ga.days_until_deadline BETWEEN 1 AND 7) OR
            (nt.trigger_type = 'stagnant' AND ga.days_since_activity >= COALESCE(nt.days_since_activity, 3)) OR
            (nt.trigger_type = 'daily_checkin' AND user_settings.daily_nudges_enabled) OR
            (nt.trigger_type = 'weekly_summary' AND user_settings.weekly_summary_enabled)
        )
    )

    SELECT
        nc.nudge_id,
        nc.goal_id,
        nc.goal_title,
        nc.template_name,
        nc.category,
        nc.title,
        nc.message,
        nc.action_text,
        nc.icon,
        nc.priority,
        nc.days_since_activity,
        nc.days_until_deadline,
        nc.should_send
    FROM nudge_candidates nc
    WHERE nc.should_send = true
    ORDER BY nc.priority DESC, nc.days_until_deadline ASC NULLS LAST
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;