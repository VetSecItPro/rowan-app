import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/subscriptions/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/feature-access-service', () => ({
  getUserFeatureAccess: vi.fn(),
}));

vi.mock('@/lib/services/subscription-service', () => ({
  getSubscriptionStatus: vi.fn(),
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

const USER_ID = '550e8400-e29b-41d4-a716-446655440001';

const MOCK_SUBSCRIPTION_STATUS = {
  tier: 'pro',
  status: 'active',
  isActive: true,
  isPastDue: false,
  isCanceled: false,
  expiresAt: null,
  daysUntilExpiration: null,
  isInTrial: false,
  trialDaysRemaining: null,
  trialEndsAt: null,
};

const MOCK_FEATURE_ACCESS = {
  features: { canUseAI: true, canUseHousehold: true },
  limits: { maxTasks: 1000 },
  dailyUsage: { aiRequests: 5 },
};

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/subscriptions');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString(), { method: 'GET' });
}

describe('/api/subscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
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
    } as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return subscription details for authenticated user', async () => {
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
    } as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never);

    const { getSubscriptionStatus } = await import('@/lib/services/subscription-service');
    vi.mocked(getSubscriptionStatus).mockResolvedValue(MOCK_SUBSCRIPTION_STATUS as unknown as Awaited<ReturnType<typeof getSubscriptionStatus>>);

    const { getUserFeatureAccess } = await import('@/lib/services/feature-access-service');
    vi.mocked(getUserFeatureAccess).mockResolvedValue(MOCK_FEATURE_ACCESS as unknown as Awaited<ReturnType<typeof getUserFeatureAccess>>);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tier).toBe('pro');
    expect(data.subscription).toBeDefined();
    expect(data.subscription.isActive).toBe(true);
    expect(data.features).toBeDefined();
    expect(data.limits).toBeDefined();
    expect(data.dailyUsage).toBeDefined();
  });

  it('should return mock subscription data in development mode when mockTier is set', async () => {
    // Use vi.stubEnv to safely override NODE_ENV
    vi.stubEnv('NODE_ENV', 'development');

    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60000,
    });

    const response = await GET(makeRequest({ mockTier: 'family' }));
    const data = await response.json();

    // In dev mode with mock tier, should return early before auth check
    expect(data._mock).toBe(true);
    expect(data._mockTier).toBe('family');
    expect(data.tier).toBe('family');
  });

  it('should return no-store cache header in test environment', async () => {
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
    } as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never);

    const { getSubscriptionStatus } = await import('@/lib/services/subscription-service');
    vi.mocked(getSubscriptionStatus).mockResolvedValue(MOCK_SUBSCRIPTION_STATUS as unknown as Awaited<ReturnType<typeof getSubscriptionStatus>>);

    const { getUserFeatureAccess } = await import('@/lib/services/feature-access-service');
    vi.mocked(getUserFeatureAccess).mockResolvedValue(MOCK_FEATURE_ACCESS as unknown as Awaited<ReturnType<typeof getUserFeatureAccess>>);

    const response = await GET(makeRequest());

    // In test env, cache-control should be no-store
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('should return 500 when subscription service throws', async () => {
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
    } as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never);

    const { getSubscriptionStatus } = await import('@/lib/services/subscription-service');
    vi.mocked(getSubscriptionStatus).mockRejectedValue(new Error('DB error'));

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to fetch subscription');
  });

  it('should not mock tier in test environment (non-development)', async () => {
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
    } as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never);

    // In test env (which is not 'development'), mockTier should be ignored
    const response = await GET(makeRequest({ mockTier: 'family' }));
    const data = await response.json();

    // Should go through normal auth flow and get 401 (user is null)
    expect(response.status).toBe(401);
    expect(data._mock).toBeUndefined();
  });
});
