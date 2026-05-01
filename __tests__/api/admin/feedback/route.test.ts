import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/security/csrf-validation', () => ({ validateCsrfRequest: vi.fn(() => null) }));
import { NextRequest } from 'next/server';

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
vi.mock('@/lib/services/feedback-service', () => ({
  getAllFeedback: vi.fn(),
  updateFeedbackStatus: vi.fn(),
  getFeedbackStats: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

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

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/admin/feedback', () => {
  it('returns 429 when rate limited', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_FAIL);
    const { GET } = await import('@/app/api/admin/feedback/route');
    const res = await GET(new NextRequest('http://l/api/admin/feedback'));
    expect(res.status).toBe(429);
  });

  it('returns 401 when admin session cookie missing', async () => {
    await setupAuth(false);
    const { GET } = await import('@/app/api/admin/feedback/route');
    const res = await GET(new NextRequest('http://l/api/admin/feedback'));
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
    vi.mocked(decryptSessionData).mockRejectedValue(new Error('bad cipher'));

    const { GET } = await import('@/app/api/admin/feedback/route');
    const res = await GET(new NextRequest('http://l/api/admin/feedback'));
    expect(res.status).toBe(401);
  });

  it('returns 401 when session data fails validation', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
    const { decryptSessionData, validateSessionData } = await import('@/lib/utils/session-crypto-edge');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
    vi.mocked(safeCookiesAsync).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'enc' }),
    } as never);
    vi.mocked(decryptSessionData).mockResolvedValue({} as never);
    vi.mocked(validateSessionData).mockReturnValue(false);

    const { GET } = await import('@/app/api/admin/feedback/route');
    const res = await GET(new NextRequest('http://l/api/admin/feedback'));
    expect(res.status).toBe(401);
  });

  it('returns 200 with feedback list and stats on success', async () => {
    await setupAuth();
    const { getAllFeedback, getFeedbackStats } = await import('@/lib/services/feedback-service');
    vi.mocked(getAllFeedback).mockResolvedValue({
      success: true,
      data: { items: [{ id: 'f1' }], total: 1, page: 1, limit: 20, totalPages: 1 } as never,
    });
    vi.mocked(getFeedbackStats).mockResolvedValue({
      success: true,
      data: { open: 1, in_progress: 0, done: 0, deleted: 0, total: 1 } as never,
    });

    const { GET } = await import('@/app/api/admin/feedback/route');
    const res = await GET(new NextRequest('http://l/api/admin/feedback?page=1&limit=20&status=open&category=bug_report'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.feedback.items[0].id).toBe('f1');
    expect(data.stats.total).toBe(1);
  });

  it('returns 500 when feedback service fails', async () => {
    await setupAuth();
    const { getAllFeedback, getFeedbackStats } = await import('@/lib/services/feedback-service');
    vi.mocked(getAllFeedback).mockResolvedValue({ success: false, error: 'db fail' });
    vi.mocked(getFeedbackStats).mockResolvedValue({ success: false, error: 'x' });

    const { GET } = await import('@/app/api/admin/feedback/route');
    const res = await GET(new NextRequest('http://l/api/admin/feedback'));
    expect(res.status).toBe(500);
  });

  it('returns 400 for invalid query params (status enum violation)', async () => {
    await setupAuth();
    const { GET } = await import('@/app/api/admin/feedback/route');
    const res = await GET(new NextRequest('http://l/api/admin/feedback?status=bogus'));
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/admin/feedback', () => {
  it('returns 429 when rate limited', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_FAIL);
    const { PATCH } = await import('@/app/api/admin/feedback/route');
    const res = await PATCH(new NextRequest('http://l/api/admin/feedback', { method: 'PATCH', body: '{}' }));
    expect(res.status).toBe(429);
  });

  it('returns 401 when not authenticated', async () => {
    await setupAuth(false);
    const { PATCH } = await import('@/app/api/admin/feedback/route');
    const res = await PATCH(new NextRequest('http://l/api/admin/feedback', { method: 'PATCH', body: '{}' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when body fails Zod validation (missing UUID)', async () => {
    await setupAuth();
    const { PATCH } = await import('@/app/api/admin/feedback/route');
    const res = await PATCH(new NextRequest('http://l/api/admin/feedback', {
      method: 'PATCH',
      body: JSON.stringify({ feedbackId: 'not-a-uuid' }),
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when neither status nor admin_notes provided', async () => {
    await setupAuth();
    const { PATCH } = await import('@/app/api/admin/feedback/route');
    const res = await PATCH(new NextRequest('http://l/api/admin/feedback', {
      method: 'PATCH',
      body: JSON.stringify({ feedbackId: '550e8400-e29b-41d4-a716-446655440000' }),
    }));
    expect(res.status).toBe(400);
  });

  it('returns 200 on successful update', async () => {
    await setupAuth();
    const { updateFeedbackStatus } = await import('@/lib/services/feedback-service');
    vi.mocked(updateFeedbackStatus).mockResolvedValue({ success: true, data: { id: 'f1', status: 'done' } as never });

    const { PATCH } = await import('@/app/api/admin/feedback/route');
    const res = await PATCH(new NextRequest('http://l/api/admin/feedback', {
      method: 'PATCH',
      body: JSON.stringify({
        feedbackId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'done',
      }),
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('returns 400 when service reports failure', async () => {
    await setupAuth();
    const { updateFeedbackStatus } = await import('@/lib/services/feedback-service');
    vi.mocked(updateFeedbackStatus).mockResolvedValue({ success: false, error: 'not found' });

    const { PATCH } = await import('@/app/api/admin/feedback/route');
    const res = await PATCH(new NextRequest('http://l/api/admin/feedback', {
      method: 'PATCH',
      body: JSON.stringify({
        feedbackId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'open',
      }),
    }));
    expect(res.status).toBe(400);
  });
});
