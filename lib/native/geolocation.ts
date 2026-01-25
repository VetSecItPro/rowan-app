/**
 * Geolocation Native Bridge
 *
 * Handles location tracking for family safety features.
 * Supports both foreground and background location on native platforms.
 */

import { Geolocation, Position, PositionOptions } from '@capacitor/geolocation';
import { isNative, isPluginAvailable, isIOS, isAndroid } from './capacitor';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

export interface LocationPermissionStatus {
  location: 'granted' | 'denied' | 'prompt';
  coarseLocation?: 'granted' | 'denied' | 'prompt';
}

/**
 * Check if geolocation is available
 */
export function isGeolocationAvailable(): boolean {
  if (isNative) {
    return isPluginAvailable('Geolocation');
  }
  return 'geolocation' in navigator;
}

/**
 * Check current permission status
 */
export async function checkLocationPermissions(): Promise<LocationPermissionStatus> {
  if (!isGeolocationAvailable()) {
    return { location: 'denied' };
  }

  if (isNative) {
    const status = await Geolocation.checkPermissions();
    return {
      location: status.location as 'granted' | 'denied' | 'prompt',
      coarseLocation: status.coarseLocation as 'granted' | 'denied' | 'prompt' | undefined,
    };
  }

  // Web API - check via Permissions API if available
  if ('permissions' in navigator) {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return { location: result.state as 'granted' | 'denied' | 'prompt' };
  }

  return { location: 'prompt' };
}

/**
 * Request location permissions
 */
export async function requestLocationPermissions(): Promise<LocationPermissionStatus> {
  if (!isGeolocationAvailable()) {
    return { location: 'denied' };
  }

  if (isNative) {
    const status = await Geolocation.requestPermissions();
    return {
      location: status.location as 'granted' | 'denied' | 'prompt',
      coarseLocation: status.coarseLocation as 'granted' | 'denied' | 'prompt' | undefined,
    };
  }

  // Web - requesting position triggers permission prompt
  try {
    await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
    });
    return { location: 'granted' };
  } catch {
    return { location: 'denied' };
  }
}

/**
 * Get current position (one-time)
 */
export async function getCurrentPosition(options?: PositionOptions): Promise<LocationData | null> {
  if (!isGeolocationAvailable()) {
    return null;
  }

  const defaultOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
    ...options,
  };

  if (isNative) {
    const position = await Geolocation.getCurrentPosition(defaultOptions);
    return positionToLocationData(position);
  }

  // Web API
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(webPositionToLocationData(position)),
      (error) => {
        console.error('Geolocation error:', error);
        resolve(null);
      },
      defaultOptions
    );
  });
}

/**
 * Watch position changes (continuous tracking)
 * Returns a cleanup function to stop watching
 */
export function watchPosition(
  callback: (location: LocationData) => void,
  errorCallback?: (error: Error) => void,
  options?: PositionOptions
): () => void {
  if (!isGeolocationAvailable()) {
    errorCallback?.(new Error('Geolocation not available'));
    return () => {};
  }

  const defaultOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000, // Allow 5 second old positions
    ...options,
  };

  if (isNative) {
    let watchId: string | null = null;

    Geolocation.watchPosition(defaultOptions, (position, err) => {
      if (err) {
        errorCallback?.(new Error(err.message));
        return;
      }
      if (position) {
        callback(positionToLocationData(position));
      }
    }).then((id) => {
      watchId = id;
    });

    return () => {
      if (watchId) {
        Geolocation.clearWatch({ id: watchId });
      }
    };
  }

  // Web API
  const watchId = navigator.geolocation.watchPosition(
    (position) => callback(webPositionToLocationData(position)),
    (error) => errorCallback?.(new Error(error.message)),
    defaultOptions
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}

/**
 * Calculate distance between two points in meters (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if a point is within a geofence
 */
export function isWithinGeofence(
  point: { latitude: number; longitude: number },
  center: { latitude: number; longitude: number },
  radiusMeters: number
): boolean {
  const distance = calculateDistance(
    point.latitude,
    point.longitude,
    center.latitude,
    center.longitude
  );
  return distance <= radiusMeters;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  const km = meters / 1000;
  if (km < 10) {
    return `${km.toFixed(1)}km`;
  }
  return `${Math.round(km)}km`;
}

/**
 * Get location update interval recommendation based on platform
 */
export function getRecommendedUpdateInterval(): number {
  if (isIOS) {
    // iOS is more battery-efficient, can update more frequently
    return 30000; // 30 seconds
  }
  if (isAndroid) {
    // Android background location can be aggressive, be conservative
    return 60000; // 1 minute
  }
  // Web - be very conservative
  return 120000; // 2 minutes
}

// Helper functions
function positionToLocationData(position: Position): LocationData {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    altitude: position.coords.altitude ?? null,
    altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
    speed: position.coords.speed ?? null,
    heading: position.coords.heading ?? null,
    timestamp: position.timestamp,
  };
}

function webPositionToLocationData(position: GeolocationPosition): LocationData {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    altitude: position.coords.altitude,
    altitudeAccuracy: position.coords.altitudeAccuracy,
    speed: position.coords.speed,
    heading: position.coords.heading,
    timestamp: position.timestamp,
  };
}
