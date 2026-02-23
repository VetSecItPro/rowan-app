import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/location/history/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/family-location-service', () => ({
  getLocationHistory: vi.fn(),
  getSharingSettings: vi.fn(),
}));

vi.mock('@/lib/services/authorization-service', () => ({
  verifySpaceAccess: vi.fn(),
}));

vi.mock('@/lib/services/subscription-service', () => ({
  getUserTier: vi.fn(),
}));

vi.mock('@/lib/config/feature-limits', () => ({
  getFeatureLimits: vi.fn(),
}));

vi.mock('@/lib/middleware/subscription-check', () => ({
  buildUpgradeResponse: vi.fn(() => new Response(JSON.stringify({ error: 'Upgrade required' }), { status: 402 })),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/lib/sentry-utils', () => ({
  setSentryUser: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/cache-headers', () => ({
  withUserDataCache: vi.fn((r) => r),
}));

const SPACE_ID = '550e8400-e29b-41d4-a716-446655440000';

async function setupPremiumAuth() {
  const { createClient } = await import('@/lib/supabase/server');
  const { getUserTier } = await import('@/lib/services/subscription-service');
  const { getFeatureLimits } = await import('@/lib/config/feature-limits');
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
  } as never);
  vi.mocked(getUserTier).mockResolvedValue('premium');
  vi.mocked(getFeatureLimits).mockReturnValue({ canUseLocation: true } as never);
}

describe('/api/location/history GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 429 when rate limited', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: false } as never);

    const request = new NextRequest(`http://localhost/api/location/history?space_id=${SPACE_ID}`);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(429);
  });

  it('should return 401 when not authenticated', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as never);

    const request = new NextRequest(`http://localhost/api/location/history?space_id=${SPACE_ID}`);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
  });

  it('should return 400 when space_id is missing', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
    await setupPremiumAuth();

    const request = new NextRequest('http://localhost/api/location/history');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('space_id is required');
  });

  it('should return 400 for out of range hours parameter', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
    await setupPremiumAuth();

    const request = new NextRequest(`http://localhost/api/location/history?space_id=${SPACE_ID}&hours=200`);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('hours must be between');
  });

  it('should return empty array when target user has sharing disabled', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
    const { getSharingSettings } = await import('@/lib/services/family-location-service');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
    await setupPremiumAuth();
    vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);
    vi.mocked(getSharingSettings).mockResolvedValue({ sharing_enabled: false } as never);

    const OTHER_USER = '660e8400-e29b-41d4-a716-446655440000';
    const request = new NextRequest(
      `http://localhost/api/location/history?space_id=${SPACE_ID}&user_id=${OTHER_USER}`
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual([]);
    expect(data.message).toContain('sharing disabled');
  });

  it('should return location history successfully', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
    const { getLocationHistory } = await import('@/lib/services/family-location-service');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
    await setupPremiumAuth();
    vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);
    vi.mocked(getLocationHistory).mockResolvedValue([
      { latitude: 32.77, longitude: -96.79, recorded_at: new Date().toISOString() },
    ] as never);

    const request = new NextRequest(`http://localhost/api/location/history?space_id=${SPACE_ID}`);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
  });
});
