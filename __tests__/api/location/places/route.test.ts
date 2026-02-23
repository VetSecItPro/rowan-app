import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/location/places/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/family-location-service', () => ({
  getPlaces: vi.fn(),
  createPlace: vi.fn(),
  updatePlace: vi.fn(),
  deletePlace: vi.fn(),
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
const PLACE_ID = '770e8400-e29b-41d4-a716-446655440000';

async function setupPremiumAuth() {
  const { createClient } = await import('@/lib/supabase/server');
  const { getUserTier } = await import('@/lib/services/subscription-service');
  const { getFeatureLimits } = await import('@/lib/config/feature-limits');
  const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
  vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
  } as never);
  vi.mocked(getUserTier).mockResolvedValue('premium');
  vi.mocked(getFeatureLimits).mockReturnValue({ canUseLocation: true } as never);
}

describe('/api/location/places', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      } as never);

      const request = new NextRequest(`http://localhost/api/location/places?space_id=${SPACE_ID}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it('should return 400 when space_id is missing', async () => {
      await setupPremiumAuth();

      const request = new NextRequest('http://localhost/api/location/places');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('space_id is required');
    });

    it('should return places successfully', async () => {
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { getPlaces } = await import('@/lib/services/family-location-service');
      await setupPremiumAuth();
      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);
      vi.mocked(getPlaces).mockResolvedValue([{ id: PLACE_ID, name: 'Home', latitude: 32.77, longitude: -96.79 }] as never);

      const request = new NextRequest(`http://localhost/api/location/places?space_id=${SPACE_ID}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
    });
  });

  describe('POST', () => {
    it('should return 400 when space_id is missing', async () => {
      await setupPremiumAuth();

      const request = new NextRequest('http://localhost/api/location/places', {
        method: 'POST',
        body: JSON.stringify({ name: 'Work', latitude: 32.78, longitude: -96.80 }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('space_id is required');
    });

    it('should create a place successfully', async () => {
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { createPlace } = await import('@/lib/services/family-location-service');
      await setupPremiumAuth();
      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);
      vi.mocked(createPlace).mockResolvedValue({ success: true, data: { id: PLACE_ID, name: 'Work' } });

      const request = new NextRequest('http://localhost/api/location/places', {
        method: 'POST',
        body: JSON.stringify({ space_id: SPACE_ID, name: 'Work', latitude: 32.78, longitude: -96.80 }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });
  });

  describe('PUT', () => {
    it('should return 400 when id or space_id is missing', async () => {
      await setupPremiumAuth();

      const request = new NextRequest('http://localhost/api/location/places', {
        method: 'PUT',
        body: JSON.stringify({ space_id: SPACE_ID, name: 'Updated' }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('id and space_id are required');
    });

    it('should update a place successfully', async () => {
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { updatePlace } = await import('@/lib/services/family-location-service');
      await setupPremiumAuth();
      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);
      vi.mocked(updatePlace).mockResolvedValue({ success: true, data: { id: PLACE_ID, name: 'Updated Home' } });

      const request = new NextRequest('http://localhost/api/location/places', {
        method: 'PUT',
        body: JSON.stringify({ id: PLACE_ID, space_id: SPACE_ID, name: 'Updated Home' }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('DELETE', () => {
    it('should return 400 when id or space_id is missing', async () => {
      await setupPremiumAuth();

      const request = new NextRequest(`http://localhost/api/location/places?space_id=${SPACE_ID}`);
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('id and space_id are required');
    });

    it('should delete a place successfully', async () => {
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { deletePlace } = await import('@/lib/services/family-location-service');
      await setupPremiumAuth();
      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);
      vi.mocked(deletePlace).mockResolvedValue({ success: true });

      const request = new NextRequest(
        `http://localhost/api/location/places?id=${PLACE_ID}&space_id=${SPACE_ID}`,
        { method: 'DELETE' }
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
