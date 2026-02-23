import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/auth/verify-email/route';

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

describe('/api/auth/verify-email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: false,
        limit: 5,
        remaining: 0,
        reset: Date.now() + 3600000,
      });

      const request = new NextRequest('http://localhost/api/auth/verify-email?token=some-token', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.valid).toBe(false);
    });

    it('returns valid: false when token query param is missing', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      const request = new NextRequest('http://localhost/api/auth/verify-email', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.valid).toBe(false);
      expect(data.error).toContain('required');
    });

    it('returns valid: false for unknown token', async () => {
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

      const request = new NextRequest('http://localhost/api/auth/verify-email?token=unknown-token', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.valid).toBe(false);
      expect(data.error).toContain('Invalid verification link');
    });

    it('returns valid: true for a valid unexpired token', async () => {
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
          email: 'test@example.com',
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          used_at: null,
        },
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: mockSelect } as any);

      const request = new NextRequest('http://localhost/api/auth/verify-email?token=valid-token', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.valid).toBe(true);
      expect(data.email).toBe('test@example.com');
    });
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

      const request = new NextRequest('http://localhost/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token: 'some-token' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many verification attempts');
    });

    it('returns 400 when token is missing from body', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      const request = new NextRequest('http://localhost/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('returns 400 for unknown token', async () => {
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

      const request = new NextRequest('http://localhost/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token: 'invalid-token' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid verification link');
    });

    it('returns 200 on successful verification', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      const tokenData = {
        id: 'token-id-1',
        user_id: 'user-abc',
        email: 'test@example.com',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        used_at: null,
      };

      const mockUpdateEq = vi.fn().mockResolvedValue({ data: {}, error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
      const mockDeleteEq = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });

      const mockSingle = vi.fn().mockResolvedValue({ data: tokenData, error: null });
      const mockSelectEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
        delete: mockDelete,
      } as any);

      vi.mocked(supabaseAdmin.auth.admin.updateUserById).mockResolvedValue({
        data: { user: {} as any },
        error: null,
      });

      const request = new NextRequest('http://localhost/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token: 'valid-verify-token' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('verified successfully');
    });
  });
});
