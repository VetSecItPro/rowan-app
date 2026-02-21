/**
 * useBackgroundLocation — React hook for Android background location service
 *
 * Manages the lifecycle of the native foreground service:
 * - Starts/stops the service
 * - Listens for location updates from the native layer
 * - Submits updates to the Rowan API (/api/location/update)
 * - Handles permissions and error states
 *
 * On iOS, background location is handled natively via Capacitor Geolocation
 * with background modes (configured in Info.plist). This hook is Android-specific.
 *
 * On web, this hook is a no-op that returns { supported: false }.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { isAndroid, isNative } from '@/lib/native/capacitor';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
import {
  startBackgroundLocation,
  stopBackgroundLocation,
  isBackgroundLocationRunning,
  addBackgroundLocationListener,
  type BackgroundLocationEvent,
} from '@/lib/native/background-location';
import {
  checkLocationPermissions,
  requestLocationPermissions,
} from '@/lib/native/geolocation';

interface UseBackgroundLocationOptions {
  /** The space ID to associate location updates with */
  spaceId: string | null;
  /** Whether to auto-start on mount (default: false) */
  autoStart?: boolean;
}

interface UseBackgroundLocationReturn {
  /** Whether background location is supported on this platform */
  supported: boolean;
  /** Whether the service is currently running */
  running: boolean;
  /** Whether permissions are granted */
  permissionGranted: boolean;
  /** Last received location from the native service */
  lastLocation: BackgroundLocationEvent | null;
  /** Error message if something went wrong */
  error: string | null;
  /** Start the background location service */
  start: () => Promise<boolean>;
  /** Stop the background location service */
  stop: () => Promise<boolean>;
}

/** Manages background geolocation tracking via Capacitor for native mobile devices */
export function useBackgroundLocation({
  spaceId,
  autoStart = false,
}: UseBackgroundLocationOptions): UseBackgroundLocationReturn {
  const supported = isNative && isAndroid;

  const [running, setRunning] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [lastLocation, setLastLocation] = useState<BackgroundLocationEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Ref to keep spaceId current inside the listener callback
  const spaceIdRef = useRef(spaceId);
  // Sync ref in effect to avoid writing refs during render
  useEffect(() => { spaceIdRef.current = spaceId; }, [spaceId]);

  // Track if we've already initialized to avoid double-start
  const initializedRef = useRef(false);

  // Submit a location update to the API
  const submitLocation = useCallback(async (event: BackgroundLocationEvent) => {
    const currentSpaceId = spaceIdRef.current;
    if (!currentSpaceId) return;

    try {
      await csrfFetch('/api/location/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          space_id: currentSpaceId,
          latitude: event.latitude,
          longitude: event.longitude,
          accuracy: event.accuracy || undefined,
          speed: event.speed || undefined,
          recorded_at: new Date(event.timestamp).toISOString(),
        }),
      });
    } catch {
      // Silently fail — background updates shouldn't block
    }
  }, []);

  // Check permissions on mount
  useEffect(() => {
    if (!supported) return;

    checkLocationPermissions().then((status) => {
      setPermissionGranted(status.location === 'granted');
    });
  }, [supported]);

  // Check initial running state
  useEffect(() => {
    if (!supported) return;

    isBackgroundLocationRunning().then(setRunning);
  }, [supported]);

  // Listen for location updates when running
  useEffect(() => {
    if (!supported || !running) return;

    const removeListener = addBackgroundLocationListener((event) => {
      setLastLocation(event);
      submitLocation(event);
    });

    return removeListener;
  }, [supported, running, submitLocation]);

  // Auto-start if enabled (only once)
  useEffect(() => {
    if (!supported || !autoStart || initializedRef.current) return;
    initializedRef.current = true;

    // Only auto-start if we have permission and a space ID
    if (permissionGranted && spaceId) {
      startBackgroundLocation().then((started) => {
        setRunning(started);
      });
    }
  }, [supported, autoStart, permissionGranted, spaceId]);

  const start = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;

    setError(null);

    // Check/request permissions first
    let perms = await checkLocationPermissions();
    if (perms.location !== 'granted') {
      perms = await requestLocationPermissions();
      setPermissionGranted(perms.location === 'granted');

      if (perms.location !== 'granted') {
        setError('Location permission is required for background tracking');
        return false;
      }
    }

    const started = await startBackgroundLocation();
    if (started) {
      setRunning(true);
      return true;
    } else {
      setError('Failed to start background location service');
      return false;
    }
  }, [supported]);

  const stop = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;

    const stopped = await stopBackgroundLocation();
    if (stopped) {
      setRunning(false);
      setError(null);
      return true;
    } else {
      setError('Failed to stop background location service');
      return false;
    }
  }, [supported]);

  return {
    supported,
    running,
    permissionGranted,
    lastLocation,
    error,
    start,
    stop,
  };
}
