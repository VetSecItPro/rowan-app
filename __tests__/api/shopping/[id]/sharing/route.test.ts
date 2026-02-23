import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH, GET } from '@/app/api/shopping/[id]/sharing/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/authorization-service', () => ({
  verifyResourceAccess: vi.fn(),
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

vi.mock('@/lib/utils/app-url', () => ({
  getAppUrl: vi.fn(() => 'https://app.example.com'),
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

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

const mockRateLimitSuccess = async () => {
  const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
  vi.mocked(checkGeneralRateLimit).mockResolvedValue({
    success: true,
    limit: 60,
    remaining: 59,
    reset: Date.now() + 60000,
  });
};

describe('/api/shopping/[id]/sharing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PATCH', () => {
    it('should return 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost/api/shopping/list-1/sharing', {
        method: 'PATCH',
        body: JSON.stringify({ isPublic: true }),
      });

      const response = await PATCH(request, makeParams('list-1'));
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('should return 401 when not authenticated', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/shopping/list-1/sharing', {
        method: 'PATCH',
        body: JSON.stringify({ isPublic: true }),
      });

      const response = await PATCH(request, makeParams('list-1'));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when isPublic is not a boolean', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/shopping/list-1/sharing', {
        method: 'PATCH',
        body: JSON.stringify({ isPublic: 'yes' }),
      });

      const response = await PATCH(request, makeParams('list-1'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('isPublic must be a boolean value');
    });

    it('should return 404 when shopping list not found', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const chain = createChainMock({ data: null, error: { message: 'Not found' } });
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(() => chain),
      } as any);

      const request = new NextRequest('http://localhost/api/shopping/nonexistent/sharing', {
        method: 'PATCH',
        body: JSON.stringify({ isPublic: true }),
      });

      const response = await PATCH(request, makeParams('nonexistent'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Shopping list not found');
    });

    it('should return 403 when user lacks access', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      const existingList = { id: 'list-1', space_id: 'space-1', is_public: false, share_token: null, shared_at: null };
      const chain = createChainMock({ data: existingList, error: null });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(() => chain),
      } as any);

      vi.mocked(verifyResourceAccess).mockRejectedValue(new Error('Access denied'));

      const request = new NextRequest('http://localhost/api/shopping/list-1/sharing', {
        method: 'PATCH',
        body: JSON.stringify({ isPublic: true }),
      });

      const response = await PATCH(request, makeParams('list-1'));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this shopping list');
    });

    it('should make list public successfully', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      const existingList = { id: 'list-1', space_id: 'space-1', is_public: false, share_token: null, shared_at: null };
      const updatedList = {
        id: 'list-1',
        title: 'Groceries',
        space_id: 'space-1',
        is_public: true,
        share_token: 'secure-token-abc123',
        shared_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let callCount = 0;
      const fromMock = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return createChainMock({ data: existingList, error: null });
        }
        return createChainMock({ data: updatedList, error: null });
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

      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/shopping/list-1/sharing', {
        method: 'PATCH',
        body: JSON.stringify({ isPublic: true }),
      });

      const response = await PATCH(request, makeParams('list-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('List is now public and shareable');
    });
  });

  describe('GET', () => {
    it('should return 401 when not authenticated', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/shopping/list-1/sharing', {
        method: 'GET',
      });

      const response = await GET(request, makeParams('list-1'));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when list not found', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const chain = createChainMock({ data: null, error: { message: 'Not found' } });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(() => chain),
      } as any);

      const request = new NextRequest('http://localhost/api/shopping/nonexistent/sharing', {
        method: 'GET',
      });

      const response = await GET(request, makeParams('nonexistent'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Shopping list not found');
    });

    it('should return sharing info successfully for a public list', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      const listData = {
        id: 'list-1',
        title: 'Weekly Groceries',
        is_public: true,
        share_token: 'secure-token-abc123',
        shared_at: '2026-01-01T00:00:00Z',
        space_id: 'space-1',
      };

      const chain = createChainMock({ data: listData, error: null });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(() => chain),
      } as any);

      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/shopping/list-1/sharing', {
        method: 'GET',
      });

      const response = await GET(request, makeParams('list-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.isPublic).toBe(true);
      expect(data.data.shareUrl).toContain('secure-token-abc123');
    });

    it('should return sharing info with null shareUrl for private list', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      const listData = {
        id: 'list-1',
        title: 'Private List',
        is_public: false,
        share_token: null,
        shared_at: null,
        space_id: 'space-1',
      };

      const chain = createChainMock({ data: listData, error: null });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(() => chain),
      } as any);

      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/shopping/list-1/sharing', {
        method: 'GET',
      });

      const response = await GET(request, makeParams('list-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.isPublic).toBe(false);
      expect(data.data.shareUrl).toBeNull();
    });
  });
});
