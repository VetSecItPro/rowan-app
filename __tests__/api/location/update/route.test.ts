import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/location/update/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/family-location-service', () => ({
  updateUserLocation: vi.fn(),
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

const SPACE_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('/api/location/update POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 429 when rate limited', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: false } as never);

    const request = new NextRequest('http://localhost/api/location/update', {
      method: 'POST',
      body: JSON.stringify({ space_id: SPACE_ID, latitude: 32.77, longitude: -96.79 }),
    });
    const response = await POST(request);
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

    const request = new NextRequest('http://localhost/api/location/update', {
      method: 'POST',
      body: JSON.stringify({ space_id: SPACE_ID, latitude: 32.77, longitude: -96.79 }),
    });
    const response = await POST(request);
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
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
    } as never);
    vi.mocked(getUserTier).mockResolvedValue('free');
    vi.mocked(getFeatureLimits).mockReturnValue({ canUseLocation: false } as never);

    const request = new NextRequest('http://localhost/api/location/update', {
      method: 'POST',
      body: JSON.stringify({ space_id: SPACE_ID, latitude: 32.77, longitude: -96.79 }),
    });
    const response = await POST(request);

    expect(response.status).toBe(402);
  });

  it('should return 400 for invalid request body', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { getUserTier } = await import('@/lib/services/subscription-service');
    const { getFeatureLimits } = await import('@/lib/config/feature-limits');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
    } as never);
    vi.mocked(getUserTier).mockResolvedValue('premium');
    vi.mocked(getFeatureLimits).mockReturnValue({ canUseLocation: true } as never);

    const request = new NextRequest('http://localhost/api/location/update', {
      method: 'POST',
      body: JSON.stringify({ space_id: 'not-a-uuid', latitude: 200, longitude: -96.79 }), // invalid
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('should return 403 when user lacks space access', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { getUserTier } = await import('@/lib/services/subscription-service');
    const { getFeatureLimits } = await import('@/lib/config/feature-limits');
    const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
    } as never);
    vi.mocked(getUserTier).mockResolvedValue('premium');
    vi.mocked(getFeatureLimits).mockReturnValue({ canUseLocation: true } as never);
    vi.mocked(verifySpaceAccess).mockRejectedValue(new Error('No access'));

    const request = new NextRequest('http://localhost/api/location/update', {
      method: 'POST',
      body: JSON.stringify({ space_id: SPACE_ID, latitude: 32.77, longitude: -96.79 }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('do not have access');
  });

  it('should update location successfully', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { getUserTier } = await import('@/lib/services/subscription-service');
    const { getFeatureLimits } = await import('@/lib/config/feature-limits');
    const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
    const { updateUserLocation } = await import('@/lib/services/family-location-service');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
    } as never);
    vi.mocked(getUserTier).mockResolvedValue('premium');
    vi.mocked(getFeatureLimits).mockReturnValue({ canUseLocation: true } as never);
    vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);
    vi.mocked(updateUserLocation).mockResolvedValue({ success: true, data: { id: 'loc-1' } });

    const request = new NextRequest('http://localhost/api/location/update', {
      method: 'POST',
      body: JSON.stringify({ space_id: SPACE_ID, latitude: 32.77, longitude: -96.79 }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
