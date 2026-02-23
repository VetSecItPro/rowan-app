import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/penalties/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/services/rewards/late-penalty-service', () => ({
  getUserPenalties: vi.fn(),
  getPenaltyStats: vi.fn(),
  getOverdueChores: vi.fn(),
}));

vi.mock('@/lib/services/feature-access-service', () => ({
  canAccessFeature: vi.fn(),
}));

vi.mock('@/lib/middleware/subscription-check', () => ({
  buildUpgradeResponse: vi.fn(() =>
    new Response(JSON.stringify({ error: 'Upgrade required' }), {
      status: 402,
      headers: { 'Content-Type': 'application/json' },
    })
  ),
}));

vi.mock('@/lib/utils/cache-headers', () => ({
  withUserDataCache: vi.fn((response) => response),
}));

function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'limit',
   'maybeSingle', 'gte', 'lte', 'lt', 'in', 'neq', 'is', 'not', 'upsert',
   'match', 'or', 'filter', 'ilike', 'range', 'textSearch', 'contains'].forEach((m) => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

const SPACE_ID = '550e8400-e29b-41d4-a716-446655440001';
const USER_ID = '550e8400-e29b-41d4-a716-446655440002';

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/penalties');
  url.searchParams.set('spaceId', SPACE_ID);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString(), { method: 'GET' });
}

function setupAuthenticatedClient(membershipData = { role: 'member' }) {
  const memberChain = createChainMock({ data: membershipData, error: null });
  const supabaseClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: USER_ID } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue(memberChain),
  };
  return supabaseClient;
}

describe('/api/penalties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 429 when rate limit exceeded', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: false,
      limit: 60,
      remaining: 0,
      reset: Date.now() + 60000,
    });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain('Too many requests');
  });

  it('should return 401 when not authenticated', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60000,
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    } as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 402 when subscription does not allow household feature', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60000,
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
      from: vi.fn(),
    } as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never);

    const { canAccessFeature } = await import('@/lib/services/feature-access-service');
    vi.mocked(canAccessFeature).mockResolvedValue({ allowed: false, tier: 'free' });

    const response = await GET(makeRequest());

    expect(response.status).toBe(402);
  });

  it('should return 400 when spaceId is missing', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60000,
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
      from: vi.fn(),
    } as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never);

    const { canAccessFeature } = await import('@/lib/services/feature-access-service');
    vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'pro' });

    const request = new NextRequest('http://localhost/api/penalties', { method: 'GET' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Space ID is required');
  });

  it('should return 403 when user is not a member of the space', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60000,
    });

    const { createClient } = await import('@/lib/supabase/server');
    const memberChain = createChainMock({ data: null, error: { message: 'Not found' } });
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue(memberChain),
    } as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never);

    const { canAccessFeature } = await import('@/lib/services/feature-access-service');
    vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'pro' });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Not a member');
  });

  it('should return penalties list for authenticated member', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60000,
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(
      setupAuthenticatedClient() as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never
    );

    const { canAccessFeature } = await import('@/lib/services/feature-access-service');
    vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'pro' });

    const { getUserPenalties } = await import('@/lib/services/rewards/late-penalty-service');
    vi.mocked(getUserPenalties).mockResolvedValue([
      { id: 'penalty-1', user_id: USER_ID, space_id: SPACE_ID } as Parameters<typeof getUserPenalties>[0] extends string ? never : never,
    ] as unknown as Awaited<ReturnType<typeof getUserPenalties>>);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.penalties).toBeDefined();
    expect(Array.isArray(data.penalties)).toBe(true);
  });

  it('should return stats when stats=true param is set', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60000,
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(
      setupAuthenticatedClient() as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never
    );

    const { canAccessFeature } = await import('@/lib/services/feature-access-service');
    vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'pro' });

    const { getPenaltyStats } = await import('@/lib/services/rewards/late-penalty-service');
    vi.mocked(getPenaltyStats).mockResolvedValue({ total: 3, forgiven: 1 } as unknown as Awaited<ReturnType<typeof getPenaltyStats>>);

    const response = await GET(makeRequest({ stats: 'true' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats).toBeDefined();
    expect(getPenaltyStats).toHaveBeenCalledWith(SPACE_ID, 'month');
  });

  it('should return overdue chores when overdue=true param is set', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60000,
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(
      setupAuthenticatedClient() as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never
    );

    const { canAccessFeature } = await import('@/lib/services/feature-access-service');
    vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'pro' });

    const { getOverdueChores } = await import('@/lib/services/rewards/late-penalty-service');
    vi.mocked(getOverdueChores).mockResolvedValue([{ id: 'chore-1' }] as unknown as Awaited<ReturnType<typeof getOverdueChores>>);

    const response = await GET(makeRequest({ overdue: 'true' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.overdue).toBeDefined();
    expect(Array.isArray(data.overdue)).toBe(true);
  });

  it('should return 500 on unexpected error', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockRejectedValue(new Error('Unexpected'));

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
