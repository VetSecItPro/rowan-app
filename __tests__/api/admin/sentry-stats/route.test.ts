import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/utils/safe-cookies', () => ({
  safeCookiesAsync: vi.fn(),
}));

vi.mock('@/lib/utils/session-crypto-edge', () => ({
  decryptSessionData: vi.fn(),
  validateSessionData: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RATE_LIMIT_OK = { success: true, limit: 60, remaining: 59, reset: Date.now() + 60000 };
const RATE_LIMIT_FAIL = { success: false, limit: 60, remaining: 0, reset: Date.now() + 60000 };
const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001';

async function setupAuth(valid = true) {
  const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
  const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
  const { decryptSessionData, validateSessionData } = await import('@/lib/utils/session-crypto-edge');

  vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);

  if (!valid) {
    vi.mocked(safeCookiesAsync).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any);
    return;
  }

  vi.mocked(safeCookiesAsync).mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: 'encrypted-session' }),
  } as any);
  vi.mocked(decryptSessionData).mockResolvedValue({ adminId: ADMIN_ID, email: 'admin@example.com' });
  vi.mocked(validateSessionData).mockReturnValue(true);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('/api/admin/sentry-stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure Sentry env vars are unset by default
    delete process.env.SENTRY_AUTH_TOKEN;
    delete process.env.SENTRY_ORG;
    delete process.env.SENTRY_PROJECT;
  });

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { GET } = await import('@/app/api/admin/sentry-stats/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_FAIL);

      const req = new NextRequest('http://localhost/api/admin/sentry-stats');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when admin session cookie is absent', async () => {
      const { GET } = await import('@/app/api/admin/sentry-stats/route');
      await setupAuth(false);

      const req = new NextRequest('http://localhost/api/admin/sentry-stats');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Admin authentication required');
    });

    it('returns 401 when session validation fails', async () => {
      const { GET } = await import('@/app/api/admin/sentry-stats/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
      const { decryptSessionData, validateSessionData } = await import('@/lib/utils/session-crypto-edge');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
      vi.mocked(safeCookiesAsync).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'encrypted' }),
      } as any);
      vi.mocked(decryptSessionData).mockResolvedValue({ adminId: ADMIN_ID });
      vi.mocked(validateSessionData).mockReturnValue(false);

      const req = new NextRequest('http://localhost/api/admin/sentry-stats');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Session expired or invalid');
    });

    it('returns 401 when session decryption throws', async () => {
      const { GET } = await import('@/app/api/admin/sentry-stats/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
      const { decryptSessionData } = await import('@/lib/utils/session-crypto-edge');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
      vi.mocked(safeCookiesAsync).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'bad' }),
      } as any);
      vi.mocked(decryptSessionData).mockRejectedValue(new Error('Decryption failed'));

      const req = new NextRequest('http://localhost/api/admin/sentry-stats');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Invalid session');
    });

    it('returns configured:false when Sentry env vars are not set', async () => {
      const { GET } = await import('@/app/api/admin/sentry-stats/route');
      await setupAuth(true);

      const req = new NextRequest('http://localhost/api/admin/sentry-stats');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.configured).toBe(false);
      expect(data.timestamp).toBeDefined();
    });

    it('returns configured:true with error counts when Sentry is configured and API succeeds', async () => {
      const { GET } = await import('@/app/api/admin/sentry-stats/route');
      await setupAuth(true);

      process.env.SENTRY_AUTH_TOKEN = 'test-sentry-token';
      process.env.SENTRY_ORG = 'test-org';
      process.env.SENTRY_PROJECT = 'test-project';

      // Sentry API returns an array of [timestamp, count] tuples
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([
          [1700000000, 5],
          [1700003600, 3],
          [1700007200, 2],
        ]),
      });
      vi.stubGlobal('fetch', mockFetch);

      const req = new NextRequest('http://localhost/api/admin/sentry-stats');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.configured).toBe(true);
      expect(data.errorCounts).toBeDefined();
      expect(typeof data.errorCounts.last24h).toBe('number');
      expect(typeof data.errorCounts.last7d).toBe('number');
      expect(typeof data.errorCounts.last30d).toBe('number');

      vi.unstubAllGlobals();
    });

    it('returns configured:true with zeroed counts when Sentry API requests fail', async () => {
      const { GET } = await import('@/app/api/admin/sentry-stats/route');
      await setupAuth(true);

      process.env.SENTRY_AUTH_TOKEN = 'test-sentry-token';
      process.env.SENTRY_ORG = 'test-org';
      process.env.SENTRY_PROJECT = 'test-project';

      // All three Sentry requests return non-ok responses
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({}),
      });
      vi.stubGlobal('fetch', mockFetch);

      const req = new NextRequest('http://localhost/api/admin/sentry-stats');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.configured).toBe(true);
      expect(data.errorCounts.last24h).toBe(0);
      expect(data.errorCounts.last7d).toBe(0);
      expect(data.errorCounts.last30d).toBe(0);

      vi.unstubAllGlobals();
    });

    it('returns configured:true with zeroed counts when Sentry fetch rejects', async () => {
      const { GET } = await import('@/app/api/admin/sentry-stats/route');
      await setupAuth(true);

      process.env.SENTRY_AUTH_TOKEN = 'test-sentry-token';
      process.env.SENTRY_ORG = 'test-org';
      process.env.SENTRY_PROJECT = 'test-project';

      // All three Sentry requests throw (network error)
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.stubGlobal('fetch', mockFetch);

      const req = new NextRequest('http://localhost/api/admin/sentry-stats');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.configured).toBe(true);
      expect(data.errorCounts.last24h).toBe(0);

      vi.unstubAllGlobals();
    });

    it('returns aggregated error counts correctly from Sentry data', async () => {
      const { GET } = await import('@/app/api/admin/sentry-stats/route');
      await setupAuth(true);

      process.env.SENTRY_AUTH_TOKEN = 'tok';
      process.env.SENTRY_ORG = 'org';
      process.env.SENTRY_PROJECT = 'proj';

      const mockFetch = vi.fn()
        // stats24h
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue([[1700000000, 10], [1700003600, 20]]),
        })
        // stats7d
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue([[1699000000, 100]]),
        })
        // stats30d
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue([[1698000000, 500]]),
        });

      vi.stubGlobal('fetch', mockFetch);

      const req = new NextRequest('http://localhost/api/admin/sentry-stats');
      const res = await GET(req);
      const data = await res.json();

      expect(data.errorCounts.last24h).toBe(30);
      expect(data.errorCounts.last7d).toBe(100);
      expect(data.errorCounts.last30d).toBe(500);

      vi.unstubAllGlobals();
    });
  });
});
