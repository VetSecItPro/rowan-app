import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/weather/user-location/route';

vi.mock('@/lib/services/geographic-detection-service', () => ({
  geographicDetectionService: {
    getClientIP: vi.fn(),
    detectLocation: vi.fn(),
  },
}));
vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));

function makeRateLimit(success: boolean) {
  return { success, limit: 60, remaining: success ? 59 : 0, reset: Date.now() + 60000 };
}

const mockLocationData = {
  city: 'Austin',
  region: 'Texas',
  country: 'United States',
  latitude: 30.2672,
  longitude: -97.7431,
  timezone: 'America/Chicago',
};

describe('/api/weather/user-location', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(false));

      const res = await GET(new NextRequest('http://localhost/api/weather/user-location'));
      expect(res.status).toBe(429);
    });

    it('returns 400 when IP cannot be determined', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { geographicDetectionService } = await import('@/lib/services/geographic-detection-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(geographicDetectionService.getClientIP).mockReturnValue('unknown');

      const res = await GET(new NextRequest('http://localhost/api/weather/user-location'));
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/unable to determine/i);
      expect(data.fallback).toBeDefined();
    });

    it('returns 500 when location detection fails', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { geographicDetectionService } = await import('@/lib/services/geographic-detection-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(geographicDetectionService.getClientIP).mockReturnValue('1.2.3.4');
      vi.mocked(geographicDetectionService.detectLocation).mockResolvedValue({
        success: false,
        error: 'API unavailable',
        data: null,
        confidence: 'none',
      } as any);

      const res = await GET(new NextRequest('http://localhost/api/weather/user-location'));
      const data = await res.json();
      expect(res.status).toBe(500);
      expect(data.error).toBeDefined();
      expect(data.fallback).toBeDefined();
    });

    it('returns 200 with location data on successful detection', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { geographicDetectionService } = await import('@/lib/services/geographic-detection-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(geographicDetectionService.getClientIP).mockReturnValue('1.2.3.4');
      vi.mocked(geographicDetectionService.detectLocation).mockResolvedValue({
        success: true,
        data: mockLocationData,
        confidence: 'high',
        error: null,
      } as any);

      const res = await GET(new NextRequest('http://localhost/api/weather/user-location'));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.location.city).toBe('Austin');
      expect(data.location.region).toBe('Texas');
      expect(data.location.formatted).toBe('Austin, Texas');
    });
  });

  describe('POST', () => {
    it('returns 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(false));

      const res = await POST(new NextRequest('http://localhost/api/weather/user-location', {
        method: 'POST',
        body: JSON.stringify({ city: 'Austin', region: 'Texas', country: 'US' }),
      }));
      expect(res.status).toBe(429);
    });

    it('returns 400 for invalid manual location body', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));

      const res = await POST(new NextRequest('http://localhost/api/weather/user-location', {
        method: 'POST',
        body: JSON.stringify({ city: '', region: 'Texas', country: 'US' }),
      }));
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/invalid input/i);
    });

    it('returns 400 for unknown extra fields (strict schema)', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));

      const res = await POST(new NextRequest('http://localhost/api/weather/user-location', {
        method: 'POST',
        body: JSON.stringify({ city: 'Austin', region: 'Texas', country: 'US', unknownField: 'bad' }),
      }));
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/invalid input/i);
    });

    it('returns 200 with manual location data on success', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));

      const res = await POST(new NextRequest('http://localhost/api/weather/user-location', {
        method: 'POST',
        body: JSON.stringify({
          city: 'Austin',
          region: 'Texas',
          country: 'United States',
          latitude: 30.2672,
          longitude: -97.7431,
          timezone: 'America/Chicago',
        }),
      }));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.location.city).toBe('Austin');
      expect(data.location.formatted).toBe('Austin, Texas');
      expect(data.source).toBe('manual_override');
    });
  });
});
