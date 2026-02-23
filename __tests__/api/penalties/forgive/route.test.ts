import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/penalties/forgive/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/services/rewards/late-penalty-service', () => ({
  forgivePenalty: vi.fn(),
  getSpacePenaltySettings: vi.fn(),
}));
vi.mock('@/lib/services/feature-access-service', () => ({ canAccessFeature: vi.fn() }));
vi.mock('@/lib/middleware/subscription-check', () => ({
  buildUpgradeResponse: vi.fn(() => new Response(JSON.stringify({ error: 'upgrade required' }), { status: 402 })),
}));

function makeRateLimit(success: boolean) {
  return { success, limit: 60, remaining: success ? 59 : 0, reset: Date.now() + 60000 };
}

const validPenaltyId = '00000000-0000-4000-8000-000000000099';

function makeMultiChain(responses: Record<string, unknown>) {
  const callIndex = 0;
  const tables = Object.keys(responses);
  return {
    from: vi.fn((table: string) => {
      const chain: Record<string, unknown> = {};
      const handler = () => chain;
      ['select', 'eq', 'single', 'update'].forEach(m => { chain[m] = vi.fn(handler); });
      chain.then = vi.fn((resolve: (v: unknown) => unknown) =>
        resolve(responses[table] ?? { data: null, error: null })
      );
      return chain;
    }),
  };
}

describe('/api/penalties/forgive', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST', () => {
    it('returns 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(false));

      const res = await POST(new NextRequest('http://localhost/api/penalties/forgive', {
        method: 'POST',
        body: JSON.stringify({ penaltyId: validPenaltyId }),
      }));
      expect(res.status).toBe(429);
    });

    it('returns 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      } as any);

      const res = await POST(new NextRequest('http://localhost/api/penalties/forgive', {
        method: 'POST',
        body: JSON.stringify({ penaltyId: validPenaltyId }),
      }));
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid penaltyId format', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      } as any);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'pro' } as any);

      const res = await POST(new NextRequest('http://localhost/api/penalties/forgive', {
        method: 'POST',
        body: JSON.stringify({ penaltyId: 'not-a-uuid' }),
      }));
      expect(res.status).toBe(400);
    });

    it('returns 404 when penalty is not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      const chain: Record<string, unknown> = {};
      const handler = () => chain;
      ['select', 'eq', 'single'].forEach(m => { chain[m] = vi.fn(handler); });
      chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ data: null, error: { message: 'not found' } }));
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
        from: vi.fn(() => chain),
      } as any);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'pro' } as any);

      const res = await POST(new NextRequest('http://localhost/api/penalties/forgive', {
        method: 'POST',
        body: JSON.stringify({ penaltyId: validPenaltyId }),
      }));
      expect(res.status).toBe(404);
    });
  });
});
