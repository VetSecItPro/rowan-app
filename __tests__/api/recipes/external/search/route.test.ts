import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/recipes/external/search/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/feature-access-service', () => ({
  canAccessFeature: vi.fn(),
}));

vi.mock('@/lib/middleware/subscription-check', () => ({
  buildUpgradeResponse: vi.fn(() =>
    new Response(JSON.stringify({ error: 'Upgrade required' }), { status: 403 })
  ),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/sanitize', () => ({
  sanitizePlainText: vi.fn((text) => text ?? ''),
  sanitizeUrl: vi.fn((url) => url ?? ''),
}));

vi.mock('@/lib/utils/cache-headers', () => ({
  withPublicDataCache: vi.fn((response) => response),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

const USER_ID = '00000000-0000-4000-8000-000000000001';

function mockRateLimitAndAuth(
  createClient: ReturnType<typeof vi.fn>,
  checkGeneralRateLimit: ReturnType<typeof vi.fn>,
  canAccessFeature: ReturnType<typeof vi.fn>
) {
  vi.mocked(checkGeneralRateLimit).mockResolvedValue({
    success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
  });

  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: USER_ID } },
        error: null,
      }),
    },
  } as any);

  vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'pro' });
}

describe('/api/recipes/external/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('should return 429 when rate limit exceeded', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: false, limit: 60, remaining: 0, reset: Date.now() + 60000,
    });

    const request = new NextRequest('http://localhost/api/recipes/external/search?q=pasta', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(429);
  });

  it('should return 401 when not authenticated', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
    } as any);

    const request = new NextRequest('http://localhost/api/recipes/external/search?q=pasta', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 403 when feature access denied', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { canAccessFeature } = await import('@/lib/services/feature-access-service');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
    } as any);

    vi.mocked(canAccessFeature).mockResolvedValue({ allowed: false, tier: 'free' });

    const request = new NextRequest('http://localhost/api/recipes/external/search?q=pasta', {
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.status).toBe(403);
  });

  it('should return empty array when query is too short', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { canAccessFeature } = await import('@/lib/services/feature-access-service');

    mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any, canAccessFeature as any);

    const request = new NextRequest('http://localhost/api/recipes/external/search?q=a', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(0);
  });

  it('should return recipes from TheMealDB', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { canAccessFeature } = await import('@/lib/services/feature-access-service');

    mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any, canAccessFeature as any);

    const mockApiResponse = {
      meals: [
        {
          idMeal: '12345',
          strMeal: 'Pasta Carbonara',
          strCategory: 'Pasta',
          strArea: 'Italian',
          strMealThumb: 'https://example.com/thumb.jpg',
          strInstructions: 'Cook pasta. Add eggs.',
          strSource: 'https://example.com',
          strYoutube: '',
          strIngredient1: 'spaghetti',
          strMeasure1: '400g',
          strIngredient2: 'eggs',
          strMeasure2: '4',
        },
      ],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockApiResponse),
    }));

    const request = new NextRequest('http://localhost/api/recipes/external/search?q=pasta', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('themealdb-12345');
    expect(data[0].source).toBe('themealdb');
    expect(data[0].name).toBe('Pasta Carbonara');
  });

  it('should return empty array when TheMealDB returns no results', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { canAccessFeature } = await import('@/lib/services/feature-access-service');

    mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any, canAccessFeature as any);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ meals: null }),
    }));

    const request = new NextRequest('http://localhost/api/recipes/external/search?q=xyzzyxyzzy', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });
});
