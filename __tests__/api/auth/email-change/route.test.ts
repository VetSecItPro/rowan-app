import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/email-change/route';

vi.mock('@/lib/ratelimit', () => ({
  checkAuthRateLimit: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock('@/lib/services/email-service', () => ({
  sendEmailChangeEmail: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/lib/utils/app-url', () => ({
  buildAppUrl: vi.fn((path: string, params: Record<string, string>) => `http://localhost${path}?token=${params.token}`),
}));

vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(() => ({ toString: () => 'mock-email-change-token' })),
  },
}));

describe('/api/auth/email-change', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: false,
        limit: 5,
        remaining: 0,
        reset: Date.now() + 3600000,
      });

      const request = new NextRequest('http://localhost/api/auth/email-change', {
        method: 'POST',
        body: JSON.stringify({ newEmail: 'new@example.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many email change requests');
    });

    it('returns 401 when user is not authenticated', async () => {
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

      const request = new NextRequest('http://localhost/api/auth/email-change', {
        method: 'POST',
        body: JSON.stringify({ newEmail: 'new@example.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('logged in');
    });

    it('returns 400 for invalid email format', async () => {
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
            data: {
              user: {
                id: 'user-123',
                email: 'current@example.com',
              },
            },
            error: null,
          }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/auth/email-change', {
        method: 'POST',
        body: JSON.stringify({ newEmail: 'not-a-valid-email' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('valid email');
    });

    it('returns 400 when new email is same as current', async () => {
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
            data: {
              user: {
                id: 'user-123',
                email: 'same@example.com',
              },
            },
            error: null,
          }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/auth/email-change', {
        method: 'POST',
        body: JSON.stringify({ newEmail: 'same@example.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('different from your current email');
    });

    it('returns 409 when new email is taken by another account', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: { id: 'user-123', email: 'current@example.com' },
            },
            error: null,
          }),
        },
      } as any);

      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'other-user' },
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: mockSelect } as any);

      const request = new NextRequest('http://localhost/api/auth/email-change', {
        method: 'POST',
        body: JSON.stringify({ newEmail: 'taken@example.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('already in use');
    });

    it('returns 200 on successful email change initiation', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      const { sendEmailChangeEmail } = await import('@/lib/services/email-service');

      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: { id: 'user-123', email: 'old@example.com' },
            },
            error: null,
          }),
        },
      } as any);

      let callCount = 0;
      vi.mocked(supabaseAdmin.from).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Email exists check — returns not found
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
              }),
            }),
          } as any;
        }
        if (callCount === 2) {
          // Get user name
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { name: 'Test User' }, error: null }),
              }),
            }),
          } as any;
        }
        // Delete + insert token
        return {
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
          insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        } as any;
      });

      vi.mocked(sendEmailChangeEmail).mockResolvedValue({ success: true });

      const request = new NextRequest('http://localhost/api/auth/email-change', {
        method: 'POST',
        body: JSON.stringify({ newEmail: 'new@example.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('verification email');
    });
  });
});
