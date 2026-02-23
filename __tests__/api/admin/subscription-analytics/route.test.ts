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

// subscription-analytics route uses `cookies` from 'next/headers', not safeCookiesAsync
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
    subscriptionMetrics: 'subscriptions:metrics',
    subscriptionEvents: vi.fn(
      (eventType: string | null, limit: number, offset: number) =>
        `subscriptions:events:${eventType || 'all'}:${limit}:${offset}`
    ),
    dailyRevenue: vi.fn((days: number) => `subscriptions:revenue:${days}d`),
  },
  ADMIN_CACHE_TTL: {
    subscriptionAnalytics: 600,
  },
}));

vi.mock('@/lib/services/subscription-analytics-service', () => ({
  getSubscriptionMetrics: vi.fn(),
  getSubscriptionEvents: vi.fn(),
  getDailyRevenueData: vi.fn(),
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

const mockMetrics = {
  mrr: 9900,
  arr: 118800,
  arpu: 99,
  totalSubscribers: 100,
  proSubscribers: 80,
  familySubscribers: 20,
};

const mockEvents = [
  { id: 'evt-1', event_type: 'subscription.created', created_at: '2026-01-01T00:00:00Z' },
];

const mockDailyRevenue = [
  { date: '2026-01-01', revenue: 330 },
];

async function setupAuth(valid = true) {
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
    get: vi.fn().mockReturnValue({ value: 'encrypted-session' }),
  } as any);
  vi.mocked(decryptSessionData).mockResolvedValue({ adminId: ADMIN_ID, email: 'admin@example.com' });
  vi.mocked(validateSessionData).mockReturnValue(true);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('/api/admin/subscription-analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { GET } = await import('@/app/api/admin/subscription-analytics/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_FAIL);

      const req = new NextRequest('http://localhost/api/admin/subscription-analytics');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when admin session cookie is absent', async () => {
      const { GET } = await import('@/app/api/admin/subscription-analytics/route');
      await setupAuth(false);

      const req = new NextRequest('http://localhost/api/admin/subscription-analytics');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Admin authentication required');
    });

    it('returns 401 when session validation fails', async () => {
      const { GET } = await import('@/app/api/admin/subscription-analytics/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { cookies } = await import('next/headers');
      const { decryptSessionData, validateSessionData } = await import('@/lib/utils/session-crypto-edge');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'encrypted' }),
      } as any);
      vi.mocked(decryptSessionData).mockResolvedValue({ adminId: ADMIN_ID });
      vi.mocked(validateSessionData).mockReturnValue(false);

      const req = new NextRequest('http://localhost/api/admin/subscription-analytics');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Session expired or invalid');
    });

    it('returns 401 when session decryption throws', async () => {
      const { GET } = await import('@/app/api/admin/subscription-analytics/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { cookies } = await import('next/headers');
      const { decryptSessionData } = await import('@/lib/utils/session-crypto-edge');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'bad' }),
      } as any);
      vi.mocked(decryptSessionData).mockRejectedValue(new Error('Decryption failed'));

      const req = new NextRequest('http://localhost/api/admin/subscription-analytics');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Invalid session');
    });

    it('returns 400 for invalid view parameter', async () => {
      const { GET } = await import('@/app/api/admin/subscription-analytics/route');
      await setupAuth(true);

      const req = new NextRequest('http://localhost/api/admin/subscription-analytics?view=invalid');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid query parameters');
    });

    it('returns 400 for limit out of range', async () => {
      const { GET } = await import('@/app/api/admin/subscription-analytics/route');
      await setupAuth(true);

      const req = new NextRequest('http://localhost/api/admin/subscription-analytics?limit=9999');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
    });

    it('returns 200 with all data when view=all (default)', async () => {
      const { GET } = await import('@/app/api/admin/subscription-analytics/route');
      await setupAuth(true);
      const {
        getSubscriptionMetrics,
        getSubscriptionEvents,
        getDailyRevenueData,
      } = await import('@/lib/services/subscription-analytics-service');

      vi.mocked(getSubscriptionMetrics).mockResolvedValue(mockMetrics as any);
      vi.mocked(getSubscriptionEvents).mockResolvedValue(mockEvents as any);
      vi.mocked(getDailyRevenueData).mockResolvedValue(mockDailyRevenue as any);

      const req = new NextRequest('http://localhost/api/admin/subscription-analytics');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metrics).toBeDefined();
      expect(data.events).toBeDefined();
      expect(data.dailyRevenue).toBeDefined();
      expect(data.view).toBe('all');
      expect(data.lastUpdated).toBeDefined();
    });

    it('returns only metrics when view=metrics', async () => {
      const { GET } = await import('@/app/api/admin/subscription-analytics/route');
      await setupAuth(true);
      const { getSubscriptionMetrics, getSubscriptionEvents, getDailyRevenueData } =
        await import('@/lib/services/subscription-analytics-service');

      vi.mocked(getSubscriptionMetrics).mockResolvedValue(mockMetrics as any);
      vi.mocked(getSubscriptionEvents).mockResolvedValue(mockEvents as any);
      vi.mocked(getDailyRevenueData).mockResolvedValue(mockDailyRevenue as any);

      const req = new NextRequest('http://localhost/api/admin/subscription-analytics?view=metrics');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.metrics).toBeDefined();
      expect(data.events).toBeUndefined();
      expect(data.dailyRevenue).toBeUndefined();
    });

    it('returns only events when view=events', async () => {
      const { GET } = await import('@/app/api/admin/subscription-analytics/route');
      await setupAuth(true);
      const { getSubscriptionMetrics, getSubscriptionEvents, getDailyRevenueData } =
        await import('@/lib/services/subscription-analytics-service');

      vi.mocked(getSubscriptionMetrics).mockResolvedValue(mockMetrics as any);
      vi.mocked(getSubscriptionEvents).mockResolvedValue(mockEvents as any);
      vi.mocked(getDailyRevenueData).mockResolvedValue(mockDailyRevenue as any);

      const req = new NextRequest('http://localhost/api/admin/subscription-analytics?view=events');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.events).toBeDefined();
      expect(data.metrics).toBeUndefined();
      expect(data.dailyRevenue).toBeUndefined();
    });

    it('returns only revenue when view=revenue', async () => {
      const { GET } = await import('@/app/api/admin/subscription-analytics/route');
      await setupAuth(true);
      const { getSubscriptionMetrics, getSubscriptionEvents, getDailyRevenueData } =
        await import('@/lib/services/subscription-analytics-service');

      vi.mocked(getSubscriptionMetrics).mockResolvedValue(mockMetrics as any);
      vi.mocked(getSubscriptionEvents).mockResolvedValue(mockEvents as any);
      vi.mocked(getDailyRevenueData).mockResolvedValue(mockDailyRevenue as any);

      const req = new NextRequest('http://localhost/api/admin/subscription-analytics?view=revenue');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.dailyRevenue).toBeDefined();
      expect(data.metrics).toBeUndefined();
      expect(data.events).toBeUndefined();
    });

    it('bypasses cache when refresh=true', async () => {
      const { GET } = await import('@/app/api/admin/subscription-analytics/route');
      await setupAuth(true);
      const { getSubscriptionMetrics, getSubscriptionEvents, getDailyRevenueData } =
        await import('@/lib/services/subscription-analytics-service');
      const { withCache } = await import('@/lib/services/admin-cache-service');

      vi.mocked(getSubscriptionMetrics).mockResolvedValue(mockMetrics as any);
      vi.mocked(getSubscriptionEvents).mockResolvedValue(mockEvents as any);
      vi.mocked(getDailyRevenueData).mockResolvedValue(mockDailyRevenue as any);

      const req = new NextRequest('http://localhost/api/admin/subscription-analytics?refresh=true');
      await GET(req);

      expect(withCache).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({ skipCache: true })
      );
    });

    it('returns 500 when service throws', async () => {
      const { GET } = await import('@/app/api/admin/subscription-analytics/route');
      await setupAuth(true);
      const { getSubscriptionMetrics } = await import('@/lib/services/subscription-analytics-service');

      vi.mocked(getSubscriptionMetrics).mockRejectedValue(new Error('Service error'));

      const req = new NextRequest('http://localhost/api/admin/subscription-analytics?view=metrics');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toContain('Failed to fetch subscription analytics');
    });
  });
});
