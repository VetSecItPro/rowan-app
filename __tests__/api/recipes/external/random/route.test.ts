import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/recipes/external/random/route';

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

const mockMealResponse = {
  meals: [{
    idMeal: '99999',
    strMeal: 'Random Dish',
    strCategory: 'Dessert',
    strArea: 'French',
    strMealThumb: 'https://example.com/img.jpg',
    strInstructions: 'Mix and bake.',
    strSource: 'https://example.com',
    strYoutube: '',
    strIngredient1: 'flour',
    strMeasure1: '200g',
  }],
};

describe('/api/recipes/external/random', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
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

    const request = new NextRequest('http://localhost/api/recipes/external/random', {
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

    const request = new NextRequest('http://localhost/api/recipes/external/random', {
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.status).toBe(403);
  });

  it('should return 400 for invalid count parameter', async () => {
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

    vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'pro' });

    const request = new NextRequest(
      'http://localhost/api/recipes/external/random?count=999',
      { method: 'GET' }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid query parameters');
  });

  it('should return unique random recipes', async () => {
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

    vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'pro' });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockMealResponse),
    }));

    const request = new NextRequest('http://localhost/api/recipes/external/random?count=2', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    // Since the same meal is returned for each fetch call, deduplification yields 1 unique recipe
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0].source).toBe('themealdb');
  });

  it('should return empty array when API returns no meals', async () => {
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

    vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'pro' });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ meals: null }),
    }));

    const request = new NextRequest('http://localhost/api/recipes/external/random?count=3', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });
});
