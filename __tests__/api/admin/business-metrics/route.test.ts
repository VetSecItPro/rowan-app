import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/business-metrics/route';

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

vi.mock('@/lib/utils/admin-auth', () => ({
  verifyAdminAuth: vi.fn(),
}));

vi.mock('@/lib/services/admin-cache-service', () => ({
  withCache: vi.fn((_key: string, fn: () => Promise<unknown>) => fn()),
  ADMIN_CACHE_KEYS: {
    businessMetrics: 'business:metrics',
  },
  ADMIN_CACHE_TTL: {
    businessMetrics: 600,
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

describe('/api/admin/business-metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost/api/admin/business-metrics', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when admin auth fails', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { verifyAdminAuth } = await import('@/lib/utils/admin-auth');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(verifyAdminAuth).mockResolvedValue({
        isValid: false,
        error: 'Admin authentication required',
      });

      const request = new NextRequest('http://localhost/api/admin/business-metrics', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Admin authentication required');
    });

    it('returns 200 with business metrics on success', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { verifyAdminAuth } = await import('@/lib/utils/admin-auth');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(verifyAdminAuth).mockResolvedValue({
        isValid: true,
        adminId: 'admin-1',
      });

      // Set up mocks for all the parallel queries
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return createChainMock({
            data: [
              { user_id: '550e8400-e29b-41d4-a716-446655440001', tier: 'pro', period: 'monthly', status: 'active', subscription_started_at: '2024-01-01T00:00:00Z', created_at: '2024-01-01T00:00:00Z' },
            ],
            error: null,
            count: null,
          }) as any;
        }
        if (table === 'subscription_events') {
          return createChainMock({ data: [], error: null }) as any;
        }
        if (table === 'feature_events') {
          return createChainMock({ data: [], error: null }) as any;
        }
        if (table === 'users') {
          return createChainMock({ data: null, error: null, count: 10 }) as any;
        }
        if (table === 'space_members') {
          return createChainMock({ data: [], error: null }) as any;
        }
        if (table === 'feature_usage_daily') {
          return createChainMock({ data: [], error: null }) as any;
        }
        return createChainMock({ data: [], error: null }) as any;
      });

      vi.mocked(supabaseAdmin.rpc).mockReturnValue(
        createChainMock({ data: { count: 5 }, error: null }) as any
      );

      const request = new NextRequest('http://localhost/api/admin/business-metrics', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metrics).toBeDefined();
      expect(data.metrics.scorecard).toBeDefined();
      expect(data.metrics.waterfall).toBeDefined();
      expect(data.metrics.projectedRevenue).toBeDefined();
    });

    it('returns 200 with zero MRR when no active subscriptions', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { verifyAdminAuth } = await import('@/lib/utils/admin-auth');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(verifyAdminAuth).mockResolvedValue({
        isValid: true,
        adminId: 'admin-1',
      });

      vi.mocked(supabaseAdmin.from).mockReturnValue(
        createChainMock({ data: [], error: null, count: 0 }) as any
      );

      vi.mocked(supabaseAdmin.rpc).mockReturnValue(
        createChainMock({ data: null, error: null }) as any
      );

      const request = new NextRequest('http://localhost/api/admin/business-metrics', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metrics.scorecard.mrr).toBe(0);
    });

    it('respects forceRefresh query param', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { verifyAdminAuth } = await import('@/lib/utils/admin-auth');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      const { withCache } = await import('@/lib/services/admin-cache-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(verifyAdminAuth).mockResolvedValue({
        isValid: true,
        adminId: 'admin-1',
      });

      vi.mocked(supabaseAdmin.from).mockReturnValue(
        createChainMock({ data: [], error: null, count: 0 }) as any
      );

      vi.mocked(supabaseAdmin.rpc).mockReturnValue(
        createChainMock({ data: null, error: null }) as any
      );

      const request = new NextRequest(
        'http://localhost/api/admin/business-metrics?refresh=true',
        { method: 'GET' }
      );

      await GET(request);

      // Verify withCache was called with skipCache: true
      expect(withCache).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({ skipCache: true })
      );
    });
  });
});
