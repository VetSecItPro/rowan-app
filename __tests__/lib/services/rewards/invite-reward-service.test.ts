/**
 * Tests for invite-reward-service.ts (Phase 15.5 invite mechanic).
 *
 * Verifies the inviter is rewarded exactly once when their invitee completes a
 * first task, and that the guards (no invite, self-invite, lost-race) hold.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  maybeRewardInviterForFirstTask,
  INVITE_FIRST_TASK_REWARD_POINTS,
} from '@/lib/services/rewards/invite-reward-service';

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/services/rewards/points-service', () => ({
  pointsService: { awardPoints: vi.fn().mockResolvedValue({ id: 'tx-1' }) },
}));

import { pointsService } from '@/lib/services/rewards/points-service';

/**
 * Supabase stub: the SELECT chain (.select().eq().eq().not().is().limit()
 * .maybeSingle()) resolves to `selectData`; the UPDATE chain (.update().eq()
 * .is().select().maybeSingle()) resolves to `updateData`.
 */
function makeSupabase(selectData: unknown, updateData: unknown) {
  const selectChain: Record<string, unknown> = {};
  ['select', 'eq', 'not', 'is', 'limit'].forEach((m) => { selectChain[m] = () => selectChain; });
  selectChain.maybeSingle = () => Promise.resolve({ data: selectData, error: null });

  const updateChain: Record<string, unknown> = {};
  ['update', 'eq', 'is', 'select'].forEach((m) => { updateChain[m] = () => updateChain; });
  updateChain.maybeSingle = () => Promise.resolve({ data: updateData, error: null });

   
  return {
    from: () => ({ select: () => selectChain, update: () => updateChain }),
  } as any;
}

beforeEach(() => vi.clearAllMocks());

describe('maybeRewardInviterForFirstTask', () => {
  it('rewards the inviter when a valid unclaimed invitation exists', async () => {
    const supabase = makeSupabase({ id: 'inv-1', invited_by: 'inviter-1' }, { id: 'inv-1' });

    const result = await maybeRewardInviterForFirstTask('invitee-1', 'space-1', supabase);

    expect(result.rewarded).toBe(true);
    expect(pointsService.awardPoints).toHaveBeenCalledTimes(1);
    const [arg] = vi.mocked(pointsService.awardPoints).mock.calls[0];
    expect(arg.user_id).toBe('inviter-1');
    expect(arg.space_id).toBe('space-1');
    expect(arg.points).toBe(INVITE_FIRST_TASK_REWARD_POINTS);
    expect(arg.source_type).toBe('bonus');
  });

  it('does nothing when there is no accepted invitation', async () => {
    const supabase = makeSupabase(null, null);
    const result = await maybeRewardInviterForFirstTask('invitee-1', 'space-1', supabase);
    expect(result.rewarded).toBe(false);
    expect(pointsService.awardPoints).not.toHaveBeenCalled();
  });

  it('never rewards a degenerate self-invite (inviter === completer)', async () => {
    const supabase = makeSupabase({ id: 'inv-1', invited_by: 'user-1' }, { id: 'inv-1' });
    const result = await maybeRewardInviterForFirstTask('user-1', 'space-1', supabase);
    expect(result.rewarded).toBe(false);
    expect(pointsService.awardPoints).not.toHaveBeenCalled();
  });

  it('does not double-reward when the grant claim is lost to a race', async () => {
    // SELECT finds an unclaimed invite, but the conditional UPDATE returns null
    // (another concurrent completion already claimed it).
    const supabase = makeSupabase({ id: 'inv-1', invited_by: 'inviter-1' }, null);
    const result = await maybeRewardInviterForFirstTask('invitee-1', 'space-1', supabase);
    expect(result.rewarded).toBe(false);
    expect(pointsService.awardPoints).not.toHaveBeenCalled();
  });
});
