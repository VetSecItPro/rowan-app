import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/notifications/route';

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

vi.mock('@/lib/utils', () => ({
  sanitizeSearchInput: vi.fn((v: string) => v),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

describe('/api/admin/notifications', () => {
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

      const request = new NextRequest('http://localhost/api/admin/notifications', {
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

      const request = new NextRequest('http://localhost/api/admin/notifications', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Admin authentication required');
    });

    it('returns 400 for invalid query parameter (page = 0)', async () => {
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
        get: vi.fn().mockReturnValue({ value: 'encrypted' }),
      } as any);

      vi.mocked(decryptSessionData).mockResolvedValue({ adminId: 'admin-1', expiresAt: Date.now() + 86400000 });
      vi.mocked(validateSessionData).mockReturnValue(true);

      const request = new NextRequest('http://localhost/api/admin/notifications?page=0', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid query parameters');
    });

    it('returns 200 with notifications for authenticated admin', async () => {
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
        get: vi.fn().mockReturnValue({ value: 'encrypted' }),
      } as any);

      vi.mocked(decryptSessionData).mockResolvedValue({ adminId: 'admin-1', expiresAt: Date.now() + 86400000 });
      vi.mocked(validateSessionData).mockReturnValue(true);

      const mockNotifications = [
        {
          id: 'notif-1',
          name: 'Alice',
          email: 'alice@example.com',
          source: 'homepage',
          referrer: null,
          ip_address: null,
          user_agent: null,
          subscribed: true,
          created_at: '2024-01-01T00:00:00Z',
          unsubscribed_at: null,
        },
      ];

      const mockRange = vi.fn().mockResolvedValue({ data: mockNotifications, error: null, count: 1 });
      const mockOrder = vi.fn().mockReturnValue({ range: mockRange });
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: mockSelect } as any);

      const request = new NextRequest('http://localhost/api/admin/notifications', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.notifications).toHaveLength(1);
      expect(data.notifications[0].email).toBe('alice@example.com');
      expect(data.pagination).toBeDefined();
    });
  });
});
