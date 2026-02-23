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

vi.mock('@/lib/services/admin-cache-service', () => ({
  withCache: vi.fn((_key: string, fn: () => Promise<unknown>) => fn()),
  ADMIN_CACHE_KEYS: {
    visitorAnalytics: vi.fn((range: string) => `visitor-analytics:${range}`),
  },
  ADMIN_CACHE_TTL: {
    analytics: 900,
  },
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

const mockVisits = [
  {
    visitor_hash: 'hash-abc',
    path: '/',
    referrer: 'https://google.com',
    utm_source: 'google',
    device_type: 'desktop',
    country: 'US',
    created_at: new Date().toISOString(),
  },
  {
    visitor_hash: 'hash-def',
    path: '/about',
    referrer: null,
    utm_source: null,
    device_type: 'mobile',
    country: 'CA',
    created_at: new Date().toISOString(),
  },
];

const mockSignups = [
  { id: '550e8400-e29b-41d4-a716-446655440011', created_at: new Date().toISOString() },
];

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

function buildChain(resolvedData: unknown) {
  const chain: Record<string, unknown> = {};
  const handler = () => chain;
  ['select', 'eq', 'gte', 'lt', 'lte', 'in', 'order', 'limit', 'neq', 'is', 'not'].forEach(m => {
    chain[m] = vi.fn(handler);
  });
  chain.then = vi.fn((resolve: (v: unknown) => unknown) =>
    resolve({ data: resolvedData, error: null })
  );
  return chain;
}

async function setupSupabaseWithMockData() {
  const { supabaseAdmin } = await import('@/lib/supabase/admin');
  let callIndex = 0;
  vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
    const idx = callIndex++;
    if (table === 'site_visits') {
      return { select: vi.fn(() => buildChain(mockVisits)) } as any;
    }
    // users table -> signups
    return { select: vi.fn(() => buildChain(mockSignups)) } as any;
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('/api/admin/visitor-analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { GET } = await import('@/app/api/admin/visitor-analytics/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_FAIL);

      const req = new NextRequest('http://localhost/api/admin/visitor-analytics');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when admin session cookie is absent', async () => {
      const { GET } = await import('@/app/api/admin/visitor-analytics/route');
      await setupAuth(false);

      const req = new NextRequest('http://localhost/api/admin/visitor-analytics');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Admin authentication required');
    });

    it('returns 401 when session validation fails', async () => {
      const { GET } = await import('@/app/api/admin/visitor-analytics/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
      const { decryptSessionData, validateSessionData } = await import('@/lib/utils/session-crypto-edge');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
      vi.mocked(safeCookiesAsync).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'encrypted' }),
      } as any);
      vi.mocked(decryptSessionData).mockResolvedValue({ adminId: ADMIN_ID });
      vi.mocked(validateSessionData).mockReturnValue(false);

      const req = new NextRequest('http://localhost/api/admin/visitor-analytics');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Session expired or invalid');
    });

    it('returns 401 when session decryption throws', async () => {
      const { GET } = await import('@/app/api/admin/visitor-analytics/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
      const { decryptSessionData } = await import('@/lib/utils/session-crypto-edge');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
      vi.mocked(safeCookiesAsync).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'bad' }),
      } as any);
      vi.mocked(decryptSessionData).mockRejectedValue(new Error('Decryption failed'));

      const req = new NextRequest('http://localhost/api/admin/visitor-analytics');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Invalid session');
    });

    it('returns 400 for invalid range parameter', async () => {
      const { GET } = await import('@/app/api/admin/visitor-analytics/route');
      await setupAuth(true);

      const req = new NextRequest('http://localhost/api/admin/visitor-analytics?range=365d');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid query parameters');
    });

    it('returns 200 with visitor analytics for authenticated admin (default 30d)', async () => {
      const { GET } = await import('@/app/api/admin/visitor-analytics/route');
      await setupAuth(true);
      await setupSupabaseWithMockData();

      const req = new NextRequest('http://localhost/api/admin/visitor-analytics');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.visitorAnalytics).toBeDefined();
    });

    it('returns expected analytics fields', async () => {
      const { GET } = await import('@/app/api/admin/visitor-analytics/route');
      await setupAuth(true);
      await setupSupabaseWithMockData();

      const req = new NextRequest('http://localhost/api/admin/visitor-analytics');
      const res = await GET(req);
      const data = await res.json();

      const analytics = data.visitorAnalytics;
      expect(typeof analytics.uniqueVisitors).toBe('number');
      expect(typeof analytics.totalPageViews).toBe('number');
      expect(typeof analytics.pagesPerVisit).toBe('number');
      expect(Array.isArray(analytics.topPages)).toBe(true);
      expect(Array.isArray(analytics.topReferrers)).toBe(true);
      expect(Array.isArray(analytics.topUtmSources)).toBe(true);
      expect(Array.isArray(analytics.deviceBreakdown)).toBe(true);
      expect(Array.isArray(analytics.countryBreakdown)).toBe(true);
      expect(Array.isArray(analytics.dailyTrend)).toBe(true);
      expect(typeof analytics.signupConversionRate).toBe('number');
      expect(typeof analytics.totalSignups).toBe('number');
      expect(analytics.lastUpdated).toBeDefined();
    });

    it('accepts 7d range parameter', async () => {
      const { GET } = await import('@/app/api/admin/visitor-analytics/route');
      await setupAuth(true);
      await setupSupabaseWithMockData();

      const req = new NextRequest('http://localhost/api/admin/visitor-analytics?range=7d');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('accepts 90d range parameter', async () => {
      const { GET } = await import('@/app/api/admin/visitor-analytics/route');
      await setupAuth(true);
      await setupSupabaseWithMockData();

      const req = new NextRequest('http://localhost/api/admin/visitor-analytics?range=90d');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('correctly counts unique visitors from visit data', async () => {
      const { GET } = await import('@/app/api/admin/visitor-analytics/route');
      await setupAuth(true);
      await setupSupabaseWithMockData();

      const req = new NextRequest('http://localhost/api/admin/visitor-analytics');
      const res = await GET(req);
      const data = await res.json();

      // mockVisits has 2 distinct visitor_hashes (hash-abc, hash-def)
      expect(data.visitorAnalytics.uniqueVisitors).toBe(2);
      expect(data.visitorAnalytics.totalPageViews).toBe(2);
    });

    it('normalizes referrer URLs to hostnames', async () => {
      const { GET } = await import('@/app/api/admin/visitor-analytics/route');
      await setupAuth(true);
      await setupSupabaseWithMockData();

      const req = new NextRequest('http://localhost/api/admin/visitor-analytics');
      const res = await GET(req);
      const data = await res.json();

      const referrers = data.visitorAnalytics.topReferrers;
      // 'https://google.com' should normalize to 'google.com'
      const googleReferrer = referrers.find((r: { referrer: string }) => r.referrer === 'google.com');
      expect(googleReferrer).toBeDefined();
    });

    it('handles Direct traffic (null referrer)', async () => {
      const { GET } = await import('@/app/api/admin/visitor-analytics/route');
      await setupAuth(true);
      await setupSupabaseWithMockData();

      const req = new NextRequest('http://localhost/api/admin/visitor-analytics');
      const res = await GET(req);
      const data = await res.json();

      const referrers = data.visitorAnalytics.topReferrers;
      const directReferrer = referrers.find((r: { referrer: string }) => r.referrer === 'Direct');
      expect(directReferrer).toBeDefined();
    });

    it('bypasses cache when refresh=true', async () => {
      const { GET } = await import('@/app/api/admin/visitor-analytics/route');
      await setupAuth(true);
      await setupSupabaseWithMockData();
      const { withCache } = await import('@/lib/services/admin-cache-service');

      const req = new NextRequest('http://localhost/api/admin/visitor-analytics?refresh=true');
      await GET(req);

      expect(withCache).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({ skipCache: true })
      );
    });

    it('includes previousPeriod when compare=true', async () => {
      const { GET } = await import('@/app/api/admin/visitor-analytics/route');
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      // With compare=true the route makes 4 queries (visits, signups, prevVisits, prevSignups)
      let callIndex = 0;
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        callIndex++;
        if (table === 'site_visits') {
          return { select: vi.fn(() => buildChain(mockVisits)) } as any;
        }
        return { select: vi.fn(() => buildChain(mockSignups)) } as any;
      });

      const req = new NextRequest('http://localhost/api/admin/visitor-analytics?compare=true');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.visitorAnalytics.previousPeriod).toBeDefined();
      expect(typeof data.visitorAnalytics.previousPeriod.uniqueVisitors).toBe('number');
    });

    it('returns 500 when database query throws unexpected error', async () => {
      const { GET } = await import('@/app/api/admin/visitor-analytics/route');
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      // Make then() throw a non-settled rejection (simulate unexpected DB error)
      const chain: Record<string, unknown> = {};
      const handler = () => chain;
      ['select', 'eq', 'gte', 'lt', 'lte', 'in', 'order', 'limit', 'neq', 'is', 'not'].forEach(m => {
        chain[m] = vi.fn(handler);
      });
      chain.then = vi.fn((_resolve: unknown, reject: (e: unknown) => unknown) =>
        reject(new Error('DB totally broken'))
      );
      // The outer try/catch in GET needs to catch — make the from() itself throw
      vi.mocked(supabaseAdmin.from).mockImplementation(() => {
        throw new Error('DB connection lost');
      });

      const req = new NextRequest('http://localhost/api/admin/visitor-analytics');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toContain('Failed to fetch visitor analytics data');
    });
  });
});
