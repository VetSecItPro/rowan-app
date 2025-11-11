'use client';

import { useState, useEffect, useRef, memo } from 'react';
import { Cloud, AlertTriangle, Info } from 'lucide-react';
import { weatherService, WeatherForecast, WeatherAlert } from '@/lib/services/weather-service';

// Global cache to persist across component re-mounts
const weatherCache = new Map<string, {
  data: WeatherForecast;
  alert: WeatherAlert | null;
  timestamp: number;
}>();

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

interface WeatherBadgeProps {
  eventTime: string;
  location?: string;
  display?: 'compact' | 'medium' | 'full';
}

export function WeatherBadge({ eventTime, location, display = 'full' }: WeatherBadgeProps) {
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [alert, setAlert] = useState<WeatherAlert | null>(null);
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadWeather();
    return () => {
      // Cleanup on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [eventTime, location]);

  const loadWeather = async () => {
    console.log('[WeatherBadge] loadWeather called with:', { location, eventTime });
    // Note: No early return - let weather service handle user location detection when location is undefined

    // Create cache key - handle undefined location for user location detection
    const effectiveLocation = location || 'user-location';
    const cacheKey = `${effectiveLocation}-${eventTime.split('T')[0]}`;
    const now = Date.now();
    const cached = weatherCache.get(cacheKey);

    // Check if we have valid cached data
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      setWeather(cached.data);
      setAlert(cached.alert);
      return;
    }

    // If we have stale cache data, show it immediately (optimistic UI)
    if (cached) {
      setWeather(cached.data);
      setAlert(cached.alert);
    } else {
      // Only show loading if we have no cached data at all
      setLoading(true);
    }

    try {
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      console.log('[WeatherBadge] About to call weatherService.getWeatherForEvent with:', { location, eventTime });
      const forecast = await weatherService.getWeatherForEvent(location, eventTime);
      console.log('[WeatherBadge] weatherService.getWeatherForEvent returned:', forecast);

      if (forecast) {
        const weatherAlert = weatherService.shouldWarnAboutWeather(forecast, location);

        // Update cache
        weatherCache.set(cacheKey, {
          data: forecast,
          alert: weatherAlert,
          timestamp: now
        });

        // Update state
        setWeather(forecast);
        setAlert(weatherAlert);
      } else {
        // No forecast available - this is normal for many locations
        // Don't show any error state, just hide the component
        if (!cached) {
          setWeather(null);
          setAlert(null);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled - this is normal
        return;
      }

      // Only log weather errors in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('[WeatherBadge] Weather unavailable for', location, ':', error instanceof Error ? error.message : 'Unknown error');
      }

      // If we had no cached data and fetch failed, gracefully degrade
      if (!cached) {
        setWeather(null);
        setAlert(null);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 py-2">
        <div className="animate-spin rounded-full h-3 w-3 border-2 border-purple-500 border-t-transparent"></div>
        Loading weather...
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400 py-2">
        Weather unavailable
      </div>
    );
  }

  const emoji = weatherService.getWeatherEmoji(weather.condition);

  // Convert Celsius to Fahrenheit and km/h to mph for US users
  const toFahrenheit = (celsius: number) => Math.round((celsius * 9/5) + 32);
  const toMph = (kmh: number) => Math.round(kmh * 0.621371);
  const tempF = toFahrenheit(weather.temp);
  const feelsLikeF = toFahrenheit(weather.feelsLike);
  const windMph = toMph(weather.windSpeed);

  if (display === 'compact') {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
        <span className="text-sm">{emoji}</span>
        <span>{tempF}°F</span>
        {alert && (
          <AlertTriangle
            className={`w-3 h-3 ${
              alert.severity === 'severe'
                ? 'text-red-500'
                : alert.severity === 'warning'
                ? 'text-orange-500'
                : 'text-blue-500'
            }`}
          />
        )}
      </div>
    );
  }

  if (display === 'medium') {
    return (
      <div className="space-y-2">
        {/* Main weather info */}
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <div className="flex-1">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {tempF}°F
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                feels {feelsLikeF}°F
              </span>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">
              {weather.description}
            </div>
          </div>
        </div>

        {/* Additional details */}
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <span>💧</span>
            <span>{weather.humidity}%</span>
          </div>
          <div className="flex items-center gap-1">
            <span>💨</span>
            <span>{windMph} mph</span>
          </div>
        </div>

        {/* Compact alert */}
        {alert && (
          <div className="flex items-center gap-1 text-xs">
            <AlertTriangle
              className={`w-3 h-3 ${
                alert.severity === 'severe'
                  ? 'text-red-500'
                  : alert.severity === 'warning'
                  ? 'text-orange-500'
                  : 'text-blue-500'
              }`}
            />
            <span className="text-gray-600 dark:text-gray-400">{alert.title}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Weather Summary */}
      <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <span className="text-2xl">{emoji}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 dark:text-white">
              {tempF}°F
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Feels like {feelsLikeF}°F
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
            {weather.description}
          </p>
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 text-right">
          <div>💧 {weather.humidity}%</div>
          <div>💨 {windMph} mph</div>
        </div>
      </div>

      {/* Weather Alert */}
      {alert && (
        <div
          className={`p-3 rounded-lg border ${
            alert.severity === 'severe'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : alert.severity === 'warning'
              ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
          }`}
        >
          <div className="flex items-start gap-2">
            {alert.severity === 'severe' || alert.severity === 'warning' ? (
              <AlertTriangle
                className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  alert.severity === 'severe'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-orange-600 dark:text-orange-400'
                }`}
              />
            ) : (
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            )}
            <div className="flex-1 min-w-0">
              <h4
                className={`text-sm font-semibold ${
                  alert.severity === 'severe'
                    ? 'text-red-900 dark:text-red-200'
                    : alert.severity === 'warning'
                    ? 'text-orange-900 dark:text-orange-200'
                    : 'text-blue-900 dark:text-blue-200'
                }`}
              >
                {alert.title}
              </h4>
              <p
                className={`text-xs mt-1 ${
                  alert.severity === 'severe'
                    ? 'text-red-800 dark:text-red-300'
                    : alert.severity === 'warning'
                    ? 'text-orange-800 dark:text-orange-300'
                    : 'text-blue-800 dark:text-blue-300'
                }`}
              >
                {alert.message}
              </p>
              {alert.recommendation && (
                <p
                  className={`text-xs mt-2 font-medium ${
                    alert.severity === 'severe'
                      ? 'text-red-900 dark:text-red-200'
                      : alert.severity === 'warning'
                      ? 'text-orange-900 dark:text-orange-200'
                      : 'text-blue-900 dark:text-blue-200'
                  }`}
                >
                  💡 {alert.recommendation}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Force recompilation to clear cache
