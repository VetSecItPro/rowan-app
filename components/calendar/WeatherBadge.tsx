'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { weatherService, WeatherForecast, WeatherAlert } from '@/lib/services/weather-service';
import { LRUCache } from 'lru-cache';

// FIX-312: Replace Map with LRUCache to prevent unbounded memory growth
const weatherCache = new LRUCache<string, {
  data: WeatherForecast;
  alert: WeatherAlert | null;
  timestamp: number;
}>({
  max: 50,
  ttl: 30 * 60 * 1000, // 30 minutes TTL
});

// In-flight request tracker to prevent duplicate concurrent fetches
const inFlightRequests = new Map<string, Promise<WeatherForecast | null>>();

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (LRU handles TTL, but keep for backwards compat)

interface WeatherBadgeProps {
  eventTime: string;
  location?: string;
  display?: 'compact' | 'medium' | 'full' | 'header';
}

/** Displays weather forecast information for a calendar event location and time. */
export function WeatherBadge({ eventTime, location, display = 'full' }: WeatherBadgeProps) {
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [alert, setAlert] = useState<WeatherAlert | null>(null);
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadWeather = useCallback(async () => {
    // Create cache key - handle undefined location for user location detection
    const effectiveLocation = location || 'user-location';
    const cacheKey = `${effectiveLocation}-${eventTime.split('T')[0]}`;
    const now = Date.now();
    const cached = weatherCache.get(cacheKey);

    // Check if we have valid cached data (LRU handles expiry, but we double-check)
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

      // Check if there's already an in-flight request for this cache key
      let forecast: WeatherForecast | null;
      const existingRequest = inFlightRequests.get(cacheKey);

      if (existingRequest) {
        // Wait for the existing request instead of making a duplicate
        forecast = await existingRequest;
      } else {
        // Create the request and track it
        const requestPromise = weatherService.getWeatherForEvent(location, eventTime);
        inFlightRequests.set(cacheKey, requestPromise);

        try {
          forecast = await requestPromise;
        } finally {
          // Clean up the in-flight tracker
          inFlightRequests.delete(cacheKey);
        }
      }

      if (forecast) {
        const weatherAlert = weatherService.shouldWarnAboutWeather(forecast, location);

        // Update cache (LRU automatically handles eviction and TTL)
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

      // If we had no cached data and fetch failed, gracefully degrade
      if (!cached) {
        setWeather(null);
        setAlert(null);
      }
    } finally {
      setLoading(false);
    }
  }, [eventTime, location]);

  useEffect(() => {
    // Stagger requests with random delay (0-2 seconds) to avoid rate limit bursts
    const delay = Math.random() * 2000;
    const timeoutId = setTimeout(() => {
      loadWeather();
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      // Cleanup on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadWeather]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
        <div className="animate-spin rounded-full h-3 w-3 border-2 border-purple-500 border-t-transparent"></div>
        Loading weather...
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="text-xs text-gray-400 py-2">
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

  // Header mode: horizontal flat layout for TodayAtAGlance header
  if (display === 'header') {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="text-base">{emoji}</span>
        <span className="font-semibold text-white">{tempF}°F</span>
        <span className="text-gray-400 text-xs">feels {feelsLikeF}°</span>
        <span className="text-gray-400 text-xs capitalize">{weather.description}</span>
        <span className="text-gray-400 text-xs">💧{weather.humidity}%</span>
        <span className="text-gray-400 text-xs">💨{windMph}mph</span>
        {alert && (
          <span title={alert.title}>
            <AlertTriangle
              className={`w-3 h-3 ${
                alert.severity === 'severe'
                  ? 'text-red-500'
                  : alert.severity === 'warning'
                  ? 'text-orange-500'
                  : 'text-blue-500'
              }`}
            />
          </span>
        )}
      </div>
    );
  }

  if (display === 'compact') {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-400">
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
              <span className="text-lg font-semibold text-white">
                {tempF}°F
              </span>
              <span className="text-xs text-gray-400">
                feels {feelsLikeF}°F
              </span>
            </div>
            <div className="text-xs text-gray-400 capitalize">
              {weather.description}
            </div>
          </div>
        </div>

        {/* Additional details */}
        <div className="flex justify-between text-xs text-gray-400">
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
            <span className="text-gray-400">{alert.title}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Weather Summary */}
      <div className="flex items-center gap-2 p-2 bg-blue-900/20 border border-blue-800 rounded-lg">
        <span className="text-2xl">{emoji}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">
              {tempF}°F
            </span>
            <span className="text-xs text-gray-400">
              Feels like {feelsLikeF}°F
            </span>
          </div>
          <p className="text-xs text-gray-400 capitalize">
            {weather.description}
          </p>
        </div>
        <div className="text-xs text-gray-400 text-right">
          <div>💧 {weather.humidity}%</div>
          <div>💨 {windMph} mph</div>
        </div>
      </div>

      {/* Weather Alert */}
      {alert && (
        <div
          className={`p-3 rounded-lg border ${
            alert.severity === 'severe'
              ? 'bg-red-900/20 border-red-800'
              : alert.severity === 'warning'
              ? 'bg-orange-900/20 border-orange-800'
              : 'bg-blue-900/20 border-blue-800'
          }`}
        >
          <div className="flex items-start gap-2">
            {alert.severity === 'severe' || alert.severity === 'warning' ? (
              <AlertTriangle
                className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  alert.severity === 'severe'
                    ? 'text-red-400'
                    : 'text-orange-400'
                }`}
              />
            ) : (
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" />
            )}
            <div className="flex-1 min-w-0">
              <h4
                className={`text-sm font-semibold ${
                  alert.severity === 'severe'
                    ? 'text-red-200'
                    : alert.severity === 'warning'
                    ? 'text-orange-200'
                    : 'text-blue-200'
                }`}
              >
                {alert.title}
              </h4>
              <p
                className={`text-xs mt-1 ${
                  alert.severity === 'severe'
                    ? 'text-red-300'
                    : alert.severity === 'warning'
                    ? 'text-orange-300'
                    : 'text-blue-300'
                }`}
              >
                {alert.message}
              </p>
              {alert.recommendation && (
                <p
                  className={`text-xs mt-2 font-medium ${
                    alert.severity === 'severe'
                      ? 'text-red-200'
                      : alert.severity === 'warning'
                      ? 'text-orange-200'
                      : 'text-blue-200'
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
