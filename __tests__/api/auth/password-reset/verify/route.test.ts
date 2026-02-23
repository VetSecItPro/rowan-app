import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/auth/password-reset/verify/route';

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

describe('/api/auth/password-reset/verify', () => {
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

      const request = new NextRequest('http://localhost/api/auth/password-reset/verify', {
        method: 'POST',
        body: JSON.stringify({ token: 'some-token', password: 'NewPassword1!' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many password reset attempts');
    });

    it('returns 400 for password that is too short', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      const request = new NextRequest('http://localhost/api/auth/password-reset/verify', {
        method: 'POST',
        body: JSON.stringify({ token: 'some-token', password: 'short' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('10 characters');
    });

    it('returns 400 for missing token', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      const request = new NextRequest('http://localhost/api/auth/password-reset/verify', {
        method: 'POST',
        body: JSON.stringify({ password: 'NewPassword1!valid' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('returns 400 for invalid or expired token', async () => {
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

      const request = new NextRequest('http://localhost/api/auth/password-reset/verify', {
        method: 'POST',
        body: JSON.stringify({ token: 'bad-reset-token', password: 'NewPassword1!ok' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid or expired reset token');
    });

    it('returns 400 when token has already been used', async () => {
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
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          used_at: new Date().toISOString(),
        },
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: mockSelect } as any);

      const request = new NextRequest('http://localhost/api/auth/password-reset/verify', {
        method: 'POST',
        body: JSON.stringify({ token: 'used-token', password: 'NewPassword1!ok' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('already been used');
    });

    it('returns 200 on successful password reset', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      const tokenData = {
        user_id: 'user-reset',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        used_at: null,
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: tokenData, error: null });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockUpdateEq = vi.fn().mockResolvedValue({ data: {}, error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
      const mockDeleteEqNeq = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockDeleteEq = vi.fn().mockReturnValue({ neq: mockDeleteEqNeq });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
        delete: mockDelete,
      } as any);

      vi.mocked(supabaseAdmin.auth.admin.updateUserById).mockResolvedValue({
        data: { user: {} as any },
        error: null,
      });

      const request = new NextRequest('http://localhost/api/auth/password-reset/verify', {
        method: 'POST',
        body: JSON.stringify({ token: 'valid-reset-token', password: 'NewPassword1!secure' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('Password updated successfully');
    });
  });

  describe('GET', () => {
    it('returns 400 when token query param is missing', async () => {
      const request = new NextRequest('http://localhost/api/auth/password-reset/verify', {
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

      const request = new NextRequest('http://localhost/api/auth/password-reset/verify?token=not-real', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.valid).toBe(false);
      expect(data.error).toContain('Invalid reset token');
    });

    it('returns valid: true for a valid unexpired token', async () => {
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          used_at: null,
        },
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: mockSelect } as any);

      const request = new NextRequest('http://localhost/api/auth/password-reset/verify?token=valid-token', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.valid).toBe(true);
      expect(data.expiresAt).toBeDefined();
    });
  });
});
