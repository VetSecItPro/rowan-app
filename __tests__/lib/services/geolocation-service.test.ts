import { describe, it, expect, vi, beforeEach } from 'vitest';
import { geolocationService } from '@/lib/services/geolocation-service';

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

global.localStorage = localStorageMock as Storage;

beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
});

describe('geolocation-service', () => {
  describe('getCurrentLocation', () => {
    it('should fetch location from API on first call', async () => {
      const mockLocation = {
        city: 'San Francisco',
        region: 'California',
        country: 'United States',
        country_code: 'US',
        latitude: 37.7749,
        longitude: -122.4194,
        timezone: 'America/Los_Angeles',
        postal: '94102',
        ip: '8.8.8.8',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockLocation,
      });

      const result = await geolocationService.getCurrentLocation();

      expect(result).toEqual(mockLocation);
      expect(global.fetch).toHaveBeenCalledWith('/api/geolocation', {
        headers: { Accept: 'application/json' },
      });
    });

    it('should use cached location within 24 hours', async () => {
      const mockLocation = {
        city: 'Dallas',
        region: 'Texas',
        country: 'United States',
        country_code: 'US',
        latitude: 32.7767,
        longitude: -96.7970,
        timezone: 'America/Chicago',
        postal: '75201',
        ip: '1.2.3.4',
      };

      const cachedData = {
        location: mockLocation,
        cachedAt: new Date().toISOString(),
      };

      localStorageMock.setItem('user-location-cache', JSON.stringify(cachedData));
      localStorageMock.setItem('user-location-cache-version', '3.0');

      const result = await geolocationService.getCurrentLocation();

      expect(result).toEqual(mockLocation);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should refetch if cache is expired (>24 hours)', async () => {
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 25);

      const expiredCache = {
        location: {
          city: 'Old City',
          region: 'Old Region',
          country: 'US',
          country_code: 'US',
          latitude: 0,
          longitude: 0,
          timezone: 'UTC',
          postal: '00000',
          ip: '0.0.0.0',
        },
        cachedAt: oldDate.toISOString(),
      };

      const newLocation = {
        city: 'San Francisco',
        region: 'California',
        country: 'United States',
        country_code: 'US',
        latitude: 37.7749,
        longitude: -122.4194,
        timezone: 'America/Los_Angeles',
        postal: '94102',
        ip: '8.8.8.8',
      };

      localStorageMock.setItem('user-location-cache', JSON.stringify(expiredCache));
      localStorageMock.setItem('user-location-cache-version', '3.0');

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => newLocation,
      });

      const result = await geolocationService.getCurrentLocation();

      expect(result).toEqual(newLocation);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should clear cache if version mismatch', async () => {
      const cachedData = {
        location: {
          city: 'Old City',
          region: 'Old Region',
          country: 'US',
          country_code: 'US',
          latitude: 0,
          longitude: 0,
          timezone: 'UTC',
          postal: '00000',
          ip: '0.0.0.0',
        },
        cachedAt: new Date().toISOString(),
      };

      localStorageMock.setItem('user-location-cache', JSON.stringify(cachedData));
      localStorageMock.setItem('user-location-cache-version', '2.0');

      const newLocation = {
        city: 'Dallas',
        region: 'Texas',
        country: 'United States',
        country_code: 'US',
        latitude: 32.7767,
        longitude: -96.7970,
        timezone: 'America/Chicago',
        postal: '75201',
        ip: '1.2.3.4',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => newLocation,
      });

      const result = await geolocationService.getCurrentLocation();

      expect(result).toEqual(newLocation);
      expect(localStorageMock.getItem('user-location-cache-version')).toBe('3.0');
    });

    it('should return Dallas fallback on API error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      const result = await geolocationService.getCurrentLocation();

      expect(result?.city).toBe('Dallas');
      expect(result?.region).toBe('Texas');
      expect(result?.latitude).toBe(32.7767);
    });

    it('should reject invalid location data', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          city: 'Test',
          region: 'Test',
          country: 'Test',
          // Missing latitude/longitude
        }),
      });

      const result = await geolocationService.getCurrentLocation();

      expect(result?.city).toBe('Dallas'); // Fallback
    });
  });

  describe('getLocationString', () => {
    it('should format location for weather API', () => {
      const location = {
        city: 'San Francisco',
        region: 'California',
        country: 'United States',
        country_code: 'US',
        latitude: 37.7749,
        longitude: -122.4194,
        timezone: 'America/Los_Angeles',
        postal: '94102',
        ip: '8.8.8.8',
      };

      const result = geolocationService.getLocationString(location);

      expect(result).toBe('San Francisco, California, United States');
    });
  });

  describe('getCachedLocation', () => {
    it('should return cached location if valid', () => {
      const mockLocation = {
        city: 'Dallas',
        region: 'Texas',
        country: 'United States',
        country_code: 'US',
        latitude: 32.7767,
        longitude: -96.7970,
        timezone: 'America/Chicago',
        postal: '75201',
        ip: '1.2.3.4',
      };

      const cachedData = {
        location: mockLocation,
        cachedAt: new Date().toISOString(),
      };

      localStorageMock.setItem('user-location-cache', JSON.stringify(cachedData));
      localStorageMock.setItem('user-location-cache-version', '3.0');

      const result = geolocationService.getCachedLocation();

      expect(result).toEqual(mockLocation);
    });

    it('should return null if no cache exists', () => {
      const result = geolocationService.getCachedLocation();

      expect(result).toBeNull();
    });

    it('should return null if cache is expired', () => {
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 25);

      const expiredCache = {
        location: {
          city: 'Old City',
          region: 'Old Region',
          country: 'US',
          country_code: 'US',
          latitude: 0,
          longitude: 0,
          timezone: 'UTC',
          postal: '00000',
          ip: '0.0.0.0',
        },
        cachedAt: oldDate.toISOString(),
      };

      localStorageMock.setItem('user-location-cache', JSON.stringify(expiredCache));
      localStorageMock.setItem('user-location-cache-version', '3.0');

      const result = geolocationService.getCachedLocation();

      expect(result).toBeNull();
    });
  });

  describe('cacheLocation', () => {
    it('should cache location with current timestamp', () => {
      const mockLocation = {
        city: 'Dallas',
        region: 'Texas',
        country: 'United States',
        country_code: 'US',
        latitude: 32.7767,
        longitude: -96.7970,
        timezone: 'America/Chicago',
        postal: '75201',
        ip: '1.2.3.4',
      };

      geolocationService.cacheLocation(mockLocation);

      const cached = JSON.parse(localStorageMock.getItem('user-location-cache')!);
      expect(cached.location).toEqual(mockLocation);
      expect(cached.cachedAt).toBeDefined();
      expect(localStorageMock.getItem('user-location-cache-version')).toBe('3.0');
    });
  });

  describe('clearCache', () => {
    it('should clear cached location', () => {
      const mockLocation = {
        city: 'Dallas',
        region: 'Texas',
        country: 'United States',
        country_code: 'US',
        latitude: 32.7767,
        longitude: -96.7970,
        timezone: 'America/Chicago',
        postal: '75201',
        ip: '1.2.3.4',
      };

      geolocationService.cacheLocation(mockLocation);

      geolocationService.clearCache();

      expect(localStorageMock.getItem('user-location-cache')).toBeNull();
      expect(localStorageMock.getItem('user-location-cache-version')).toBeNull();
    });
  });

  describe('formatLocationDisplay', () => {
    it('should format location for display', () => {
      const location = {
        city: 'San Francisco',
        region: 'California',
        country: 'United States',
        country_code: 'US',
        latitude: 37.7749,
        longitude: -122.4194,
        timezone: 'America/Los_Angeles',
        postal: '94102',
        ip: '8.8.8.8',
      };

      const result = geolocationService.formatLocationDisplay(location);

      expect(result).toBe('San Francisco, California');
    });
  });

  describe('getTimezone', () => {
    it('should return timezone from location', () => {
      const location = {
        city: 'Dallas',
        region: 'Texas',
        country: 'United States',
        country_code: 'US',
        latitude: 32.7767,
        longitude: -96.7970,
        timezone: 'America/Chicago',
        postal: '75201',
        ip: '1.2.3.4',
      };

      const result = geolocationService.getTimezone(location);

      expect(result).toBe('America/Chicago');
    });
  });
});
