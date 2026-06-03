import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/services/storage-service', () => ({ checkStorageQuota: vi.fn() }));
vi.mock('@/lib/services/authorization-service', () => ({ verifySpaceAccess: vi.fn() }));
vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

const SPACE = '123e4567-e89b-12d3-a456-426614174000';

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/storage/check-quota', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function setAuth(userId: string | null) {
  const { createClient } = await import('@/lib/supabase/server');
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null }, error: null }) },
  } as never);
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
  vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true, limit: 60, remaining: 59, reset: Date.now() + 60000 });
  const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
  vi.mocked(verifySpaceAccess).mockResolvedValue(undefined as never);
});

describe('POST /api/storage/check-quota (Phase 11.2)', () => {
  it('returns 401 when unauthenticated', async () => {
    await setAuth(null);
    const { POST } = await import('@/app/api/storage/check-quota/route');
    const res = await POST(makeReq({ spaceId: SPACE, fileSizeBytes: 1000 }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for an invalid body', async () => {
    await setAuth('user-1');
    const { POST } = await import('@/app/api/storage/check-quota/route');
    const res = await POST(makeReq({ spaceId: 'not-a-uuid', fileSizeBytes: -5 }));
    expect(res.status).toBe(400);
  });

  it('returns 403 when the user lacks space access', async () => {
    await setAuth('user-1');
    const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
    vi.mocked(verifySpaceAccess).mockRejectedValue(new Error('no access') as never);
    const { POST } = await import('@/app/api/storage/check-quota/route');
    const res = await POST(makeReq({ spaceId: SPACE, fileSizeBytes: 1000 }));
    expect(res.status).toBe(403);
  });

  it('returns 200 allowed=true when the file fits', async () => {
    await setAuth('user-1');
    const { checkStorageQuota } = await import('@/lib/services/storage-service');
    vi.mocked(checkStorageQuota).mockResolvedValue({
      success: true,
      data: { allowed: true, currentBytes: 100, limitBytes: 1000, availableBytes: 900, percentageUsed: 10 },
    } as never);
    const { POST } = await import('@/app/api/storage/check-quota/route');
    const res = await POST(makeReq({ spaceId: SPACE, fileSizeBytes: 500 }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.allowed).toBe(true);
  });

  it('returns 413 when the file would exceed the quota', async () => {
    await setAuth('user-1');
    const { checkStorageQuota } = await import('@/lib/services/storage-service');
    vi.mocked(checkStorageQuota).mockResolvedValue({
      success: true,
      data: { allowed: false, currentBytes: 950, limitBytes: 1000, availableBytes: 50, percentageUsed: 95 },
    } as never);
    const { POST } = await import('@/app/api/storage/check-quota/route');
    const res = await POST(makeReq({ spaceId: SPACE, fileSizeBytes: 500 }));
    const data = await res.json();
    expect(res.status).toBe(413);
    expect(data.allowed).toBe(false);
  });

  it('fails closed (500) when the quota check errors', async () => {
    await setAuth('user-1');
    const { checkStorageQuota } = await import('@/lib/services/storage-service');
    vi.mocked(checkStorageQuota).mockResolvedValue({ success: false, error: 'db down' } as never);
    const { POST } = await import('@/app/api/storage/check-quota/route');
    const res = await POST(makeReq({ spaceId: SPACE, fileSizeBytes: 500 }));
    expect(res.status).toBe(500);
  });
});
