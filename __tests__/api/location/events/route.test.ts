import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/location/events/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/family-location-service', () => ({
  getGeofenceEvents: vi.fn(),
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
  buildUpgradeResponse: vi.fn(
    () => new Response(JSON.stringify({ error: 'Upgrade required' }), { status: 402 })
  ),
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
  const { checkGeneralRateLimit } = await import('@/lib/ratelimit');

  vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      }),
    },
  } as never);
  vi.mocked(getUserTier).mockResolvedValue('premium');
  vi.mocked(getFeatureLimits).mockReturnValue({ canUseLocation: true } as never);
}

describe('/api/location/events GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 429 when rate limited', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: false } as never);

    const request = new NextRequest(
      `http://localhost/api/location/events?space_id=${SPACE_ID}`
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain('Too many requests');
  });

  it('should return 401 when not authenticated', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never);

    const request = new NextRequest(
      `http://localhost/api/location/events?space_id=${SPACE_ID}`
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 402 when user tier does not support location', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { getUserTier } = await import('@/lib/services/subscription-service');
    const { getFeatureLimits } = await import('@/lib/config/feature-limits');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    } as never);
    vi.mocked(getUserTier).mockResolvedValue('free');
    vi.mocked(getFeatureLimits).mockReturnValue({ canUseLocation: false } as never);

    const request = new NextRequest(
      `http://localhost/api/location/events?space_id=${SPACE_ID}`
    );
    const response = await GET(request);

    expect(response.status).toBe(402);
  });

  it('should return 400 when space_id is missing', async () => {
    await setupPremiumAuth();

    const request = new NextRequest('http://localhost/api/location/events');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('space_id is required');
  });

  it('should return 400 when hours parameter is out of range', async () => {
    await setupPremiumAuth();

    const request = new NextRequest(
      `http://localhost/api/location/events?space_id=${SPACE_ID}&hours=200`
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('hours must be between');
  });

  it('should return 400 when hours parameter is less than 1', async () => {
    await setupPremiumAuth();

    const request = new NextRequest(
      `http://localhost/api/location/events?space_id=${SPACE_ID}&hours=0`
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('hours must be between');
  });

  it('should return 403 when user lacks space access', async () => {
    const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
    await setupPremiumAuth();
    vi.mocked(verifySpaceAccess).mockRejectedValue(new Error('No access'));

    const request = new NextRequest(
      `http://localhost/api/location/events?space_id=${SPACE_ID}`
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('do not have access');
  });

  it('should return geofence events successfully', async () => {
    const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
    const { getGeofenceEvents } = await import(
      '@/lib/services/family-location-service'
    );
    await setupPremiumAuth();
    vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);
    vi.mocked(getGeofenceEvents).mockResolvedValue([
      { id: 'evt-1', type: 'arrival', place_id: 'place-1', user_id: 'user-123' },
      { id: 'evt-2', type: 'departure', place_id: 'place-1', user_id: 'member-1' },
    ] as never);

    const request = new NextRequest(
      `http://localhost/api/location/events?space_id=${SPACE_ID}&hours=48`
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(getGeofenceEvents).toHaveBeenCalledWith(SPACE_ID, 48, expect.anything());
  });

  it('should use default hours of 24 when not specified', async () => {
    const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
    const { getGeofenceEvents } = await import(
      '@/lib/services/family-location-service'
    );
    await setupPremiumAuth();
    vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);
    vi.mocked(getGeofenceEvents).mockResolvedValue([] as never);

    const request = new NextRequest(
      `http://localhost/api/location/events?space_id=${SPACE_ID}`
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(getGeofenceEvents).toHaveBeenCalledWith(SPACE_ID, 24, expect.anything());
  });
});
