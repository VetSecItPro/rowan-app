import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/spaces/create/route';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/spaces-service', () => ({
  createSpace: vi.fn(),
}));

vi.mock('@/lib/services/subscription-service', () => ({
  getUserTier: vi.fn(),
}));

vi.mock('@/lib/config/feature-limits', () => ({
  getFeatureLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/validations/space-schemas', () => ({
  validateAndSanitizeSpace: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/lib/sentry-utils', () => ({
  setSentryUser: vi.fn(),
}));

describe('/api/spaces/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should return 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost/api/spaces/create', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Space' }),
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

      const request = new NextRequest('http://localhost/api/spaces/create', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Space' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid input', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { validateAndSanitizeSpace } = await import('@/lib/validations/space-schemas');
      const { z } = await import('zod');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
        },
      } as any);

      vi.mocked(validateAndSanitizeSpace).mockImplementation(() => {
        throw new z.ZodError([
          {
            code: 'invalid_type',
            expected: 'string',
            received: 'undefined',
            path: ['name'],
            message: 'Name is required',
          },
        ]);
      });

      const request = new NextRequest('http://localhost/api/spaces/create', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should return 403 when space limit reached', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { validateAndSanitizeSpace } = await import('@/lib/validations/space-schemas');
      const { getUserTier } = await import('@/lib/services/subscription-service');
      const { getFeatureLimit } = await import('@/lib/config/feature-limits');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000,
      });

      const mockFinalEq = { count: 1, error: null };
      const mockSecondEq = vi.fn().mockReturnValue(mockFinalEq);
      const mockFirstEq = vi.fn().mockReturnValue({ eq: mockSecondEq });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockFirstEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: '00000000-0000-4000-8000-000000000001', email: 'test@example.com' } },
            error: null,
          }),
        },
        from: mockFrom,
      } as any);

      vi.mocked(validateAndSanitizeSpace).mockReturnValue({ name: 'Test Space' });
      vi.mocked(getUserTier).mockResolvedValue('free');
      vi.mocked(getFeatureLimit).mockReturnValue(1);

      const request = new NextRequest('http://localhost/api/spaces/create', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Space' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('reached the maximum');
      expect(data.code).toBe('SPACE_LIMIT_REACHED');
    });

    it('should create space successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { validateAndSanitizeSpace } = await import('@/lib/validations/space-schemas');
      const { getUserTier } = await import('@/lib/services/subscription-service');
      const { getFeatureLimit } = await import('@/lib/config/feature-limits');
      const { createSpace } = await import('@/lib/services/spaces-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000,
      });

      const mockFinalEq = { count: 0, error: null };
      const mockSecondEq = vi.fn().mockReturnValue(mockFinalEq);
      const mockFirstEq = vi.fn().mockReturnValue({ eq: mockSecondEq });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockFirstEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: '00000000-0000-4000-8000-000000000001', email: 'test@example.com' } },
            error: null,
          }),
        },
        from: mockFrom,
      } as any);

      vi.mocked(validateAndSanitizeSpace).mockReturnValue({ name: 'Test Space' });
      vi.mocked(getUserTier).mockResolvedValue('free');
      vi.mocked(getFeatureLimit).mockReturnValue(1);
      vi.mocked(createSpace).mockResolvedValue({
        success: true,
        data: {
          id: '00000000-0000-4000-8000-000000000002',
          name: 'Test Space',
          created_at: new Date().toISOString(),
        },
      });

      const request = new NextRequest('http://localhost/api/spaces/create', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Space' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('00000000-0000-4000-8000-000000000002');
      expect(data.data.name).toBe('Test Space');
    });

    it('should return 400 when service fails', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { validateAndSanitizeSpace } = await import('@/lib/validations/space-schemas');
      const { getUserTier } = await import('@/lib/services/subscription-service');
      const { getFeatureLimit } = await import('@/lib/config/feature-limits');
      const { createSpace } = await import('@/lib/services/spaces-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000,
      });

      const mockFinalEq = { count: 0, error: null };
      const mockSecondEq = vi.fn().mockReturnValue(mockFinalEq);
      const mockFirstEq = vi.fn().mockReturnValue({ eq: mockSecondEq });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockFirstEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: '00000000-0000-4000-8000-000000000001', email: 'test@example.com' } },
            error: null,
          }),
        },
        from: mockFrom,
      } as any);

      vi.mocked(validateAndSanitizeSpace).mockReturnValue({ name: 'Test Space' });
      vi.mocked(getUserTier).mockResolvedValue('free');
      vi.mocked(getFeatureLimit).mockReturnValue(1);
      vi.mocked(createSpace).mockResolvedValue({
        success: false,
        error: 'Failed to create space',
      });

      const request = new NextRequest('http://localhost/api/spaces/create', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Space' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Failed to create space');
    });
  });
});
