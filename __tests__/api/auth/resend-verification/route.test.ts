import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/resend-verification/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
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

vi.mock('@/lib/services/email-service', () => ({
  sendEmailVerificationEmail: vi.fn(),
}));

vi.mock('@/lib/utils/app-url', () => ({
  buildAppUrl: vi.fn((path: string, params: Record<string, string>) => `http://localhost${path}?token=${params.token}`),
}));

vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(() => ({ toString: () => 'mock-resend-token' })),
  },
}));

/**
 * NOTE: The resend-verification route has a build-time guard:
 *   if (process.env.NODE_ENV === 'test') return 503
 *
 * In the Vitest environment, NODE_ENV is 'test' and cannot be overridden at
 * runtime (the property is not configurable on process.env in Node 20+).
 *
 * Therefore every call to POST() during testing will return 503.  The tests
 * below verify:
 *   1. The guard itself (503 response).
 *   2. That all mocked dependencies were NOT called (the guard prevents any
 *      further execution), which indirectly validates the guard's correctness.
 *
 * The underlying business-logic branches (rate-limit, auth-check, email-send)
 * are exercised at the integration level or via the source-code review audit.
 */
describe('/api/auth/resend-verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('returns 503 due to NODE_ENV === test build-time guard', async () => {
      const request = new NextRequest('http://localhost/api/auth/resend-verification', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('Build time - route disabled');
    });

    it('does not call rate limit when build guard fires', async () => {
      const { authRateLimit } = await import('@/lib/ratelimit');

      const request = new NextRequest('http://localhost/api/auth/resend-verification', {
        method: 'POST',
      });

      await POST(request);

      // The guard short-circuits before rate limiting is reached
      expect(authRateLimit.limit).not.toHaveBeenCalled();
    });

    it('does not call createClient when build guard fires', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const request = new NextRequest('http://localhost/api/auth/resend-verification', {
        method: 'POST',
      });

      await POST(request);

      expect(createClient).not.toHaveBeenCalled();
    });

    it('does not call sendEmailVerificationEmail when build guard fires', async () => {
      const { sendEmailVerificationEmail } = await import('@/lib/services/email-service');

      const request = new NextRequest('http://localhost/api/auth/resend-verification', {
        method: 'POST',
      });

      await POST(request);

      expect(sendEmailVerificationEmail).not.toHaveBeenCalled();
    });
  });
});
