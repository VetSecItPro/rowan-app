import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/tasks/[id]/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/tasks-service', () => ({
  tasksService: {
    getTaskById: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
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

vi.mock('@/lib/validations/task-schemas', () => ({
  updateTaskSchema: {
    parse: vi.fn(),
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

describe('/api/tasks/[id]', () => {
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

      const request = new NextRequest('http://localhost/api/tasks/task-1', {
        method: 'GET',
      });

      const response = await GET(request, makeParams('task-1'));
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

      const request = new NextRequest('http://localhost/api/tasks/task-1', {
        method: 'GET',
      });

      const response = await GET(request, makeParams('task-1'));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when task not found', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { tasksService } = await import('@/lib/services/tasks-service');
      vi.mocked(tasksService.getTaskById).mockResolvedValue(null as any);

      const request = new NextRequest('http://localhost/api/tasks/nonexistent', {
        method: 'GET',
      });

      const response = await GET(request, makeParams('nonexistent'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Task not found');
    });

    it('should return 403 when user lacks task access', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { tasksService } = await import('@/lib/services/tasks-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      const mockTask = { id: 'task-1', title: 'Test Task', space_id: 'space-1' };
      vi.mocked(tasksService.getTaskById).mockResolvedValue(mockTask as any);
      vi.mocked(verifyResourceAccess).mockRejectedValue(new Error('Access denied'));

      const request = new NextRequest('http://localhost/api/tasks/task-1', {
        method: 'GET',
      });

      const response = await GET(request, makeParams('task-1'));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this task');
    });

    it('should return task successfully', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { tasksService } = await import('@/lib/services/tasks-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      const mockTask = {
        id: '00000000-0000-4000-8000-000000000010',
        title: 'Buy groceries',
        status: 'pending',
        priority: 'medium',
        space_id: '00000000-0000-4000-8000-000000000002',
      };

      vi.mocked(tasksService.getTaskById).mockResolvedValue(mockTask as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/tasks/00000000-0000-4000-8000-000000000010', {
        method: 'GET',
      });

      const response = await GET(request, makeParams('00000000-0000-4000-8000-000000000010'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('00000000-0000-4000-8000-000000000010');
      expect(data.data.title).toBe('Buy groceries');
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

      const request = new NextRequest('http://localhost/api/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      });

      const response = await PATCH(request, makeParams('task-1'));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when task not found', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { tasksService } = await import('@/lib/services/tasks-service');
      vi.mocked(tasksService.getTaskById).mockResolvedValue(null as any);

      const request = new NextRequest('http://localhost/api/tasks/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      });

      const response = await PATCH(request, makeParams('nonexistent'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Task not found');
    });

    it('should return 400 when validation fails', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { tasksService } = await import('@/lib/services/tasks-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      const { updateTaskSchema } = await import('@/lib/validations/task-schemas');
      const { ZodError } = await import('zod');

      const mockTask = { id: 'task-1', title: 'Test', space_id: 'space-1' };
      vi.mocked(tasksService.getTaskById).mockResolvedValue(mockTask as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      vi.mocked(updateTaskSchema.parse).mockImplementation(() => {
        throw new ZodError([
          {
            code: 'invalid_enum_value',
            options: ['pending', 'completed'],
            received: 'invalid',
            path: ['status'],
            message: 'Invalid status value',
          },
        ]);
      });

      const request = new NextRequest('http://localhost/api/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'invalid' }),
      });

      const response = await PATCH(request, makeParams('task-1'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should update task successfully', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { tasksService } = await import('@/lib/services/tasks-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      const { updateTaskSchema } = await import('@/lib/validations/task-schemas');

      const existingTask = { id: 'task-1', title: 'Buy groceries', status: 'pending', space_id: 'space-1' };
      const updatedTask = { id: 'task-1', title: 'Buy groceries', status: 'completed', space_id: 'space-1' };

      vi.mocked(tasksService.getTaskById).mockResolvedValue(existingTask as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);
      vi.mocked(updateTaskSchema.parse).mockReturnValue({ status: 'completed' } as any);
      vi.mocked(tasksService.updateTask).mockResolvedValue(updatedTask as any);

      const request = new NextRequest('http://localhost/api/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      });

      const response = await PATCH(request, makeParams('task-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('completed');
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

      const request = new NextRequest('http://localhost/api/tasks/task-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, makeParams('task-1'));
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('should return 404 when task not found', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { tasksService } = await import('@/lib/services/tasks-service');
      vi.mocked(tasksService.getTaskById).mockResolvedValue(null as any);

      const request = new NextRequest('http://localhost/api/tasks/nonexistent', {
        method: 'DELETE',
      });

      const response = await DELETE(request, makeParams('nonexistent'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Task not found');
    });

    it('should return 403 when user lacks access', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { tasksService } = await import('@/lib/services/tasks-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      const mockTask = { id: 'task-1', title: 'Test', space_id: 'space-1' };
      vi.mocked(tasksService.getTaskById).mockResolvedValue(mockTask as any);
      vi.mocked(verifyResourceAccess).mockRejectedValue(new Error('Access denied'));

      const request = new NextRequest('http://localhost/api/tasks/task-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, makeParams('task-1'));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this task');
    });

    it('should delete task successfully', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { tasksService } = await import('@/lib/services/tasks-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      const mockTask = { id: 'task-1', title: 'Test', space_id: 'space-1' };
      vi.mocked(tasksService.getTaskById).mockResolvedValue(mockTask as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);
      vi.mocked(tasksService.deleteTask).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/tasks/task-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, makeParams('task-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Task deleted successfully');
    });
  });
});
