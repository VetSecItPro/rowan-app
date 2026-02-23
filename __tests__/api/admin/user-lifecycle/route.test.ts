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

vi.mock('@/lib/utils/admin-auth', () => ({
  verifyAdminAuth: vi.fn(),
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

vi.mock('@/lib/services/admin-cache-service', () => ({
  withCache: vi.fn((_key: string, fn: () => Promise<unknown>) => fn()),
  ADMIN_CACHE_KEYS: {
    userLifecycle: 'user:lifecycle',
  },
  ADMIN_CACHE_TTL: {
    userLifecycle: 600,
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

const mockAuthUsers = [
  { id: '550e8400-e29b-41d4-a716-446655440011', email: 'user1@example.com', created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
  { id: '550e8400-e29b-41d4-a716-446655440012', email: 'user2@example.com', created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
];

async function setupAuth(valid = true) {
  const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
  const { verifyAdminAuth } = await import('@/lib/utils/admin-auth');

  vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
  vi.mocked(verifyAdminAuth).mockResolvedValue(
    valid
      ? { isValid: true, adminId: ADMIN_ID }
      : { isValid: false, error: 'Admin authentication required' }
  );
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

async function setupSupabaseWithEmptyData() {
  const { supabaseAdmin } = await import('@/lib/supabase/admin');

  // listUsers returns 2 users then empty page to terminate pagination
  vi.mocked(supabaseAdmin.auth.admin.listUsers)
    .mockResolvedValueOnce({ data: { users: mockAuthUsers }, error: null } as any)
    .mockResolvedValueOnce({ data: { users: [] }, error: null } as any);

  // All .from() queries return empty arrays
  vi.mocked(supabaseAdmin.from).mockImplementation(() => {
    return { select: vi.fn(() => buildChain([])) } as any;
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('/api/admin/user-lifecycle', () => {
  beforeEach(async () => {
    // resetAllMocks also resets mockResolvedValue/mockReturnValue implementations
    // which prevents state leaking between tests (especially from mockResolvedValue calls)
    vi.resetAllMocks();
    // Restore withCache to pass-through after reset
    const { withCache } = await import('@/lib/services/admin-cache-service');
    vi.mocked(withCache).mockImplementation((_key: string, fn: () => Promise<unknown>) => fn());
  });

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { GET } = await import('@/app/api/admin/user-lifecycle/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_FAIL);

      const req = new NextRequest('http://localhost/api/admin/user-lifecycle');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when not authenticated', async () => {
      const { GET } = await import('@/app/api/admin/user-lifecycle/route');
      await setupAuth(false);

      const req = new NextRequest('http://localhost/api/admin/user-lifecycle');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('returns 200 with lifecycle data for authenticated admin', async () => {
      const { GET } = await import('@/app/api/admin/user-lifecycle/route');
      await setupAuth(true);
      await setupSupabaseWithEmptyData();

      const req = new NextRequest('http://localhost/api/admin/user-lifecycle');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.lifecycle).toBeDefined();
    });

    it('returns lifecycle stages object with expected keys', async () => {
      const { GET } = await import('@/app/api/admin/user-lifecycle/route');
      await setupAuth(true);
      await setupSupabaseWithEmptyData();

      const req = new NextRequest('http://localhost/api/admin/user-lifecycle');
      const res = await GET(req);
      const data = await res.json();

      expect(data.lifecycle.stages).toBeDefined();
      expect(typeof data.lifecycle.stages.new).toBe('number');
      expect(typeof data.lifecycle.stages.activated).toBe('number');
      expect(typeof data.lifecycle.stages.engaged).toBe('number');
      expect(typeof data.lifecycle.stages.power_user).toBe('number');
      expect(typeof data.lifecycle.stages.at_risk).toBe('number');
      expect(typeof data.lifecycle.stages.churned).toBe('number');
    });

    it('returns space analytics object', async () => {
      const { GET } = await import('@/app/api/admin/user-lifecycle/route');
      await setupAuth(true);
      await setupSupabaseWithEmptyData();

      const req = new NextRequest('http://localhost/api/admin/user-lifecycle');
      const res = await GET(req);
      const data = await res.json();

      expect(data.lifecycle.spaceAnalytics).toBeDefined();
      expect(typeof data.lifecycle.spaceAnalytics.avgMembersPerSpace).toBe('number');
      expect(data.lifecycle.spaceAnalytics.distribution).toBeDefined();
      expect(Array.isArray(data.lifecycle.spaceAnalytics.mostActiveSpaces)).toBe(true);
    });

    it('returns time-to-value metrics', async () => {
      const { GET } = await import('@/app/api/admin/user-lifecycle/route');
      await setupAuth(true);
      await setupSupabaseWithEmptyData();

      const req = new NextRequest('http://localhost/api/admin/user-lifecycle');
      const res = await GET(req);
      const data = await res.json();

      expect(data.lifecycle.timeToValue).toBeDefined();
      expect(typeof data.lifecycle.timeToValue.medianHours).toBe('number');
      expect(typeof data.lifecycle.timeToValue.averageHours).toBe('number');
    });

    it('returns resurrection metrics', async () => {
      const { GET } = await import('@/app/api/admin/user-lifecycle/route');
      await setupAuth(true);
      await setupSupabaseWithEmptyData();

      const req = new NextRequest('http://localhost/api/admin/user-lifecycle');
      const res = await GET(req);
      const data = await res.json();

      expect(data.lifecycle.resurrection).toBeDefined();
      expect(typeof data.lifecycle.resurrection.resurrectedUsers).toBe('number');
      expect(typeof data.lifecycle.resurrection.totalChurned).toBe('number');
      expect(typeof data.lifecycle.resurrection.resurrectionRate).toBe('number');
    });

    it('returns 200 gracefully when listUsers returns an error (fetchAllAuthUsers catches it)', async () => {
      // fetchAllAuthUsers breaks on error and returns empty array — the route does NOT 500
      const { GET } = await import('@/app/api/admin/user-lifecycle/route');
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      // Return an error response; fetchAllAuthUsers will break immediately and return []
      vi.mocked(supabaseAdmin.auth.admin.listUsers).mockResolvedValueOnce({
        data: { users: [] },
        error: { message: 'Auth API error' },
      } as any);

      vi.mocked(supabaseAdmin.from).mockImplementation(() => {
        return { select: vi.fn(() => buildChain([])) } as any;
      });

      const req = new NextRequest('http://localhost/api/admin/user-lifecycle');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.lifecycle.total).toBe(0);
    });

    it('returns 500 when withCache throws an unexpected error', async () => {
      const { GET } = await import('@/app/api/admin/user-lifecycle/route');
      await setupAuth(true);
      const { withCache } = await import('@/lib/services/admin-cache-service');

      vi.mocked(withCache).mockRejectedValue(new Error('Cache system failure'));

      const req = new NextRequest('http://localhost/api/admin/user-lifecycle');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toContain('Failed to fetch user lifecycle data');
    });

    it('handles pagination correctly by fetching multiple pages of users', async () => {
      const { GET } = await import('@/app/api/admin/user-lifecycle/route');
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      // Return a full page of 1000 users (triggers pagination), then empty page to stop
      const page1Users = Array.from({ length: 1000 }, (_, i) => ({
        id: `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`,
        email: `user${i}@example.com`,
        created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      }));

      vi.mocked(supabaseAdmin.auth.admin.listUsers)
        .mockResolvedValueOnce({ data: { users: page1Users }, error: null } as any)
        .mockResolvedValueOnce({ data: { users: [] }, error: null } as any);

      vi.mocked(supabaseAdmin.from).mockImplementation(() => {
        return { select: vi.fn(() => buildChain([])) } as any;
      });

      const req = new NextRequest('http://localhost/api/admin/user-lifecycle');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.lifecycle.total).toBe(1000);
      expect(vi.mocked(supabaseAdmin.auth.admin.listUsers)).toHaveBeenCalledTimes(2);
    });

    it('uses cache for repeated requests', async () => {
      const { GET } = await import('@/app/api/admin/user-lifecycle/route');
      await setupAuth(true);
      await setupSupabaseWithEmptyData();
      const { withCache } = await import('@/lib/services/admin-cache-service');

      const req = new NextRequest('http://localhost/api/admin/user-lifecycle');
      await GET(req);

      expect(withCache).toHaveBeenCalledWith(
        'user:lifecycle',
        expect.any(Function),
        expect.any(Object)
      );
    });
  });
});
