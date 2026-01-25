'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';
import {
  isGeolocationAvailable,
  getCurrentPosition,
  watchPosition,
  getRecommendedUpdateInterval,
  type LocationData,
} from '@/lib/native';
import type { FamilyMemberLocation, FamilyPlace, LocationSharingSettings } from '@/lib/services/family-location-service';

interface UseFamilyLocationOptions {
  enableTracking?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // in ms
}

interface UseFamilyLocationReturn {
  // Family data
  familyLocations: FamilyMemberLocation[];
  places: FamilyPlace[];
  settings: LocationSharingSettings | null;

  // User's current location
  currentLocation: LocationData | null;

  // Status
  isLoading: boolean;
  isTracking: boolean;
  error: string | null;
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unavailable';

  // Actions
  startTracking: () => Promise<boolean>;
  stopTracking: () => void;
  refreshFamilyLocations: () => Promise<void>;
  updateSettings: (updates: Partial<LocationSharingSettings>) => Promise<boolean>;
  createPlace: (place: Omit<FamilyPlace, 'id' | 'space_id' | 'created_by' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  deletePlace: (placeId: string) => Promise<boolean>;
}

export function useFamilyLocation(
  spaceId: string | null,
  options: UseFamilyLocationOptions = {}
): UseFamilyLocationReturn {
  const {
    enableTracking = false,
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds default
  } = options;

  // State
  const [familyLocations, setFamilyLocations] = useState<FamilyMemberLocation[]>([]);
  const [places, setPlaces] = useState<FamilyPlace[]>([]);
  const [settings, setSettings] = useState<LocationSharingSettings | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unavailable'>('prompt');

  // Refs for cleanup
  const stopWatchingRef = useRef<(() => void) | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Check geolocation availability
  useEffect(() => {
    if (!isGeolocationAvailable()) {
      setPermissionStatus('unavailable');
      setError('Location services are not available on this device');
    }
  }, []);

  // Fetch family locations
  const refreshFamilyLocations = useCallback(async () => {
    if (!spaceId) return;

    try {
      const response = await fetch(`/api/location/family?space_id=${spaceId}&include_events=true`);
      const data = await response.json();

      if (data.success) {
        setFamilyLocations(data.data.locations || []);
      } else {
        logger.error('Failed to fetch family locations', undefined, {
          component: 'hook-useFamilyLocation',
          action: 'refresh_locations',
          details: data.error,
        });
      }
    } catch (err) {
      logger.error('Error fetching family locations', err, {
        component: 'hook-useFamilyLocation',
        action: 'refresh_locations',
      });
    }
  }, [spaceId]);

  // Fetch places
  const fetchPlaces = useCallback(async () => {
    if (!spaceId) return;

    try {
      const response = await fetch(`/api/location/places?space_id=${spaceId}`);
      const data = await response.json();

      if (data.success) {
        setPlaces(data.data || []);
      }
    } catch (err) {
      logger.error('Error fetching places', err, {
        component: 'hook-useFamilyLocation',
        action: 'fetch_places',
      });
    }
  }, [spaceId]);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    if (!spaceId) return;

    try {
      const response = await fetch(`/api/location/settings?space_id=${spaceId}`);
      const data = await response.json();

      if (data.success) {
        setSettings(data.data);
      }
    } catch (err) {
      logger.error('Error fetching location settings', err, {
        component: 'hook-useFamilyLocation',
        action: 'fetch_settings',
      });
    }
  }, [spaceId]);

  // Update location on server
  const updateLocationOnServer = useCallback(async (location: LocationData) => {
    if (!spaceId) return;

    // Throttle updates (minimum interval based on platform)
    const minInterval = getRecommendedUpdateInterval();
    const now = Date.now();
    if (now - lastUpdateRef.current < minInterval) {
      return;
    }
    lastUpdateRef.current = now;

    try {
      const response = await fetch('/api/location/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          space_id: spaceId,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          altitude: location.altitude,
          altitude_accuracy: location.altitudeAccuracy,
          speed: location.speed,
          heading: location.heading,
          recorded_at: new Date(location.timestamp).toISOString(),
        }),
      });

      const data = await response.json();
      if (!data.success) {
        logger.error('Failed to update location on server', undefined, {
          component: 'hook-useFamilyLocation',
          action: 'update_location',
          details: data.error,
        });
      }
    } catch (err) {
      logger.error('Error updating location on server', err, {
        component: 'hook-useFamilyLocation',
        action: 'update_location',
      });
    }
  }, [spaceId]);

  // Start location tracking
  const startTracking = useCallback(async (): Promise<boolean> => {
    if (!isGeolocationAvailable()) {
      setError('Location services are not available');
      return false;
    }

    if (!spaceId) {
      setError('No space selected');
      return false;
    }

    try {
      // Get initial position
      const position = await getCurrentPosition({ enableHighAccuracy: true });

      if (!position) {
        setPermissionStatus('denied');
        setError('Location permission denied');
        return false;
      }

      setPermissionStatus('granted');
      setCurrentLocation(position);

      // Update server with initial position
      await updateLocationOnServer(position);

      // Start watching position
      const stopWatching = watchPosition(
        (location) => {
          setCurrentLocation(location);
          updateLocationOnServer(location);
        },
        (err) => {
          logger.error('Location watch error', err, {
            component: 'hook-useFamilyLocation',
            action: 'watch_position',
          });
          setError(err.message);
        },
        { enableHighAccuracy: true }
      );

      stopWatchingRef.current = stopWatching;
      setIsTracking(true);
      setError(null);

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start location tracking';
      setError(message);
      logger.error('Failed to start tracking', err, {
        component: 'hook-useFamilyLocation',
        action: 'start_tracking',
      });
      return false;
    }
  }, [spaceId, updateLocationOnServer]);

  // Stop location tracking
  const stopTracking = useCallback(() => {
    if (stopWatchingRef.current) {
      stopWatchingRef.current();
      stopWatchingRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Update settings
  const updateSettings = useCallback(async (updates: Partial<LocationSharingSettings>): Promise<boolean> => {
    if (!spaceId) return false;

    try {
      const response = await fetch('/api/location/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ space_id: spaceId, ...updates }),
      });

      const data = await response.json();

      if (data.success) {
        setSettings(data.data);
        return true;
      }

      setError(data.error);
      return false;
    } catch (err) {
      logger.error('Error updating settings', err, {
        component: 'hook-useFamilyLocation',
        action: 'update_settings',
      });
      return false;
    }
  }, [spaceId]);

  // Create place
  const createPlace = useCallback(async (
    place: Omit<FamilyPlace, 'id' | 'space_id' | 'created_by' | 'created_at' | 'updated_at'>
  ): Promise<boolean> => {
    if (!spaceId) return false;

    try {
      const response = await fetch('/api/location/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ space_id: spaceId, ...place }),
      });

      const data = await response.json();

      if (data.success) {
        setPlaces((prev) => [...prev, data.data]);
        return true;
      }

      setError(data.error);
      return false;
    } catch (err) {
      logger.error('Error creating place', err, {
        component: 'hook-useFamilyLocation',
        action: 'create_place',
      });
      return false;
    }
  }, [spaceId]);

  // Delete place
  const deletePlace = useCallback(async (placeId: string): Promise<boolean> => {
    if (!spaceId) return false;

    try {
      const response = await fetch(`/api/location/places?id=${placeId}&space_id=${spaceId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setPlaces((prev) => prev.filter((p) => p.id !== placeId));
        return true;
      }

      setError(data.error);
      return false;
    } catch (err) {
      logger.error('Error deleting place', err, {
        component: 'hook-useFamilyLocation',
        action: 'delete_place',
      });
      return false;
    }
  }, [spaceId]);

  // Initial data fetch
  useEffect(() => {
    if (!spaceId) {
      setIsLoading(false);
      return;
    }

    const initialize = async () => {
      setIsLoading(true);
      setError(null);

      await Promise.all([
        refreshFamilyLocations(),
        fetchPlaces(),
        fetchSettings(),
      ]);

      setIsLoading(false);
    };

    initialize();
  }, [spaceId, refreshFamilyLocations, fetchPlaces, fetchSettings]);

  // Auto-start tracking if enabled
  useEffect(() => {
    if (enableTracking && spaceId && !isTracking && permissionStatus !== 'unavailable') {
      startTracking();
    }
  }, [enableTracking, spaceId, isTracking, permissionStatus, startTracking]);

  // Auto-refresh family locations
  useEffect(() => {
    if (!autoRefresh || !spaceId) return;

    refreshIntervalRef.current = setInterval(refreshFamilyLocations, refreshInterval);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, spaceId, refreshInterval, refreshFamilyLocations]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [stopTracking]);

  return {
    familyLocations,
    places,
    settings,
    currentLocation,
    isLoading,
    isTracking,
    error,
    permissionStatus,
    startTracking,
    stopTracking,
    refreshFamilyLocations,
    updateSettings,
    createPlace,
    deletePlace,
  };
}
