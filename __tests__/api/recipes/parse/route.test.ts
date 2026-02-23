import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/recipes/parse/route';

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

const mockGenerateContent = vi.fn();

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent };
    }
  },
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/lib/sentry-utils', () => ({
  setSentryUser: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

const USER_ID = '00000000-0000-4000-8000-000000000001';

const validRecipeJson = JSON.stringify({
  name: 'Spaghetti Carbonara',
  description: 'Classic Italian pasta',
  ingredients: [
    { name: 'spaghetti', amount: '400', unit: 'g' },
    { name: 'eggs', amount: '4', unit: '' },
  ],
  instructions: '1. Boil pasta. 2. Mix eggs with cheese.',
  prep_time: 10,
  cook_time: 20,
  servings: 4,
  difficulty: 'medium',
  cuisine_type: 'Italian',
  tags: ['pasta', 'italian'],
});

describe('/api/recipes/parse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_GEMINI_API_KEY = 'test-gemini-key';
  });

  it('should return 429 when rate limit exceeded', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: false, limit: 60, remaining: 0, reset: Date.now() + 60000,
    });

    const request = new NextRequest('http://localhost/api/recipes/parse', {
      method: 'POST',
      body: JSON.stringify({ text: 'Spaghetti carbonara recipe' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain('Too many requests');
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

    const request = new NextRequest('http://localhost/api/recipes/parse', {
      method: 'POST',
      body: JSON.stringify({ text: 'Spaghetti carbonara recipe' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 403 when user lacks meal planning access', async () => {
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

    const request = new NextRequest('http://localhost/api/recipes/parse', {
      method: 'POST',
      body: JSON.stringify({ text: 'Spaghetti carbonara recipe' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
  });

  it('should return 400 when neither text nor image provided', async () => {
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

    const request = new NextRequest('http://localhost/api/recipes/parse', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Please provide either text or an image');
  });

  it('should return 400 when text exceeds maximum length', async () => {
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

    const request = new NextRequest('http://localhost/api/recipes/parse', {
      method: 'POST',
      body: JSON.stringify({ text: 'a'.repeat(50001) }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('too long');
  });

  it('should parse recipe text and return structured data', async () => {
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

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => validRecipeJson,
      },
    });

    const request = new NextRequest('http://localhost/api/recipes/parse', {
      method: 'POST',
      body: JSON.stringify({ text: 'Make spaghetti carbonara...' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.recipe.name).toBe('Spaghetti Carbonara');
    expect(data.recipe.ingredients).toHaveLength(2);
  });
});
