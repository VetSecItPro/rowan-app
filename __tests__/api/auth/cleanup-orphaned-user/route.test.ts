import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/auth/cleanup-orphaned-user/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/lib/sentry-utils', () => ({
  setSentryUser: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

// Mock the @supabase/supabase-js createClient for admin operations within the route
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

describe('/api/auth/cleanup-orphaned-user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  });

  describe('POST', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new Request('http://localhost/api/auth/cleanup-orphaned-user', {
        method: 'POST',
        body: JSON.stringify({ userId: '550e8400-e29b-41d4-a716-446655440000' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when user is not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      // Import the server createClient that the route uses
      const serverModule = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(serverModule.createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } }),
        },
      } as any);

      const request = new Request('http://localhost/api/auth/cleanup-orphaned-user', {
        method: 'POST',
        body: JSON.stringify({ userId: '550e8400-e29b-41d4-a716-446655440000' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 400 when userId is missing', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const serverModule = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(serverModule.createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
            error: null,
          }),
        },
      } as any);

      const request = new Request('http://localhost/api/auth/cleanup-orphaned-user', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('User ID is required');
    });

    it('returns 400 for invalid UUID format', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const serverModule = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(serverModule.createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
            error: null,
          }),
        },
      } as any);

      const request = new Request('http://localhost/api/auth/cleanup-orphaned-user', {
        method: 'POST',
        body: JSON.stringify({ userId: 'not-a-uuid' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid User ID format');
    });

    it('returns 403 when user tries to delete another user', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const serverModule = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(serverModule.createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
            error: null,
          }),
        },
      } as any);

      const request = new Request('http://localhost/api/auth/cleanup-orphaned-user', {
        method: 'POST',
        body: JSON.stringify({ userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Unauthorized to delete');
    });

    it('returns 200 on successful orphaned user deletion', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const serverModule = await import('@/lib/supabase/server');
      const supabaseJs = await import('@supabase/supabase-js');

      const userId = '550e8400-e29b-41d4-a716-446655440000';

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(serverModule.createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId } },
            error: null,
          }),
        },
      } as any);

      vi.mocked(supabaseJs.createClient).mockReturnValue({
        auth: {
          admin: {
            deleteUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
          },
        },
      } as any);

      const request = new Request('http://localhost/api/auth/cleanup-orphaned-user', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
