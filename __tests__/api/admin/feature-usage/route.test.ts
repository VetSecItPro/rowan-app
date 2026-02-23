import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/admin/feature-usage/route';

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/lib/utils/session-crypto-edge', () => ({
  decryptSessionData: vi.fn(),
  validateSessionData: vi.fn(),
}));

vi.mock('@/lib/services/admin-cache-service', () => ({
  withCache: vi.fn((_key: string, fn: () => Promise<unknown>) => fn()),
  ADMIN_CACHE_KEYS: {
    analytics: vi.fn((range: string) => `analytics:${range}`),
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
  const { cookies } = await import('next/headers');
  const { decryptSessionData, validateSessionData } = await import('@/lib/utils/session-crypto-edge');

  vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);

  if (!valid) {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any);
    return;
  }

  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: 'encrypted-payload' }),
  } as any);
  vi.mocked(decryptSessionData).mockResolvedValue({
    adminId: 'admin-1',
    expiresAt: Date.now() + 86400000,
  });
  vi.mocked(validateSessionData).mockReturnValue(true);
}

describe('/api/admin/feature-usage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_FAIL);

      const request = new NextRequest('http://localhost/api/admin/feature-usage', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when admin session cookie is missing', async () => {
      await setupAuth(false);

      const request = new NextRequest('http://localhost/api/admin/feature-usage', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Admin authentication required');
    });

    it('returns 401 when session data is invalid', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { cookies } = await import('next/headers');
      const { decryptSessionData, validateSessionData } = await import('@/lib/utils/session-crypto-edge');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'encrypted-payload' }),
      } as any);
      vi.mocked(decryptSessionData).mockResolvedValue({ adminId: 'admin-1', expiresAt: 0 });
      vi.mocked(validateSessionData).mockReturnValue(false);

      const request = new NextRequest('http://localhost/api/admin/feature-usage', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Session expired or invalid');
    });

    it('returns 401 when session decryption throws', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { cookies } = await import('next/headers');
      const { decryptSessionData } = await import('@/lib/utils/session-crypto-edge');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'bad-token' }),
      } as any);
      vi.mocked(decryptSessionData).mockRejectedValue(new Error('Decryption failed'));

      const request = new NextRequest('http://localhost/api/admin/feature-usage', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid session');
    });

    it('returns 200 with feature usage data on success', async () => {
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      const mockDailyData = [
        {
          date: '2024-01-15',
          feature: 'tasks',
          page_views: 50,
          unique_users: 20,
          total_actions: 80,
          device_mobile: 10,
          device_desktop: 8,
          device_tablet: 2,
        },
      ];

      const mockEvents = [
        { feature: 'tasks', action: 'create', device_type: 'mobile', created_at: new Date().toISOString() },
        { feature: 'tasks', action: 'complete', device_type: 'desktop', created_at: new Date().toISOString() },
      ];

      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'feature_usage_daily') {
          return createChainMock({ data: mockDailyData, error: null }) as any;
        }
        if (table === 'feature_events') {
          return createChainMock({ data: mockEvents, error: null }) as any;
        }
        return createChainMock({ data: [], error: null }) as any;
      });

      const request = new NextRequest('http://localhost/api/admin/feature-usage?range=7d', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.summary).toBeDefined();
      expect(data.data.totals).toBeDefined();
      expect(data.data.timeRange).toBe('7d');
    });

    it('returns 200 with 30d range', async () => {
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(supabaseAdmin.from).mockReturnValue(
        createChainMock({ data: [], error: null }) as any
      );

      const request = new NextRequest('http://localhost/api/admin/feature-usage?range=30d', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.timeRange).toBe('30d');
    });

    it('returns 500 when daily data fetch fails', async () => {
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'feature_usage_daily') {
          return createChainMock({ data: null, error: { message: 'Table not found' } }) as any;
        }
        return createChainMock({ data: [], error: null }) as any;
      });

      const request = new NextRequest('http://localhost/api/admin/feature-usage', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to fetch feature usage data');
    });
  });

  describe('POST', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_FAIL);

      const request = new NextRequest('http://localhost/api/admin/feature-usage', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when admin session cookie is missing on POST', async () => {
      await setupAuth(false);

      const request = new NextRequest('http://localhost/api/admin/feature-usage', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Admin authentication required');
    });

    it('returns 200 when aggregation succeeds', async () => {
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(supabaseAdmin.rpc).mockReturnValue(
        createChainMock({ error: null }) as any
      );

      const request = new NextRequest('http://localhost/api/admin/feature-usage', {
        method: 'POST',
        body: JSON.stringify({ date: '2024-01-15' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('2024-01-15');
    });

    it('returns 400 for invalid date format in POST body', async () => {
      await setupAuth(true);

      const request = new NextRequest('http://localhost/api/admin/feature-usage', {
        method: 'POST',
        body: JSON.stringify({ date: 'not-a-date' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid input');
    });

    it('returns 500 when aggregation RPC fails', async () => {
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(supabaseAdmin.rpc).mockReturnValue(
        createChainMock({ error: { message: 'RPC failed' } }) as any
      );

      const request = new NextRequest('http://localhost/api/admin/feature-usage', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Aggregation failed');
    });
  });
});
