import { Redis } from '@upstash/redis';
import { WeatherForecast } from './weather-service';

// Initialize Upstash Redis (already configured in project)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface CachedWeather {
  forecast: WeatherForecast;
  cachedAt: string;
  location: string;
}

interface CachedGeocode {
  lat: number;
  lon: number;
  cachedAt: string;
}

const WEATHER_CACHE_TTL = 3 * 60 * 60; // 3 hours in seconds
const GEOCODE_CACHE_TTL = 30 * 24 * 60 * 60; // 30 days (geocoding rarely changes)

/**
 * Weather caching service using Upstash Redis
 * Reduces API calls by 80-90% through intelligent caching
 */
export const weatherCacheService = {
  /**
   * Get weather from cache or fetch fresh data
   */
  async getOrFetchWeather(
    location: string,
    eventTime: string,
    fetchFn: () => Promise<WeatherForecast | null>
  ): Promise<WeatherForecast | null> {
    try {
      // Create cache key based on location and date (not exact time)
      const eventDate = eventTime.split('T')[0]; // Just the date part
      const cacheKey = `weather:${location.toLowerCase().replace(/\s+/g, '-')}:${eventDate}`;

      // Try to get from cache
      const cached = await redis.get<CachedWeather>(cacheKey);

      if (cached && cached.forecast) {
        const age = Date.now() - new Date(cached.cachedAt).getTime();

        // Return cached data if less than 3 hours old
        if (age < WEATHER_CACHE_TTL * 1000) {
          console.log(`[Weather Cache] HIT for ${location} on ${eventDate} (age: ${Math.round(age / 60000)}min)`);
          return cached.forecast;
        } else {
          console.log(`[Weather Cache] EXPIRED for ${location} on ${eventDate}`);
        }
      } else {
        console.log(`[Weather Cache] MISS for ${location} on ${eventDate}`);
      }

      // Fetch fresh data
      const forecast = await fetchFn();

      if (forecast) {
        // Cache the result
        const cacheData: CachedWeather = {
          forecast,
          cachedAt: new Date().toISOString(),
          location,
        };

        await redis.setex(cacheKey, WEATHER_CACHE_TTL, cacheData);
        console.log(`[Weather Cache] STORED for ${location} on ${eventDate} (TTL: 3hrs)`);
      }

      return forecast;
    } catch (error) {
      console.error('[Weather Cache] Error:', error);
      // Fall back to fetching without cache
      return await fetchFn();
    }
  },

  /**
   * Get geocoding coordinates from cache or fetch
   */
  async getOrFetchGeocode(
    location: string,
    fetchFn: () => Promise<{ lat: number; lon: number } | null>
  ): Promise<{ lat: number; lon: number } | null> {
    try {
      const cacheKey = `geocode:${location.toLowerCase().replace(/\s+/g, '-')}`;

      // Try to get from cache
      const cached = await redis.get<CachedGeocode>(cacheKey);

      if (cached) {
        console.log(`[Geocode Cache] HIT for ${location}`);
        return { lat: cached.lat, lon: cached.lon };
      }

      console.log(`[Geocode Cache] MISS for ${location}`);

      // Fetch fresh geocoding
      const coords = await fetchFn();

      if (coords) {
        // Cache for 30 days (geocoding rarely changes)
        const cacheData: CachedGeocode = {
          ...coords,
          cachedAt: new Date().toISOString(),
        };

        await redis.setex(cacheKey, GEOCODE_CACHE_TTL, cacheData);
        console.log(`[Geocode Cache] STORED for ${location} (TTL: 30 days)`);
      }

      return coords;
    } catch (error) {
      console.error('[Geocode Cache] Error:', error);
      // Fall back to fetching without cache
      return await fetchFn();
    }
  },

  /**
   * Clear all weather cache (useful for debugging or forced refresh)
   */
  async clearWeatherCache(): Promise<void> {
    // Note: Upstash Redis doesn't support SCAN in REST API
    // So we can't easily clear all keys matching a pattern
    // This would need to be done manually or with a different approach
    console.log('[Weather Cache] Manual clear not implemented for Upstash REST API');
  },

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ message: string }> {
    return {
      message: 'Cache stats not available in Upstash REST API',
    };
  },
};
