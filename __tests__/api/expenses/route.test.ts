import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/expenses/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/budgets-service', () => ({
  projectsService: {
    getExpenses: vi.fn(),
    createExpense: vi.fn(),
  },
}));

vi.mock('@/lib/services/authorization-service', () => ({
  verifySpaceAccess: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/validations/expense-schemas', () => ({
  createExpenseSchema: {
    parse: vi.fn(),
  },
}));

vi.mock('@/lib/sanitize', () => ({
  sanitizePlainText: vi.fn((text) => text),
}));

vi.mock('@/lib/utils/cache-headers', () => ({
  withUserDataCache: vi.fn((response) => response),
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

describe('/api/expenses', () => {
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

      const request = new NextRequest('http://localhost/api/expenses?space_id=space-123', {
        method: 'GET',
      });

      const response = await GET(request);
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

      const request = new NextRequest('http://localhost/api/expenses?space_id=space-123', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when space_id is missing', async () => {
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
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/expenses', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('space_id is required');
    });

    it('should return 403 when user lacks space access', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
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

      vi.mocked(verifySpaceAccess).mockRejectedValue(new Error('Access denied'));

      const request = new NextRequest('http://localhost/api/expenses?space_id=space-123', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this space');
    });

    it('should return expenses successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { projectsService } = await import('@/lib/services/budgets-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
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

      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);

      const mockExpenses = [
        { id: 'expense-1', title: 'Groceries', amount: 150, status: 'paid' },
        { id: 'expense-2', title: 'Utilities', amount: 200, status: 'pending' },
      ];

      vi.mocked(projectsService.getExpenses).mockResolvedValue(mockExpenses as any);

      const request = new NextRequest('http://localhost/api/expenses?space_id=space-123', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockExpenses);
    });
  });

  describe('POST', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost/api/expenses', {
        method: 'POST',
        body: JSON.stringify({ space_id: 'space-123', title: 'Groceries', amount: 150 }),
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

      const request = new NextRequest('http://localhost/api/expenses', {
        method: 'POST',
        body: JSON.stringify({ space_id: 'space-123', title: 'Groceries', amount: 150 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid input', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { createExpenseSchema } = await import('@/lib/validations/expense-schemas');
      const { ZodError, ZodIssueCode } = await import('zod');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
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

      vi.mocked(createExpenseSchema.parse).mockImplementation(() => {
        throw new ZodError([
          {
            code: ZodIssueCode.invalid_type,
            expected: 'string',
            received: 'undefined',
            path: ['title'],
            message: 'Required',
          },
        ]);
      });

      const request = new NextRequest('http://localhost/api/expenses', {
        method: 'POST',
        body: JSON.stringify({ space_id: 'space-123' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should return 403 when user lacks space access', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { createExpenseSchema } = await import('@/lib/validations/expense-schemas');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
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

      vi.mocked(createExpenseSchema.parse).mockReturnValue(undefined);
      vi.mocked(verifySpaceAccess).mockRejectedValue(new Error('Access denied'));

      const request = new NextRequest('http://localhost/api/expenses', {
        method: 'POST',
        body: JSON.stringify({ space_id: 'space-123', title: 'Groceries', amount: 150 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this space');
    });

    it('should create expense successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { createExpenseSchema } = await import('@/lib/validations/expense-schemas');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { projectsService } = await import('@/lib/services/budgets-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: '00000000-0000-4000-8000-000000000001' } },
            error: null,
          }),
        },
      } as any);

      vi.mocked(createExpenseSchema.parse).mockReturnValue(undefined);
      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);

      const mockExpense = {
        id: '00000000-0000-4000-8000-000000000010',
        title: 'Groceries',
        amount: 150,
        space_id: '00000000-0000-4000-8000-000000000002',
        status: 'pending',
      };

      vi.mocked(projectsService.createExpense).mockResolvedValue(mockExpense as any);

      const request = new NextRequest('http://localhost/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          space_id: '00000000-0000-4000-8000-000000000002',
          title: 'Groceries',
          amount: 150,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('00000000-0000-4000-8000-000000000010');
    });

    it('should sanitize input text fields', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { createExpenseSchema } = await import('@/lib/validations/expense-schemas');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { projectsService } = await import('@/lib/services/budgets-service');
      const { sanitizePlainText } = await import('@/lib/sanitize');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: '00000000-0000-4000-8000-000000000001' } },
            error: null,
          }),
        },
      } as any);

      vi.mocked(createExpenseSchema.parse).mockReturnValue(undefined);
      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);
      vi.mocked(projectsService.createExpense).mockResolvedValue({ id: 'expense-1' } as any);

      const request = new NextRequest('http://localhost/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          space_id: '00000000-0000-4000-8000-000000000002',
          title: 'Groceries',
          amount: 150,
          paid_by: '00000000-0000-4000-8000-000000000001',
          notes: 'Weekly shopping',
        }),
      });

      await POST(request);

      expect(sanitizePlainText).toHaveBeenCalledWith('Groceries');
    });
  });
});
