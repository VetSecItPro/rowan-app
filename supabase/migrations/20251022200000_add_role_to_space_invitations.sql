-- Add role column to space_invitations table
ALTER TABLE space_invitations
ADD COLUMN role TEXT NOT NULL DEFAULT 'member';

-- Add constraint to ensure only valid roles are allowed
ALTER TABLE space_invitations
ADD CONSTRAINT space_invitations_role_check
CHECK (role IN ('member', 'admin'));

-- Create index for faster role-based queries
CREATE INDEX idx_space_invitations_role ON space_invitations(role);

-- Update any existing invitations to have member role (if any exist)
UPDATE space_invitations SET role = 'member' WHERE role IS NULL;