import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/expenses/[id]/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/budgets-service', () => ({
  projectsService: {
    getExpenseById: vi.fn(),
    updateExpense: vi.fn(),
    deleteExpense: vi.fn(),
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

const EXPENSE_ID = '00000000-0000-4000-8000-000000000010';
const USER_ID = '00000000-0000-4000-8000-000000000001';
const SPACE_ID = '00000000-0000-4000-8000-000000000002';

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function mockRateLimitOk() {
  return { success: true, limit: 60, remaining: 59, reset: Date.now() + 60000 };
}

function mockAuthUser(userId = USER_ID) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  };
}

describe('/api/expenses/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest(`http://localhost/api/expenses/${EXPENSE_ID}`, { method: 'GET' });
      const response = await GET(request, makeParams(EXPENSE_ID));
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }),
        },
      } as any);

      const request = new NextRequest(`http://localhost/api/expenses/${EXPENSE_ID}`, { method: 'GET' });
      const response = await GET(request, makeParams(EXPENSE_ID));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when expense is not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { projectsService } = await import('@/lib/services/budgets-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue(mockAuthUser() as any);
      vi.mocked(projectsService.getExpenseById).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/expenses/${EXPENSE_ID}`, { method: 'GET' });
      const response = await GET(request, makeParams(EXPENSE_ID));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Expense not found');
    });

    it('should return 403 when user lacks access to the expense', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { projectsService } = await import('@/lib/services/budgets-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue(mockAuthUser() as any);
      vi.mocked(projectsService.getExpenseById).mockResolvedValue({ id: EXPENSE_ID, space_id: SPACE_ID } as any);
      vi.mocked(verifyResourceAccess).mockRejectedValue(new Error('Access denied'));

      const request = new NextRequest(`http://localhost/api/expenses/${EXPENSE_ID}`, { method: 'GET' });
      const response = await GET(request, makeParams(EXPENSE_ID));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this expense');
    });

    it('should return expense data successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { projectsService } = await import('@/lib/services/budgets-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      const mockExpense = { id: EXPENSE_ID, title: 'Groceries', amount: 150, space_id: SPACE_ID };

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue(mockAuthUser() as any);
      vi.mocked(projectsService.getExpenseById).mockResolvedValue(mockExpense as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const request = new NextRequest(`http://localhost/api/expenses/${EXPENSE_ID}`, { method: 'GET' });
      const response = await GET(request, makeParams(EXPENSE_ID));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockExpense);
    });
  });

  describe('PATCH', () => {
    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }),
        },
      } as any);

      const request = new NextRequest(`http://localhost/api/expenses/${EXPENSE_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated Groceries' }),
      });
      const response = await PATCH(request, makeParams(EXPENSE_ID));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid update input', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue(mockAuthUser() as any);

      const request = new NextRequest(`http://localhost/api/expenses/${EXPENSE_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'invalid_status_value' }),
      });
      const response = await PATCH(request, makeParams(EXPENSE_ID));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });

    it('should return 404 when expense is not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { projectsService } = await import('@/lib/services/budgets-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue(mockAuthUser() as any);
      vi.mocked(projectsService.getExpenseById).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/expenses/${EXPENSE_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated Groceries' }),
      });
      const response = await PATCH(request, makeParams(EXPENSE_ID));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Expense not found');
    });

    it('should return 403 when user lacks access', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { projectsService } = await import('@/lib/services/budgets-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue(mockAuthUser() as any);
      vi.mocked(projectsService.getExpenseById).mockResolvedValue({ id: EXPENSE_ID, space_id: SPACE_ID } as any);
      vi.mocked(verifyResourceAccess).mockRejectedValue(new Error('Access denied'));

      const request = new NextRequest(`http://localhost/api/expenses/${EXPENSE_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated Groceries' }),
      });
      const response = await PATCH(request, makeParams(EXPENSE_ID));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this expense');
    });

    it('should update expense successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { projectsService } = await import('@/lib/services/budgets-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      const updatedExpense = { id: EXPENSE_ID, title: 'Updated Groceries', amount: 200, space_id: SPACE_ID };

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue(mockAuthUser() as any);
      vi.mocked(projectsService.getExpenseById).mockResolvedValue({ id: EXPENSE_ID, space_id: SPACE_ID } as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);
      vi.mocked(projectsService.updateExpense).mockResolvedValue(updatedExpense as any);

      const request = new NextRequest(`http://localhost/api/expenses/${EXPENSE_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated Groceries', amount: 200 }),
      });
      const response = await PATCH(request, makeParams(EXPENSE_ID));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('Updated Groceries');
    });
  });

  describe('DELETE', () => {
    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }),
        },
      } as any);

      const request = new NextRequest(`http://localhost/api/expenses/${EXPENSE_ID}`, { method: 'DELETE' });
      const response = await DELETE(request, makeParams(EXPENSE_ID));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when expense is not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { projectsService } = await import('@/lib/services/budgets-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue(mockAuthUser() as any);
      vi.mocked(projectsService.getExpenseById).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/expenses/${EXPENSE_ID}`, { method: 'DELETE' });
      const response = await DELETE(request, makeParams(EXPENSE_ID));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Expense not found');
    });

    it('should return 403 when user lacks access', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { projectsService } = await import('@/lib/services/budgets-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue(mockAuthUser() as any);
      vi.mocked(projectsService.getExpenseById).mockResolvedValue({ id: EXPENSE_ID, space_id: SPACE_ID } as any);
      vi.mocked(verifyResourceAccess).mockRejectedValue(new Error('Access denied'));

      const request = new NextRequest(`http://localhost/api/expenses/${EXPENSE_ID}`, { method: 'DELETE' });
      const response = await DELETE(request, makeParams(EXPENSE_ID));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this expense');
    });

    it('should delete expense successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { projectsService } = await import('@/lib/services/budgets-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue(mockAuthUser() as any);
      vi.mocked(projectsService.getExpenseById).mockResolvedValue({ id: EXPENSE_ID, space_id: SPACE_ID } as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);
      vi.mocked(projectsService.deleteExpense).mockResolvedValue(undefined);

      const request = new NextRequest(`http://localhost/api/expenses/${EXPENSE_ID}`, { method: 'DELETE' });
      const response = await DELETE(request, makeParams(EXPENSE_ID));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Expense deleted successfully');
    });
  });
});
