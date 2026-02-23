import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/auth/mfa/enroll/route';

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

describe('/api/auth/mfa/enroll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('returns CSRF error response when CSRF validation fails', async () => {
      const { validateCsrfRequest } = await import('@/lib/security/csrf-validation');
      const mockCsrfResponse = new Response(JSON.stringify({ error: 'Invalid CSRF token' }), { status: 403 });
      vi.mocked(validateCsrfRequest).mockReturnValue(mockCsrfResponse as any);

      const request = new NextRequest('http://localhost/api/auth/mfa/enroll', {
        method: 'POST',
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

      const request = new NextRequest('http://localhost/api/auth/mfa/enroll', {
        method: 'POST',
      });

      const response = await POST(request);
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
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/auth/mfa/enroll', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('returns 500 when MFA enrollment fails', async () => {
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
            data: { user: { id: 'user-mfa', email: 'mfa@example.com' } },
            error: null,
          }),
          mfa: {
            enroll: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'MFA enrollment failed' },
            }),
          },
        },
      } as any);

      const request = new NextRequest('http://localhost/api/auth/mfa/enroll', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to enroll in MFA');
    });

    it('returns 200 with TOTP data on successful enrollment', async () => {
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
            data: { user: { id: 'user-mfa', email: 'mfa@example.com' } },
            error: null,
          }),
          mfa: {
            enroll: vi.fn().mockResolvedValue({
              data: {
                id: 'factor-id-1',
                type: 'totp',
                totp: {
                  qr_code: 'data:image/png;base64,mock-qr',
                  secret: 'MOCKSECRETBASE32',
                  uri: 'otpauth://totp/mock',
                },
              },
              error: null,
            }),
          },
        },
      } as any);

      const request = new NextRequest('http://localhost/api/auth/mfa/enroll', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('factor-id-1');
      expect(data.data.qr_code).toBeDefined();
      expect(data.data.secret).toBe('MOCKSECRETBASE32');
    });
  });

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkMfaRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkMfaRateLimit).mockResolvedValue({
        success: false,
        limit: 5,
        remaining: 0,
        reset: Date.now() + 3600000,
      });

      const request = new NextRequest('http://localhost/api/auth/mfa/enroll', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
    });

    it('returns 401 when user is not authenticated', async () => {
      const { checkMfaRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

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

      const request = new NextRequest('http://localhost/api/auth/mfa/enroll', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it('returns 200 with factors list on success', async () => {
      const { checkMfaRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkMfaRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-mfa', email: 'mfa@example.com' } },
            error: null,
          }),
          mfa: {
            listFactors: vi.fn().mockResolvedValue({
              data: {
                totp: [{ id: 'factor-1', status: 'verified', friendly_name: 'My TOTP' }],
              },
              error: null,
            }),
          },
        },
      } as any);

      const request = new NextRequest('http://localhost/api/auth/mfa/enroll', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.is_enrolled).toBe(true);
      expect(data.data.factors).toHaveLength(1);
    });
  });
});
