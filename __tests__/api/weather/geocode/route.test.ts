import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/weather/geocode/route';

vi.mock('@/lib/services/weather-cache-service', () => ({
  weatherCacheService: {
    getOrFetchGeocode: vi.fn(),
  },
}));
vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));

function makeRateLimit(success: boolean) {
  return { success, limit: 60, remaining: success ? 59 : 0, reset: Date.now() + 60000 };
}

describe('/api/weather/geocode', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(false));

      const res = await GET(new NextRequest('http://localhost/api/weather/geocode?location=New+York'));
      expect(res.status).toBe(429);
    });

    it('returns 400 when location parameter is missing', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));

      const res = await GET(new NextRequest('http://localhost/api/weather/geocode'));
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/location parameter/i);
    });

    it('returns 404 when location cannot be geocoded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { weatherCacheService } = await import('@/lib/services/weather-cache-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      // getOrFetchGeocode calls the fetcher which returns null (not found)
      vi.mocked(weatherCacheService.getOrFetchGeocode).mockImplementation(
        async (_loc: string, fetcher: () => Promise<unknown>) => {
          return await fetcher();
        }
      );

      // We need to mock global fetch to return empty results
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ results: [] }),
      } as Response);

      const res = await GET(new NextRequest('http://localhost/api/weather/geocode?location=ZZZUnknownPlaceXXX'));
      const data = await res.json();
      expect(res.status).toBe(404);
      expect(data.error).toMatch(/not found/i);

      fetchSpy.mockRestore();
    });

    it('returns 200 with coordinates for a known location', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { weatherCacheService } = await import('@/lib/services/weather-cache-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));

      // Simulate cache returning coordinates; also need fullResult from geocoding
      vi.mocked(weatherCacheService.getOrFetchGeocode).mockImplementation(
        async (_loc: string, fetcher: () => Promise<unknown>) => {
          // Call fetcher to set fullResult in route scope
          await fetcher();
          return { lat: 40.7128, lon: -74.006 };
        }
      );

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{
            name: 'New York',
            latitude: 40.7128,
            longitude: -74.006,
            country: 'United States',
            country_code: 'US',
            admin1: 'New York',
          }],
        }),
      } as Response);

      const res = await GET(new NextRequest('http://localhost/api/weather/geocode?location=New+York'));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.lat).toBe(40.7128);
      expect(data.lon).toBe(-74.006);
      expect(data.name).toBe('New York');

      fetchSpy.mockRestore();
    });
  });
});
