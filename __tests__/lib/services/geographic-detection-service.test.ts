import { describe, it, expect, vi, beforeEach } from 'vitest';
import { geographicDetectionService } from '@/lib/services/geographic-detection-service';

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

global.fetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('geographic-detection-service', () => {
  describe('detectLocation', () => {
    it('should detect California location via ipapi.co', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          country_name: 'United States',
          region: 'California',
          region_code: 'CA',
          city: 'San Francisco',
          postal: '94102',
          latitude: 37.7749,
          longitude: -122.4194,
          timezone: 'America/Los_Angeles',
        }),
      });

      const result = await geographicDetectionService.detectLocation('8.8.8.8');

      expect(result.success).toBe(true);
      expect(result.data?.isCaliforniaResident).toBe(true);
      expect(result.data?.state).toBe('CA');
      expect(result.confidence).toBe('high');
    });

    it('should detect non-California location', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          country_name: 'United States',
          region: 'Texas',
          region_code: 'TX',
          city: 'Dallas',
          postal: '75201',
          latitude: 32.7767,
          longitude: -96.7970,
          timezone: 'America/Chicago',
        }),
      });

      const result = await geographicDetectionService.detectLocation('1.2.3.4');

      expect(result.success).toBe(true);
      expect(result.data?.isCaliforniaResident).toBe(false);
      expect(result.data?.state).toBe('TX');
    });

    it('should handle private IP addresses', async () => {
      const result = await geographicDetectionService.detectLocation('192.168.1.1');

      expect(result.success).toBe(true);
      expect(result.data?.country).toBe('Unknown');
      expect(result.data?.isCaliforniaResident).toBe(false);
      expect(result.confidence).toBe('low');
    });

    it('should fallback to ipgeolocation.io on primary failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            country_name: 'United States',
            state_prov: 'California',
            state_code: 'CA',
            city: 'Los Angeles',
            zipcode: '90001',
            latitude: '34.0522',
            longitude: '-118.2437',
            time_zone: { name: 'America/Los_Angeles' },
          }),
        });

      const result = await geographicDetectionService.detectLocation('8.8.8.8');

      expect(result.success).toBe(true);
      expect(result.data?.isCaliforniaResident).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should default to California on complete failure (CCPA compliance)', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      const result = await geographicDetectionService.detectLocation('8.8.8.8');

      expect(result.success).toBe(true);
      expect(result.data?.isCaliforniaResident).toBe(true);
      expect(result.confidence).toBe('low');
    });
  });

  describe('getClientIP', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('https://example.com', {
        headers: { 'x-forwarded-for': '8.8.8.8, 192.168.1.1' },
      });

      const ip = geographicDetectionService.getClientIP(request);

      expect(ip).toBe('8.8.8.8');
    });

    it('should extract IP from x-real-ip header', () => {
      const request = new Request('https://example.com', {
        headers: { 'x-real-ip': '1.2.3.4' },
      });

      const ip = geographicDetectionService.getClientIP(request);

      expect(ip).toBe('1.2.3.4');
    });

    it('should extract IP from cf-connecting-ip header (Cloudflare)', () => {
      const request = new Request('https://example.com', {
        headers: { 'cf-connecting-ip': '5.6.7.8' },
      });

      const ip = geographicDetectionService.getClientIP(request);

      expect(ip).toBe('5.6.7.8');
    });

    it('should return "unknown" if no valid IP found', () => {
      const request = new Request('https://example.com', {
        headers: {},
      });

      const ip = geographicDetectionService.getClientIP(request);

      expect(ip).toBe('unknown');
    });

    it('should skip private IPs in x-forwarded-for', () => {
      const request = new Request('https://example.com', {
        headers: { 'x-forwarded-for': '192.168.1.1, 8.8.8.8' },
      });

      const ip = geographicDetectionService.getClientIP(request);

      expect(ip).toBe('unknown');
    });
  });

  describe('shouldShowCCPANotice', () => {
    it('should show notice for California residents', () => {
      const locationData = {
        ip: '8.8.8.8',
        country: 'United States',
        region: 'California',
        state: 'CA',
        city: 'San Francisco',
        zip: '94102',
        latitude: 37.7749,
        longitude: -122.4194,
        timezone: 'America/Los_Angeles',
        isCaliforniaResident: true,
      };

      const result = geographicDetectionService.shouldShowCCPANotice(locationData);

      expect(result).toBe(true);
    });

    it('should not show notice for non-California residents', () => {
      const locationData = {
        ip: '1.2.3.4',
        country: 'United States',
        region: 'Texas',
        state: 'TX',
        city: 'Dallas',
        zip: '75201',
        latitude: 32.7767,
        longitude: -96.7970,
        timezone: 'America/Chicago',
        isCaliforniaResident: false,
      };

      const result = geographicDetectionService.shouldShowCCPANotice(locationData);

      expect(result).toBe(false);
    });

    it('should show notice for unknown locations (conservative)', () => {
      const locationData = {
        ip: '0.0.0.0',
        country: 'Unknown',
        region: 'Unknown',
        state: 'Unknown',
        city: 'Unknown',
        zip: 'Unknown',
        latitude: 0,
        longitude: 0,
        timezone: 'Unknown',
        isCaliforniaResident: false,
      };

      const result = geographicDetectionService.shouldShowCCPANotice(locationData);

      expect(result).toBe(true);
    });

    it('should show notice when locationData is undefined', () => {
      const result = geographicDetectionService.shouldShowCCPANotice(undefined);

      expect(result).toBe(true);
    });
  });

  describe('California detection logic', () => {
    it('should detect by ZIP code range', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          country_name: 'United States',
          region: 'Unknown',
          region_code: 'Unknown',
          city: 'Unknown',
          postal: '94102',
          latitude: 0,
          longitude: 0,
          timezone: 'Unknown',
        }),
      });

      const result = await geographicDetectionService.detectLocation('8.8.8.8');

      expect(result.data?.isCaliforniaResident).toBe(true);
    });

    it('should detect by city name', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          country_name: 'United States',
          region: 'Unknown',
          region_code: 'Unknown',
          city: 'San Diego',
          postal: '00000',
          latitude: 0,
          longitude: 0,
          timezone: 'Unknown',
        }),
      });

      const result = await geographicDetectionService.detectLocation('8.8.8.8');

      expect(result.data?.isCaliforniaResident).toBe(true);
    });

    it('should detect by coordinates (bounding box)', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          country_name: 'United States',
          region: 'Unknown',
          region_code: 'Unknown',
          city: 'Unknown',
          postal: '00000',
          latitude: 37.0,
          longitude: -120.0,
          timezone: 'Unknown',
        }),
      });

      const result = await geographicDetectionService.detectLocation('8.8.8.8');

      expect(result.data?.isCaliforniaResident).toBe(true);
    });
  });
});
