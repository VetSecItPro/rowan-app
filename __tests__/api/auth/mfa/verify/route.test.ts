import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/mfa/verify/route';

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

describe('/api/auth/mfa/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('returns CSRF error when CSRF validation fails', async () => {
      const { validateCsrfRequest } = await import('@/lib/security/csrf-validation');
      const mockCsrfResponse = new Response(JSON.stringify({ error: 'Invalid CSRF token' }), { status: 403 });
      vi.mocked(validateCsrfRequest).mockReturnValue(mockCsrfResponse as any);

      const request = new NextRequest('http://localhost/api/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ factorId: 'factor-1', code: '123456' }),
      });

      const response = await POST(request);
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

      const request = new NextRequest('http://localhost/api/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ factorId: 'factor-1', code: '123456' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many verification attempts');
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

      const request = new NextRequest('http://localhost/api/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ factorId: 'factor-1', code: '123456' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('returns 400 for invalid code format (not 6 digits)', async () => {
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

      const request = new NextRequest('http://localhost/api/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ factorId: 'factor-1', code: '123' }), // too short
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('returns 400 when MFA verification fails for enrollment', async () => {
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
            verify: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Invalid code' },
            }),
          },
        },
      } as any);

      const request = new NextRequest('http://localhost/api/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ factorId: 'factor-1', code: '999999' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid verification code');
    });

    it('returns 200 on successful enrollment verification', async () => {
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
            verify: vi.fn().mockResolvedValue({
              data: { access_token: 'new-access-token', session: {} },
              error: null,
            }),
          },
        },
      } as any);

      const request = new NextRequest('http://localhost/api/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ factorId: 'factor-1', code: '123456' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('MFA verification successful');
    });

    it('returns 200 on successful challenge verification (login flow)', async () => {
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
            verify: vi.fn().mockResolvedValue({
              data: { access_token: 'token-after-challenge', session: {} },
              error: null,
            }),
          },
        },
      } as any);

      const request = new NextRequest('http://localhost/api/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ factorId: 'factor-1', code: '123456', challengeId: 'challenge-abc' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
