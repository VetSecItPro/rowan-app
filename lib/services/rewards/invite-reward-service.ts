/**
 * Invite-mechanic reward loop (Phase 15.5).
 *
 * When a member who joined via an invitation completes their FIRST task, the
 * person who invited them earns points. This turns every signup into an
 * incentive to bring active members, not just warm bodies (the reward only
 * fires once the invitee actually does something).
 *
 * Called fire-and-forget from the task-completion route with the service-role
 * client: it must read an invitation the completer doesn't own, flip a flag on
 * it, and award points to a DIFFERENT user (the inviter) - none of which the
 * completer's RLS scope permits. The trust boundary is the caller: the
 * completingUserId is the authenticated user and spaceId is an access-verified
 * task's space.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { pointsService } from './points-service';
import { logger } from '@/lib/logger';

/** Points awarded to the inviter. Product default - adjust freely. */
export const INVITE_FIRST_TASK_REWARD_POINTS = 50;

export interface InviteRewardResult {
  rewarded: boolean;
}

export async function maybeRewardInviterForFirstTask(
  completingUserId: string,
  spaceId: string,
  supabase: SupabaseClient,
): Promise<InviteRewardResult> {
  // Did this user join via an invitation in this space that has an inviter and
  // hasn't paid out yet?
  // nosemgrep: supabase-missing-space-id-filter - filtered by .eq('space_id', spaceId) below
  const { data: invite } = await supabase
    .from('space_invitations')
    .select('id, invited_by')
    .eq('accepted_by_user_id', completingUserId)
    .eq('space_id', spaceId)
    .not('invited_by', 'is', null)
    .is('inviter_reward_granted_at', null)
    .limit(1)
    .maybeSingle();

  const inviterId = invite?.invited_by as string | undefined;
  // Nothing to do, or a degenerate self-invite - never reward yourself.
  if (!invite || !inviterId || inviterId === completingUserId) {
    return { rewarded: false };
  }

  // Claim the grant atomically: the conditional `.is(...granted_at, null)` means
  // only one concurrent first-task completion can win, so the inviter is paid
  // exactly once even under a burst of completions.
  // nosemgrep: supabase-missing-space-id-filter - keyed by invitation id (PK), not space-scoped
  const { data: claimed } = await supabase
    .from('space_invitations')
    .update({ inviter_reward_granted_at: new Date().toISOString() })
    .eq('id', invite.id)
    .is('inviter_reward_granted_at', null)
    .select('id')
    .maybeSingle();

  if (!claimed) return { rewarded: false }; // lost the race; already granted

  await pointsService.awardPoints(
    {
      user_id: inviterId,
      space_id: spaceId,
      source_type: 'bonus',
      source_id: invite.id,
      points: INVITE_FIRST_TASK_REWARD_POINTS,
      reason: 'A member you invited completed their first task',
      metadata: { kind: 'invite_first_task', invited_user_id: completingUserId },
    },
    supabase,
  );

  logger.info('Invite reward granted to inviter', {
    component: 'invite-reward-service',
    inviterId,
    invitedUserId: completingUserId,
    spaceId,
    points: INVITE_FIRST_TASK_REWARD_POINTS,
  });

  return { rewarded: true };
}
