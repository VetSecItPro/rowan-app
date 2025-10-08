-- =============================================
-- COMPREHENSIVE ROW LEVEL SECURITY POLICIES
-- Date: October 8, 2025
-- Purpose: Enable production-ready RLS on all tables
-- =============================================

-- =============================================
-- SECTION 1: CLEANUP - Drop all existing policies
-- =============================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- =============================================
-- SECTION 2: ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECTION 3: PERFORMANCE INDEXES
-- =============================================

-- Critical index for RLS performance
CREATE INDEX IF NOT EXISTS idx_space_members_user_space
  ON space_members(user_id, space_id);

-- Space-scoped table indexes
CREATE INDEX IF NOT EXISTS idx_tasks_space ON tasks(space_id);
CREATE INDEX IF NOT EXISTS idx_events_space ON events(space_id);
CREATE INDEX IF NOT EXISTS idx_reminders_space ON reminders(space_id);
CREATE INDEX IF NOT EXISTS idx_conversations_space ON conversations(space_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_space ON shopping_lists(space_id);
CREATE INDEX IF NOT EXISTS idx_recipes_space ON recipes(space_id);
CREATE INDEX IF NOT EXISTS idx_meals_space ON meals(space_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_space ON meal_plans(space_id);
CREATE INDEX IF NOT EXISTS idx_chores_space ON chores(space_id);
CREATE INDEX IF NOT EXISTS idx_expenses_space ON expenses(space_id);
CREATE INDEX IF NOT EXISTS idx_budgets_space ON budgets(space_id);
CREATE INDEX IF NOT EXISTS idx_goals_space ON goals(space_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_space ON activity_log(space_id);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_space ON daily_checkins(space_id);

-- Nested relationship indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_list ON shopping_items(list_id);
CREATE INDEX IF NOT EXISTS idx_chore_completions_chore ON chore_completions(chore_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal ON goal_milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_updates_goal ON goal_updates(goal_id);

-- =============================================
-- SECTION 4: USER-SCOPED POLICIES (Pattern A)
-- =============================================

-- Users: Can only access own profile
CREATE POLICY users_select_own ON users FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY users_insert_own ON users FOR INSERT
  WITH CHECK (auth.uid() = id);
CREATE POLICY users_update_own ON users FOR UPDATE
  USING (auth.uid() = id);

-- Space Members: View own memberships + memberships in shared spaces
CREATE POLICY space_members_select ON space_members FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM space_members sm WHERE sm.space_id = space_members.space_id AND sm.user_id = auth.uid())
  );
CREATE POLICY space_members_insert ON space_members FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM space_members WHERE space_id = space_members.space_id AND user_id = auth.uid())
  );
CREATE POLICY space_members_delete ON space_members FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM space_members WHERE space_id = space_members.space_id AND user_id = auth.uid())
  );

-- =============================================
-- SECTION 5: SPACE-SCOPED POLICIES (Pattern B)
-- Optimized with EXISTS for performance
-- =============================================

-- Helper function to reduce redundancy
CREATE OR REPLACE FUNCTION user_has_space_access(p_space_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM space_members
    WHERE space_id = p_space_id AND user_id = auth.uid()
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- TASKS
CREATE POLICY tasks_select ON tasks FOR SELECT
  USING (user_has_space_access(space_id));
CREATE POLICY tasks_insert ON tasks FOR INSERT
  WITH CHECK (user_has_space_access(space_id));
CREATE POLICY tasks_update ON tasks FOR UPDATE
  USING (user_has_space_access(space_id));
CREATE POLICY tasks_delete ON tasks FOR DELETE
  USING (user_has_space_access(space_id));

-- EVENTS
CREATE POLICY events_select ON events FOR SELECT
  USING (user_has_space_access(space_id));
CREATE POLICY events_insert ON events FOR INSERT
  WITH CHECK (user_has_space_access(space_id));
CREATE POLICY events_update ON events FOR UPDATE
  USING (user_has_space_access(space_id));
CREATE POLICY events_delete ON events FOR DELETE
  USING (user_has_space_access(space_id));

-- REMINDERS
CREATE POLICY reminders_select ON reminders FOR SELECT
  USING (user_has_space_access(space_id));
CREATE POLICY reminders_insert ON reminders FOR INSERT
  WITH CHECK (user_has_space_access(space_id));
CREATE POLICY reminders_update ON reminders FOR UPDATE
  USING (user_has_space_access(space_id));
CREATE POLICY reminders_delete ON reminders FOR DELETE
  USING (user_has_space_access(space_id));

-- CONVERSATIONS
CREATE POLICY conversations_select ON conversations FOR SELECT
  USING (user_has_space_access(space_id));
CREATE POLICY conversations_insert ON conversations FOR INSERT
  WITH CHECK (user_has_space_access(space_id));
CREATE POLICY conversations_update ON conversations FOR UPDATE
  USING (user_has_space_access(space_id));
CREATE POLICY conversations_delete ON conversations FOR DELETE
  USING (user_has_space_access(space_id));

-- SHOPPING LISTS
CREATE POLICY shopping_lists_select ON shopping_lists FOR SELECT
  USING (user_has_space_access(space_id));
CREATE POLICY shopping_lists_insert ON shopping_lists FOR INSERT
  WITH CHECK (user_has_space_access(space_id));
CREATE POLICY shopping_lists_update ON shopping_lists FOR UPDATE
  USING (user_has_space_access(space_id));
CREATE POLICY shopping_lists_delete ON shopping_lists FOR DELETE
  USING (user_has_space_access(space_id));

-- RECIPES
CREATE POLICY recipes_select ON recipes FOR SELECT
  USING (user_has_space_access(space_id));
CREATE POLICY recipes_insert ON recipes FOR INSERT
  WITH CHECK (user_has_space_access(space_id));
CREATE POLICY recipes_update ON recipes FOR UPDATE
  USING (user_has_space_access(space_id));
CREATE POLICY recipes_delete ON recipes FOR DELETE
  USING (user_has_space_access(space_id));

-- MEALS
CREATE POLICY meals_select ON meals FOR SELECT
  USING (user_has_space_access(space_id));
CREATE POLICY meals_insert ON meals FOR INSERT
  WITH CHECK (user_has_space_access(space_id));
CREATE POLICY meals_update ON meals FOR UPDATE
  USING (user_has_space_access(space_id));
CREATE POLICY meals_delete ON meals FOR DELETE
  USING (user_has_space_access(space_id));

-- MEAL PLANS
CREATE POLICY meal_plans_select ON meal_plans FOR SELECT
  USING (user_has_space_access(space_id));
CREATE POLICY meal_plans_insert ON meal_plans FOR INSERT
  WITH CHECK (user_has_space_access(space_id));
CREATE POLICY meal_plans_update ON meal_plans FOR UPDATE
  USING (user_has_space_access(space_id));
CREATE POLICY meal_plans_delete ON meal_plans FOR DELETE
  USING (user_has_space_access(space_id));

-- CHORES
CREATE POLICY chores_select ON chores FOR SELECT
  USING (user_has_space_access(space_id));
CREATE POLICY chores_insert ON chores FOR INSERT
  WITH CHECK (user_has_space_access(space_id));
CREATE POLICY chores_update ON chores FOR UPDATE
  USING (user_has_space_access(space_id));
CREATE POLICY chores_delete ON chores FOR DELETE
  USING (user_has_space_access(space_id));

-- EXPENSES
CREATE POLICY expenses_select ON expenses FOR SELECT
  USING (user_has_space_access(space_id));
CREATE POLICY expenses_insert ON expenses FOR INSERT
  WITH CHECK (user_has_space_access(space_id));
CREATE POLICY expenses_update ON expenses FOR UPDATE
  USING (user_has_space_access(space_id));
CREATE POLICY expenses_delete ON expenses FOR DELETE
  USING (user_has_space_access(space_id));

-- BUDGETS
CREATE POLICY budgets_select ON budgets FOR SELECT
  USING (user_has_space_access(space_id));
CREATE POLICY budgets_insert ON budgets FOR INSERT
  WITH CHECK (user_has_space_access(space_id));
CREATE POLICY budgets_update ON budgets FOR UPDATE
  USING (user_has_space_access(space_id));
CREATE POLICY budgets_delete ON budgets FOR DELETE
  USING (user_has_space_access(space_id));

-- GOALS
CREATE POLICY goals_select ON goals FOR SELECT
  USING (user_has_space_access(space_id));
CREATE POLICY goals_insert ON goals FOR INSERT
  WITH CHECK (user_has_space_access(space_id));
CREATE POLICY goals_update ON goals FOR UPDATE
  USING (user_has_space_access(space_id));
CREATE POLICY goals_delete ON goals FOR DELETE
  USING (user_has_space_access(space_id));

-- ACTIVITY LOG
CREATE POLICY activity_log_select ON activity_log FOR SELECT
  USING (user_has_space_access(space_id));
CREATE POLICY activity_log_insert ON activity_log FOR INSERT
  WITH CHECK (true); -- Allow system inserts for audit integrity

-- DAILY CHECKINS
CREATE POLICY daily_checkins_select ON daily_checkins FOR SELECT
  USING (user_has_space_access(space_id));
CREATE POLICY daily_checkins_insert ON daily_checkins FOR INSERT
  WITH CHECK (user_has_space_access(space_id));
CREATE POLICY daily_checkins_update ON daily_checkins FOR UPDATE
  USING (user_has_space_access(space_id));
CREATE POLICY daily_checkins_delete ON daily_checkins FOR DELETE
  USING (user_has_space_access(space_id));

-- =============================================
-- SECTION 6: NESTED RELATIONSHIP POLICIES
-- Inherit access through parent table
-- =============================================

-- MESSAGES (inherit from conversations)
CREATE POLICY messages_select ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND user_has_space_access(c.space_id)
    )
  );
CREATE POLICY messages_insert ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND user_has_space_access(c.space_id)
    )
  );
CREATE POLICY messages_update ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND user_has_space_access(c.space_id)
    )
  );
CREATE POLICY messages_delete ON messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND user_has_space_access(c.space_id)
    )
  );

-- SHOPPING ITEMS (inherit from shopping_lists)
CREATE POLICY shopping_items_select ON shopping_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shopping_lists sl
      WHERE sl.id = shopping_items.list_id
        AND user_has_space_access(sl.space_id)
    )
  );
CREATE POLICY shopping_items_insert ON shopping_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shopping_lists sl
      WHERE sl.id = shopping_items.list_id
        AND user_has_space_access(sl.space_id)
    )
  );
CREATE POLICY shopping_items_update ON shopping_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM shopping_lists sl
      WHERE sl.id = shopping_items.list_id
        AND user_has_space_access(sl.space_id)
    )
  );
CREATE POLICY shopping_items_delete ON shopping_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM shopping_lists sl
      WHERE sl.id = shopping_items.list_id
        AND user_has_space_access(sl.space_id)
    )
  );

-- CHORE COMPLETIONS (inherit from chores)
CREATE POLICY chore_completions_select ON chore_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chores ch
      WHERE ch.id = chore_completions.chore_id
        AND user_has_space_access(ch.space_id)
    )
  );
CREATE POLICY chore_completions_insert ON chore_completions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chores ch
      WHERE ch.id = chore_completions.chore_id
        AND user_has_space_access(ch.space_id)
    )
  );
CREATE POLICY chore_completions_delete ON chore_completions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM chores ch
      WHERE ch.id = chore_completions.chore_id
        AND user_has_space_access(ch.space_id)
    )
  );

-- GOAL MILESTONES (inherit from goals)
CREATE POLICY goal_milestones_select ON goal_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM goals g
      WHERE g.id = goal_milestones.goal_id
        AND user_has_space_access(g.space_id)
    )
  );
CREATE POLICY goal_milestones_insert ON goal_milestones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM goals g
      WHERE g.id = goal_milestones.goal_id
        AND user_has_space_access(g.space_id)
    )
  );
CREATE POLICY goal_milestones_update ON goal_milestones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM goals g
      WHERE g.id = goal_milestones.goal_id
        AND user_has_space_access(g.space_id)
    )
  );
CREATE POLICY goal_milestones_delete ON goal_milestones FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM goals g
      WHERE g.id = goal_milestones.goal_id
        AND user_has_space_access(g.space_id)
    )
  );

-- GOAL UPDATES (inherit from goals)
CREATE POLICY goal_updates_select ON goal_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM goals g
      WHERE g.id = goal_updates.goal_id
        AND user_has_space_access(g.space_id)
    )
  );
CREATE POLICY goal_updates_insert ON goal_updates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM goals g
      WHERE g.id = goal_updates.goal_id
        AND user_has_space_access(g.space_id)
    )
  );
CREATE POLICY goal_updates_delete ON goal_updates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM goals g
      WHERE g.id = goal_updates.goal_id
        AND user_has_space_access(g.space_id)
    )
  );

-- =============================================
-- SECTION 7: SPACES TABLE POLICIES (Pattern C)
-- =============================================

-- Users can view spaces they're members of
CREATE POLICY spaces_select ON spaces FOR SELECT
  USING (user_has_space_access(id));

-- Anyone authenticated can create a space
CREATE POLICY spaces_insert ON spaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only members can update their space
CREATE POLICY spaces_update ON spaces FOR UPDATE
  USING (user_has_space_access(id));

-- Only members can delete their space
CREATE POLICY spaces_delete ON spaces FOR DELETE
  USING (user_has_space_access(id));

-- =============================================
-- SECTION 8: SPACE INVITATIONS POLICIES (Pattern D)
-- =============================================

-- Users can view invitations TO their email OR FROM their spaces
CREATE POLICY space_invitations_select ON space_invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
    user_has_space_access(space_id)
  );

-- Only space members can create invitations
CREATE POLICY space_invitations_insert ON space_invitations FOR INSERT
  WITH CHECK (user_has_space_access(space_id));

-- Only space members can update invitations
CREATE POLICY space_invitations_update ON space_invitations FOR UPDATE
  USING (user_has_space_access(space_id));

-- Only space members can delete invitations
CREATE POLICY space_invitations_delete ON space_invitations FOR DELETE
  USING (user_has_space_access(space_id));

-- =============================================
-- VERIFICATION QUERIES (Run in Supabase SQL Editor)
-- =============================================

/*
-- Test 1: Verify RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Test 2: Count policies per table
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Test 3: Test as specific user (replace with actual user_id)
SET LOCAL jwt.claims.sub = '<user-uuid-here>';
SELECT * FROM tasks; -- Should only return user's space tasks
SELECT * FROM events; -- Should only return user's space events

-- Test 4: Performance check
EXPLAIN ANALYZE
SELECT * FROM tasks
WHERE space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid());
*/
