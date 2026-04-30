import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./weather-cache-service', () => ({
  weatherCacheService: {
    getOrFetchGeocode: vi.fn(),
    getOrFetchWeather: vi.fn(),
  },
}));
vi.mock('@/lib/services/weather-cache-service', () => ({
  weatherCacheService: {
    getOrFetchGeocode: vi.fn(),
    getOrFetchWeather: vi.fn(),
  },
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { weatherService, type WeatherForecast } from '@/lib/services/weather-service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('weatherService.shouldFetchWeather', () => {
  it('returns true for events 1 day in future', () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    expect(weatherService.shouldFetchWeather(tomorrow)).toBe(true);
  });

  it('returns false for events more than 5 days out', () => {
    const tenDays = new Date(Date.now() + 10 * 86400000).toISOString();
    expect(weatherService.shouldFetchWeather(tenDays)).toBe(false);
  });

  it('returns false for past events', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    expect(weatherService.shouldFetchWeather(yesterday)).toBe(false);
  });

  it('returns false for invalid date strings', () => {
    expect(weatherService.shouldFetchWeather('not-a-date')).toBe(false);
  });
});

describe('weatherService.mapWeatherCode', () => {
  it.each([
    [0, 'clear'],
    [1, 'clear'],
    [2, 'clouds'],
    [3, 'clouds'],
    [45, 'fog'],
    [48, 'fog'],
    [51, 'rain'],
    [65, 'rain'],
    [71, 'snow'],
    [77, 'snow'],
    [80, 'storm'],
    [99, 'storm'],
    [200, 'clouds'], // default
  ])('maps code %i to %s', (code, expected) => {
    expect(weatherService.mapWeatherCode(code)).toBe(expected);
  });
});

describe('weatherService.getWeatherDescription', () => {
  it('returns mapped description for known code', () => {
    expect(weatherService.getWeatherDescription(0)).toBe('clear sky');
    expect(weatherService.getWeatherDescription(95)).toBe('thunderstorm');
  });

  it('returns "unknown" for unmapped codes', () => {
    expect(weatherService.getWeatherDescription(99999)).toBe('unknown');
  });
});

describe('weatherService.getWeatherEmoji', () => {
  it('returns emoji for each known condition', () => {
    expect(weatherService.getWeatherEmoji('clear')).toBeTruthy();
    expect(weatherService.getWeatherEmoji('rain')).toBeTruthy();
    expect(weatherService.getWeatherEmoji('storm')).toBeTruthy();
    expect(weatherService.getWeatherEmoji('snow')).toBeTruthy();
    expect(weatherService.getWeatherEmoji('fog')).toBeTruthy();
    expect(weatherService.getWeatherEmoji('clouds')).toBeTruthy();
  });

  it('falls back to clouds emoji for unknown', () => {
    expect(weatherService.getWeatherEmoji('alien' as never)).toBe(weatherService.getWeatherEmoji('clouds'));
  });
});

describe('weatherService.shouldWarnAboutWeather', () => {
  const baseWeather: WeatherForecast = {
    condition: 'clear',
    temp: 20,
    feelsLike: 20,
    description: 'clear',
    humidity: 50,
    windSpeed: 10,
    icon: '',
    timestamp: '',
  };

  it('returns null when no weather provided', () => {
    expect(weatherService.shouldWarnAboutWeather(null)).toBeNull();
  });

  it('returns null for indoor location', () => {
    expect(weatherService.shouldWarnAboutWeather(baseWeather, 'office')).toBeNull();
  });

  it('returns severe alert for storm at outdoor event', () => {
    const alert = weatherService.shouldWarnAboutWeather(
      { ...baseWeather, condition: 'storm' },
      'park'
    );
    expect(alert?.severity).toBe('severe');
  });

  it('returns warning for rain at outdoor event', () => {
    const alert = weatherService.shouldWarnAboutWeather(
      { ...baseWeather, condition: 'rain' },
      'beach picnic'
    );
    expect(alert?.severity).toBe('warning');
    expect(alert?.title).toMatch(/Rain/);
  });

  it('returns warning for snow at outdoor event', () => {
    const alert = weatherService.shouldWarnAboutWeather(
      { ...baseWeather, condition: 'snow' },
      'hike'
    );
    expect(alert?.title).toMatch(/Snow/);
  });

  it('returns warning for high temp at outdoor event', () => {
    const alert = weatherService.shouldWarnAboutWeather(
      { ...baseWeather, temp: 40 },
      'outdoor bbq'
    );
    expect(alert?.title).toMatch(/High Temperature/);
  });

  it('returns warning for freezing temp at outdoor event', () => {
    const alert = weatherService.shouldWarnAboutWeather(
      { ...baseWeather, temp: -5 },
      'trail'
    );
    expect(alert?.title).toMatch(/Freezing/);
  });

  it('returns warning for high winds at outdoor event', () => {
    const alert = weatherService.shouldWarnAboutWeather(
      { ...baseWeather, windSpeed: 70 },
      'park'
    );
    expect(alert?.title).toMatch(/Wind/);
  });

  it('returns null for nice weather at outdoor event', () => {
    expect(weatherService.shouldWarnAboutWeather(baseWeather, 'park')).toBeNull();
  });
});

describe('weatherService.getWeatherSummary', () => {
  it('formats summary with emoji + temp + description', () => {
    const summary = weatherService.getWeatherSummary({
      condition: 'clear',
      temp: 22,
      feelsLike: 22,
      description: 'clear sky',
      humidity: 40,
      windSpeed: 5,
      icon: '',
      timestamp: '',
    });
    expect(summary).toContain('22');
    expect(summary).toContain('clear sky');
  });
});

describe('weatherService.getWeatherForEvent', () => {
  it('returns null when no location and detection fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as never;
    const result = await weatherService.getWeatherForEvent(undefined, new Date().toISOString());
    expect(result).toBeNull();
  });

  it('returns null for past events', async () => {
    const pastTime = new Date(Date.now() - 10 * 86400000).toISOString();
    const result = await weatherService.getWeatherForEvent('NYC', pastTime);
    expect(result).toBeNull();
  });
});
