import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/tasks/route';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/tasks-service', () => ({
  tasksService: {
    getTasks: vi.fn(),
    createTask: vi.fn(),
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
  fallbackRateLimit: vi.fn(),
}));

vi.mock('@/lib/middleware/usage-check', () => ({
  checkUsageLimit: vi.fn(),
  trackUsage: vi.fn(),
}));

vi.mock('@/lib/utils/cache-headers', () => ({
  withUserDataCache: vi.fn((response) => response),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
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

describe('/api/tasks', () => {
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

      const request = new NextRequest('http://localhost/api/tasks?space_id=space-123', {
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

      const request = new NextRequest('http://localhost/api/tasks?space_id=space-123', {
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

      const request = new NextRequest('http://localhost/api/tasks', {
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

      const request = new NextRequest('http://localhost/api/tasks?space_id=space-123', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this space');
    });

    it('should return tasks successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { tasksService } = await import('@/lib/services/tasks-service');

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

      const mockTasks = [
        { id: 'task-1', title: 'Task 1', status: 'pending' },
        { id: 'task-2', title: 'Task 2', status: 'completed' },
      ];

      vi.mocked(tasksService.getTasks).mockResolvedValue(mockTasks as any);

      const request = new NextRequest('http://localhost/api/tasks?space_id=space-123', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockTasks);
    });

    it('should support filtering by status', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { tasksService } = await import('@/lib/services/tasks-service');

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
      vi.mocked(tasksService.getTasks).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/tasks?space_id=space-123&status=completed', {
        method: 'GET',
      });

      await GET(request);

      expect(tasksService.getTasks).toHaveBeenCalledWith(
        'space-123',
        expect.objectContaining({ status: 'completed' }),
        expect.anything()
      );
    });
  });

  describe('POST', () => {
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

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          space_id: 'space-123',
          title: 'New Task',
          status: 'pending',
          priority: 'medium',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 429 when usage limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { checkUsageLimit } = await import('@/lib/middleware/usage-check');

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

      vi.mocked(checkUsageLimit).mockResolvedValue({
        allowed: false,
        message: 'Daily task creation limit reached',
        currentUsage: 10,
        limit: 10,
        remaining: 0,
      });

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          space_id: 'space-123',
          title: 'New Task',
          status: 'pending',
          priority: 'medium',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Daily task creation limit reached');
      expect(data.upgradeRequired).toBe(true);
    });

    it('should return 400 for invalid input', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { checkUsageLimit } = await import('@/lib/middleware/usage-check');

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

      vi.mocked(checkUsageLimit).mockResolvedValue({
        allowed: true,
        currentUsage: 5,
        limit: 10,
        remaining: 5,
      });

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          space_id: 'space-123',
          // Missing required field: title
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should create task successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { checkUsageLimit, trackUsage } = await import('@/lib/middleware/usage-check');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { tasksService } = await import('@/lib/services/tasks-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
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

      vi.mocked(checkUsageLimit).mockResolvedValue({
        allowed: true,
        currentUsage: 5,
        limit: 10,
        remaining: 5,
      });

      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);

      const mockTask = {
        id: '00000000-0000-4000-8000-000000000010',
        title: 'New Task',
        status: 'pending',
        priority: 'medium',
        space_id: '00000000-0000-4000-8000-000000000002',
        created_by: '00000000-0000-4000-8000-000000000001',
      };

      vi.mocked(tasksService.createTask).mockResolvedValue(mockTask as any);
      vi.mocked(trackUsage).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          space_id: '00000000-0000-4000-8000-000000000002',
          title: 'New Task',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('00000000-0000-4000-8000-000000000010');
      expect(trackUsage).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001', 'tasks_created');
    });

    it('should return 403 when user lacks space access', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { checkUsageLimit } = await import('@/lib/middleware/usage-check');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
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

      vi.mocked(checkUsageLimit).mockResolvedValue({
        allowed: true,
        currentUsage: 5,
        limit: 10,
        remaining: 5,
      });

      vi.mocked(verifySpaceAccess).mockRejectedValue(new Error('Access denied'));

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          space_id: '00000000-0000-4000-8000-000000000002',
          title: 'New Task',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this space');
    });
  });
});
