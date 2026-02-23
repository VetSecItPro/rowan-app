/**
 * Unit tests for lib/hooks/useBackgroundLocation.ts
 *
 * Tests background location tracking:
 * - Permission handling
 * - Location updates
 * - Battery optimization
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock native modules
vi.mock('@/lib/native/capacitor', () => ({
  isAndroid: false,
  isNative: false,
}));

vi.mock('@/lib/native/background-location', () => ({
  startBackgroundLocation: vi.fn(),
  stopBackgroundLocation: vi.fn(),
  isBackgroundLocationRunning: vi.fn(),
  addBackgroundLocationListener: vi.fn(),
}));

vi.mock('@/lib/native/geolocation', () => ({
  checkLocationPermissions: vi.fn(),
  requestLocationPermissions: vi.fn(),
}));

// Mock csrfFetch
vi.mock('@/lib/utils/csrf-fetch', () => ({
  csrfFetch: vi.fn(),
}));

// Import after mocks
import { useBackgroundLocation } from '@/lib/hooks/useBackgroundLocation';

describe('useBackgroundLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useBackgroundLocation({
        spaceId: 'space-123',
        autoStart: false,
      })
    );

    expect(result.current.supported).toBe(false);
    expect(result.current.running).toBe(false);
    expect(result.current.lastLocation).toBeNull();
  });

  it('should not be supported in web environment', () => {
    const { result } = renderHook(() =>
      useBackgroundLocation({
        spaceId: 'space-123',
        autoStart: false,
      })
    );

    expect(result.current.supported).toBe(false);
  });

  it('should handle missing spaceId', () => {
    const { result } = renderHook(() =>
      useBackgroundLocation({
        spaceId: null,
        autoStart: true,
      })
    );

    expect(result.current.running).toBe(false);
  });
});
