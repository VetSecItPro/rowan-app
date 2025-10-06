-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Space members can view conversations" ON conversations;
DROP POLICY IF EXISTS "Space members can create conversations" ON conversations;
DROP POLICY IF EXISTS "Space members can update conversations" ON conversations;
DROP POLICY IF EXISTS "Space members can delete conversations" ON conversations;

DROP POLICY IF EXISTS "Space members can view messages" ON messages;
DROP POLICY IF EXISTS "Space members can create messages" ON messages;
DROP POLICY IF EXISTS "Space members can update messages" ON messages;
DROP POLICY IF EXISTS "Space members can delete messages" ON messages;

-- Create a function to get current user from custom context
-- This allows us to set user context at the application layer
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
  -- Try to get from auth first (for production)
  IF auth.uid() IS NOT NULL THEN
    RETURN auth.uid();
  END IF;

  -- Fall back to custom setting (for development)
  -- This will be set by the application layer
  RETURN current_setting('app.current_user_id', TRUE)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CONVERSATIONS: Secure RLS using current_user_id()
CREATE POLICY "Users can view space conversations"
ON conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM space_members sm
    WHERE sm.space_id = conversations.space_id
    AND sm.user_id = current_user_id()
  )
);

CREATE POLICY "Users can create space conversations"
ON conversations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM space_members sm
    WHERE sm.space_id = conversations.space_id
    AND sm.user_id = current_user_id()
  )
);

CREATE POLICY "Users can update space conversations"
ON conversations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM space_members sm
    WHERE sm.space_id = conversations.space_id
    AND sm.user_id = current_user_id()
  )
);

CREATE POLICY "Users can delete space conversations"
ON conversations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM space_members sm
    WHERE sm.space_id = conversations.space_id
    AND sm.user_id = current_user_id()
  )
);

-- MESSAGES: Secure RLS using current_user_id()
CREATE POLICY "Users can view space messages"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    INNER JOIN space_members sm ON sm.space_id = c.space_id
    WHERE c.id = messages.conversation_id
    AND sm.user_id = current_user_id()
  )
);

CREATE POLICY "Users can create space messages"
ON messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c
    INNER JOIN space_members sm ON sm.space_id = c.space_id
    WHERE c.id = messages.conversation_id
    AND sm.user_id = current_user_id()
  )
);

CREATE POLICY "Users can update own messages"
ON messages FOR UPDATE
USING (
  sender_id = current_user_id()
  AND EXISTS (
    SELECT 1 FROM conversations c
    INNER JOIN space_members sm ON sm.space_id = c.space_id
    WHERE c.id = messages.conversation_id
    AND sm.user_id = current_user_id()
  )
);

CREATE POLICY "Users can delete own messages"
ON messages FOR DELETE
USING (
  sender_id = current_user_id()
  AND EXISTS (
    SELECT 1 FROM conversations c
    INNER JOIN space_members sm ON sm.space_id = c.space_id
    WHERE c.id = messages.conversation_id
    AND sm.user_id = current_user_id()
  )
);
