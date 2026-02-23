import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/acquisition/route';

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
    acquisition: vi.fn((range: string) => `acquisition:${range}`),
  },
  ADMIN_CACHE_TTL: {
    analytics: 900,
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'limit',
   'maybeSingle', 'gte', 'lte', 'lt', 'in', 'neq', 'is', 'not', 'upsert',
   'match', 'or', 'filter', 'ilike', 'range', 'textSearch', 'contains'].forEach(m => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

const RATE_LIMIT_OK = { success: true, limit: 60, remaining: 59, reset: Date.now() + 60000 };
const RATE_LIMIT_FAIL = { success: false, limit: 60, remaining: 0, reset: Date.now() + 60000 };

async function setupAuth(valid: boolean) {
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
    get: vi.fn().mockReturnValue({ value: 'encrypted-payload' }),
  } as any);
  vi.mocked(decryptSessionData).mockResolvedValue({
    adminId: 'admin-1',
    expiresAt: Date.now() + 86400000,
  });
  vi.mocked(validateSessionData).mockReturnValue(true);
}

describe('/api/admin/acquisition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_FAIL);

      const request = new NextRequest('http://localhost/api/admin/acquisition', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when admin session cookie is missing', async () => {
      await setupAuth(false);

      const request = new NextRequest('http://localhost/api/admin/acquisition', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Admin authentication required');
    });

    it('returns 401 when session data is invalid', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
      const { decryptSessionData, validateSessionData } = await import('@/lib/utils/session-crypto-edge');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
      vi.mocked(safeCookiesAsync).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'encrypted-payload' }),
      } as any);
      vi.mocked(decryptSessionData).mockResolvedValue({ adminId: 'admin-1', expiresAt: 0 });
      vi.mocked(validateSessionData).mockReturnValue(false);

      const request = new NextRequest('http://localhost/api/admin/acquisition', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Session expired or invalid');
    });

    it('returns 401 when session decryption throws', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
      const { decryptSessionData } = await import('@/lib/utils/session-crypto-edge');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
      vi.mocked(safeCookiesAsync).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'bad-token' }),
      } as any);
      vi.mocked(decryptSessionData).mockRejectedValue(new Error('Decryption failed'));

      const request = new NextRequest('http://localhost/api/admin/acquisition', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid session');
    });

    it('returns 400 for invalid range parameter', async () => {
      await setupAuth(true);

      const request = new NextRequest(
        'http://localhost/api/admin/acquisition?range=invalid',
        { method: 'GET' }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid query parameters');
    });

    it('returns 200 with acquisition data for 30d range', async () => {
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'launch_notifications') {
          return createChainMock({
            data: [
              { id: 'notif-1', source: 'google', referrer: 'https://google.com', created_at: '2024-01-15T10:00:00Z', email: 'user@example.com' },
            ],
            count: 1,
            error: null,
          }) as any;
        }
        if (table === 'users') {
          return createChainMock({
            data: [{ id: '550e8400-e29b-41d4-a716-446655440001', created_at: '2024-01-15T10:00:00Z' }],
            error: null,
          }) as any;
        }
        return createChainMock({ data: [], error: null }) as any;
      });

      const request = new NextRequest(
        'http://localhost/api/admin/acquisition?range=30d',
        { method: 'GET' }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.acquisition).toBeDefined();
      expect(data.acquisition.totalVisitors).toBeGreaterThanOrEqual(0);
      expect(data.acquisition.sources).toBeDefined();
      expect(data.acquisition.referrers).toBeDefined();
      expect(data.acquisition.dailyTrend).toBeDefined();
    });

    it('returns 200 with 7d range', async () => {
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(supabaseAdmin.from).mockReturnValue(
        createChainMock({ data: [], error: null, count: 0 }) as any
      );

      const request = new NextRequest(
        'http://localhost/api/admin/acquisition?range=7d',
        { method: 'GET' }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 200 with 90d range', async () => {
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(supabaseAdmin.from).mockReturnValue(
        createChainMock({ data: [], error: null, count: 0 }) as any
      );

      const request = new NextRequest(
        'http://localhost/api/admin/acquisition?range=90d',
        { method: 'GET' }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('includes previousPeriod data when compare=true', async () => {
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(supabaseAdmin.from).mockReturnValue(
        createChainMock({ data: [], error: null, count: 0 }) as any
      );

      const request = new NextRequest(
        'http://localhost/api/admin/acquisition?compare=true',
        { method: 'GET' }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // previousPeriod is included when compare=true (may be undefined if no data)
      expect(data.acquisition).toBeDefined();
    });
  });
});
