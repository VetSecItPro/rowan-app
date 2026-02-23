import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { DELETE, POST } from '@/app/api/auth/mfa/unenroll/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkMfaRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/security/csrf-validation', () => ({
  validateCsrfRequest: vi.fn(() => null),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('/api/auth/mfa/unenroll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DELETE', () => {
    it('returns CSRF error when CSRF validation fails', async () => {
      const { validateCsrfRequest } = await import('@/lib/security/csrf-validation');
      const mockCsrfResponse = new Response(JSON.stringify({ error: 'Invalid CSRF token' }), { status: 403 });
      vi.mocked(validateCsrfRequest).mockReturnValue(mockCsrfResponse as any);

      const request = new NextRequest('http://localhost/api/auth/mfa/unenroll', {
        method: 'DELETE',
        body: JSON.stringify({ factorId: 'factor-123' }),
      });

      const response = await DELETE(request);
      expect(response.status).toBe(403);
    });

    it('returns 429 when rate limit exceeded', async () => {
      const { validateCsrfRequest } = await import('@/lib/security/csrf-validation');
      const { checkMfaRateLimit } = await import('@/lib/ratelimit');

      vi.mocked(validateCsrfRequest).mockReturnValue(null);
      vi.mocked(checkMfaRateLimit).mockResolvedValue({
        success: false,
        limit: 5,
        remaining: 0,
        reset: Date.now() + 3600000,
      });

      const request = new NextRequest('http://localhost/api/auth/mfa/unenroll', {
        method: 'DELETE',
        body: JSON.stringify({ factorId: 'factor-123' }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when user is not authenticated', async () => {
      const { validateCsrfRequest } = await import('@/lib/security/csrf-validation');
      const { checkMfaRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(validateCsrfRequest).mockReturnValue(null);
      vi.mocked(checkMfaRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/auth/mfa/unenroll', {
        method: 'DELETE',
        body: JSON.stringify({ factorId: 'factor-123' }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('returns 400 for missing factorId in body', async () => {
      const { validateCsrfRequest } = await import('@/lib/security/csrf-validation');
      const { checkMfaRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(validateCsrfRequest).mockReturnValue(null);
      vi.mocked(checkMfaRateLimit).mockResolvedValue({
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

      const request = new NextRequest('http://localhost/api/auth/mfa/unenroll', {
        method: 'DELETE',
        body: JSON.stringify({}),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('returns 500 when unenroll fails', async () => {
      const { validateCsrfRequest } = await import('@/lib/security/csrf-validation');
      const { checkMfaRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(validateCsrfRequest).mockReturnValue(null);
      vi.mocked(checkMfaRateLimit).mockResolvedValue({
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
          mfa: {
            unenroll: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Factor not found' },
            }),
          },
        },
      } as any);

      const request = new NextRequest('http://localhost/api/auth/mfa/unenroll', {
        method: 'DELETE',
        body: JSON.stringify({ factorId: 'factor-abc' }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to disable MFA');
    });

    it('returns 200 on successful unenrollment', async () => {
      const { validateCsrfRequest } = await import('@/lib/security/csrf-validation');
      const { checkMfaRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(validateCsrfRequest).mockReturnValue(null);
      vi.mocked(checkMfaRateLimit).mockResolvedValue({
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
          mfa: {
            unenroll: vi.fn().mockResolvedValue({ data: {}, error: null }),
          },
        },
      } as any);

      const request = new NextRequest('http://localhost/api/auth/mfa/unenroll', {
        method: 'DELETE',
        body: JSON.stringify({ factorId: 'factor-abc' }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('disabled');
    });
  });

  describe('POST', () => {
    it('delegates to DELETE handler and returns same result', async () => {
      const { validateCsrfRequest } = await import('@/lib/security/csrf-validation');
      const { checkMfaRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(validateCsrfRequest).mockReturnValue(null);
      vi.mocked(checkMfaRateLimit).mockResolvedValue({
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
          mfa: {
            unenroll: vi.fn().mockResolvedValue({ data: {}, error: null }),
          },
        },
      } as any);

      const request = new NextRequest('http://localhost/api/auth/mfa/unenroll', {
        method: 'POST',
        body: JSON.stringify({ factorId: 'factor-abc' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
