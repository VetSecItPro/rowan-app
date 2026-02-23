import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/users/online/route';

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock('@/lib/utils/safe-cookies', () => ({
  safeCookiesAsync: vi.fn(),
}));

vi.mock('@/lib/utils/session-crypto-edge', () => ({
  decryptSessionData: vi.fn(),
  validateSessionData: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

describe('/api/admin/users/online', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost/api/admin/users/online', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when admin session cookie is absent', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(safeCookiesAsync).mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
      } as any);

      const request = new NextRequest('http://localhost/api/admin/users/online', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Admin authentication required');
    });

    it('returns 401 when session is expired or invalid', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
      const { decryptSessionData, validateSessionData } = await import('@/lib/utils/session-crypto-edge');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(safeCookiesAsync).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'encrypted-data' }),
      } as any);

      vi.mocked(decryptSessionData).mockResolvedValue({ adminId: 'admin-1', expiresAt: Date.now() - 1000 });
      vi.mocked(validateSessionData).mockReturnValue(false);

      const request = new NextRequest('http://localhost/api/admin/users/online', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it('returns 200 with users and stats for authenticated admin', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
      const { decryptSessionData, validateSessionData } = await import('@/lib/utils/session-crypto-edge');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(safeCookiesAsync).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'encrypted-data' }),
      } as any);

      vi.mocked(decryptSessionData).mockResolvedValue({
        adminId: 'admin-1',
        expiresAt: Date.now() + 86400000,
      });
      vi.mocked(validateSessionData).mockReturnValue(true);

      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User One',
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_seen: new Date(Date.now() - 60000).toISOString(), // 1 minute ago — online
          is_online: true,
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          name: 'User Two',
          avatar_url: null,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          updated_at: new Date(Date.now() - 86400000).toISOString(),
          last_seen: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago — offline
          is_online: false,
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({ data: mockUsers, error: null });
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: mockSelect } as any);

      const request = new NextRequest('http://localhost/api/admin/users/online', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.users).toHaveLength(2);
      expect(data.stats.total_users).toBe(2);
      expect(data.stats.online_users).toBeGreaterThanOrEqual(1);
    });
  });
});
