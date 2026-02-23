import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/polar/portal/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/polar', () => ({ getPolarClient: vi.fn() }));
vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/security/csrf-validation', () => ({ validateCsrfRequest: vi.fn(() => null) }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

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

describe('/api/polar/portal', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST', () => {
    it('returns 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(false));

      const res = await POST(new NextRequest('http://localhost/api/polar/portal', { method: 'POST' }));
      expect(res.status).toBe(429);
    });

    it('returns 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      } as any);

      const res = await POST(new NextRequest('http://localhost/api/polar/portal', { method: 'POST' }));
      expect(res.status).toBe(401);
    });

    it('returns 503 when Polar client is not configured', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { getPolarClient } = await import('@/lib/polar');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      } as any);
      vi.mocked(getPolarClient).mockResolvedValue(null as any);

      const res = await POST(new NextRequest('http://localhost/api/polar/portal', { method: 'POST' }));
      expect(res.status).toBe(503);
    });

    it('returns 400 when no Polar customer ID found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { getPolarClient } = await import('@/lib/polar');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      const subChain = makeChainMock({ data: { polar_customer_id: null }, error: null });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
        from: vi.fn(() => subChain),
      } as any);
      vi.mocked(getPolarClient).mockResolvedValue({} as any);

      const res = await POST(new NextRequest('http://localhost/api/polar/portal', { method: 'POST' }));
      expect(res.status).toBe(400);
    });

    it('returns 200 with portal URL on success', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { getPolarClient } = await import('@/lib/polar');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      const subChain = makeChainMock({ data: { polar_customer_id: 'cust-123' }, error: null });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
        from: vi.fn(() => subChain),
      } as any);
      vi.mocked(getPolarClient).mockResolvedValue({
        customerSessions: {
          create: vi.fn().mockResolvedValue({ customerPortalUrl: 'https://polar.sh/portal' }),
        },
      } as any);

      const res = await POST(new NextRequest('http://localhost/api/polar/portal', { method: 'POST' }));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.url).toBe('https://polar.sh/portal');
    });
  });
});
