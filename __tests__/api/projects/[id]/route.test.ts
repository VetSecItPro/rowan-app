import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/projects/[id]/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/projects-service', () => ({
  projectsOnlyService: {
    getProjectById: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
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

describe('/api/projects/[id]', () => {
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

      const request = new NextRequest('http://localhost/api/projects/project-1', {
        method: 'GET',
      });

      const response = await GET(request, makeParams('project-1'));
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

      const request = new NextRequest('http://localhost/api/projects/project-1', {
        method: 'GET',
      });

      const response = await GET(request, makeParams('project-1'));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when project not found', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { projectsOnlyService } = await import('@/lib/services/projects-service');
      vi.mocked(projectsOnlyService.getProjectById).mockResolvedValue(null as any);

      const request = new NextRequest('http://localhost/api/projects/nonexistent', {
        method: 'GET',
      });

      const response = await GET(request, makeParams('nonexistent'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Project not found');
    });

    it('should return 403 when user lacks project access', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { projectsOnlyService } = await import('@/lib/services/projects-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      const mockProject = { id: 'project-1', name: 'Test', space_id: 'space-1' };
      vi.mocked(projectsOnlyService.getProjectById).mockResolvedValue(mockProject as any);
      vi.mocked(verifyResourceAccess).mockRejectedValue(new Error('Access denied'));

      const request = new NextRequest('http://localhost/api/projects/project-1', {
        method: 'GET',
      });

      const response = await GET(request, makeParams('project-1'));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this project');
    });

    it('should return project successfully', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { projectsOnlyService } = await import('@/lib/services/projects-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      const mockProject = {
        id: '00000000-0000-4000-8000-000000000010',
        name: 'Website Redesign',
        status: 'active',
        space_id: '00000000-0000-4000-8000-000000000002',
      };

      vi.mocked(projectsOnlyService.getProjectById).mockResolvedValue(mockProject as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/projects/00000000-0000-4000-8000-000000000010', {
        method: 'GET',
      });

      const response = await GET(request, makeParams('00000000-0000-4000-8000-000000000010'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('00000000-0000-4000-8000-000000000010');
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

      const request = new NextRequest('http://localhost/api/projects/project-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      const response = await PATCH(request, makeParams('project-1'));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 when user lacks access', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { projectsOnlyService } = await import('@/lib/services/projects-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      const mockProject = { id: 'project-1', name: 'Test', space_id: 'space-1' };
      vi.mocked(projectsOnlyService.getProjectById).mockResolvedValue(mockProject as any);
      vi.mocked(verifyResourceAccess).mockRejectedValue(new Error('Access denied'));

      const request = new NextRequest('http://localhost/api/projects/project-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      const response = await PATCH(request, makeParams('project-1'));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this project');
    });

    it('should update project successfully', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { projectsOnlyService } = await import('@/lib/services/projects-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      const existingProject = { id: 'project-1', name: 'Old Name', space_id: 'space-1' };
      const updatedProject = { id: 'project-1', name: 'Updated Name', space_id: 'space-1', status: 'active' };

      vi.mocked(projectsOnlyService.getProjectById).mockResolvedValue(existingProject as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);
      vi.mocked(projectsOnlyService.updateProject).mockResolvedValue(updatedProject as any);

      const request = new NextRequest('http://localhost/api/projects/project-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      const response = await PATCH(request, makeParams('project-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Name');
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

      const request = new NextRequest('http://localhost/api/projects/project-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, makeParams('project-1'));
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('should return 403 when user lacks access', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { projectsOnlyService } = await import('@/lib/services/projects-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      const mockProject = { id: 'project-1', name: 'Test', space_id: 'space-1' };
      vi.mocked(projectsOnlyService.getProjectById).mockResolvedValue(mockProject as any);
      vi.mocked(verifyResourceAccess).mockRejectedValue(new Error('Access denied'));

      const request = new NextRequest('http://localhost/api/projects/project-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, makeParams('project-1'));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this project');
    });

    it('should delete project successfully', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { projectsOnlyService } = await import('@/lib/services/projects-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      const mockProject = { id: 'project-1', name: 'Test', space_id: 'space-1' };
      vi.mocked(projectsOnlyService.getProjectById).mockResolvedValue(mockProject as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);
      vi.mocked(projectsOnlyService.deleteProject).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/projects/project-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, makeParams('project-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Project deleted successfully');
    });
  });
});
