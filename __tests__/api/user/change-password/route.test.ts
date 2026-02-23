import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/user/change-password/route';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkAuthRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/lib/sentry-utils', () => ({
  setSentryUser: vi.fn(),
}));

describe('/api/user/change-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should return 429 when rate limit exceeded', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: false,
        limit: 5,
        remaining: 0,
        reset: Date.now() + 3600000,
      });

      const request = new NextRequest('http://localhost/api/user/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: 'oldpass123',
          newPassword: 'NewPass123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many password change attempts');
    });

    it('should return 401 when not authenticated', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/user/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: 'oldpass123',
          newPassword: 'NewPass123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should return 400 for invalid password format', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/user/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: 'oldpass123',
          newPassword: 'weak', // Too short, missing requirements
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should return 400 when current password is incorrect', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkAuthRateLimit).mockResolvedValue({
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
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
          signInWithPassword: mockSignInWithPassword,
        },
      } as any);

      const request = new NextRequest('http://localhost/api/user/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: 'wrongpassword',
          newPassword: 'NewPass123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Current password is incorrect');
    });

    it('should return 400 when new password is same as current', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      const mockUser = { id: 'user-123', email: 'test@example.com' };

      const mockSignInWithPassword = vi.fn().mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token' } },
        error: null,
      });

      const mockUpdateUser = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'New password is same as old password' },
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
          signInWithPassword: mockSignInWithPassword,
          updateUser: mockUpdateUser,
        },
      } as any);

      const request = new NextRequest('http://localhost/api/user/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: 'SamePass123!',
          newPassword: 'SamePass123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('different from your current password');
    });

    it('should change password successfully', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      const mockUser = { id: 'user-123', email: 'test@example.com' };

      const mockSignInWithPassword = vi.fn().mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token' } },
        error: null,
      });

      const mockUpdateUser = vi.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
          signInWithPassword: mockSignInWithPassword,
          updateUser: mockUpdateUser,
        },
      } as any);

      const request = new NextRequest('http://localhost/api/user/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: 'OldPass123!',
          newPassword: 'NewPass456!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Password updated successfully');
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'NewPass456!' });
    });

    it('should validate password requirements', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
        },
      } as any);

      // Test missing uppercase
      const request1 = new NextRequest('http://localhost/api/user/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: 'oldpass',
          newPassword: 'newpass123',
        }),
      });

      const response1 = await POST(request1);
      const data1 = await response1.json();

      expect(response1.status).toBe(400);
      expect(data1.error).toContain('uppercase');

      // Test missing number
      const request2 = new NextRequest('http://localhost/api/user/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: 'oldpass',
          newPassword: 'NewPassword',
        }),
      });

      const response2 = await POST(request2);
      const data2 = await response2.json();

      expect(response2.status).toBe(400);
      expect(data2.error).toContain('number');
    });
  });
});
