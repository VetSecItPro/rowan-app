import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/auth/email-change/verify/route';

vi.mock('@/lib/ratelimit', () => ({
  checkAuthRateLimit: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    auth: {
      admin: {
        updateUserById: vi.fn(),
      },
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('/api/auth/email-change/verify', () => {
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

      const request = new NextRequest('http://localhost/api/auth/email-change/verify', {
        method: 'POST',
        body: JSON.stringify({ token: 'some-token' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many verification attempts');
    });

    it('returns 400 for missing token', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      const request = new NextRequest('http://localhost/api/auth/email-change/verify', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid verification link');
    });

    it('returns 400 for invalid or not-found token', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: mockSelect } as any);

      const request = new NextRequest('http://localhost/api/auth/email-change/verify', {
        method: 'POST',
        body: JSON.stringify({ token: 'invalid-token' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid or expired');
    });

    it('returns 400 when token is already confirmed', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          user_id: 'user-123',
          current_email: 'old@example.com',
          new_email: 'new@example.com',
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          confirmed_at: new Date().toISOString(),
        },
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: mockSelect } as any);

      const request = new NextRequest('http://localhost/api/auth/email-change/verify', {
        method: 'POST',
        body: JSON.stringify({ token: 'already-confirmed' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('already been used');
    });

    it('returns 200 on successful email change verification', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      const tokenData = {
        user_id: 'user-xyz',
        current_email: 'old@example.com',
        new_email: 'new@example.com',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        confirmed_at: null,
      };

      let callCount = 0;
      vi.mocked(supabaseAdmin.from).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Fetch token
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: tokenData, error: null }),
              }),
            }),
          } as any;
        }
        if (callCount === 2) {
          // Check if new email is taken (not found = available)
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
                }),
              }),
            }),
          } as any;
        }
        // Update and delete operations
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        } as any;
      });

      vi.mocked(supabaseAdmin.auth.admin.updateUserById).mockResolvedValue({
        data: { user: {} as any },
        error: null,
      });

      const request = new NextRequest('http://localhost/api/auth/email-change/verify', {
        method: 'POST',
        body: JSON.stringify({ token: 'valid-change-token' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.newEmail).toBe('new@example.com');
    });
  });

  describe('GET', () => {
    it('returns 400 when token query param is missing', async () => {
      const request = new NextRequest('http://localhost/api/auth/email-change/verify', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Token is required');
    });

    it('returns valid: false for unknown token', async () => {
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: mockSelect } as any);

      const request = new NextRequest('http://localhost/api/auth/email-change/verify?token=bad-token', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.valid).toBe(false);
      expect(data.error).toContain('Invalid verification link');
    });

    it('returns valid: true with current and new email for a valid token', async () => {
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          current_email: 'old@example.com',
          new_email: 'new@example.com',
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          confirmed_at: null,
        },
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: mockSelect } as any);

      const request = new NextRequest('http://localhost/api/auth/email-change/verify?token=valid-token', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.valid).toBe(true);
      expect(data.currentEmail).toBe('old@example.com');
      expect(data.newEmail).toBe('new@example.com');
    });
  });
});
