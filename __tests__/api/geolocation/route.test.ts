import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/geolocation/route';

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

describe('/api/geolocation GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return 429 when rate limited', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: false } as never);

    const request = new NextRequest('http://localhost/api/geolocation');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe('Too many requests');
  });

  it('should return Dallas fallback for localhost IP', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { extractIP } = await import('@/lib/ratelimit-fallback');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(extractIP).mockReturnValue('127.0.0.1');

    // Mock external IP fetch to also fail
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    const request = new NextRequest('http://localhost/api/geolocation');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.city).toBe('Dallas');
    expect(data.fallback).toBe(true);
  });

  it('should return fallback for invalid IP format', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { extractIP } = await import('@/lib/ratelimit-fallback');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(extractIP).mockReturnValue('invalid-ip-format!@#');

    const request = new NextRequest('http://localhost/api/geolocation', {
      headers: { 'x-vercel-forwarded-for': 'invalid-ip-format!@#' },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.city).toBe('Dallas');
    expect(data.fallback).toBe(true);
  });

  it('should return geolocation data for valid IP', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { extractIP } = await import('@/lib/ratelimit-fallback');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(extractIP).mockReturnValue('8.8.8.8');

    const geoData = {
      city: 'Mountain View',
      region: 'California',
      country_name: 'United States',
      country_code: 'US',
      latitude: 37.386,
      longitude: -122.0838,
      timezone: 'America/Los_Angeles',
      postal: '94043',
    };
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(geoData),
    } as never);

    const request = new NextRequest('http://localhost/api/geolocation', {
      headers: { 'x-vercel-forwarded-for': '8.8.8.8' },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.city).toBe('Mountain View');
    expect(data.fallback).toBe(false);
    expect(data.latitude).toBe(37.386);
  });

  it('should return Dallas fallback when API returns error', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { extractIP } = await import('@/lib/ratelimit-fallback');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(extractIP).mockReturnValue('8.8.8.8');

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ error: 'Rate limited', latitude: null, longitude: null }),
    } as never);

    const request = new NextRequest('http://localhost/api/geolocation', {
      headers: { 'x-vercel-forwarded-for': '8.8.8.8' },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.city).toBe('Dallas');
    expect(data.fallback).toBe(true);
  });
});
