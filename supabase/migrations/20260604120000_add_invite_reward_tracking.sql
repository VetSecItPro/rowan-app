-- Phase 15.5: invite-mechanic reward loop.
-- Reward the inviter once, when the member they invited completes their first
-- task. We need two things on space_invitations:
--   1. accepted_by_user_id - link the accepted invitation back to the user who
--      joined (the row only stored the invitee EMAIL + the inviter before).
--   2. inviter_reward_granted_at - idempotency flag so the reward fires exactly
--      once per accepted invitation, regardless of how many tasks get completed.
-- Both nullable + additive; safe to replay (IF NOT EXISTS).

ALTER TABLE public.space_invitations
  ADD COLUMN IF NOT EXISTS accepted_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.space_invitations
  ADD COLUMN IF NOT EXISTS inviter_reward_granted_at timestamptz;

-- Partial index: the reward check looks up accepted-but-not-yet-rewarded
-- invitations by the joining user. Keep it cheap.
CREATE INDEX IF NOT EXISTS idx_space_invitations_reward_lookup
  ON public.space_invitations (accepted_by_user_id, space_id)
  WHERE inviter_reward_granted_at IS NULL;
