import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/signin/route';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  authRateLimit: {
    limit: vi.fn(),
  },
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

describe('/api/auth/signin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should return 429 when rate limit exceeded', async () => {
      const { authRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(authRateLimit.limit).mockResolvedValue({
        success: false,
        limit: 5,
        remaining: 0,
        reset: Date.now() + 3600000,
      });

      const request = new NextRequest('http://localhost/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many signin attempts');
    });

    it('should return 400 for invalid email format', async () => {
      const { authRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(authRateLimit.limit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      const request = new NextRequest('http://localhost/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'password123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });

    it('should return 400 for missing password', async () => {
      const { authRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(authRateLimit.limit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      const request = new NextRequest('http://localhost/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });

    it('should return 400 for invalid JSON', async () => {
      const { authRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(authRateLimit.limit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      const request = new NextRequest('http://localhost/api/auth/signin', {
        method: 'POST',
        body: 'invalid-json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON in request body');
    });

    it('should return 401 for invalid credentials', async () => {
      const { authRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(authRateLimit.limit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      const mockSignInWithPassword = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          signInWithPassword: mockSignInWithPassword,
        },
      } as any);

      const request = new NextRequest('http://localhost/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid email or password');
    });

    it('should return 200 with user data on successful signin', async () => {
      const { authRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(authRateLimit.limit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user_metadata: { name: 'Test User' },
      };

      const mockSession = {
        expires_at: Date.now() + 3600000,
      };

      const mockSignInWithPassword = vi.fn().mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          signInWithPassword: mockSignInWithPassword,
        },
      } as any);

      const request = new NextRequest('http://localhost/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'correctpassword',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.id).toBe('user-123');
      expect(data.user.email).toBe('test@example.com');
      expect(data.session.expires_at).toBeDefined();
    });

    // Email sanitization (lowercase + trim) is handled by the Zod schema's
    // .toLowerCase().trim() transforms. This is a structural guarantee —
    // any email passing validation is automatically normalized.

    it('should include rate limit headers in response', async () => {
      const { authRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(authRateLimit.limit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 3,
        reset: 1234567890,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: {
              user: { id: 'user-123', email: 'test@example.com' },
              session: { expires_at: Date.now() },
            },
            error: null,
          }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await POST(request);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('5');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('3');
      expect(response.headers.get('X-RateLimit-Reset')).toBe('1234567890');
    });
  });
});
