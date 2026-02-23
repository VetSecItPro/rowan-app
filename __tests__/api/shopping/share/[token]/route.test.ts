import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from '@/app/api/shopping/share/[token]/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/ratelimit-shopping', () => ({
  checkShoppingTokenRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
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

const makeParams = (token: string) => ({ params: Promise.resolve({ token }) });

const VALID_TOKEN = 'abcdefghijklmnopqrstuvwxyz123456'; // 32 chars, valid format

const mockRateLimitSuccess = async () => {
  const { checkShoppingTokenRateLimit } = await import('@/lib/ratelimit-shopping');
  vi.mocked(checkShoppingTokenRateLimit).mockResolvedValue({
    success: true,
    limit: 5,
    remaining: 4,
    reset: Date.now() + 60000,
  });
};

describe('/api/shopping/share/[token]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 429 when rate limit exceeded', async () => {
      const { checkShoppingTokenRateLimit } = await import('@/lib/ratelimit-shopping');
      vi.mocked(checkShoppingTokenRateLimit).mockResolvedValue({
        success: false,
        limit: 5,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest(`http://localhost/api/shopping/share/${VALID_TOKEN}`, {
        method: 'GET',
      });

      const response = await GET(request, makeParams(VALID_TOKEN));
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many shopping list access attempts');
    });

    it('should return 400 for an invalid token format (too short)', async () => {
      await mockRateLimitSuccess();

      const request = new NextRequest('http://localhost/api/shopping/share/short', {
        method: 'GET',
      });

      const response = await GET(request, makeParams('short'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid share token format');
    });

    it('should return 400 for a token with invalid characters', async () => {
      await mockRateLimitSuccess();

      const invalidToken = 'abcdefghijklmnopqrstuvwxyz12345!'; // contains !

      const request = new NextRequest(`http://localhost/api/shopping/share/${invalidToken}`, {
        method: 'GET',
      });

      const response = await GET(request, makeParams(invalidToken));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid share token format');
    });

    it('should return 404 when list not found or not public', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const chain = createChainMock({ data: null, error: { message: 'Not found' } });

      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn(() => chain),
      } as any);

      const request = new NextRequest(`http://localhost/api/shopping/share/${VALID_TOKEN}`, {
        method: 'GET',
      });

      const response = await GET(request, makeParams(VALID_TOKEN));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Shopping list not found or not public');
    });

    it('should return shopping list with items for a valid public token', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');

      const shoppingList = {
        id: 'list-1',
        title: 'Shared Groceries',
        description: 'Shared with family',
        created_by: 'user-123',
        is_public: true,
        share_token: VALID_TOKEN,
      };

      const items = [
        { id: 'item-1', name: 'Milk', category: 'Dairy', is_purchased: false, list_id: 'list-1' },
        { id: 'item-2', name: 'Eggs', category: 'Dairy', is_purchased: true, list_id: 'list-1' },
      ];

      const creator = { name: 'John Doe' };

      let callIndex = 0;
      const fromMock = vi.fn(() => {
        callIndex++;
        if (callIndex === 1) return createChainMock({ data: shoppingList, error: null });
        if (callIndex === 2) return createChainMock({ data: items, error: null });
        return createChainMock({ data: creator, error: null });
      });

      vi.mocked(createClient).mockResolvedValue({
        from: fromMock,
      } as any);

      const request = new NextRequest(`http://localhost/api/shopping/share/${VALID_TOKEN}`, {
        method: 'GET',
      });

      const response = await GET(request, makeParams(VALID_TOKEN));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.list.title).toBe('Shared Groceries');
      expect(data.data.stats.totalItems).toBe(2);
      expect(data.data.stats.purchasedItems).toBe(1);
    });
  });

  describe('PATCH', () => {
    it('should return 429 when rate limit exceeded', async () => {
      const { checkShoppingTokenRateLimit } = await import('@/lib/ratelimit-shopping');
      vi.mocked(checkShoppingTokenRateLimit).mockResolvedValue({
        success: false,
        limit: 5,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest(`http://localhost/api/shopping/share/${VALID_TOKEN}`, {
        method: 'PATCH',
        body: JSON.stringify({ itemId: '00000000-0000-4000-8000-000000000001', isPurchased: true }),
      });

      const response = await PATCH(request, makeParams(VALID_TOKEN));
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many shopping list access attempts');
    });

    it('should return 400 for invalid body (missing isPurchased)', async () => {
      await mockRateLimitSuccess();

      const request = new NextRequest(`http://localhost/api/shopping/share/${VALID_TOKEN}`, {
        method: 'PATCH',
        body: JSON.stringify({ itemId: '00000000-0000-4000-8000-000000000001' }),
      });

      const response = await PATCH(request, makeParams(VALID_TOKEN));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('should return 400 for invalid itemId format (not UUID)', async () => {
      await mockRateLimitSuccess();

      const request = new NextRequest(`http://localhost/api/shopping/share/${VALID_TOKEN}`, {
        method: 'PATCH',
        body: JSON.stringify({ itemId: 'not-a-uuid', isPurchased: true }),
      });

      const response = await PATCH(request, makeParams(VALID_TOKEN));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('should return 404 when list not found or not public', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const chain = createChainMock({ data: null, error: { message: 'Not found' } });

      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn(() => chain),
      } as any);

      const request = new NextRequest(`http://localhost/api/shopping/share/${VALID_TOKEN}`, {
        method: 'PATCH',
        body: JSON.stringify({
          itemId: '00000000-0000-4000-8000-000000000001',
          isPurchased: true,
        }),
      });

      const response = await PATCH(request, makeParams(VALID_TOKEN));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Shopping list not found or not public');
    });

    it('should update item purchased status successfully', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');

      const shoppingList = { id: 'list-1' };

      let callIndex = 0;
      const fromMock = vi.fn(() => {
        callIndex++;
        if (callIndex === 1) return createChainMock({ data: shoppingList, error: null });
        return createChainMock({ error: null });
      });

      vi.mocked(createClient).mockResolvedValue({
        from: fromMock,
      } as any);

      const request = new NextRequest(`http://localhost/api/shopping/share/${VALID_TOKEN}`, {
        method: 'PATCH',
        body: JSON.stringify({
          itemId: '00000000-0000-4000-8000-000000000001',
          isPurchased: true,
        }),
      });

      const response = await PATCH(request, makeParams(VALID_TOKEN));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Item updated successfully');
    });
  });
});
