import { NextRequest, NextResponse } from 'next/server';
import { weatherCacheService } from '@/lib/services/weather-cache-service';

// Force dynamic rendering for this route since it uses request.url
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const date = searchParams.get('date');

    if (!lat || !lon || lat === 'undefined' || lon === 'undefined' || lat === 'null' || lon === 'null') {
      return NextResponse.json(
        { error: 'Latitude and longitude parameters are required' },
        { status: 400 }
      );
    }

    // Validate that coordinates are valid numbers
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (isNaN(latNum) || isNaN(lonNum)) {
      return NextResponse.json(
        { error: 'Latitude and longitude must be valid numbers' },
        { status: 400 }
      );
    }

    console.log('[Weather Forecast API] Fetching weather for:', { lat: latNum, lon: lonNum, date });

    // Create location string and event time for cache key
    const location = `${latNum},${lonNum}`;
    const eventTime = date ? `${date}T12:00:00.000Z` : new Date().toISOString();

    // Use cache service with 3-hour TTL
    const forecast = await weatherCacheService.getOrFetchWeather(
      location,
      eventTime,
      async () => {
        // Call Open-Meteo Weather API server-side
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latNum}&longitude=${lonNum}&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,windspeed_10m_max&current=temperature_2m,relative_humidity_2m,apparent_temperature,weathercode,windspeed_10m&timezone=auto`;

        const response = await fetch(weatherUrl, {
          headers: {
            'User-Agent': 'Rowan-App/1.0',
          },
        });

        if (!response.ok) {
          throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Process the data and return the formatted forecast
        return processWeatherData(data, date);
      }
    );

    if (!forecast) {
      return NextResponse.json(
        { error: 'Failed to fetch weather forecast' },
        { status: 500 }
      );
    }

    console.log('[Weather Forecast API] Returning weather:', forecast);
    return NextResponse.json(forecast);
  } catch (error) {
    console.error('[Weather Forecast API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather forecast' },
      { status: 500 }
    );
  }
}

/**
 * Process weather data and return formatted forecast
 */
function processWeatherData(data: any, date?: string | null) {
  // If a specific date is requested, find it in daily forecast
  if (date) {
    const dateIndex = data.daily.time.indexOf(date);

    if (dateIndex === -1) {
      throw new Error('No forecast available for the requested date');
    }

    // Return daily forecast for specific date
    const weatherCode = data.daily.weathercode[dateIndex];
    const tempMax = data.daily.temperature_2m_max[dateIndex];
    const tempMin = data.daily.temperature_2m_min[dateIndex];
    const temp = Math.round((tempMax + tempMin) / 2);

    const feelsLikeMax = data.daily.apparent_temperature_max[dateIndex];
    const feelsLikeMin = data.daily.apparent_temperature_min[dateIndex];
    const feelsLike = Math.round((feelsLikeMax + feelsLikeMin) / 2);

    return {
      condition: mapWeatherCode(weatherCode),
      temp,
      feelsLike,
      description: getWeatherDescription(weatherCode),
      humidity: 0, // Not available in daily API
      windSpeed: Math.round(data.daily.windspeed_10m_max[dateIndex]),
      icon: weatherCode.toString(),
      timestamp: new Date().toISOString(),
    };
  }

  // Return current weather
  const current = data.current;
  return {
    condition: mapWeatherCode(current.weathercode),
    temp: Math.round(current.temperature_2m),
    feelsLike: Math.round(current.apparent_temperature),
    description: getWeatherDescription(current.weathercode),
    humidity: Math.round(current.relative_humidity_2m),
    windSpeed: Math.round(current.windspeed_10m),
    icon: current.weathercode.toString(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Map Open-Meteo weather codes to our simplified conditions
 */
function mapWeatherCode(code: number): 'clear' | 'clouds' | 'rain' | 'storm' | 'snow' | 'fog' {
  if (code === 0 || code === 1) return 'clear'; // Clear sky, mainly clear
  if (code === 2 || code === 3) return 'clouds'; // Partly cloudy, overcast
  if (code >= 45 && code <= 48) return 'fog'; // Fog
  if (code >= 51 && code <= 67) return 'rain'; // Drizzle, rain
  if (code >= 71 && code <= 77) return 'snow'; // Snow
  if (code >= 80 && code <= 99) return 'storm'; // Rain showers, thunderstorms
  return 'clouds'; // Default
}

/**
 * Get human-readable description from weather code
 */
function getWeatherDescription(code: number): string {
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
}