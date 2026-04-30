import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));
vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: vi.fn() },
}));
vi.mock('@/lib/utils/safe-cookies', () => ({
  safeCookiesAsync: vi.fn(),
}));
vi.mock('@/lib/utils/session-crypto-edge', () => ({
  decryptSessionData: vi.fn(),
  validateSessionData: vi.fn(),
}));
vi.mock('@/lib/services/admin-cache-service', () => ({
  withCache: vi.fn((_k: string, fn: () => Promise<unknown>) => fn()),
  ADMIN_CACHE_KEYS: { inviteAnalytics: 'invite-analytics' },
  ADMIN_CACHE_TTL: { analytics: 900 },
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));

const RATE_LIMIT_OK = { success: true, limit: 60, remaining: 59, reset: Date.now() + 60000 };
const RATE_LIMIT_FAIL = { success: false, limit: 60, remaining: 0, reset: Date.now() + 60000 };

async function setupAuth(valid = true) {
  const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
  const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
  const { decryptSessionData, validateSessionData } = await import('@/lib/utils/session-crypto-edge');

  vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
  if (!valid) {
    vi.mocked(safeCookiesAsync).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as never);
    return;
  }
  vi.mocked(safeCookiesAsync).mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: 'enc' }),
  } as never);
  vi.mocked(decryptSessionData).mockResolvedValue({ adminId: 'a1', email: 'a@x.com' } as never);
  vi.mocked(validateSessionData).mockReturnValue(true);
}

function buildInvitesChain(invites: Array<{ status: string; created_at: string }>) {
  const chain: Record<string, unknown> = {};
  const handler = () => chain;
  ['select', 'order'].forEach(m => { chain[m] = vi.fn(handler); });
  chain.then = vi.fn((resolve: (v: unknown) => unknown) =>
    resolve({ data: invites, error: null })
  );
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/admin/invite-analytics', () => {
  it('returns 429 when rate limited', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_FAIL);
    const { GET } = await import('@/app/api/admin/invite-analytics/route');
    const res = await GET(new NextRequest('http://l/api/admin/invite-analytics'));
    expect(res.status).toBe(429);
  });

  it('returns 401 when admin session cookie missing', async () => {
    await setupAuth(false);
    const { GET } = await import('@/app/api/admin/invite-analytics/route');
    const res = await GET(new NextRequest('http://l/api/admin/invite-analytics'));
    expect(res.status).toBe(401);
  });

  it('returns 401 when session decryption throws', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
    const { decryptSessionData } = await import('@/lib/utils/session-crypto-edge');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
    vi.mocked(safeCookiesAsync).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'bad' }),
    } as never);
    vi.mocked(decryptSessionData).mockRejectedValue(new Error('decrypt fail'));

    const { GET } = await import('@/app/api/admin/invite-analytics/route');
    const res = await GET(new NextRequest('http://l/api/admin/invite-analytics'));
    expect(res.status).toBe(401);
  });

  it('returns 401 when validateSessionData rejects payload', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
    const { decryptSessionData, validateSessionData } = await import('@/lib/utils/session-crypto-edge');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
    vi.mocked(safeCookiesAsync).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'enc' }),
    } as never);
    vi.mocked(decryptSessionData).mockResolvedValue({} as never);
    vi.mocked(validateSessionData).mockReturnValue(false);

    const { GET } = await import('@/app/api/admin/invite-analytics/route');
    const res = await GET(new NextRequest('http://l/api/admin/invite-analytics'));
    expect(res.status).toBe(401);
  });

  it('returns 200 with computed analytics for mixed statuses', async () => {
    await setupAuth();
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    const recent = new Date(Date.now() - 86400000).toISOString();
    vi.mocked(supabaseAdmin.from).mockReturnValue(buildInvitesChain([
      { status: 'accepted', created_at: recent },
      { status: 'accepted', created_at: recent },
      { status: 'pending', created_at: recent },
      { status: 'expired', created_at: recent },
      { status: 'cancelled', created_at: recent },
    ]) as never);

    const { GET } = await import('@/app/api/admin/invite-analytics/route');
    const res = await GET(new NextRequest('http://l/api/admin/invite-analytics'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.inviteAnalytics.totalSent).toBe(5);
    expect(data.inviteAnalytics.accepted).toBe(2);
    expect(data.inviteAnalytics.pending).toBe(1);
    expect(data.inviteAnalytics.expired).toBe(1);
    expect(data.inviteAnalytics.cancelled).toBe(1);
    // 2/5 = 40%
    expect(data.inviteAnalytics.conversionRate).toBe(40);
    expect(Array.isArray(data.inviteAnalytics.dailyTrend)).toBe(true);
    expect(data.inviteAnalytics.dailyTrend.length).toBe(30);
  });

  it('returns 200 with zero conversionRate when no invites', async () => {
    await setupAuth();
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    vi.mocked(supabaseAdmin.from).mockReturnValue(buildInvitesChain([]) as never);

    const { GET } = await import('@/app/api/admin/invite-analytics/route');
    const res = await GET(new NextRequest('http://l/api/admin/invite-analytics'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.inviteAnalytics.totalSent).toBe(0);
    expect(data.inviteAnalytics.conversionRate).toBe(0);
  });

  it('honors refresh=true (passes skipCache to withCache)', async () => {
    await setupAuth();
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    const { withCache } = await import('@/lib/services/admin-cache-service');
    vi.mocked(supabaseAdmin.from).mockReturnValue(buildInvitesChain([]) as never);

    const { GET } = await import('@/app/api/admin/invite-analytics/route');
    await GET(new NextRequest('http://l/api/admin/invite-analytics?refresh=true'));
    expect(withCache).toHaveBeenCalledWith(
      'invite-analytics',
      expect.any(Function),
      expect.objectContaining({ skipCache: true })
    );
  });

  it('returns 500 when supabase query fails', async () => {
    await setupAuth();
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    const failChain: Record<string, unknown> = {};
    const handler = () => failChain;
    ['select', 'order'].forEach(m => { failChain[m] = vi.fn(handler); });
    failChain.then = vi.fn((resolve: (v: unknown) => unknown) =>
      resolve({ data: null, error: { message: 'permission' } })
    );
    vi.mocked(supabaseAdmin.from).mockReturnValue(failChain as never);

    const { GET } = await import('@/app/api/admin/invite-analytics/route');
    const res = await GET(new NextRequest('http://l/api/admin/invite-analytics'));
    expect(res.status).toBe(500);
  });
});
