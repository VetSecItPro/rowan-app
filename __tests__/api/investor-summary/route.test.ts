import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/investor-summary/[token]/route';

vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: vi.fn() } }));
vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));

function makeRateLimit(success: boolean) {
  return { success, limit: 60, remaining: success ? 59 : 0, reset: Date.now() + 60000 };
}

function makeChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'single', 'update', 'order', 'gte', 'lt', 'in'].forEach(m => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

const makeContext = (token: string) => ({
  params: Promise.resolve({ token }),
});

describe('/api/investor-summary/[token]', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(false));

      const req = new NextRequest('http://localhost/api/investor-summary/test-token');
      const res = await GET(req, makeContext('test-token'));
      expect(res.status).toBe(429);
    });

    it('returns 401 when token is invalid', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      const chain = makeChainMock({ data: null, error: { message: 'not found' } });
      vi.mocked(supabaseAdmin.from).mockReturnValue(chain as any);

      const req = new NextRequest('http://localhost/api/investor-summary/bad-token');
      const res = await GET(req, makeContext('bad-token'));
      expect(res.status).toBe(401);
    });

    it('returns 401 when token is revoked', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      const chain = makeChainMock({
        data: { id: 't-1', expires_at: new Date(Date.now() + 86400000).toISOString(), is_revoked: true, access_count: 0 },
        error: null,
      });
      vi.mocked(supabaseAdmin.from).mockReturnValue(chain as any);

      const req = new NextRequest('http://localhost/api/investor-summary/revoked-token');
      const res = await GET(req, makeContext('revoked-token'));
      expect(res.status).toBe(401);
    });

    it('returns 401 when token is expired', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      const chain = makeChainMock({
        data: { id: 't-1', expires_at: new Date(Date.now() - 1000).toISOString(), is_revoked: false, access_count: 0 },
        error: null,
      });
      vi.mocked(supabaseAdmin.from).mockReturnValue(chain as any);

      const req = new NextRequest('http://localhost/api/investor-summary/expired-token');
      const res = await GET(req, makeContext('expired-token'));
      expect(res.status).toBe(401);
    });
  });
});
