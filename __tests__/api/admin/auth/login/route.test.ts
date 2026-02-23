import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/admin/auth/login/route';

vi.mock('@/lib/ratelimit', () => ({
  checkAuthRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('@/lib/utils/safe-cookies', () => ({
  safeCookiesAsync: vi.fn(),
}));

vi.mock('@/lib/utils/session-crypto-edge', () => ({
  encryptSessionData: vi.fn(),
}));

vi.mock('@/lib/utils/admin-audit', () => ({
  logAdminAction: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

describe('/api/admin/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
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

      const request = new NextRequest('http://localhost/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@example.com', password: 'password' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many login attempts');
    });

    it('returns 400 for invalid request body (missing password)', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      const request = new NextRequest('http://localhost/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@example.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Email and password are required');
    });

    it('returns 400 for invalid email format', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      const request = new NextRequest('http://localhost/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'not-an-email', password: 'password' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Email and password are required');
    });

    it('returns 401 when admin user is not found in admin_users table', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      const supabaseJs = await import('@supabase/supabase-js');

      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      // Admin user not found
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });
      const mockIsActive = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ eq: mockIsActive });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: mockSelect } as any);

      // Auth client — valid credentials but no admin record
      vi.mocked(supabaseJs.createClient).mockReturnValue({
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: {
              user: { id: 'user-123', email: 'notadmin@example.com' },
              session: {},
            },
            error: null,
          }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'notadmin@example.com', password: 'password' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid credentials');
    });

    it('returns 401 when auth password check fails', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      const supabaseJs = await import('@supabase/supabase-js');

      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      // Admin record exists
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'admin-1',
          email: 'admin@example.com',
          role: 'admin',
          permissions: [],
          is_active: true,
        },
        error: null,
      });
      const mockIsActive = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ eq: mockIsActive });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: mockSelect } as any);

      // Wrong password
      vi.mocked(supabaseJs.createClient).mockReturnValue({
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: { message: 'Invalid credentials' },
          }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@example.com', password: 'wrongpassword' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid credentials');
    });

    it('returns 200 with admin data on successful login', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      const supabaseJs = await import('@supabase/supabase-js');
      const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
      const { encryptSessionData } = await import('@/lib/utils/session-crypto-edge');

      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      const adminUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'super_admin',
        permissions: ['read', 'write'],
        is_active: true,
      };

      // Mock admin_users check
      let adminFromCallCount = 0;
      vi.mocked(supabaseAdmin.from).mockImplementation(() => {
        adminFromCallCount++;
        if (adminFromCallCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: adminUser, error: null }),
                }),
              }),
            }),
          } as any;
        }
        // Update admin user
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
          }),
        } as any;
      });

      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ data: {}, error: null } as any);

      vi.mocked(supabaseJs.createClient).mockReturnValue({
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: {
              user: { id: 'user-auth-123', email: 'admin@example.com' },
              session: { access_token: 'token' },
            },
            error: null,
          }),
        },
      } as any);

      vi.mocked(encryptSessionData).mockResolvedValue('encrypted-session-payload');

      const mockCookieSet = vi.fn();
      vi.mocked(safeCookiesAsync).mockResolvedValue({
        set: mockCookieSet,
        get: vi.fn(),
      } as any);

      const request = new NextRequest('http://localhost/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@example.com', password: 'correctpassword' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.admin.email).toBe('admin@example.com');
      expect(data.admin.role).toBe('super_admin');
      expect(mockCookieSet).toHaveBeenCalledWith('admin-session', 'encrypted-session-payload', expect.any(Object));
    });
  });
});
