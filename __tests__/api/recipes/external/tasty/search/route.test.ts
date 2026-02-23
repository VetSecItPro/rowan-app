import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/recipes/external/tasty/search/route';

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

describe('/api/recipes/external/tasty/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    process.env.RAPIDAPI_KEY = 'test-rapidapi-key';
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
      'http://localhost/api/recipes/external/tasty/search?q=tacos',
      { method: 'GET' }
    );

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

    const request = new NextRequest(
      'http://localhost/api/recipes/external/tasty/search?q=tacos',
      { method: 'GET' }
    );

    const response = await GET(request);

    expect(response.status).toBe(403);
  });

  it('should return empty array when query is too short', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { canAccessFeature } = await import('@/lib/services/feature-access-service');

    mockAuth(createClient as any, checkGeneralRateLimit as any, canAccessFeature as any);

    const request = new NextRequest(
      'http://localhost/api/recipes/external/tasty/search?q=t',
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

    delete process.env.RAPIDAPI_KEY;

    const request = new NextRequest(
      'http://localhost/api/recipes/external/tasty/search?q=tacos',
      { method: 'GET' }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it('should return recipes from Tasty API', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { canAccessFeature } = await import('@/lib/services/feature-access-service');

    mockAuth(createClient as any, checkGeneralRateLimit as any, canAccessFeature as any);

    const mockApiResponse = {
      results: [
        {
          id: 1234,
          name: 'Street Tacos',
          description: 'Classic Mexican street tacos.',
          thumbnail_url: 'https://tasty.co/img/tacos.jpg',
          prep_time_minutes: 15,
          cook_time_minutes: 10,
          num_servings: 4,
          tags: [{ type: 'cuisine', display_name: 'Mexican' }],
          canonical_id: 'street-tacos',
          slug: 'street-tacos',
          sections: [{
            components: [
              {
                ingredient: { name: 'tortillas' },
                measurements: [{ quantity: '8', unit: { name: 'pieces' } }],
              },
              {
                ingredient: { name: 'beef' },
                measurements: [{ quantity: '500', unit: { name: 'g' } }],
              },
            ],
          }],
          instructions: [
            { display_text: 'Cook beef.' },
            { display_text: 'Assemble tacos.' },
          ],
        },
      ],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockApiResponse),
    }));

    const request = new NextRequest(
      'http://localhost/api/recipes/external/tasty/search?q=tacos',
      { method: 'GET' }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('tasty-1234');
    expect(data[0].source).toBe('tasty');
    expect(data[0].name).toBe('Street Tacos');
    expect(data[0].cuisine).toBe('Mexican');
    expect(data[0].ingredients).toHaveLength(2);
    expect(data[0].source_url).toBe('https://tasty.co/recipe/street-tacos');
  });

  it('should return empty array when Tasty returns no results', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { canAccessFeature } = await import('@/lib/services/feature-access-service');

    mockAuth(createClient as any, checkGeneralRateLimit as any, canAccessFeature as any);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ results: [] }),
    }));

    const request = new NextRequest(
      'http://localhost/api/recipes/external/tasty/search?q=xyzzy',
      { method: 'GET' }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });
});
