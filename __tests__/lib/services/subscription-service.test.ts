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
        data: { user_id: 'user1', tier: 'pro', status: 'active' },
        error: null,
      });

      const result = await getUserSubscription('user1');

      expect(result).toHaveProperty('tier', 'pro');
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
        data: { tier: 'pro', status: 'active' },
        error: null,
      });

      const result = await getUserTier('user1');

      expect(result).toBe('pro');
    });

    it('should return free tier when subscription inactive', async () => {
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: { tier: 'pro', status: 'canceled' },
        error: null,
      });

      const result = await getUserTier('user1');

      expect(result).toBe('free');
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
