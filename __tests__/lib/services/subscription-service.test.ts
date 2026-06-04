import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserSubscription, getUserTier, hasActiveSubscription } from '@/lib/services/subscription-service';

const mockSupabaseClient = vi.hoisted(() => ({
  from: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  eq: vi.fn(() => mockSupabaseClient),
  maybeSingle: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

vi.mock('@/lib/cache', () => ({
  getCache: vi.fn(() => null),
  setCache: vi.fn(),
  deleteCache: vi.fn(),
  cacheKeys: { subscription: vi.fn(() => 'sub-key') },
  CACHE_TTL: { SHORT: 120 },
}));

describe('subscription-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserSubscription', () => {
    it('should return subscription for user', async () => {
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: { user_id: 'user1', tier: 'plus', status: 'active' },
        error: null,
      });

      const result = await getUserSubscription('user1');

      expect(result).toHaveProperty('tier', 'plus');
      expect(result).toHaveProperty('status', 'active');
    });

    it('should return null when no subscription exists', async () => {
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      const result = await getUserSubscription('user1');

      expect(result).toBeNull();
    });

    it('should throw on database error', async () => {
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'DB error', code: '500' },
      });

      await expect(getUserSubscription('user1')).rejects.toThrow();
    });
  });

  describe('getUserTier', () => {
    it('should return free tier when no subscription', async () => {
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      const result = await getUserTier('user1');

      expect(result).toBe('free');
    });

    it('should return subscription tier when active', async () => {
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: { tier: 'plus', status: 'active' },
        error: null,
      });

      const result = await getUserTier('user1');

      expect(result).toBe('plus');
    });

    it('should return free tier when subscription inactive', async () => {
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: { tier: 'plus', status: 'canceled' },
        error: null,
      });

      const result = await getUserTier('user1');

      expect(result).toBe('free');
    });

    // Phase 11.4 cancel-vs-revoke split: the money-affecting entitlement boundary.
    // A user who CANCELS keeps their paid tier until subscription_ends_at; only
    // subscription.revoked (which getUserTier sees as canceled + past end) removes
    // access. These guard that a cancelled-but-not-yet-expired user is NOT
    // prematurely downgraded (would strip features they paid for) and that an
    // expired one IS downgraded (would otherwise grant free access forever).
    it('KEEPS the paid tier when canceled but still within the paid-through date', async () => {
      const futureEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: { tier: 'family', status: 'canceled', subscription_ends_at: futureEnd },
        error: null,
      });

      const result = await getUserTier('user1');

      expect(result).toBe('family');
    });

    it('downgrades to free when canceled AND past the paid-through date', async () => {
      const pastEnd = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: { tier: 'family', status: 'canceled', subscription_ends_at: pastEnd },
        error: null,
      });

      const result = await getUserTier('user1');

      expect(result).toBe('free');
    });

    // Phase 11.3 dunning: past_due is Polar's card-retry window. Access MUST
    // continue (we keep billing them) until Polar gives up and sends revoke.
    it('KEEPS the paid tier while past_due (dunning window, access continues)', async () => {
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: { tier: 'plus', status: 'past_due' },
        error: null,
      });

      const result = await getUserTier('user1');

      expect(result).toBe('plus');
    });

    // Owner is never downgraded — checked before status, so any state stays owner.
    it('never downgrades an owner-tier row regardless of status', async () => {
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: { tier: 'owner', status: 'canceled', subscription_ends_at: null },
        error: null,
      });

      const result = await getUserTier('user1');

      expect(result).toBe('owner');
    });

    // Trial-only user (no Polar subscription) past trial end → free, even though
    // an active trial row would otherwise read as entitled.
    it('downgrades a trial-only user whose trial has expired to free', async () => {
      const pastTrial = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: {
          tier: 'plus',
          status: 'active',
          trial_ends_at: pastTrial,
          polar_subscription_id: null,
        },
        error: null,
      });

      const result = await getUserTier('user1');

      expect(result).toBe('free');
    });

    // Legacy 'pro' rows must normalize to 'plus' at the read boundary (rename keystone).
    it('normalizes a legacy pro row to plus', async () => {
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: { tier: 'pro', status: 'active' },
        error: null,
      });

      const result = await getUserTier('user1');

      expect(result).toBe('plus');
    });
  });

  describe('hasActiveSubscription', () => {
    it('should return true for active subscription', async () => {
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: { status: 'active' },
        error: null,
      });

      const result = await hasActiveSubscription('user1');

      expect(result).toBe(true);
    });

    it('should return false when no subscription', async () => {
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      const result = await hasActiveSubscription('user1');

      expect(result).toBe(false);
    });
  });
});
