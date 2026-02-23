import { describe, it, expect, vi, beforeEach } from 'vitest';


vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/rewards/points-service', () => ({
  pointsService: {
    awardPoints: vi.fn().mockResolvedValue(undefined),
  },
}));

// Build a chainable Supabase mock
function makeChain(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single', 'limit',
   'in', 'gte', 'lte', 'lt', 'neq', 'is', 'not', 'match', 'or', 'maybeSingle'].forEach((m) => {
    chain[m] = vi.fn(self);
  });
  chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return chain;
}

const SPACE_ID = '550e8400-e29b-41d4-a716-446655440001';
const REWARD_ID = '550e8400-e29b-41d4-a716-446655440002';
const USER_ID = '550e8400-e29b-41d4-a716-446655440003';
const REDEMPTION_ID = '550e8400-e29b-41d4-a716-446655440004';

const MOCK_REWARD = {
  id: REWARD_ID,
  space_id: SPACE_ID,
  name: 'Movie Night',
  description: 'Pick the movie',
  cost_points: 100,
  category: 'entertainment',
  image_url: null,
  emoji: '🎬',
  is_active: true,
  max_redemptions_per_week: null,
  created_by: USER_ID,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const MOCK_REDEMPTION = {
  id: REDEMPTION_ID,
  user_id: USER_ID,
  space_id: SPACE_ID,
  reward_id: REWARD_ID,
  points_spent: 100,
  status: 'pending',
  notes: null,
  approved_by: null,
  approved_at: null,
  fulfilled_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  reward: MOCK_REWARD,
};

describe('rewardsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRewards()', () => {
    it('should return active rewards for a space', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: [MOCK_REWARD], error: null });
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');
      const result = await rewardsService.getRewards(SPACE_ID);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(REWARD_ID);
    });

    it('should return empty array when no rewards exist', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: null, error: null });
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');
      const result = await rewardsService.getRewards(SPACE_ID);

      expect(result).toEqual([]);
    });

    it('should throw when query fails', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: null, error: { message: 'DB error' } });
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');

      await expect(rewardsService.getRewards(SPACE_ID)).rejects.toThrow('Failed to fetch rewards');
    });
  });

  describe('getReward()', () => {
    it('should return a single reward by id', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: MOCK_REWARD, error: null });
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');
      const result = await rewardsService.getReward(REWARD_ID);

      expect(result?.id).toBe(REWARD_ID);
    });

    it('should return null when reward not found (PGRST116)', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');
      const result = await rewardsService.getReward(REWARD_ID);

      expect(result).toBeNull();
    });

    it('should throw for non-PGRST116 errors', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: null, error: { code: '42P01', message: 'Table not found' } });
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');

      await expect(rewardsService.getReward(REWARD_ID)).rejects.toThrow('Failed to fetch reward');
    });
  });

  describe('createReward()', () => {
    it('should create a reward and return it', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: MOCK_REWARD, error: null });
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');
      const result = await rewardsService.createReward({
        space_id: SPACE_ID,
        name: 'Movie Night',
        cost_points: 100,
        category: 'entertainment',
        created_by: USER_ID,
      });

      expect(result.id).toBe(REWARD_ID);
    });

    it('should throw when creation fails', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: null, error: { message: 'Insert failed' } });
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');

      await expect(
        rewardsService.createReward({
          space_id: SPACE_ID,
          name: 'Test',
          cost_points: 50,
          category: 'other',
          created_by: USER_ID,
        })
      ).rejects.toThrow('Failed to create reward');
    });
  });

  describe('updateReward()', () => {
    it('should update a reward and return it', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const updated = { ...MOCK_REWARD, name: 'Updated Name' };
      const chain = makeChain({ data: updated, error: null });
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');
      const result = await rewardsService.updateReward(REWARD_ID, { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw when update fails', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: null, error: { message: 'Update failed' } });
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');

      await expect(
        rewardsService.updateReward(REWARD_ID, { name: 'New name' })
      ).rejects.toThrow('Failed to update reward');
    });
  });

  describe('deleteReward()', () => {
    it('should soft-delete (deactivate) a reward', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: null, error: null });
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');

      await expect(rewardsService.deleteReward(REWARD_ID)).resolves.toBeUndefined();
    });

    it('should throw when deactivation fails', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: null, error: { message: 'Update failed' } });
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');

      await expect(rewardsService.deleteReward(REWARD_ID)).rejects.toThrow('Failed to delete reward');
    });
  });

  describe('initializeDefaultRewards()', () => {
    it('should skip initialization when rewards already exist', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      let callCount = 0;

      const chain = makeChain(null);
      (chain as Record<string, unknown>).then = vi.fn((resolve: (v: unknown) => unknown) => {
        callCount++;
        // First call returns existing rewards (count > 0)
        return resolve(callCount === 1 ? { count: 3, data: null, error: null } : { data: [MOCK_REWARD], error: null });
      });

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');
      const result = await rewardsService.initializeDefaultRewards(SPACE_ID, USER_ID);

      // Should return existing rewards without creating new ones
      expect(Array.isArray(result)).toBe(true);
    });

    it('should create default rewards when space has none', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      let callCount = 0;

      const chain = makeChain(null);
      (chain as Record<string, unknown>).then = vi.fn((resolve: (v: unknown) => unknown) => {
        callCount++;
        if (callCount === 1) {
          return resolve({ count: 0, data: null, error: null });
        }
        return resolve({ data: [MOCK_REWARD], error: null });
      });

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');
      const result = await rewardsService.initializeDefaultRewards(SPACE_ID, USER_ID);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getRedemptions()', () => {
    it('should return redemptions for a space', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: [MOCK_REDEMPTION], error: null });
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');
      const result = await rewardsService.getRedemptions(SPACE_ID);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
    });

    it('should throw when fetch fails', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: null, error: { message: 'Query failed' } });
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');

      await expect(rewardsService.getRedemptions(SPACE_ID)).rejects.toThrow('Failed to fetch redemptions');
    });
  });

  describe('getPendingRedemptionsCount()', () => {
    it('should return count of pending redemptions', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ count: 5, data: null, error: null });
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');
      const result = await rewardsService.getPendingRedemptionsCount(SPACE_ID);

      expect(result).toBe(5);
    });

    it('should return 0 when no pending redemptions', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ count: null, data: null, error: null });
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');
      const result = await rewardsService.getPendingRedemptionsCount(SPACE_ID);

      expect(result).toBe(0);
    });
  });

  describe('redeemReward()', () => {
    it('should redeem a reward via RPC and return redemption details', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      let callCount = 0;

      vi.mocked(createClient).mockReturnValue({
        rpc: vi.fn().mockResolvedValue({
          data: { success: true, redemption_id: REDEMPTION_ID },
          error: null,
        }),
        from: vi.fn().mockImplementation(() => {
          callCount++;
          return makeChain({ data: MOCK_REDEMPTION, error: null });
        }),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');
      const result = await rewardsService.redeemReward(USER_ID, SPACE_ID, REWARD_ID);

      expect(result.id).toBe(REDEMPTION_ID);
    });

    it('should throw when RPC fails', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      vi.mocked(createClient).mockReturnValue({
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insufficient points' },
        }),
        from: vi.fn(),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');

      await expect(
        rewardsService.redeemReward(USER_ID, SPACE_ID, REWARD_ID)
      ).rejects.toThrow('Failed to redeem reward');
    });

    it('should throw when RPC returns success=false', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      vi.mocked(createClient).mockReturnValue({
        rpc: vi.fn().mockResolvedValue({
          data: { success: false, error: 'Insufficient points' },
          error: null,
        }),
        from: vi.fn(),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');

      await expect(
        rewardsService.redeemReward(USER_ID, SPACE_ID, REWARD_ID)
      ).rejects.toThrow('Insufficient points');
    });
  });

  describe('approveRedemption()', () => {
    it('should approve a pending redemption', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const approved = { ...MOCK_REDEMPTION, status: 'approved', approved_by: USER_ID };
      const chain = makeChain({ data: approved, error: null });
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');
      const result = await rewardsService.approveRedemption(REDEMPTION_ID, USER_ID);

      expect(result.status).toBe('approved');
    });

    it('should throw when approval fails', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: null, error: { message: 'Update failed' } });
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');

      await expect(
        rewardsService.approveRedemption(REDEMPTION_ID, USER_ID)
      ).rejects.toThrow('Failed to approve redemption');
    });
  });

  describe('fulfillRedemption()', () => {
    it('should fulfill a redemption', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const fulfilled = { ...MOCK_REDEMPTION, status: 'fulfilled' };
      const chain = makeChain({ data: fulfilled, error: null });
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');
      const result = await rewardsService.fulfillRedemption(REDEMPTION_ID);

      expect(result.status).toBe('fulfilled');
    });
  });

  describe('denyRedemption()', () => {
    it('should throw when redemption is not pending', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const nonPending = { ...MOCK_REDEMPTION, status: 'approved' };
      const chain = makeChain({ data: nonPending, error: null });
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');

      await expect(
        rewardsService.denyRedemption(REDEMPTION_ID, USER_ID)
      ).rejects.toThrow('Can only deny pending redemptions');
    });

    it('should deny a pending redemption and refund points', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      let callCount = 0;

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // Fetch existing
            return makeChain({ data: MOCK_REDEMPTION, error: null });
          }
          // Update
          return makeChain({ data: { ...MOCK_REDEMPTION, status: 'denied' }, error: null });
        }),
      } as unknown as ReturnType<typeof createClient>);

      const { pointsService } = await import('@/lib/services/rewards/points-service');
      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');

      const result = await rewardsService.denyRedemption(REDEMPTION_ID, USER_ID, 'Not available');

      expect(result.status).toBe('denied');
      expect(pointsService.awardPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: USER_ID,
          points: MOCK_REDEMPTION.points_spent,
          source_type: 'adjustment',
        })
      );
    });
  });

  describe('cancelRedemption()', () => {
    it('should cancel a pending redemption and refund points', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      let callCount = 0;

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return makeChain({ data: MOCK_REDEMPTION, error: null });
          }
          return makeChain({ data: { ...MOCK_REDEMPTION, status: 'cancelled' }, error: null });
        }),
      } as unknown as ReturnType<typeof createClient>);

      const { pointsService } = await import('@/lib/services/rewards/points-service');
      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');

      const result = await rewardsService.cancelRedemption(REDEMPTION_ID, USER_ID);

      expect(result.status).toBe('cancelled');
      expect(pointsService.awardPoints).toHaveBeenCalled();
    });

    it('should throw when redemption is not pending', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const nonPending = { ...MOCK_REDEMPTION, status: 'fulfilled' };
      const chain = makeChain({ data: nonPending, error: null });
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');

      await expect(
        rewardsService.cancelRedemption(REDEMPTION_ID, USER_ID)
      ).rejects.toThrow('Can only cancel pending redemptions');
    });
  });

  describe('getRedemptionStats()', () => {
    it('should return stats with totals and categories', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const redemptions = [
        {
          points_spent: 100,
          reward: { id: REWARD_ID, name: 'Movie Night', category: 'entertainment' },
        },
        {
          points_spent: 50,
          reward: { id: REWARD_ID, name: 'Movie Night', category: 'entertainment' },
        },
      ];
      const chain = makeChain({ data: redemptions, error: null });
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');
      const result = await rewardsService.getRedemptionStats(SPACE_ID, 'month');

      expect(result.totalRedemptions).toBe(2);
      expect(result.totalPointsSpent).toBe(150);
      expect(result.byCategory['entertainment']).toBe(2);
      expect(result.topRewards.length).toBeGreaterThan(0);
    });

    it('should return zeros when no redemptions', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: [], error: null });
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');
      const result = await rewardsService.getRedemptionStats(SPACE_ID, 'week');

      expect(result.totalRedemptions).toBe(0);
      expect(result.totalPointsSpent).toBe(0);
      expect(result.topRewards).toHaveLength(0);
    });

    it('should throw when stats fetch fails', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: null, error: { message: 'Query failed' } });
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { rewardsService } = await import('@/lib/services/rewards/rewards-service');

      await expect(rewardsService.getRedemptionStats(SPACE_ID)).rejects.toThrow('Failed to fetch stats');
    });
  });
});
