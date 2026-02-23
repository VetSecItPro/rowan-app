import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/admin/users/[userId]/[action]/route';

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        updateUserById: vi.fn(),
        deleteUser: vi.fn(),
      },
    },
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

const VALID_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

function makeProps(userId: string, action: string) {
  return { params: Promise.resolve({ userId, action }) };
}

describe('/api/admin/users/[userId]/[action]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest(`http://localhost/api/admin/users/${VALID_USER_ID}/ban`, {
        method: 'POST',
      });

      const response = await POST(request, makeProps(VALID_USER_ID, 'ban'));
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when admin session cookie is missing', async () => {
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

      const request = new NextRequest(`http://localhost/api/admin/users/${VALID_USER_ID}/ban`, {
        method: 'POST',
      });

      const response = await POST(request, makeProps(VALID_USER_ID, 'ban'));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Admin authentication required');
    });

    it('returns 400 for invalid action (not ban or delete)', async () => {
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

      vi.mocked(decryptSessionData).mockResolvedValue({ adminId: 'admin-1', expiresAt: Date.now() + 86400000 });
      vi.mocked(validateSessionData).mockReturnValue(true);

      const request = new NextRequest(`http://localhost/api/admin/users/${VALID_USER_ID}/suspend`, {
        method: 'POST',
      });

      const response = await POST(request, makeProps(VALID_USER_ID, 'suspend'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request parameters');
    });

    it('returns 400 for invalid UUID userId', async () => {
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

      vi.mocked(decryptSessionData).mockResolvedValue({ adminId: 'admin-1', expiresAt: Date.now() + 86400000 });
      vi.mocked(validateSessionData).mockReturnValue(true);

      const request = new NextRequest('http://localhost/api/admin/users/not-a-uuid/ban', {
        method: 'POST',
      });

      const response = await POST(request, makeProps('not-a-uuid', 'ban'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request parameters');
    });

    it('returns 200 after successfully banning a user', async () => {
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

      vi.mocked(decryptSessionData).mockResolvedValue({ adminId: 'admin-1', expiresAt: Date.now() + 86400000 });
      vi.mocked(validateSessionData).mockReturnValue(true);

      vi.mocked(supabaseAdmin.auth.admin.updateUserById).mockResolvedValue({
        data: { user: {} as any },
        error: null,
      });

      const request = new NextRequest(`http://localhost/api/admin/users/${VALID_USER_ID}/ban`, {
        method: 'POST',
      });

      const response = await POST(request, makeProps(VALID_USER_ID, 'ban'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('ban');
    });

    it('returns 200 after successfully deleting a user', async () => {
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

      vi.mocked(decryptSessionData).mockResolvedValue({ adminId: 'admin-1', expiresAt: Date.now() + 86400000 });
      vi.mocked(validateSessionData).mockReturnValue(true);

      vi.mocked(supabaseAdmin.auth.admin.deleteUser).mockResolvedValue({
        data: {},
        error: null,
      } as any);

      const request = new NextRequest(`http://localhost/api/admin/users/${VALID_USER_ID}/delete`, {
        method: 'POST',
      });

      const response = await POST(request, makeProps(VALID_USER_ID, 'delete'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('delete');
    });
  });
});
