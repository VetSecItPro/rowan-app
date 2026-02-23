import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock('@/lib/utils/safe-cookies', () => ({
  safeCookiesAsync: vi.fn(),
}));

vi.mock('@/lib/utils/session-crypto-edge', () => ({
  decryptSessionData: vi.fn(),
  validateSessionData: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RATE_LIMIT_OK = { success: true, limit: 60, remaining: 59, reset: Date.now() + 60000 };
const RATE_LIMIT_FAIL = { success: false, limit: 60, remaining: 0, reset: Date.now() + 60000 };
const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001';

async function setupAuth(valid = true) {
  const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
  const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
  const { decryptSessionData, validateSessionData } = await import('@/lib/utils/session-crypto-edge');

  vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);

  if (!valid) {
    vi.mocked(safeCookiesAsync).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any);
    return;
  }

  vi.mocked(safeCookiesAsync).mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: 'encrypted-session' }),
  } as any);
  vi.mocked(decryptSessionData).mockResolvedValue({ adminId: ADMIN_ID, email: 'admin@example.com' });
  vi.mocked(validateSessionData).mockReturnValue(true);
}

/**
 * Build a Supabase mock that chains: .from().select().eq().gte().lt() etc.
 * and ultimately resolves to { data, count, error }
 */
function buildCountChain(count: number) {
  const chain: Record<string, unknown> = {};
  const handler = () => chain;
  ['eq', 'gte', 'lt', 'lte', 'in', 'order', 'limit', 'neq', 'is'].forEach(m => {
    chain[m] = vi.fn(handler);
  });
  chain.then = vi.fn((resolve: (v: unknown) => unknown) =>
    resolve({ data: null, count, error: null })
  );
  return chain;
}

function buildDataChain(data: unknown[]) {
  const chain: Record<string, unknown> = {};
  const handler = () => chain;
  ['eq', 'gte', 'lt', 'lte', 'in', 'order', 'limit', 'neq', 'is'].forEach(m => {
    chain[m] = vi.fn(handler);
  });
  chain.then = vi.fn((resolve: (v: unknown) => unknown) =>
    resolve({ data, count: null, error: null })
  );
  return chain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('/api/admin/notifications/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { GET } = await import('@/app/api/admin/notifications/stats/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_FAIL);

      const req = new NextRequest('http://localhost/api/admin/notifications/stats');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when admin session cookie is absent', async () => {
      const { GET } = await import('@/app/api/admin/notifications/stats/route');
      await setupAuth(false);

      const req = new NextRequest('http://localhost/api/admin/notifications/stats');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Admin authentication required');
    });

    it('returns 401 when session validation fails', async () => {
      const { GET } = await import('@/app/api/admin/notifications/stats/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
      const { decryptSessionData, validateSessionData } = await import('@/lib/utils/session-crypto-edge');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
      vi.mocked(safeCookiesAsync).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'encrypted' }),
      } as any);
      vi.mocked(decryptSessionData).mockResolvedValue({ adminId: ADMIN_ID });
      vi.mocked(validateSessionData).mockReturnValue(false);

      const req = new NextRequest('http://localhost/api/admin/notifications/stats');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Invalid or expired session');
    });

    it('returns 401 when session decryption throws', async () => {
      const { GET } = await import('@/app/api/admin/notifications/stats/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
      const { decryptSessionData } = await import('@/lib/utils/session-crypto-edge');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
      vi.mocked(safeCookiesAsync).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'bad' }),
      } as any);
      vi.mocked(decryptSessionData).mockRejectedValue(new Error('Decryption failed'));

      const req = new NextRequest('http://localhost/api/admin/notifications/stats');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Invalid session');
    });

    it('returns 200 with stats for authenticated admin', async () => {
      const { GET } = await import('@/app/api/admin/notifications/stats/route');
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      // The route runs 6 parallel queries. We need to handle the select() call
      // and return different chains depending on what is chained after.
      let callIndex = 0;
      vi.mocked(supabaseAdmin.from).mockImplementation(() => {
        const idx = callIndex++;
        // Queries 0-4 are count queries, query 5 is source data
        if (idx < 5) {
          const chain = buildCountChain(idx === 0 ? 100 : idx === 1 ? 80 : idx === 2 ? 20 : idx === 3 ? 5 : 30);
          return { select: vi.fn(() => chain) } as any;
        }
        // Source breakdown query
        const chain = buildDataChain([{ source: 'homepage' }, { source: 'social' }, { source: 'homepage' }]);
        return { select: vi.fn(() => chain) } as any;
      });

      const req = new NextRequest('http://localhost/api/admin/notifications/stats');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stats).toBeDefined();
      expect(data.stats.lastUpdated).toBeDefined();
    });

    it('returns 200 with zeros when all db queries fail', async () => {
      const { GET } = await import('@/app/api/admin/notifications/stats/route');
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      // All queries reject — the route uses Promise.allSettled so it should still succeed
      vi.mocked(supabaseAdmin.from).mockImplementation(() => {
        const chain: Record<string, unknown> = {};
        const handler = () => chain;
        ['eq', 'gte', 'lt', 'lte', 'in', 'order', 'limit', 'neq', 'is'].forEach(m => {
          chain[m] = vi.fn(handler);
        });
        chain.then = vi.fn((_: unknown, reject: (e: unknown) => unknown) =>
          reject(new Error('DB unavailable'))
        );
        return { select: vi.fn(() => chain) } as any;
      });

      const req = new NextRequest('http://localhost/api/admin/notifications/stats');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stats.total).toBe(0);
      expect(data.stats.subscribed).toBe(0);
    });

    it('returns stats with computed metrics', async () => {
      const { GET } = await import('@/app/api/admin/notifications/stats/route');
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      let callIndex = 0;
      vi.mocked(supabaseAdmin.from).mockImplementation(() => {
        const idx = callIndex++;
        if (idx < 5) {
          const counts = [200, 150, 50, 10, 70];
          const chain = buildCountChain(counts[idx] ?? 0);
          return { select: vi.fn(() => chain) } as any;
        }
        const chain = buildDataChain([
          { source: 'homepage' },
          { source: 'homepage' },
          { source: 'social' },
        ]);
        return { select: vi.fn(() => chain) } as any;
      });

      const req = new NextRequest('http://localhost/api/admin/notifications/stats');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.stats.metrics).toBeDefined();
      expect(typeof data.stats.metrics.subscriptionRate).toBe('number');
      expect(data.stats.topSources).toBeDefined();
      expect(Array.isArray(data.stats.topSources)).toBe(true);
    });
  });
});
