import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/penalties/settings/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/services/rewards/late-penalty-service', () => ({
  getSpacePenaltySettings: vi.fn(),
  updateSpacePenaltySettings: vi.fn(),
}));
vi.mock('@/lib/services/feature-access-service', () => ({ canAccessFeature: vi.fn() }));
vi.mock('@/lib/middleware/subscription-check', () => ({
  buildUpgradeResponse: vi.fn(() => new Response(JSON.stringify({ error: 'upgrade' }), { status: 402 })),
}));
vi.mock('@/lib/utils/cache-headers', () => ({ withUserDataCache: vi.fn((res: unknown) => res) }));

function makeRateLimit(success: boolean) {
  return { success, limit: 60, remaining: success ? 59 : 0, reset: Date.now() + 60000 };
}

function makeChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'single'].forEach(m => { mock[m] = vi.fn(handler); });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

describe('/api/penalties/settings', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(false));

      const res = await GET(new NextRequest('http://localhost/api/penalties/settings?spaceId=space-1'));
      expect(res.status).toBe(429);
    });

    it('returns 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      } as any);

      const res = await GET(new NextRequest('http://localhost/api/penalties/settings?spaceId=space-1'));
      expect(res.status).toBe(401);
    });

    it('returns 400 when spaceId is missing', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      } as any);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'pro' } as any);

      const res = await GET(new NextRequest('http://localhost/api/penalties/settings'));
      expect(res.status).toBe(400);
    });

    it('returns 200 with settings on success', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { getSpacePenaltySettings } = await import('@/lib/services/rewards/late-penalty-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      const memberChain = makeChainMock({ data: { role: 'owner' }, error: null });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
        from: vi.fn(() => memberChain),
      } as any);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'pro' } as any);
      vi.mocked(getSpacePenaltySettings).mockResolvedValue({ enabled: true, default_penalty_points: 10 } as any);

      const res = await GET(new NextRequest('http://localhost/api/penalties/settings?spaceId=space-1'));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.settings.enabled).toBe(true);
    });
  });

  describe('PUT', () => {
    it('returns 403 when user is not admin', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      const memberChain = makeChainMock({ data: { role: 'member' }, error: null });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
        from: vi.fn(() => memberChain),
      } as any);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'pro' } as any);

      const res = await PUT(new NextRequest('http://localhost/api/penalties/settings', {
        method: 'PUT',
        body: JSON.stringify({ spaceId: '00000000-0000-4000-8000-000000000001', settings: { enabled: true } }),
      }));
      expect(res.status).toBe(403);
    });
  });
});
