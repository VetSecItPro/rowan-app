import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/shopping/generate-from-meals/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
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

vi.mock('@/lib/services/ingredient-parser', () => ({
  generateShoppingList: vi.fn(),
  categorizeIngredient: vi.fn((name: string) => 'Other'),
}));

vi.mock('@/lib/services/email-service', () => ({
  sendShoppingListEmail: vi.fn(),
}));

function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  [
    'select', 'eq', 'order', 'insert', 'update', 'delete',
    'single', 'limit', 'maybeSingle', 'gte', 'lte', 'in',
    'neq', 'is', 'not', 'upsert', 'match', 'or', 'filter', 'ilike',
  ].forEach((m) => { mock[m] = vi.fn(handler); });
  mock.then = vi.fn((resolve: (value: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

const VALID_SPACE_ID = '00000000-0000-4000-8000-000000000002';
const VALID_MEAL_ID_1 = '00000000-0000-4000-8000-000000000011';
const VALID_MEAL_ID_2 = '00000000-0000-4000-8000-000000000012';

describe('/api/shopping/generate-from-meals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 429 when rate limit exceeded', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 60000,
    });

    const request = new NextRequest('http://localhost/api/shopping/generate-from-meals', {
      method: 'POST',
      body: JSON.stringify({ mealIds: [VALID_MEAL_ID_1], spaceId: VALID_SPACE_ID }),
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
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60000,
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
    } as any);

    const request = new NextRequest('http://localhost/api/shopping/generate-from-meals', {
      method: 'POST',
      body: JSON.stringify({ mealIds: [VALID_MEAL_ID_1], spaceId: VALID_SPACE_ID }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 when validation fails (empty mealIds)', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60000,
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    } as any);

    const request = new NextRequest('http://localhost/api/shopping/generate-from-meals', {
      method: 'POST',
      body: JSON.stringify({ mealIds: [], spaceId: VALID_SPACE_ID }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('should return 400 when spaceId is missing', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60000,
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    } as any);

    const request = new NextRequest('http://localhost/api/shopping/generate-from-meals', {
      method: 'POST',
      body: JSON.stringify({ mealIds: [VALID_MEAL_ID_1] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('should return 403 when user is not a space member', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60000,
    });

    const chain = createChainMock({ data: null, error: null });
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn(() => chain),
    } as any);

    const request = new NextRequest('http://localhost/api/shopping/generate-from-meals', {
      method: 'POST',
      body: JSON.stringify({ mealIds: [VALID_MEAL_ID_1], spaceId: VALID_SPACE_ID }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('You do not have access to this space');
  });

  it('should return 404 when no meals found', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60000,
    });

    const membership = { space_id: VALID_SPACE_ID, user_id: 'user-123', role: 'member' };

    let callIndex = 0;
    const fromMock = vi.fn(() => {
      callIndex++;
      if (callIndex === 1) return createChainMock({ data: membership, error: null }); // membership check
      return createChainMock({ data: [], error: null }); // no meals
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: fromMock,
    } as any);

    const request = new NextRequest('http://localhost/api/shopping/generate-from-meals', {
      method: 'POST',
      body: JSON.stringify({ mealIds: [VALID_MEAL_ID_1], spaceId: VALID_SPACE_ID }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('No meals found with the provided IDs');
  });

  it('should generate shopping list successfully', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { generateShoppingList } = await import('@/lib/services/ingredient-parser');
    const { sendShoppingListEmail } = await import('@/lib/services/email-service');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60000,
    });

    const membership = { space_id: VALID_SPACE_ID, user_id: 'user-123', role: 'member' };

    const meals = [
      {
        id: VALID_MEAL_ID_1,
        space_id: VALID_SPACE_ID,
        recipes: {
          id: 'recipe-1',
          name: 'Pasta',
          ingredients: ['200g pasta', '2 tomatoes'],
        },
      },
    ];

    const shoppingList = {
      id: '00000000-0000-4000-8000-000000000099',
      title: 'Shopping List',
      space_id: VALID_SPACE_ID,
    };

    const aggregatedIngredients = [
      { name: 'pasta', amount: 200, unit: 'g', recipes: [{ id: 'recipe-1', name: 'Pasta' }] },
    ];

    vi.mocked(generateShoppingList).mockReturnValue(aggregatedIngredients as any);
    vi.mocked(sendShoppingListEmail).mockResolvedValue({ success: true } as any);

    let callIndex = 0;
    const fromMock = vi.fn(() => {
      callIndex++;
      if (callIndex === 1) return createChainMock({ data: membership, error: null }); // membership
      if (callIndex === 2) return createChainMock({ data: meals, error: null }); // meals
      if (callIndex === 3) return createChainMock({ data: shoppingList, error: null }); // create list
      if (callIndex === 4) return createChainMock({ error: null }); // create items
      if (callIndex === 5) return createChainMock({ data: { name: 'My Space' }, error: null }); // space
      if (callIndex === 6) return createChainMock({ data: { name: 'John', email: 'john@example.com' }, error: null }); // user
      return createChainMock({ data: null, error: null }); // prefs
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: fromMock,
    } as any);

    const request = new NextRequest('http://localhost/api/shopping/generate-from-meals', {
      method: 'POST',
      body: JSON.stringify({
        mealIds: [VALID_MEAL_ID_1],
        spaceId: VALID_SPACE_ID,
        listName: 'My Shopping List',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.itemCount).toBe(1);
    expect(data.data.recipeCount).toBe(1);
    expect(data.message).toBe('Shopping list generated successfully');
  });
});
