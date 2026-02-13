/**
 * Family Location Tracking Service
 *
 * Provides GPS-based location sharing for family safety features.
 * Handles location updates, geofencing, and privacy controls.
 */

import { createClient } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { notifyLocationArrival, notifyLocationDeparture } from '@/lib/services/push-notification-service';

// =============================================
// TYPES
// =============================================

export interface UserLocation {
  id: string;
  user_id: string;
  space_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  altitude_accuracy: number | null;
  speed: number | null;
  heading: number | null;
  battery_level: number | null;
  is_charging: boolean;
  recorded_at: string;
  created_at: string;
}

export interface FamilyPlace {
  id: string;
  space_id: string;
  name: string;
  icon: string;
  color: string;
  latitude: number;
  longitude: number;
  address: string | null;
  radius_meters: number;
  notify_on_arrival: boolean;
  notify_on_departure: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocationSharingSettings {
  id: string;
  user_id: string;
  space_id: string;
  sharing_enabled: boolean;
  precision: 'exact' | 'approximate' | 'city' | 'hidden';
  history_retention_days: number;
  notify_arrivals: boolean;
  notify_departures: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeofenceEvent {
  id: string;
  user_id: string;
  space_id: string;
  place_id: string;
  event_type: 'arrival' | 'departure';
  latitude: number;
  longitude: number;
  notification_sent: boolean;
  notification_sent_at: string | null;
  occurred_at: string;
  created_at: string;
}

export interface FamilyMemberLocation {
  user_id: string;
  name: string;
  avatar_url: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recorded_at: string;
  minutes_ago: number;
  battery_level: number | null;
  is_charging: boolean;
  sharing_enabled: boolean;
  precision: 'exact' | 'approximate' | 'city' | 'hidden';
  current_place: FamilyPlace | null;
}

// =============================================
// VALIDATION SCHEMAS
// =============================================

const LocationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
  altitude: z.number().optional(),
  altitude_accuracy: z.number().positive().optional(),
  speed: z.number().min(0).optional(),
  heading: z.number().min(0).max(360).optional(),
  battery_level: z.number().min(0).max(1).optional(),
  is_charging: z.boolean().optional(),
  recorded_at: z.string().datetime().optional(),
});

const CreatePlaceSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  icon: z.string().default('map-pin'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3b82f6'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().max(500).optional(),
  radius_meters: z.number().min(50).max(5000).default(150),
  notify_on_arrival: z.boolean().default(true),
  notify_on_departure: z.boolean().default(true),
});

const UpdatePlaceSchema = CreatePlaceSchema.partial();

const UpdateSharingSettingsSchema = z.object({
  sharing_enabled: z.boolean().optional(),
  precision: z.enum(['exact', 'approximate', 'city', 'hidden']).optional(),
  history_retention_days: z.number().min(1).max(365).optional(),
  notify_arrivals: z.boolean().optional(),
  notify_departures: z.boolean().optional(),
  quiet_hours_start: z.string().nullable().optional(),
  quiet_hours_end: z.string().nullable().optional(),
});

// =============================================
// HELPER FUNCTIONS
// =============================================

const getSupabaseClient = (supabase?: SupabaseClient) => supabase ?? createClient();

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

  return R * c;
}

/**
 * Check if a point is within a geofence radius
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
 * Apply privacy precision to location coordinates
 */
function applyPrecision(
  latitude: number,
  longitude: number,
  precision: 'exact' | 'approximate' | 'city' | 'hidden'
): { latitude: number; longitude: number } | null {
  switch (precision) {
    case 'exact':
      return { latitude, longitude };
    case 'approximate': {
      // Fuzz to ~500m radius using cryptographically secure randomness
      const fuzzFactor = 0.005; // ~500m at equator
      const bytes = new Uint32Array(2);
      crypto.getRandomValues(bytes);
      return {
        latitude: latitude + (bytes[0] / 0xFFFFFFFF - 0.5) * fuzzFactor,
        longitude: longitude + (bytes[1] / 0xFFFFFFFF - 0.5) * fuzzFactor,
      };
    }
    case 'city':
      // Round to 2 decimal places (~1km precision)
      return {
        latitude: Math.round(latitude * 100) / 100,
        longitude: Math.round(longitude * 100) / 100,
      };
    case 'hidden':
      return null;
    default:
      return { latitude, longitude };
  }
}

// =============================================
// LOCATION TRACKING
// =============================================

/**
 * Update user's current location
 */
export async function updateUserLocation(
  userId: string,
  spaceId: string,
  locationData: z.infer<typeof LocationUpdateSchema>,
  supabaseClient?: SupabaseClient
): Promise<{ success: true; data: UserLocation } | { success: false; error: string }> {
  try {
    const supabase = supabaseClient ? supabaseAdmin : getSupabaseClient();
    const validated = LocationUpdateSchema.parse(locationData);

    const { data, error } = await supabase
      .from('user_locations')
      .insert({
        user_id: userId,
        space_id: spaceId,
        latitude: validated.latitude,
        longitude: validated.longitude,
        accuracy: validated.accuracy ?? null,
        altitude: validated.altitude ?? null,
        altitude_accuracy: validated.altitude_accuracy ?? null,
        speed: validated.speed ?? null,
        heading: validated.heading ?? null,
        battery_level: validated.battery_level ?? null,
        is_charging: validated.is_charging ?? false,
        recorded_at: validated.recorded_at ?? new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('updateUserLocation error', error instanceof Error ? error : new Error(JSON.stringify(error)), {
        component: 'family-location-service',
        action: 'update_location',
        details: { userId, spaceId },
      });
      return { success: false, error: error.message };
    }

    // Check geofences asynchronously
    checkGeofences(userId, spaceId, validated.latitude, validated.longitude, supabaseClient).catch((err) => {
      logger.error('checkGeofences error', err, { component: 'family-location-service', action: 'check_geofences' });
    });

    return { success: true, data };
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues.map((e) => e.message).join(', ')
      : error instanceof Error
        ? error.message
        : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Get last known location for a user
 */
export async function getLastLocation(
  userId: string,
  spaceId: string,
  supabaseClient?: SupabaseClient
): Promise<UserLocation | null> {
  try {
    const supabase = getSupabaseClient(supabaseClient);

    const { data, error } = await supabase
      .from('user_locations')
      .select('id, user_id, space_id, latitude, longitude, accuracy, altitude, altitude_accuracy, speed, heading, battery_level, is_charging, recorded_at, created_at')
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows
      logger.error('getLastLocation error', error instanceof Error ? error : new Error(JSON.stringify(error)), {
        component: 'family-location-service',
        action: 'get_last_location',
      });
      return null;
    }

    return data;
  } catch (error) {
    logger.error('getLastLocation error', error instanceof Error ? error : new Error('Unknown error'), {
      component: 'family-location-service',
      action: 'get_last_location',
    });
    return null;
  }
}

/**
 * Get all family members' locations for a space
 */
export async function getFamilyLocations(
  spaceId: string,
  currentUserId: string,
  supabaseClient?: SupabaseClient
): Promise<FamilyMemberLocation[]> {
  try {
    const supabase = getSupabaseClient(supabaseClient);

    // Get all space members
    const { data: members, error: membersError } = await supabase
      .from('space_members')
      .select(`
        user_id,
        users (
          id,
          name,
          avatar_url
        )
      `)
      .eq('space_id', spaceId);

    if (membersError) {
      logger.error('getFamilyLocations members error', membersError instanceof Error ? membersError : new Error(JSON.stringify(membersError)), {
        component: 'family-location-service',
        action: 'get_family_locations',
      });
      return [];
    }

    // Get sharing settings for all members
    const { data: settings, error: settingsError } = await supabase
      .from('location_sharing_settings')
      .select('id, user_id, space_id, sharing_enabled, precision, history_retention_days, notify_arrivals, notify_departures, quiet_hours_start, quiet_hours_end, created_at, updated_at')
      .eq('space_id', spaceId);

    if (settingsError) {
      logger.error('getFamilyLocations settings error', settingsError instanceof Error ? settingsError : new Error(JSON.stringify(settingsError)), {
        component: 'family-location-service',
        action: 'get_family_locations',
      });
    }

    const settingsMap = new Map<string, LocationSharingSettings>(
      settings?.map((s: LocationSharingSettings) => [s.user_id, s]) ?? []
    );

    // Get places for current location matching
    const { data: places } = await supabase
      .from('family_places')
      .select('id, space_id, name, icon, color, latitude, longitude, address, radius_meters, notify_on_arrival, notify_on_departure, created_by, created_at, updated_at')
      .eq('space_id', spaceId);

    const familyLocations: FamilyMemberLocation[] = [];

    for (const member of members ?? []) {
      const userSettings: Pick<LocationSharingSettings, 'sharing_enabled' | 'precision'> =
        settingsMap.get(member.user_id) ?? {
          sharing_enabled: true,
          precision: 'exact',
        };

      // Skip if sharing is disabled (unless it's the current user viewing themselves)
      if (!userSettings.sharing_enabled && member.user_id !== currentUserId) {
        continue;
      }

      // Get last location
      const location = await getLastLocation(member.user_id, spaceId, supabase);

      if (!location) continue;

      // Apply privacy precision
      const adjustedCoords = applyPrecision(
        location.latitude,
        location.longitude,
        member.user_id === currentUserId ? 'exact' : userSettings.precision
      );

      if (!adjustedCoords) continue;

      // Check if at a known place
      let currentPlace: FamilyPlace | null = null;
      if (places) {
        for (const place of places) {
          if (isWithinGeofence(
            { latitude: location.latitude, longitude: location.longitude },
            { latitude: place.latitude, longitude: place.longitude },
            place.radius_meters
          )) {
            currentPlace = place;
            break;
          }
        }
      }

      const minutesAgo = Math.floor(
        (Date.now() - new Date(location.recorded_at).getTime()) / 60000
      );

      const user = member.users as { id: string; name: string | null; avatar_url: string | null } | null;

      familyLocations.push({
        user_id: member.user_id,
        name: user?.name ?? 'Unknown',
        avatar_url: user?.avatar_url ?? null,
        latitude: adjustedCoords.latitude,
        longitude: adjustedCoords.longitude,
        accuracy: location.accuracy,
        recorded_at: location.recorded_at,
        minutes_ago: minutesAgo,
        battery_level: location.battery_level,
        is_charging: location.is_charging,
        sharing_enabled: userSettings.sharing_enabled,
        precision: userSettings.precision as 'exact' | 'approximate' | 'city' | 'hidden',
        current_place: currentPlace,
      });
    }

    return familyLocations;
  } catch (error) {
    logger.error('getFamilyLocations error', error instanceof Error ? error : new Error('Unknown error'), {
      component: 'family-location-service',
      action: 'get_family_locations',
    });
    return [];
  }
}

/**
 * Get location history for a user
 */
export async function getLocationHistory(
  userId: string,
  spaceId: string,
  hours: number = 24,
  supabaseClient?: SupabaseClient
): Promise<UserLocation[]> {
  try {
    const supabase = getSupabaseClient(supabaseClient);

    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('user_locations')
      .select('id, user_id, space_id, latitude, longitude, accuracy, altitude, altitude_accuracy, speed, heading, battery_level, is_charging, recorded_at, created_at')
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: false });

    if (error) {
      logger.error('getLocationHistory error', error instanceof Error ? error : new Error(JSON.stringify(error)), {
        component: 'family-location-service',
        action: 'get_location_history',
      });
      return [];
    }

    return data ?? [];
  } catch (error) {
    logger.error('getLocationHistory error', error instanceof Error ? error : new Error('Unknown error'), {
      component: 'family-location-service',
      action: 'get_location_history',
    });
    return [];
  }
}

// =============================================
// FAMILY PLACES (GEOFENCES)
// =============================================

/**
 * Create a new family place
 */
export async function createPlace(
  spaceId: string,
  userId: string,
  placeData: z.infer<typeof CreatePlaceSchema>,
  supabaseClient?: SupabaseClient
): Promise<{ success: true; data: FamilyPlace } | { success: false; error: string }> {
  try {
    const supabase = supabaseClient ? supabaseAdmin : getSupabaseClient();
    const validated = CreatePlaceSchema.parse(placeData);

    const { data, error } = await supabase
      .from('family_places')
      .insert({
        space_id: spaceId,
        name: validated.name,
        icon: validated.icon,
        color: validated.color,
        latitude: validated.latitude,
        longitude: validated.longitude,
        address: validated.address ?? null,
        radius_meters: validated.radius_meters,
        notify_on_arrival: validated.notify_on_arrival,
        notify_on_departure: validated.notify_on_departure,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      logger.error('createPlace error', error instanceof Error ? error : new Error(JSON.stringify(error)), {
        component: 'family-location-service',
        action: 'create_place',
      });
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues.map((e) => e.message).join(', ')
      : error instanceof Error
        ? error.message
        : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Get all places for a space
 */
export async function getPlaces(
  spaceId: string,
  supabaseClient?: SupabaseClient
): Promise<FamilyPlace[]> {
  try {
    const supabase = getSupabaseClient(supabaseClient);

    const { data, error } = await supabase
      .from('family_places')
      .select('id, space_id, name, icon, color, latitude, longitude, address, radius_meters, notify_on_arrival, notify_on_departure, created_by, created_at, updated_at')
      .eq('space_id', spaceId)
      .order('name');

    if (error) {
      logger.error('getPlaces error', error instanceof Error ? error : new Error(JSON.stringify(error)), {
        component: 'family-location-service',
        action: 'get_places',
      });
      return [];
    }

    return data ?? [];
  } catch (error) {
    logger.error('getPlaces error', error instanceof Error ? error : new Error('Unknown error'), {
      component: 'family-location-service',
      action: 'get_places',
    });
    return [];
  }
}

/**
 * Update a place
 */
export async function updatePlace(
  placeId: string,
  spaceId: string,
  updates: z.infer<typeof UpdatePlaceSchema>,
  supabaseClient?: SupabaseClient
): Promise<{ success: true; data: FamilyPlace } | { success: false; error: string }> {
  try {
    const supabase = getSupabaseClient(supabaseClient);
    const validated = UpdatePlaceSchema.parse(updates);

    const { data, error } = await supabase
      .from('family_places')
      .update(validated)
      .eq('id', placeId)
      .eq('space_id', spaceId)
      .select()
      .single();

    if (error) {
      logger.error('updatePlace error', error instanceof Error ? error : new Error(JSON.stringify(error)), {
        component: 'family-location-service',
        action: 'update_place',
      });
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues.map((e) => e.message).join(', ')
      : error instanceof Error
        ? error.message
        : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Delete a place
 */
export async function deletePlace(
  placeId: string,
  spaceId: string,
  supabaseClient?: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient(supabaseClient);

    const { error } = await supabase
      .from('family_places')
      .delete()
      .eq('id', placeId)
      .eq('space_id', spaceId);

    if (error) {
      logger.error('deletePlace error', error instanceof Error ? error : new Error(JSON.stringify(error)), {
        component: 'family-location-service',
        action: 'delete_place',
      });
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =============================================
// SHARING SETTINGS
// =============================================

/**
 * Get or create sharing settings for a user in a space
 */
export async function getSharingSettings(
  userId: string,
  spaceId: string,
  supabaseClient?: SupabaseClient
): Promise<LocationSharingSettings | null> {
  try {
    const supabase = getSupabaseClient(supabaseClient);

    // Try to get existing settings
    const { data, error } = await supabase
      .from('location_sharing_settings')
      .select('id, user_id, space_id, sharing_enabled, precision, history_retention_days, notify_arrivals, notify_departures, quiet_hours_start, quiet_hours_end, created_at, updated_at')
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .single();

    if (error?.code === 'PGRST116') {
      // No settings exist, create defaults
      const { data: newData, error: insertError } = await supabase
        .from('location_sharing_settings')
        .insert({
          user_id: userId,
          space_id: spaceId,
          sharing_enabled: true,
          precision: 'exact',
          history_retention_days: 7,
          notify_arrivals: true,
          notify_departures: true,
        })
        .select()
        .single();

      if (insertError) {
        logger.error('getSharingSettings insert error', insertError instanceof Error ? insertError : new Error(JSON.stringify(insertError)), {
          component: 'family-location-service',
          action: 'get_sharing_settings',
        });
        return null;
      }

      return newData;
    }

    if (error) {
      logger.error('getSharingSettings error', error instanceof Error ? error : new Error(JSON.stringify(error)), {
        component: 'family-location-service',
        action: 'get_sharing_settings',
      });
      return null;
    }

    return data;
  } catch (error) {
    logger.error('getSharingSettings error', error instanceof Error ? error : new Error('Unknown error'), {
      component: 'family-location-service',
      action: 'get_sharing_settings',
    });
    return null;
  }
}

/**
 * Update sharing settings
 */
export async function updateSharingSettings(
  userId: string,
  spaceId: string,
  updates: z.infer<typeof UpdateSharingSettingsSchema>,
  supabaseClient?: SupabaseClient
): Promise<{ success: true; data: LocationSharingSettings } | { success: false; error: string }> {
  try {
    const supabase = getSupabaseClient(supabaseClient);
    const validated = UpdateSharingSettingsSchema.parse(updates);

    // Ensure settings exist first
    await getSharingSettings(userId, spaceId, supabase);

    const { data, error } = await supabase
      .from('location_sharing_settings')
      .update(validated)
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .select()
      .single();

    if (error) {
      logger.error('updateSharingSettings error', error instanceof Error ? error : new Error(JSON.stringify(error)), {
        component: 'family-location-service',
        action: 'update_sharing_settings',
      });
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues.map((e) => e.message).join(', ')
      : error instanceof Error
        ? error.message
        : 'Unknown error';
    return { success: false, error: message };
  }
}

// =============================================
// GEOFENCE EVENTS
// =============================================

/**
 * Check geofences and create events if user entered/exited
 */
async function checkGeofences(
  userId: string,
  spaceId: string,
  latitude: number,
  longitude: number,
  supabaseClient?: SupabaseClient
): Promise<void> {
  try {
    const supabase = getSupabaseClient(supabaseClient);

    // Get all places for the space
    const places = await getPlaces(spaceId, supabase);

    // Get user's previous location
    const { data: previousLocations } = await supabase
      .from('user_locations')
      .select('latitude, longitude')
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .order('recorded_at', { ascending: false })
      .limit(2);

    const previousLocation = previousLocations?.[1]; // Index 1 because index 0 is the one we just inserted

    for (const place of places) {
      const currentlyInside = isWithinGeofence(
        { latitude, longitude },
        { latitude: place.latitude, longitude: place.longitude },
        place.radius_meters
      );

      const wasInside = previousLocation
        ? isWithinGeofence(
            { latitude: previousLocation.latitude, longitude: previousLocation.longitude },
            { latitude: place.latitude, longitude: place.longitude },
            place.radius_meters
          )
        : false;

      if (currentlyInside && !wasInside && place.notify_on_arrival) {
        // Arrival event
        await createGeofenceEvent(userId, spaceId, place.id, 'arrival', latitude, longitude, supabase);
      } else if (!currentlyInside && wasInside && place.notify_on_departure) {
        // Departure event
        await createGeofenceEvent(userId, spaceId, place.id, 'departure', latitude, longitude, supabase);
      }
    }
  } catch (error) {
    logger.error('checkGeofences error', error instanceof Error ? error : new Error('Unknown error'), {
      component: 'family-location-service',
      action: 'check_geofences',
    });
  }
}

/**
 * Check if the current time falls within quiet hours
 */
function isWithinQuietHours(quietStart: string | null, quietEnd: string | null): boolean {
  if (!quietStart || !quietEnd) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = quietStart.split(':').map(Number);
  const [endH, endM] = quietEnd.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Handle overnight quiet hours (e.g., 22:00 - 07:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Create a geofence event and send push notifications to family members
 */
async function createGeofenceEvent(
  userId: string,
  spaceId: string,
  placeId: string,
  eventType: 'arrival' | 'departure',
  latitude: number,
  longitude: number,
  supabase: SupabaseClient
): Promise<void> {
  try {
    const { data: eventData, error } = await supabase
      .from('geofence_events')
      .insert({
        user_id: userId,
        space_id: spaceId,
        place_id: placeId,
        event_type: eventType,
        latitude,
        longitude,
        notification_sent: false,
      })
      .select('id')
      .single();

    if (error) {
      logger.error('createGeofenceEvent error', error instanceof Error ? error : new Error(JSON.stringify(error)), {
        component: 'family-location-service',
        action: 'create_geofence_event',
      });
      return;
    }

    // Fetch user name and place name for notification text
    const [userResult, placeResult] = await Promise.all([
      supabase.from('users').select('name').eq('id', userId).single(),
      supabase.from('family_places').select('name').eq('id', placeId).single(),
    ]);

    const userName = userResult.data?.name ?? 'Someone';
    const placeName = placeResult.data?.name ?? 'a saved place';

    // Check the triggering user's quiet hours setting
    const settings = await getSharingSettings(userId, spaceId, supabase);
    const inQuietHours = settings
      ? isWithinQuietHours(settings.quiet_hours_start, settings.quiet_hours_end)
      : false;

    if (inQuietHours) {
      logger.info(`Geofence notification suppressed (quiet hours): ${userId} ${eventType} at ${placeName}`, {
        component: 'family-location-service',
        action: 'geofence_event',
      });
      return;
    }

    // Send push notification to family members
    if (eventType === 'arrival') {
      await notifyLocationArrival(spaceId, userId, userName, placeName);
    } else {
      await notifyLocationDeparture(spaceId, userId, userName, placeName);
    }

    // Mark the event as notified
    if (eventData?.id) {
      await supabase
        .from('geofence_events')
        .update({
          notification_sent: true,
          notification_sent_at: new Date().toISOString(),
        })
        .eq('id', eventData.id);
    }

    logger.info(`Geofence event: ${userName} ${eventType} at ${placeName}`, {
      component: 'family-location-service',
      action: 'geofence_event',
    });
  } catch (error) {
    logger.error('createGeofenceEvent error', error instanceof Error ? error : new Error('Unknown error'), {
      component: 'family-location-service',
      action: 'create_geofence_event',
    });
  }
}

/**
 * Get recent geofence events for a space
 */
export async function getGeofenceEvents(
  spaceId: string,
  hours: number = 24,
  supabaseClient?: SupabaseClient
): Promise<(GeofenceEvent & { user: { name: string; avatar_url: string | null }; place: FamilyPlace })[]> {
  try {
    const supabase = getSupabaseClient(supabaseClient);

    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('geofence_events')
      .select(`
        *,
        users (
          name,
          avatar_url
        ),
        family_places (
          *
        )
      `)
      .eq('space_id', spaceId)
      .gte('occurred_at', since)
      .order('occurred_at', { ascending: false });

    if (error) {
      logger.error('getGeofenceEvents error', error instanceof Error ? error : new Error(JSON.stringify(error)), {
        component: 'family-location-service',
        action: 'get_geofence_events',
      });
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((event: any) => ({
      ...event,
      user: event.users as { name: string; avatar_url: string | null },
      place: event.family_places as FamilyPlace,
    }));
  } catch (error) {
    logger.error('getGeofenceEvents error', error instanceof Error ? error : new Error('Unknown error'), {
      component: 'family-location-service',
      action: 'get_geofence_events',
    });
    return [];
  }
}

// =============================================
// CLEANUP
// =============================================

/**
 * Delete location history older than retention period
 */
export async function cleanupOldLocations(
  userId: string,
  spaceId: string,
  supabaseClient?: SupabaseClient
): Promise<number> {
  try {
    const supabase = getSupabaseClient(supabaseClient);

    // Get user's retention setting
    const settings = await getSharingSettings(userId, spaceId, supabase);
    const retentionDays = settings?.history_retention_days ?? 7;

    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('user_locations')
      .delete()
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .lt('recorded_at', cutoffDate)
      .select('id');

    if (error) {
      logger.error('cleanupOldLocations error', error instanceof Error ? error : new Error(JSON.stringify(error)), {
        component: 'family-location-service',
        action: 'cleanup_old_locations',
      });
      return 0;
    }

    return data?.length ?? 0;
  } catch (error) {
    logger.error('cleanupOldLocations error', error instanceof Error ? error : new Error('Unknown error'), {
      component: 'family-location-service',
      action: 'cleanup_old_locations',
    });
    return 0;
  }
}
