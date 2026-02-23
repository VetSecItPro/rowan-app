import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/signout/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  apiRateLimit: {
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

describe('/api/auth/signout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('returns 429 when rate limit is exceeded', async () => {
      const { apiRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(apiRateLimit.limit).mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now() + 600000,
      });

      const request = new NextRequest('http://localhost/api/auth/signout', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many signout requests');
    });

    it('returns 500 when supabase signOut fails', async () => {
      const { apiRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(apiRateLimit.limit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 600000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          signOut: vi.fn().mockResolvedValue({
            error: { message: 'Session not found' },
          }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/auth/signout', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to sign out. Please try again.');
    });

    it('returns 200 on successful signout', async () => {
      const { apiRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(apiRateLimit.limit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 600000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          signOut: vi.fn().mockResolvedValue({ error: null }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/auth/signout', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Signed out successfully');
    });

    it('includes rate limit headers on success', async () => {
      const { apiRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(apiRateLimit.limit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 7,
        reset: 1234567890,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          signOut: vi.fn().mockResolvedValue({ error: null }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/auth/signout', {
        method: 'POST',
      });

      const response = await POST(request);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('7');
      expect(response.headers.get('X-RateLimit-Reset')).toBe('1234567890');
    });

    it('returns 500 on unexpected error', async () => {
      const { apiRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(apiRateLimit.limit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 600000,
      });

      vi.mocked(createClient).mockRejectedValue(new Error('DB connection failed'));

      const request = new NextRequest('http://localhost/api/auth/signout', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
