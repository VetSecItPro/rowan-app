-- =============================================
-- SPACE INVITATIONS TABLE
-- =============================================
-- Allows space owners/admins to invite others via email

CREATE TABLE space_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Indexes
CREATE INDEX idx_space_invitations_space_id ON space_invitations(space_id);
CREATE INDEX idx_space_invitations_email ON space_invitations(email);
CREATE INDEX idx_space_invitations_token ON space_invitations(token);
CREATE INDEX idx_space_invitations_status ON space_invitations(status);

-- RLS Policies
ALTER TABLE space_invitations ENABLE ROW LEVEL SECURITY;

-- Users can view invitations for spaces they're members of
CREATE POLICY "Members can view space invitations"
ON space_invitations FOR SELECT
USING (
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  )
);

-- Only space owners/admins can create invitations
CREATE POLICY "Owners can create invitations"
ON space_invitations FOR INSERT
WITH CHECK (
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- Only space owners/admins can update invitations (cancel them)
CREATE POLICY "Owners can update invitations"
ON space_invitations FOR UPDATE
USING (
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- Only space owners/admins can delete invitations
CREATE POLICY "Owners can delete invitations"
ON space_invitations FOR DELETE
USING (
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
