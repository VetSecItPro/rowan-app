import { format, parseISO } from 'date-fns';

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
 * Uses OpenWeatherMap API for forecasts
 */
export const weatherService = {
  /**
   * Get weather forecast for a specific location and time
   */
  async getWeatherForEvent(
    location: string | undefined,
    eventTime: string
  ): Promise<WeatherForecast | null> {
    if (!location) return null;

    const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
    if (!apiKey) {
      console.warn('OpenWeatherMap API key not configured');
      return null;
    }

    try {
      // Get coordinates for location (geocoding)
      const geoResponse = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`
      );

      if (!geoResponse.ok) throw new Error('Geocoding failed');

      const geoData = await geoResponse.json();
      if (!geoData || geoData.length === 0) return null;

      const { lat, lon } = geoData[0];

      // Get 5-day forecast
      const forecastResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
      );

      if (!forecastResponse.ok) throw new Error('Forecast fetch failed');

      const forecastData = await forecastResponse.json();
      const eventDate = parseISO(eventTime);

      // Find forecast closest to event time
      const closestForecast = forecastData.list.reduce((closest: any, current: any) => {
        const currentTime = new Date(current.dt * 1000);
        const closestTime = new Date(closest.dt * 1000);

        return Math.abs(currentTime.getTime() - eventDate.getTime()) <
               Math.abs(closestTime.getTime() - eventDate.getTime())
          ? current
          : closest;
      });

      return this.mapWeatherData(closestForecast);
    } catch (error) {
      console.error('Failed to fetch weather:', error);
      return null;
    }
  },

  /**
   * Map OpenWeatherMap data to our format
   */
  mapWeatherData(data: any): WeatherForecast {
    const mainCondition = data.weather[0].main.toLowerCase();

    // Map OpenWeatherMap conditions to our simplified types
    let condition: WeatherForecast['condition'];
    switch (mainCondition) {
      case 'clear':
        condition = 'clear';
        break;
      case 'clouds':
        condition = 'clouds';
        break;
      case 'rain':
      case 'drizzle':
        condition = 'rain';
        break;
      case 'thunderstorm':
        condition = 'storm';
        break;
      case 'snow':
        condition = 'snow';
        break;
      case 'mist':
      case 'fog':
      case 'haze':
        condition = 'fog';
        break;
      default:
        condition = 'clouds';
    }

    return {
      condition,
      temp: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      icon: data.weather[0].icon,
      timestamp: new Date(data.dt * 1000).toISOString(),
    };
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
    const outdoorKeywords = ['park', 'outdoor', 'picnic', 'hike', 'beach', 'garden', 'field', 'trail', 'lake'];
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
   * Get human-readable weather description
   */
  getWeatherSummary(weather: WeatherForecast): string {
    const emoji = this.getWeatherEmoji(weather.condition);
    return `${emoji} ${weather.temp}°C, ${weather.description}`;
  },
};
