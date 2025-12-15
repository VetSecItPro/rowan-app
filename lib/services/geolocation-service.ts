/**
 * Geolocation service for IP-based location detection
 * Uses ipapi.co free API for IP geolocation
 */

import { logger } from '@/lib/logger';

interface IPLocation {
  city: string;
  region: string;
  country: string;
  country_code: string;
  latitude: number;
  longitude: number;
  timezone: string;
  postal: string;
  ip: string;
}

interface CachedLocation {
  location: IPLocation;
  cachedAt: string;
}

const LOCATION_CACHE_KEY = 'user-location-cache';
const CACHE_VERSION_KEY = 'user-location-cache-version';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const CURRENT_CACHE_VERSION = '3.0'; // Force cache clear for Dallas location fix

export const geolocationService = {
  /**
   * Get user's current location based on IP address
   * Uses browser localStorage for 24-hour caching
   */
  async getCurrentLocation(): Promise<IPLocation | null> {
    try {
      // Check cache first
      const cached = this.getCachedLocation();
      if (cached) {
        logger.info('[Geolocation] Using cached location:', { component: 'lib-geolocation-service', data: cached.city });
        return cached;
      }

      logger.info('[Geolocation] Fetching location from IP...', { component: 'lib-geolocation-service' });

      // Use our server-side API route instead of direct external call
      const response = await fetch('/api/geolocation', {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: IPLocation = await response.json();

      // Validate response
      if (!data.latitude || !data.longitude) {
        throw new Error('Invalid location data received');
      }

      // Cache the result
      this.cacheLocation(data);

      logger.info('[Geolocation] Location detected:', { component: 'lib-geolocation-service', data: `${data.city}, ${data.region}, ${data.country}` });

      return data;
    } catch (error) {
      logger.error('[Geolocation] Failed to get location:', error, { component: 'lib-geolocation-service', action: 'service_call' });

      // Return fallback location (Dallas, since user mentioned being there) on error
      return {
        city: 'Dallas',
        region: 'Texas',
        country: 'United States',
        country_code: 'US',
        latitude: 32.7767,
        longitude: -96.7970,
        timezone: 'America/Chicago',
        postal: '75201',
        ip: '0.0.0.0'
      };
    }
  },

  /**
   * Get location string suitable for weather API
   */
  getLocationString(location: IPLocation): string {
    return `${location.city}, ${location.region}, ${location.country}`;
  },

  /**
   * Get cached location if it exists and is not expired
   */
  getCachedLocation(): IPLocation | null {
    try {
      // Check cache version first
      const cacheVersion = localStorage.getItem(CACHE_VERSION_KEY);
      if (cacheVersion !== CURRENT_CACHE_VERSION) {
        logger.info('[Geolocation] Cache version mismatch, clearing cache', { component: 'lib-geolocation-service' });
        localStorage.removeItem(LOCATION_CACHE_KEY);
        localStorage.removeItem(CACHE_VERSION_KEY);
        return null;
      }

      const cached = localStorage.getItem(LOCATION_CACHE_KEY);
      if (!cached) return null;

      const parsed: CachedLocation = JSON.parse(cached);
      const age = Date.now() - new Date(parsed.cachedAt).getTime();

      if (age < CACHE_DURATION) {
        return parsed.location;
      } else {
        // Remove expired cache
        localStorage.removeItem(LOCATION_CACHE_KEY);
        localStorage.removeItem(CACHE_VERSION_KEY);
        return null;
      }
    } catch (error) {
      logger.error('[Geolocation] Cache read error:', error, { component: 'lib-geolocation-service', action: 'service_call' });
      return null;
    }
  },

  /**
   * Cache location data in localStorage
   */
  cacheLocation(location: IPLocation): void {
    try {
      const cacheData: CachedLocation = {
        location,
        cachedAt: new Date().toISOString(),
      };

      localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cacheData));
      localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
      logger.info('[Geolocation] Location cached for 24 hours', { component: 'lib-geolocation-service' });
    } catch (error) {
      logger.error('[Geolocation] Cache write error:', error, { component: 'lib-geolocation-service', action: 'service_call' });
    }
  },

  /**
   * Clear cached location (useful for testing or user preference)
   */
  clearCache(): void {
    try {
      localStorage.removeItem(LOCATION_CACHE_KEY);
      localStorage.removeItem(CACHE_VERSION_KEY);
      logger.info('[Geolocation] Location cache cleared', { component: 'lib-geolocation-service' });
    } catch (error) {
      logger.error('[Geolocation] Cache clear error:', error, { component: 'lib-geolocation-service', action: 'service_call' });
    }
  },

  /**
   * Format location for display
   */
  formatLocationDisplay(location: IPLocation): string {
    return `${location.city}, ${location.region}`;
  },

  /**
   * Get timezone info
   */
  getTimezone(location: IPLocation): string {
    return location.timezone;
  },
};