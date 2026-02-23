import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/recipes/external/spoonacular/search/route';

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

function mockAuth(
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

describe('/api/recipes/external/spoonacular/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    process.env.SPOONACULAR_API_KEY = 'test-spoonacular-key';
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

    const request = new NextRequest(
      'http://localhost/api/recipes/external/spoonacular/search?q=pasta',
      { method: 'GET' }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return empty array when query is too short', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { canAccessFeature } = await import('@/lib/services/feature-access-service');

    mockAuth(createClient as any, checkGeneralRateLimit as any, canAccessFeature as any);

    const request = new NextRequest(
      'http://localhost/api/recipes/external/spoonacular/search?q=p',
      { method: 'GET' }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it('should return empty array when API key is not configured', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { canAccessFeature } = await import('@/lib/services/feature-access-service');

    mockAuth(createClient as any, checkGeneralRateLimit as any, canAccessFeature as any);

    delete process.env.SPOONACULAR_API_KEY;

    const request = new NextRequest(
      'http://localhost/api/recipes/external/spoonacular/search?q=pasta',
      { method: 'GET' }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it('should return recipes from Spoonacular', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { canAccessFeature } = await import('@/lib/services/feature-access-service');

    mockAuth(createClient as any, checkGeneralRateLimit as any, canAccessFeature as any);

    const mockApiResponse = {
      results: [
        {
          id: 71642,
          title: 'Spicy Pasta',
          image: 'https://spoonacular.com/img/pasta.jpg',
          summary: 'Delicious spicy pasta dish.',
          preparationMinutes: 10,
          cookingMinutes: 20,
          servings: 4,
          cuisines: ['Italian'],
          sourceUrl: 'https://spoonacular.com/recipe',
          extendedIngredients: [
            { name: 'pasta', amount: 200, unit: 'g' },
            { name: 'chilli', amount: 2, unit: 'pieces' },
          ],
          analyzedInstructions: [{
            steps: [
              { number: 1, step: 'Boil pasta.' },
              { number: 2, step: 'Add chilli.' },
            ],
          }],
        },
      ],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockApiResponse),
    }));

    const request = new NextRequest(
      'http://localhost/api/recipes/external/spoonacular/search?q=pasta',
      { method: 'GET' }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('spoonacular-71642');
    expect(data[0].source).toBe('spoonacular');
    expect(data[0].name).toBe('Spicy Pasta');
    expect(data[0].ingredients).toHaveLength(2);
  });

  it('should return empty array when Spoonacular returns no results', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { canAccessFeature } = await import('@/lib/services/feature-access-service');

    mockAuth(createClient as any, checkGeneralRateLimit as any, canAccessFeature as any);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ results: [] }),
    }));

    const request = new NextRequest(
      'http://localhost/api/recipes/external/spoonacular/search?q=xyzzyxyz',
      { method: 'GET' }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });
});
