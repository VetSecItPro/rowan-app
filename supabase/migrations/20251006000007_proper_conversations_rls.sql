-- Re-enable RLS on conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations table
-- Users can only access conversations for spaces they are members of

-- SELECT Policy
CREATE POLICY "Users can view their space conversations"
ON conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM space_members
    WHERE space_members.space_id = conversations.space_id
    AND space_members.user_id = auth.uid()
  )
);

-- INSERT Policy
CREATE POLICY "Users can create conversations in their spaces"
ON conversations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM space_members
    WHERE space_members.space_id = conversations.space_id
    AND space_members.user_id = auth.uid()
  )
);

-- UPDATE Policy
CREATE POLICY "Users can update their space conversations"
ON conversations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM space_members
    WHERE space_members.space_id = conversations.space_id
    AND space_members.user_id = auth.uid()
  )
);

-- DELETE Policy
CREATE POLICY "Users can delete their space conversations"
ON conversations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM space_members
    WHERE space_members.space_id = conversations.space_id
    AND space_members.user_id = auth.uid()
  )
);
