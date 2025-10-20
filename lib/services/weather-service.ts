import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import { weatherCacheService } from './weather-cache-service';

export interface WeatherForecast {
  condition: 'clear' | 'clouds' | 'rain' | 'storm' | 'snow' | 'fog';
  temp: number; // Celsius
  feelsLike: number;
  description: string;
  humidity: number;
  windSpeed: number;
  icon: string;
  timestamp: string;
}

export interface WeatherAlert {
  severity: 'info' | 'warning' | 'severe';
  title: string;
  message: string;
  recommendation?: string;
}

/**
 * Weather service for event planning
 * Uses Open-Meteo API (FREE, no API key required)
 * Includes 3-hour caching and smart fetching
 */
export const weatherService = {
  /**
   * Check if we should fetch weather for this event
   * Smart fetching: Only fetch for events within 5 days
   */
  shouldFetchWeather(eventTime: string, location?: string): boolean {
    if (!location) return false;

    try {
      const eventDate = parseISO(eventTime);
      const now = new Date();
      const daysUntilEvent = differenceInDays(eventDate, now);

      // Only fetch for events that are:
      // 1. In the future (not past)
      // 2. Within 5 days (forecast limit)
      return daysUntilEvent >= 0 && daysUntilEvent <= 5;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get weather forecast for a specific location and time
   * Uses Open-Meteo API (FREE) with 3-hour caching
   */
  async getWeatherForEvent(
    location: string | undefined,
    eventTime: string
  ): Promise<WeatherForecast | null> {
    if (!location) return null;

    // Smart fetching: Only fetch for upcoming events within 5 days
    if (!this.shouldFetchWeather(eventTime, location)) {
      console.log(`[Weather] Skipping fetch for ${location} - event outside 5-day window`);
      return null;
    }

    // Use cache with 3-hour TTL
    return weatherCacheService.getOrFetchWeather(
      location,
      eventTime,
      () => this.fetchWeatherFromAPI(location, eventTime)
    );
  },

  /**
   * Fetch weather from our server-side API routes (internal method)
   */
  async fetchWeatherFromAPI(
    location: string,
    eventTime: string
  ): Promise<WeatherForecast | null> {
    try {
      // Step 1: Geocode location with caching (permanent cache)
      const coords = await weatherCacheService.getOrFetchGeocode(
        location,
        () => this.geocodeLocation(location)
      );

      if (!coords) return null;

      // Step 2: Get weather forecast from our server-side API
      const eventDate = parseISO(eventTime);
      const dateStr = format(eventDate, 'yyyy-MM-dd');

      // Determine if we need current weather or specific date forecast
      const today = format(new Date(), 'yyyy-MM-dd');
      const isToday = dateStr === today;

      let weatherUrl = `/api/weather/forecast?lat=${coords.lat}&lon=${coords.lon}`;
      if (!isToday) {
        weatherUrl += `&date=${dateStr}`;
      }

      const weatherResponse = await fetch(weatherUrl);

      if (!weatherResponse.ok) {
        throw new Error(`Weather fetch failed: ${weatherResponse.status}`);
      }

      const forecast = await weatherResponse.json();

      if (forecast.error) {
        throw new Error(forecast.error);
      }

      return {
        condition: forecast.condition,
        temp: forecast.temp,
        feelsLike: forecast.feelsLike,
        description: forecast.description,
        humidity: forecast.humidity,
        windSpeed: forecast.windSpeed,
        icon: forecast.icon,
        timestamp: eventTime,
      };
    } catch (error) {
      console.error('[Weather] Failed to fetch weather:', error);
      return null;
    }
  },

  /**
   * Geocode location using our server-side API route
   */
  async geocodeLocation(location: string): Promise<{ lat: number; lon: number } | null> {
    try {
      const geocodeUrl = `/api/weather/geocode?location=${encodeURIComponent(location)}`;

      const response = await fetch(geocodeUrl);

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        console.log(`[Weather] Location not found: ${location}`);
        return null;
      }

      return {
        lat: data.lat,
        lon: data.lon,
      };
    } catch (error) {
      console.error('[Weather] Geocoding error:', error);
      return null;
    }
  },

  /**
   * Map Open-Meteo weather codes to our simplified conditions
   * https://open-meteo.com/en/docs
   */
  mapWeatherCode(code: number): WeatherForecast['condition'] {
    if (code === 0 || code === 1) return 'clear'; // Clear sky, mainly clear
    if (code === 2 || code === 3) return 'clouds'; // Partly cloudy, overcast
    if (code >= 45 && code <= 48) return 'fog'; // Fog
    if (code >= 51 && code <= 67) return 'rain'; // Drizzle, rain
    if (code >= 71 && code <= 77) return 'snow'; // Snow
    if (code >= 80 && code <= 99) return 'storm'; // Rain showers, thunderstorms
    return 'clouds'; // Default
  },

  /**
   * Get human-readable description from weather code
   */
  getWeatherDescription(code: number): string {
    const descriptions: Record<number, string> = {
      0: 'clear sky',
      1: 'mainly clear',
      2: 'partly cloudy',
      3: 'overcast',
      45: 'foggy',
      48: 'depositing rime fog',
      51: 'light drizzle',
      53: 'moderate drizzle',
      55: 'dense drizzle',
      61: 'slight rain',
      63: 'moderate rain',
      65: 'heavy rain',
      71: 'slight snow',
      73: 'moderate snow',
      75: 'heavy snow',
      80: 'slight rain showers',
      81: 'moderate rain showers',
      82: 'violent rain showers',
      95: 'thunderstorm',
      96: 'thunderstorm with slight hail',
      99: 'thunderstorm with heavy hail',
    };

    return descriptions[code] || 'unknown';
  },

  /**
   * Get weather icon emoji
   */
  getWeatherEmoji(condition: WeatherForecast['condition']): string {
    const emojis = {
      clear: '☀️',
      clouds: '☁️',
      rain: '🌧️',
      storm: '⛈️',
      snow: '❄️',
      fog: '🌫️',
    };
    return emojis[condition] || '☁️';
  },

  /**
   * Check if event needs weather warning
   */
  shouldWarnAboutWeather(
    weather: WeatherForecast | null,
    eventLocation?: string
  ): WeatherAlert | null {
    if (!weather) return null;

    // Check if event is likely outdoor
    const outdoorKeywords = ['park', 'outdoor', 'picnic', 'hike', 'beach', 'garden', 'field', 'trail', 'lake', 'pool', 'playground', 'bbq', 'barbecue'];
    const isOutdoor = eventLocation
      ? outdoorKeywords.some(kw => eventLocation.toLowerCase().includes(kw))
      : false;

    if (!isOutdoor) return null;

    // Severe weather warnings
    if (weather.condition === 'storm') {
      return {
        severity: 'severe',
        title: 'Storm Warning',
        message: `Thunderstorms expected at ${weather.temp}°C`,
        recommendation: 'Consider rescheduling or moving indoors',
      };
    }

    if (weather.condition === 'rain') {
      return {
        severity: 'warning',
        title: 'Rain Expected',
        message: `Rain forecasted with ${weather.temp}°C`,
        recommendation: 'Bring umbrellas or consider indoor alternative',
      };
    }

    if (weather.condition === 'snow') {
      return {
        severity: 'warning',
        title: 'Snow Forecasted',
        message: `Snow expected at ${weather.temp}°C`,
        recommendation: 'Check road conditions and dress warmly',
      };
    }

    // Extreme temperatures
    if (weather.temp > 35) {
      return {
        severity: 'warning',
        title: 'High Temperature',
        message: `Very hot weather expected (${weather.temp}°C)`,
        recommendation: 'Stay hydrated and seek shade',
      };
    }

    if (weather.temp < 0) {
      return {
        severity: 'warning',
        title: 'Freezing Temperature',
        message: `Below freezing expected (${weather.temp}°C)`,
        recommendation: 'Dress warmly in layers',
      };
    }

    // High wind
    if (weather.windSpeed > 50) {
      return {
        severity: 'warning',
        title: 'High Winds',
        message: `Strong winds expected (${Math.round(weather.windSpeed)} km/h)`,
        recommendation: 'Secure loose items and consider indoor activities',
      };
    }

    return null;
  },

  /**
   * Get human-readable weather summary
   */
  getWeatherSummary(weather: WeatherForecast): string {
    const emoji = this.getWeatherEmoji(weather.condition);
    return `${emoji} ${weather.temp}°C, ${weather.description}`;
  },
};
