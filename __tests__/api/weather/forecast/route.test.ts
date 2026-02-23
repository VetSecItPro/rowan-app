import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/weather/forecast/route';

vi.mock('@/lib/services/weather-cache-service', () => ({
  weatherCacheService: {
    getOrFetchWeather: vi.fn(),
  },
}));
vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

function makeRateLimit(success: boolean) {
  return { success, limit: 60, remaining: success ? 59 : 0, reset: Date.now() + 60000 };
}

const mockForecast = {
  condition: 'clear',
  temp: 22,
  feelsLike: 20,
  description: 'clear sky',
  humidity: 55,
  windSpeed: 10,
  icon: '0',
  timestamp: new Date().toISOString(),
};

describe('/api/weather/forecast', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(false));

      const res = await GET(new NextRequest('http://localhost/api/weather/forecast?lat=40.7128&lon=-74.0060'));
      expect(res.status).toBe(429);
    });

    it('returns 400 when lat and lon are missing', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));

      const res = await GET(new NextRequest('http://localhost/api/weather/forecast'));
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/latitude and longitude/i);
    });

    it('returns 400 when lat is "undefined"', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));

      const res = await GET(new NextRequest('http://localhost/api/weather/forecast?lat=undefined&lon=-74.0060'));
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/latitude and longitude/i);
    });

    it('returns 400 when coordinates are out of range', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));

      const res = await GET(new NextRequest('http://localhost/api/weather/forecast?lat=999&lon=-74.0060'));
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/invalid query/i);
    });

    it('returns 200 with forecast data for valid coordinates', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { weatherCacheService } = await import('@/lib/services/weather-cache-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(weatherCacheService.getOrFetchWeather).mockResolvedValue(mockForecast);

      const res = await GET(new NextRequest('http://localhost/api/weather/forecast?lat=40.7128&lon=-74.0060'));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.condition).toBe('clear');
      expect(data.temp).toBe(22);
    });

    it('returns 500 when weather cache service returns null', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { weatherCacheService } = await import('@/lib/services/weather-cache-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(weatherCacheService.getOrFetchWeather).mockResolvedValue(null);

      const res = await GET(new NextRequest('http://localhost/api/weather/forecast?lat=40.7128&lon=-74.0060'));
      const data = await res.json();
      expect(res.status).toBe(500);
      expect(data.error).toMatch(/failed to fetch weather/i);
    });

    it('returns 200 for a date-specific forecast', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { weatherCacheService } = await import('@/lib/services/weather-cache-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(weatherCacheService.getOrFetchWeather).mockResolvedValue(mockForecast);

      const res = await GET(new NextRequest(
        'http://localhost/api/weather/forecast?lat=40.7128&lon=-74.0060&date=2026-02-22'
      ));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.condition).toBeDefined();
    });
  });
});
