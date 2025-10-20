'use client';

import { useState, useEffect } from 'react';
import { Cloud, AlertTriangle, Info } from 'lucide-react';
import { weatherService, WeatherForecast, WeatherAlert } from '@/lib/services/weather-service';

interface WeatherBadgeProps {
  eventTime: string;
  location?: string;
  compact?: boolean;
}

export function WeatherBadge({ eventTime, location, compact = false }: WeatherBadgeProps) {
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [alert, setAlert] = useState<WeatherAlert | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWeather();
  }, [eventTime, location]);

  const loadWeather = async () => {
    if (!location) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const forecast = await weatherService.getWeatherForEvent(location, eventTime);
      setWeather(forecast);

      if (forecast) {
        const weatherAlert = weatherService.shouldWarnAboutWeather(forecast, location);
        setAlert(weatherAlert);
      }
    } catch (error) {
      console.error('Failed to load weather:', error);
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

  // Convert Celsius to Fahrenheit for US users
  const toFahrenheit = (celsius: number) => Math.round((celsius * 9/5) + 32);
  const tempF = toFahrenheit(weather.temp);
  const feelsLikeF = toFahrenheit(weather.feelsLike);

  if (compact) {
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
          <div>💨 {Math.round(weather.windSpeed)} km/h</div>
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
