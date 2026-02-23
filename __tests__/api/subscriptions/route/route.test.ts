import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/subscriptions/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/services/feature-access-service', () => ({ getUserFeatureAccess: vi.fn() }));
vi.mock('@/lib/services/subscription-service', () => ({ getSubscriptionStatus: vi.fn() }));
vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

function makeRateLimit(success: boolean) {
  return { success, limit: 60, remaining: success ? 59 : 0, reset: Date.now() + 60000 };
}

describe('/api/subscriptions', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(false));

      const res = await GET(new NextRequest('http://localhost/api/subscriptions'));
      expect(res.status).toBe(429);
    });

    it('returns 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Unauthenticated' } }) },
      } as any);

      const res = await GET(new NextRequest('http://localhost/api/subscriptions'));
      expect(res.status).toBe(401);
    });

    it('returns 200 with subscription data on success', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { getSubscriptionStatus } = await import('@/lib/services/subscription-service');
      const { getUserFeatureAccess } = await import('@/lib/services/feature-access-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      } as any);
      vi.mocked(getSubscriptionStatus).mockResolvedValue({
        tier: 'pro', status: 'active', isActive: true, isPastDue: false,
        isCanceled: false, expiresAt: null, daysUntilExpiration: null,
        isInTrial: false, trialDaysRemaining: null, trialEndsAt: null,
      } as any);
      vi.mocked(getUserFeatureAccess).mockResolvedValue({
        features: {}, limits: {}, dailyUsage: {},
      } as any);

      const res = await GET(new NextRequest('http://localhost/api/subscriptions'));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.tier).toBe('pro');
      expect(data.subscription.isActive).toBe(true);
    });

    it('returns mock tier in dev mode when mockTier param is present', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      const originalEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = 'development';

      const res = await GET(new NextRequest('http://localhost/api/subscriptions?mockTier=pro'));
      const data = await res.json();
      expect(data._mock).toBe(true);
      expect(data.tier).toBe('pro');
      (process.env as any).NODE_ENV = originalEnv;
    });
  });
});
