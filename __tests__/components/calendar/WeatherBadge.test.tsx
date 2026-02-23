// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('@/lib/services/weather-service', () => ({
  weatherService: {
    getWeatherForEvent: vi.fn().mockResolvedValue(null),
    shouldWarnAboutWeather: vi.fn().mockReturnValue(null),
    getWeatherEmoji: vi.fn().mockReturnValue('☀️'),
  },
}));
// Mock LRUCache as a proper constructor-compatible function
vi.mock('lru-cache', () => {
  function MockLRUCache(this: { _store: Map<unknown, unknown> }) {
    this._store = new Map();
  }
  MockLRUCache.prototype.get = vi.fn().mockReturnValue(null);
  MockLRUCache.prototype.set = vi.fn();
  return { LRUCache: MockLRUCache };
});

import { WeatherBadge } from '@/components/calendar/WeatherBadge';
import { weatherService } from '@/lib/services/weather-service';

describe('WeatherBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <WeatherBadge eventTime="2024-01-15T10:00:00Z" location="New York" />
    );
    expect(container).toBeTruthy();
  });

  it('shows "Weather unavailable" initially since no weather is loaded yet', () => {
    // Component starts with loading=false, weather=null → shows "Weather unavailable"
    render(<WeatherBadge eventTime="2024-01-15T10:00:00Z" location="NYC" />);
    expect(screen.getByText('Weather unavailable')).toBeTruthy();
  });

  it('renders compact display mode', () => {
    render(<WeatherBadge eventTime="2024-01-15T10:00:00Z" display="compact" />);
    expect(document.body).toBeTruthy();
  });

  it('calls getWeatherForEvent when location is provided after delay', async () => {
    render(<WeatherBadge eventTime="2024-01-15T10:00:00Z" location="NYC" />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(weatherService.getWeatherForEvent).toHaveBeenCalledWith('NYC', '2024-01-15T10:00:00Z');
  });
});
