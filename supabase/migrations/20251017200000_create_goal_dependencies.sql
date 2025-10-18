-- Create goal_dependencies table
CREATE TABLE goal_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    depends_on_goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    dependency_type TEXT NOT NULL CHECK (dependency_type IN ('prerequisite', 'trigger', 'blocking')),
    completion_threshold INTEGER DEFAULT 100 CHECK (completion_threshold >= 0 AND completion_threshold <= 100),
    auto_unlock BOOLEAN DEFAULT true,
    unlock_delay_days INTEGER DEFAULT 0 CHECK (unlock_delay_days >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'satisfied', 'bypassed')),
    satisfied_at TIMESTAMPTZ,
    bypassed_at TIMESTAMPTZ,
    bypassed_by UUID REFERENCES auth.users(id),
    bypass_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    -- Constraints
    CONSTRAINT no_self_dependency CHECK (goal_id != depends_on_goal_id),
    CONSTRAINT valid_threshold CHECK (
        (dependency_type = 'prerequisite' AND completion_threshold > 0) OR
        (dependency_type != 'prerequisite')
    )
);

-- Create indexes for performance
CREATE INDEX idx_goal_dependencies_goal_id ON goal_dependencies(goal_id);
CREATE INDEX idx_goal_dependencies_depends_on_goal_id ON goal_dependencies(depends_on_goal_id);
CREATE INDEX idx_goal_dependencies_space_id ON goal_dependencies(space_id);
CREATE INDEX idx_goal_dependencies_status ON goal_dependencies(status);

-- Create composite index for dependency chains
CREATE INDEX idx_goal_dependencies_chain ON goal_dependencies(space_id, goal_id, depends_on_goal_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_goal_dependencies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER goal_dependencies_updated_at
    BEFORE UPDATE ON goal_dependencies
    FOR EACH ROW
    EXECUTE FUNCTION update_goal_dependencies_updated_at();

-- Row Level Security (RLS)
ALTER TABLE goal_dependencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view dependencies in their spaces" ON goal_dependencies
    FOR SELECT USING (
        space_id IN (
            SELECT space_id FROM space_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create dependencies in their spaces" ON goal_dependencies
    FOR INSERT WITH CHECK (
        space_id IN (
            SELECT space_id FROM space_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update dependencies in their spaces" ON goal_dependencies
    FOR UPDATE USING (
        space_id IN (
            SELECT space_id FROM space_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete dependencies in their spaces" ON goal_dependencies
    FOR DELETE USING (
        space_id IN (
            SELECT space_id FROM space_members WHERE user_id = auth.uid()
        )
    );

-- Function to detect circular dependencies for goals
CREATE OR REPLACE FUNCTION check_goal_circular_dependency(
    p_goal_id UUID,
    p_depends_on_goal_id UUID,
    p_space_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    circular_count INTEGER;
BEGIN
    -- Use a recursive CTE to detect circular dependencies
    WITH RECURSIVE dependency_chain AS (
        -- Base case: start with the new dependency
        SELECT
            p_depends_on_goal_id as goal_id,
            p_goal_id as depends_on_goal_id,
            1 as depth

        UNION ALL

        -- Recursive case: follow the dependency chain
        SELECT
            gd.depends_on_goal_id,
            dc.depends_on_goal_id,
            dc.depth + 1
        FROM goal_dependencies gd
        JOIN dependency_chain dc ON gd.goal_id = dc.goal_id
        WHERE
            gd.space_id = p_space_id
            AND dc.depth < 10  -- Prevent infinite recursion
    )
    SELECT COUNT(*)
    INTO circular_count
    FROM dependency_chain
    WHERE goal_id = p_goal_id;

    RETURN circular_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update dependency status when goals complete
CREATE OR REPLACE FUNCTION update_goal_dependency_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process when a goal is completed or progress changes
    IF (NEW.status = 'completed' AND OLD.status != 'completed') OR
       (NEW.progress != OLD.progress) THEN

        -- Update dependencies that depend on this goal
        UPDATE goal_dependencies
        SET
            status = CASE
                WHEN NEW.status = 'completed' OR NEW.progress >= completion_threshold THEN 'satisfied'
                ELSE status
            END,
            satisfied_at = CASE
                WHEN NEW.status = 'completed' OR NEW.progress >= completion_threshold THEN NOW()
                ELSE satisfied_at
            END
        WHERE
            depends_on_goal_id = NEW.id
            AND status = 'pending';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on goals table to auto-update dependencies
CREATE TRIGGER update_goal_dependencies
    AFTER UPDATE ON goals
    FOR EACH ROW
    EXECUTE FUNCTION update_goal_dependency_status();

-- Function to get dependency tree for a goal
CREATE OR REPLACE FUNCTION get_goal_dependency_tree(p_goal_id UUID)
RETURNS TABLE(
    goal_id UUID,
    goal_title TEXT,
    depends_on_goal_id UUID,
    depends_on_title TEXT,
    dependency_type TEXT,
    completion_threshold INTEGER,
    status TEXT,
    depth INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE dependency_tree AS (
        -- Base case: direct dependencies
        SELECT
            gd.goal_id,
            g1.title as goal_title,
            gd.depends_on_goal_id,
            g2.title as depends_on_title,
            gd.dependency_type,
            gd.completion_threshold,
            gd.status,
            1 as depth
        FROM goal_dependencies gd
        JOIN goals g1 ON gd.goal_id = g1.id
        JOIN goals g2 ON gd.depends_on_goal_id = g2.id
        WHERE gd.goal_id = p_goal_id

        UNION ALL

        -- Recursive case: dependencies of dependencies
        SELECT
            gd.goal_id,
            g1.title,
            gd.depends_on_goal_id,
            g2.title,
            gd.dependency_type,
            gd.completion_threshold,
            gd.status,
            dt.depth + 1
        FROM goal_dependencies gd
        JOIN dependency_tree dt ON gd.goal_id = dt.depends_on_goal_id
        JOIN goals g1 ON gd.goal_id = g1.id
        JOIN goals g2 ON gd.depends_on_goal_id = g2.id
        WHERE dt.depth < 5  -- Limit depth to prevent infinite recursion
    )
    SELECT * FROM dependency_tree
    ORDER BY depth, goal_title;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE goal_dependencies IS 'Manages dependencies between goals, allowing prerequisite and trigger relationships';
COMMENT ON COLUMN goal_dependencies.dependency_type IS 'Type of dependency: prerequisite (must complete before), trigger (starts when completed), blocking (prevents start)';
COMMENT ON COLUMN goal_dependencies.completion_threshold IS 'Percentage completion required to satisfy dependency (for prerequisites)';
COMMENT ON COLUMN goal_dependencies.auto_unlock IS 'Whether to automatically unlock dependent goal when satisfied';
COMMENT ON COLUMN goal_dependencies.unlock_delay_days IS 'Days to wait before auto-unlocking after dependency is satisfied';
COMMENT ON FUNCTION check_goal_circular_dependency IS 'Detects circular dependencies to prevent infinite loops';
COMMENT ON FUNCTION get_goal_dependency_tree IS 'Returns the complete dependency tree for a goal, including nested dependencies';