import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/auth/magic-link/verify/route';

vi.mock('@/lib/ratelimit', () => ({
  checkApiRateLimit: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    auth: {
      admin: {
        generateLink: vi.fn(),
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

vi.mock('@/lib/utils/app-url', () => ({
  getAppUrl: vi.fn(() => 'http://localhost'),
}));

describe('/api/auth/magic-link/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkApiRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkApiRateLimit).mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now() + 10000,
      });

      const request = new NextRequest('http://localhost/api/auth/magic-link/verify', {
        method: 'POST',
        body: JSON.stringify({ token: 'some-token' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many authentication attempts');
    });

    it('returns 400 when token is missing', async () => {
      const { checkApiRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkApiRateLimit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 10000,
      });

      const request = new NextRequest('http://localhost/api/auth/magic-link/verify', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid magic link token');
    });

    it('returns 400 when token is not found in database', async () => {
      const { checkApiRateLimit } = await import('@/lib/ratelimit');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(checkApiRateLimit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 10000,
      });

      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: mockSelect } as any);

      const request = new NextRequest('http://localhost/api/auth/magic-link/verify', {
        method: 'POST',
        body: JSON.stringify({ token: 'invalid-token-xyz' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid or expired magic link');
    });

    it('returns 400 when token has already been used', async () => {
      const { checkApiRateLimit } = await import('@/lib/ratelimit');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(checkApiRateLimit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 10000,
      });

      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          user_id: 'user-123',
          expires_at: new Date(Date.now() + 900000).toISOString(),
          used_at: new Date().toISOString(),
        },
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: mockSelect } as any);

      const request = new NextRequest('http://localhost/api/auth/magic-link/verify', {
        method: 'POST',
        body: JSON.stringify({ token: 'already-used-token' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('already been used');
    });

    it('returns 400 when token has expired', async () => {
      const { checkApiRateLimit } = await import('@/lib/ratelimit');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(checkApiRateLimit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 10000,
      });

      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          user_id: 'user-123',
          expires_at: new Date(Date.now() - 3600000).toISOString(),
          used_at: null,
        },
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: mockSelect } as any);

      const request = new NextRequest('http://localhost/api/auth/magic-link/verify', {
        method: 'POST',
        body: JSON.stringify({ token: 'expired-token-abc' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('expired');
    });

    it('returns 200 with action_url on valid token', async () => {
      const { checkApiRateLimit } = await import('@/lib/ratelimit');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(checkApiRateLimit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 10000,
      });

      const tokenData = {
        user_id: 'user-abc',
        expires_at: new Date(Date.now() + 900000).toISOString(),
        used_at: null,
      };
      const userData = { email: 'user@example.com', name: 'Test User' };

      let callCount = 0;
      vi.mocked(supabaseAdmin.from).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: fetch token
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: tokenData, error: null }),
              }),
            }),
          } as any;
        }
        // Second call: fetch user
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: userData, error: null }),
            }),
          }),
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

      vi.mocked(supabaseAdmin.auth.admin.generateLink).mockResolvedValue({
        data: {
          properties: { action_link: 'https://auth.example.com/magiclink?token=xyz' },
        },
        error: null,
      } as any);

      const request = new NextRequest('http://localhost/api/auth/magic-link/verify', {
        method: 'POST',
        body: JSON.stringify({ token: 'valid-token-123' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.action_url).toBeDefined();
    });
  });

  describe('GET', () => {
    it('returns 400 when no token query param provided', async () => {
      const request = new NextRequest('http://localhost/api/auth/magic-link/verify', {
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

      const request = new NextRequest('http://localhost/api/auth/magic-link/verify?token=bad-token', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.valid).toBe(false);
    });

    it('returns valid: true for a valid unexpired token', async () => {
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          expires_at: new Date(Date.now() + 900000).toISOString(),
          used_at: null,
        },
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: mockSelect } as any);

      const request = new NextRequest('http://localhost/api/auth/magic-link/verify?token=valid-token', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.valid).toBe(true);
      expect(data.expiresAt).toBeDefined();
    });
  });
});
