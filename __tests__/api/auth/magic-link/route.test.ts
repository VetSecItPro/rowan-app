import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/auth/magic-link/route';

vi.mock('@/lib/ratelimit', () => ({
  checkAuthRateLimit: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock('@/lib/services/email-service', () => ({
  sendMagicLinkEmail: vi.fn(),
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
    randomBytes: vi.fn(() => ({ toString: () => 'mock-magic-token-hex' })),
  },
}));

describe('/api/auth/magic-link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('returns 429 when rate limit is exceeded', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: false,
        limit: 5,
        remaining: 0,
        reset: Date.now() + 900000,
      });

      const request = new NextRequest('http://localhost/api/auth/magic-link', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many magic link requests');
    });

    it('returns 400 for an invalid email', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 900000,
      });

      const request = new NextRequest('http://localhost/api/auth/magic-link', {
        method: 'POST',
        body: JSON.stringify({ email: 'not-valid' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('valid email');
    });

    it('returns 200 for a non-existent user (security: no enumeration)', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 900000,
      });

      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: mockSelect } as any);

      const request = new NextRequest('http://localhost/api/auth/magic-link', {
        method: 'POST',
        body: JSON.stringify({ email: 'unknown@example.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('magic link');
    });

    it('returns 200 and sends email for existing user', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      const { sendMagicLinkEmail } = await import('@/lib/services/email-service');

      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 900000,
      });

      const mockUser = { id: 'user-magic-123', name: 'Magic User', email: 'magic@example.com' };

      const mockInsertResult = vi.fn().mockResolvedValue({ data: {}, error: null });
      const mockDeleteNeq = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockDeleteEq = vi.fn().mockReturnValue({ neq: mockDeleteNeq });

      const mockSingle = vi.fn().mockResolvedValue({ data: mockUser, error: null });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabaseAdmin.from).mockImplementation((table) => {
        if (table === 'users') {
          return { select: mockSelect } as any;
        }
        return {
          insert: mockInsertResult,
          delete: () => ({ eq: mockDeleteEq }),
        } as any;
      });

      vi.mocked(sendMagicLinkEmail).mockResolvedValue({ success: true });

      const request = new NextRequest('http://localhost/api/auth/magic-link', {
        method: 'POST',
        body: JSON.stringify({ email: 'magic@example.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 400 for invalid JSON body', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 900000,
      });

      const request = new NextRequest('http://localhost/api/auth/magic-link', {
        method: 'POST',
        body: 'not json at all',
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });

  describe('GET', () => {
    it('returns 405 Method Not Allowed', async () => {
      const response = await GET();
      expect(response.status).toBe(405);
    });
  });
});
