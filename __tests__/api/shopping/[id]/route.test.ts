import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/shopping/[id]/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/shopping-service', () => ({
  shoppingService: {
    getListById: vi.fn(),
    updateList: vi.fn(),
    deleteList: vi.fn(),
  },
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

const mockAuthUser = async (userId = 'user-123') => {
  const { createClient } = await import('@/lib/supabase/server');
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  } as any);
};

describe('/api/shopping/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost/api/shopping/list-1', {
        method: 'GET',
      });

      const response = await GET(request, makeParams('list-1'));
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
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

      const request = new NextRequest('http://localhost/api/shopping/list-1', {
        method: 'GET',
      });

      const response = await GET(request, makeParams('list-1'));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when shopping list not found', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { shoppingService } = await import('@/lib/services/shopping-service');
      vi.mocked(shoppingService.getListById).mockResolvedValue(null as any);

      const request = new NextRequest('http://localhost/api/shopping/nonexistent', {
        method: 'GET',
      });

      const response = await GET(request, makeParams('nonexistent'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Shopping list not found');
    });

    it('should return 403 when user lacks access', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { shoppingService } = await import('@/lib/services/shopping-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      const mockList = { id: 'list-1', title: 'Groceries', space_id: 'space-1' };
      vi.mocked(shoppingService.getListById).mockResolvedValue(mockList as any);
      vi.mocked(verifyResourceAccess).mockRejectedValue(new Error('Access denied'));

      const request = new NextRequest('http://localhost/api/shopping/list-1', {
        method: 'GET',
      });

      const response = await GET(request, makeParams('list-1'));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this shopping list');
    });

    it('should return shopping list successfully', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { shoppingService } = await import('@/lib/services/shopping-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      const mockList = {
        id: '00000000-0000-4000-8000-000000000010',
        title: 'Grocery Run',
        status: 'active',
        space_id: '00000000-0000-4000-8000-000000000002',
        items: [],
      };

      vi.mocked(shoppingService.getListById).mockResolvedValue(mockList as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/shopping/00000000-0000-4000-8000-000000000010', {
        method: 'GET',
      });

      const response = await GET(request, makeParams('00000000-0000-4000-8000-000000000010'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('00000000-0000-4000-8000-000000000010');
      expect(data.data.title).toBe('Grocery Run');
    });
  });

  describe('PATCH', () => {
    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
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

      const request = new NextRequest('http://localhost/api/shopping/list-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      });

      const response = await PATCH(request, makeParams('list-1'));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when list not found', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { shoppingService } = await import('@/lib/services/shopping-service');
      vi.mocked(shoppingService.getListById).mockResolvedValue(null as any);

      const request = new NextRequest('http://localhost/api/shopping/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      });

      const response = await PATCH(request, makeParams('nonexistent'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Shopping list not found');
    });

    it('should return 400 for invalid update data', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { shoppingService } = await import('@/lib/services/shopping-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      const mockList = { id: 'list-1', title: 'Groceries', space_id: 'space-1' };
      vi.mocked(shoppingService.getListById).mockResolvedValue(mockList as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/shopping/list-1', {
        method: 'PATCH',
        // title with invalid length > 200 chars
        body: JSON.stringify({ title: 'a'.repeat(201) }),
      });

      const response = await PATCH(request, makeParams('list-1'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid update data');
    });

    it('should update shopping list successfully', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { shoppingService } = await import('@/lib/services/shopping-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      const existingList = { id: 'list-1', title: 'Groceries', status: 'active', space_id: 'space-1' };
      const updatedList = { id: 'list-1', title: 'Weekly Groceries', status: 'active', space_id: 'space-1' };

      vi.mocked(shoppingService.getListById).mockResolvedValue(existingList as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);
      vi.mocked(shoppingService.updateList).mockResolvedValue(updatedList as any);

      const request = new NextRequest('http://localhost/api/shopping/list-1', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Weekly Groceries' }),
      });

      const response = await PATCH(request, makeParams('list-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('Weekly Groceries');
    });
  });

  describe('DELETE', () => {
    it('should return 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost/api/shopping/list-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, makeParams('list-1'));
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('should return 404 when list not found', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { shoppingService } = await import('@/lib/services/shopping-service');
      vi.mocked(shoppingService.getListById).mockResolvedValue(null as any);

      const request = new NextRequest('http://localhost/api/shopping/nonexistent', {
        method: 'DELETE',
      });

      const response = await DELETE(request, makeParams('nonexistent'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Shopping list not found');
    });

    it('should return 403 when user lacks access', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { shoppingService } = await import('@/lib/services/shopping-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      const mockList = { id: 'list-1', title: 'Groceries', space_id: 'space-1' };
      vi.mocked(shoppingService.getListById).mockResolvedValue(mockList as any);
      vi.mocked(verifyResourceAccess).mockRejectedValue(new Error('Access denied'));

      const request = new NextRequest('http://localhost/api/shopping/list-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, makeParams('list-1'));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this shopping list');
    });

    it('should delete shopping list successfully', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { shoppingService } = await import('@/lib/services/shopping-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      const mockList = { id: 'list-1', title: 'Groceries', space_id: 'space-1' };
      vi.mocked(shoppingService.getListById).mockResolvedValue(mockList as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);
      vi.mocked(shoppingService.deleteList).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/shopping/list-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, makeParams('list-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Shopping list deleted successfully');
    });
  });
});
