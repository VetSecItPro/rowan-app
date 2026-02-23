import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/auth/password-reset/route';

// Mock dependencies
vi.mock('@/lib/ratelimit', () => ({
  checkAuthRateLimit: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock('@/lib/services/email-service', () => ({
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/utils/app-url', () => ({
  buildAppUrl: vi.fn((path, params) => `http://localhost${path}?token=${params.token}`),
}));

vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(() => ({
      toString: () => 'mock-reset-token-123',
    })),
  },
}));

describe('/api/auth/password-reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should return 429 when rate limit exceeded', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: false,
        limit: 5,
        remaining: 0,
        reset: Date.now() + 3600000,
      });

      const request = new NextRequest('http://localhost/api/auth/password-reset', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many password reset attempts');
    });

    it('should return 400 for invalid email format', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      const request = new NextRequest('http://localhost/api/auth/password-reset', {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid-email' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('valid email');
    });

    it('should return success even when user does not exist (security)', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      const mockFrom = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'User not found' },
      });

      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom);
      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost/api/auth/password-reset', {
        method: 'POST',
        body: JSON.stringify({ email: 'nonexistent@example.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('sent you a password reset link');
    });

    it('should create reset token and send email for existing user', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      const { sendPasswordResetEmail } = await import('@/lib/services/email-service');

      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const mockFrom = vi.fn();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockNeq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockUser,
        error: null,
      });
      const mockInsert = vi.fn().mockResolvedValue({
        data: { token: 'mock-reset-token-123' },
        error: null,
      });
      const mockDelete = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabaseAdmin.from).mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: mockSelect,
          } as any;
        } else if (table === 'password_reset_tokens') {
          return {
            insert: mockInsert,
            delete: mockDelete,
          } as any;
        }
        return {} as any;
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
        neq: mockNeq,
      });
      mockNeq.mockReturnValue({});

      vi.mocked(sendPasswordResetEmail).mockResolvedValue({
        success: true,
      });

      const request = new NextRequest('http://localhost/api/auth/password-reset', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should normalize email to lowercase', async () => {
      const { checkAuthRateLimit } = await import('@/lib/ratelimit');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(checkAuthRateLimit).mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 3600000,
      });

      const mockFrom = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom);
      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost/api/auth/password-reset', {
        method: 'POST',
        body: JSON.stringify({ email: 'TEST@EXAMPLE.COM' }),
      });

      await POST(request);

      expect(mockEq).toHaveBeenCalledWith('email', 'test@example.com');
    });
  });

  describe('GET', () => {
    it('should return 405 Method Not Allowed', async () => {
      const request = new NextRequest('http://localhost/api/auth/password-reset', {
        method: 'GET',
      });

      const response = await GET();

      expect(response.status).toBe(405);
    });
  });
});
