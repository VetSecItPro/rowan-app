import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/location/settings/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/family-location-service', () => ({
  getSharingSettings: vi.fn(),
  updateSharingSettings: vi.fn(),
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

function setupAuthAndTier(authenticated = true) {
  return async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { getUserTier } = await import('@/lib/services/subscription-service');
    const { getFeatureLimits } = await import('@/lib/config/feature-limits');
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: authenticated ? { id: 'user-123' } : null },
          error: null,
        }),
      },
    } as never);
    vi.mocked(getUserTier).mockResolvedValue('premium');
    vi.mocked(getFeatureLimits).mockReturnValue({ canUseLocation: true } as never);
  };
}

describe('/api/location/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: false } as never);

      const request = new NextRequest(`http://localhost/api/location/settings?space_id=${SPACE_ID}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
    });

    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
      await setupAuthAndTier(false)();

      const request = new NextRequest(`http://localhost/api/location/settings?space_id=${SPACE_ID}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it('should return 400 when space_id is missing', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
      await setupAuthAndTier()();

      const request = new NextRequest('http://localhost/api/location/settings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('space_id is required');
    });

    it('should return location sharing settings', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { getSharingSettings } = await import('@/lib/services/family-location-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
      await setupAuthAndTier()();
      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);
      vi.mocked(getSharingSettings).mockResolvedValue({ sharing_enabled: true, update_interval: 30 } as never);

      const request = new NextRequest(`http://localhost/api/location/settings?space_id=${SPACE_ID}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.sharing_enabled).toBe(true);
    });
  });

  describe('PUT', () => {
    it('should return 400 when space_id is missing in body', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
      await setupAuthAndTier()();

      const request = new NextRequest('http://localhost/api/location/settings', {
        method: 'PUT',
        body: JSON.stringify({ sharing_enabled: false }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('space_id is required');
    });

    it('should update sharing settings successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { updateSharingSettings } = await import('@/lib/services/family-location-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
      await setupAuthAndTier()();
      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);
      vi.mocked(updateSharingSettings).mockResolvedValue({ success: true, data: { sharing_enabled: false } });

      const request = new NextRequest('http://localhost/api/location/settings', {
        method: 'PUT',
        body: JSON.stringify({ space_id: SPACE_ID, sharing_enabled: false }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
