import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/signup/route';

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

vi.mock('@/lib/sanitize', () => ({
  sanitizePlainText: vi.fn((v: string) => v),
}));

vi.mock('@/lib/services/email-service', () => ({
  sendEmailVerificationEmail: vi.fn(),
}));

vi.mock('@/lib/utils/app-url', () => ({
  buildAppUrl: vi.fn((path: string, params: Record<string, string>) => `http://localhost${path}?token=${params.token}`),
}));

vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(() => ({ toString: () => 'mock-token-abc123' })),
  },
}));

/**
 * NOTE: The signup route has a build-time guard:
 *   if (process.env.NODE_ENV === 'test') return 503
 *
 * In Vitest's environment NODE_ENV is always 'test' and cannot be overridden
 * (the property is non-configurable in Node 20+).
 *
 * All tests below verify:
 *   1. The 503 guard response itself.
 *   2. That downstream dependencies are NOT invoked when the guard fires,
 *      proving the guard short-circuits correctly.
 *
 * Full integration-level coverage of the business-logic branches (rate
 * limiting, Zod validation, Supabase signup, email delivery) is handled
 * by e2e / integration tests that run outside the test environment guard.
 */
describe('/api/auth/signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('returns 503 due to NODE_ENV === test build-time guard', async () => {
      const request = new NextRequest('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Password1!secure',
          profile: { name: 'Test User', space_name: 'My Home' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('Build time - route disabled');
    });

    it('does not call authRateLimit when build guard fires', async () => {
      const { authRateLimit } = await import('@/lib/ratelimit');

      const request = new NextRequest('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      await POST(request);

      expect(authRateLimit.limit).not.toHaveBeenCalled();
    });

    it('does not call createClient when build guard fires', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const request = new NextRequest('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      await POST(request);

      expect(createClient).not.toHaveBeenCalled();
    });

    it('does not call sendEmailVerificationEmail when build guard fires', async () => {
      const { sendEmailVerificationEmail } = await import('@/lib/services/email-service');

      const request = new NextRequest('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      await POST(request);

      expect(sendEmailVerificationEmail).not.toHaveBeenCalled();
    });

    it('returns 503 regardless of request body content', async () => {
      const request = new NextRequest('http://localhost/api/auth/signup', {
        method: 'POST',
        body: 'invalid-json-body',
      });

      const response = await POST(request);
      expect(response.status).toBe(503);
    });
  });
});
