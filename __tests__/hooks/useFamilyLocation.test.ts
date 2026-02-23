/**
 * Unit tests for hooks/useFamilyLocation.ts
 *
 * Tests initial state, geolocation availability, and action functions.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFamilyLocation } from '@/hooks/useFamilyLocation';

const mockIsGeolocationAvailable = vi.fn();
const mockGetCurrentPosition = vi.fn();
const mockWatchPosition = vi.fn();
const mockGetRecommendedUpdateInterval = vi.fn();
const mockSupabaseFrom = vi.fn();
const mockSupabaseChannel = vi.fn();
const mockSupabaseRemoveChannel = vi.fn();

vi.mock('@/lib/native', () => ({
  isGeolocationAvailable: () => mockIsGeolocationAvailable(),
  getCurrentPosition: () => mockGetCurrentPosition(),
  watchPosition: (...args: unknown[]) => mockWatchPosition(...args),
  getRecommendedUpdateInterval: () => mockGetRecommendedUpdateInterval(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    channel: (...args: unknown[]) => mockSupabaseChannel(...args),
    removeChannel: (...args: unknown[]) => mockSupabaseRemoveChannel(...args),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe('useFamilyLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsGeolocationAvailable.mockReturnValue(false);
    mockGetRecommendedUpdateInterval.mockReturnValue(30000);

    const channelMock = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    };
    mockSupabaseChannel.mockReturnValue(channelMock);

    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      data: [],
      error: null,
    };
    query.order = vi.fn().mockResolvedValue({ data: [], error: null });
    mockSupabaseFrom.mockReturnValue(query);
  });

  it('should return initial state with empty data', () => {
    const { result } = renderHook(() => useFamilyLocation('space-1'));

    expect(result.current.familyLocations).toEqual([]);
    expect(result.current.places).toEqual([]);
    expect(result.current.settings).toBeNull();
    expect(result.current.currentLocation).toBeNull();
    expect(result.current.isTracking).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should return permissionStatus unavailable when geolocation not available', () => {
    mockIsGeolocationAvailable.mockReturnValue(false);

    const { result } = renderHook(() => useFamilyLocation('space-1'));

    expect(result.current.permissionStatus).toBe('unavailable');
  });

  it('should expose all action functions', () => {
    const { result } = renderHook(() => useFamilyLocation('space-1'));

    expect(typeof result.current.startTracking).toBe('function');
    expect(typeof result.current.stopTracking).toBe('function');
    expect(typeof result.current.refreshFamilyLocations).toBe('function');
    expect(typeof result.current.updateSettings).toBe('function');
    expect(typeof result.current.createPlace).toBe('function');
    expect(typeof result.current.deletePlace).toBe('function');
  });

  it('should not crash when spaceId is null', () => {
    expect(() => {
      renderHook(() => useFamilyLocation(null));
    }).not.toThrow();
  });

  it('isLoading should be true initially when spaceId provided', () => {
    const { result } = renderHook(() => useFamilyLocation('space-1'));

    expect(result.current.isLoading).toBe(true);
  });
});
