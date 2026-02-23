import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/analytics/funnel/route';

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    auth: {
      admin: {
        listUsers: vi.fn(),
      },
    },
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
  ADMIN_CACHE_TTL: {
    dashboardStats: 300,
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

describe('/api/admin/analytics/funnel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_FAIL);

      const request = new NextRequest('http://localhost/api/admin/analytics/funnel', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when admin session cookie is missing', async () => {
      await setupAuth(false);

      const request = new NextRequest('http://localhost/api/admin/analytics/funnel', {
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

      const request = new NextRequest('http://localhost/api/admin/analytics/funnel', {
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

      const request = new NextRequest('http://localhost/api/admin/analytics/funnel', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid session');
    });

    it('returns 200 with funnel data on success', async () => {
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(supabaseAdmin.auth.admin.listUsers).mockResolvedValue({
        data: {
          users: [
            { id: '550e8400-e29b-41d4-a716-446655440001', created_at: '2024-01-01T00:00:00Z' },
            { id: '550e8400-e29b-41d4-a716-446655440002', created_at: '2024-01-02T00:00:00Z' },
          ],
        },
        error: null,
      } as any);

      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'space_members') {
          return createChainMock({
            data: [
              { user_id: '550e8400-e29b-41d4-a716-446655440001', joined_at: '2024-01-01T01:00:00Z' },
            ],
            error: null,
          }) as any;
        }
        if (table === 'feature_events') {
          return createChainMock({
            data: [
              { user_id: '550e8400-e29b-41d4-a716-446655440001', action: 'create', feature: 'tasks', created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
            ],
            error: null,
          }) as any;
        }
        return createChainMock({ data: [], error: null }) as any;
      });

      const request = new NextRequest('http://localhost/api/admin/analytics/funnel', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.funnel).toBeDefined();
      expect(data.funnel.steps).toBeDefined();
      expect(data.funnel.steps.length).toBeGreaterThan(0);
      expect(data.funnel.conversionRates).toBeDefined();
      expect(data.funnel.topActivationFeatures).toBeDefined();
      expect(data.funnel.timeToMilestones).toBeDefined();
    });

    it('returns 200 with zero counts when all queries fail', async () => {
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(supabaseAdmin.auth.admin.listUsers).mockRejectedValue(new Error('Auth error'));

      vi.mocked(supabaseAdmin.from).mockReturnValue(
        createChainMock({ data: [], error: null }) as any
      );

      const request = new NextRequest('http://localhost/api/admin/analytics/funnel', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.funnel.steps[0].count).toBe(0);
    });

    it('funnel steps have correct IDs and labels', async () => {
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(supabaseAdmin.auth.admin.listUsers).mockResolvedValue({
        data: { users: [] },
        error: null,
      } as any);

      vi.mocked(supabaseAdmin.from).mockReturnValue(
        createChainMock({ data: [], error: null }) as any
      );

      const request = new NextRequest('http://localhost/api/admin/analytics/funnel', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const stepIds = data.funnel.steps.map((s: { id: string }) => s.id);
      expect(stepIds).toContain('signups');
      expect(stepIds).toContain('space');
      expect(stepIds).toContain('action');
      expect(stepIds).toContain('active');
      expect(stepIds).toContain('power');
    });
  });
});
