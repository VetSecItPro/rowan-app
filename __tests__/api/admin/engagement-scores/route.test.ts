import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/engagement-scores/route';

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

vi.mock('@/lib/utils/admin-auth', () => ({
  verifyAdminAuth: vi.fn(),
}));

vi.mock('@/lib/services/admin-cache-service', () => ({
  withCache: vi.fn((_key: string, fn: () => Promise<unknown>) => fn()),
  ADMIN_CACHE_KEYS: {
    engagementScores: 'engagement:scores',
  },
  ADMIN_CACHE_TTL: {
    engagementScores: 900,
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

describe('/api/admin/engagement-scores', () => {
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

      const request = new NextRequest('http://localhost/api/admin/engagement-scores', {
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

      const request = new NextRequest('http://localhost/api/admin/engagement-scores', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Admin authentication required');
    });

    it('returns 200 with engagement data for authenticated admin', async () => {
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

      const mockUsers = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          email: 'user1@example.com',
          last_seen: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      const mockRecentEvents = [
        {
          user_id: '550e8400-e29b-41d4-a716-446655440001',
          feature: 'tasks',
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          user_id: '550e8400-e29b-41d4-a716-446655440001',
          feature: 'calendar',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      const mockSessionEvents = [
        {
          session_id: 'session-1',
          created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        },
        {
          session_id: 'session-1',
          created_at: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
        },
      ];

      // The route makes 4 parallel queries to feature_events and users
      let callIndex = 0;
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'users') {
          return createChainMock({ data: mockUsers, error: null }) as any;
        }
        if (table === 'feature_events') {
          callIndex++;
          if (callIndex === 1) {
            return createChainMock({ data: mockRecentEvents, error: null }) as any;
          }
          if (callIndex === 2) {
            return createChainMock({ data: mockRecentEvents, error: null }) as any;
          }
          return createChainMock({ data: mockSessionEvents, error: null }) as any;
        }
        return createChainMock({ data: [], error: null }) as any;
      });

      const request = new NextRequest('http://localhost/api/admin/engagement-scores', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.engagement).toBeDefined();
      expect(data.engagement.scoreDistribution).toBeDefined();
      expect(data.engagement.averageScore).toBeDefined();
      expect(data.engagement.topUsers).toBeDefined();
      expect(data.engagement.adoptionMatrix).toBeDefined();
      expect(data.engagement.sessions).toBeDefined();
    });

    it('returns 200 with zero scores when no users or events', async () => {
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
        createChainMock({ data: [], error: null }) as any
      );

      const request = new NextRequest('http://localhost/api/admin/engagement-scores', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.engagement.averageScore).toBe(0);
      expect(data.engagement.topUsers).toEqual([]);
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
        createChainMock({ data: [], error: null }) as any
      );

      const request = new NextRequest(
        'http://localhost/api/admin/engagement-scores?refresh=true',
        { method: 'GET' }
      );

      await GET(request);

      expect(withCache).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({ skipCache: true })
      );
    });

    it('adoption matrix includes all defined features', async () => {
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
        createChainMock({ data: [], error: null }) as any
      );

      const request = new NextRequest('http://localhost/api/admin/engagement-scores', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const features = data.engagement.adoptionMatrix.map((e: { feature: string }) => e.feature);
      expect(features).toContain('tasks');
      expect(features).toContain('calendar');
      expect(features).toContain('meals');
      expect(features).toContain('goals');
    });
  });
});
