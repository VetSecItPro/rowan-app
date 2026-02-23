import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  updateUserLocation,
  getLastLocation,
  getFamilyLocations,
  createPlace,
  getPlaces,
  getSharingSettings,
  calculateDistance,
  isWithinGeofence,
} from '@/lib/services/family-location-service';

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  auth: { getUser: vi.fn() },
}));

const mockSupabaseAdmin = vi.hoisted(() => ({
  from: vi.fn(),
  auth: { getUser: vi.fn() },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: mockSupabaseAdmin,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/services/push-notification-service', () => ({
  notifyLocationArrival: vi.fn(),
  notifyLocationDeparture: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('family-location-service', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const distance = calculateDistance(40.7128, -74.0060, 34.0522, -118.2437);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeCloseTo(3936000, -3);
    });

    it('should return 0 for same point', () => {
      const distance = calculateDistance(40.7128, -74.0060, 40.7128, -74.0060);
      expect(distance).toBe(0);
    });
  });

  describe('isWithinGeofence', () => {
    it('should return true when point is within radius', () => {
      const result = isWithinGeofence(
        { latitude: 40.7128, longitude: -74.0060 },
        { latitude: 40.7128, longitude: -74.0060 },
        100
      );
      expect(result).toBe(true);
    });

    it('should return false when point is outside radius', () => {
      const result = isWithinGeofence(
        { latitude: 40.7128, longitude: -74.0060 },
        { latitude: 34.0522, longitude: -118.2437 },
        1000
      );
      expect(result).toBe(false);
    });
  });

  describe('updateUserLocation', () => {
    it('should update user location successfully', async () => {
      const mockLocation = { id: 'loc-1', latitude: 40.7128, longitude: -74.0060 };
      const mockInsert = {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockLocation, error: null }),
        }),
      };

      mockSupabase.from.mockReturnValue({ insert: vi.fn().mockReturnValue(mockInsert) });

      const result = await updateUserLocation('user-1', 'space-1', {
        latitude: 40.7128,
        longitude: -74.0060,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockLocation);
      }
    });

    it('should return error if insert fails', async () => {
      const mockInsert = {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
        }),
      };

      mockSupabase.from.mockReturnValue({ insert: vi.fn().mockReturnValue(mockInsert) });

      const result = await updateUserLocation('user-1', 'space-1', {
        latitude: 40.7128,
        longitude: -74.0060,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('getLastLocation', () => {
    it('should return last location for user', async () => {
      const mockLocation = {
        id: 'loc-1',
        user_id: 'user-1',
        space_id: 'space-1',
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
      };

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockLocation, error: null }),
      };

      mockSupabase.from.mockReturnValue({ select: vi.fn().mockReturnValue(mockQuery) });

      const result = await getLastLocation('user-1', 'space-1');

      expect(result).toEqual(mockLocation);
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockQuery.eq).toHaveBeenCalledWith('space_id', 'space-1');
    });

    it('should return null if no location found', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };

      mockSupabase.from.mockReturnValue({ select: vi.fn().mockReturnValue(mockQuery) });

      const result = await getLastLocation('user-1', 'space-1');

      expect(result).toBeNull();
    });
  });

  describe('createPlace', () => {
    it('should create a new place', async () => {
      const mockPlace = {
        id: 'place-1',
        space_id: 'space-1',
        name: 'Home',
        latitude: 40.7128,
        longitude: -74.0060,
        radius_meters: 100,
      };

      const mockInsert = {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockPlace, error: null }),
        }),
      };

      mockSupabase.from.mockReturnValue({ insert: vi.fn().mockReturnValue(mockInsert) });

      const result = await createPlace('space-1', 'user-1', {
        name: 'Home',
        latitude: 40.7128,
        longitude: -74.0060,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Home');
      }
    });
  });

  describe('getPlaces', () => {
    it('should return all places for a space', async () => {
      const mockPlaces = [
        { id: 'place-1', name: 'Home', latitude: 40.7128, longitude: -74.0060 },
        { id: 'place-2', name: 'Work', latitude: 40.7489, longitude: -73.9680 },
      ];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockPlaces, error: null }),
      };

      mockSupabase.from.mockReturnValue({ select: vi.fn().mockReturnValue(mockQuery) });

      const result = await getPlaces('space-1');

      expect(result).toEqual(mockPlaces);
      expect(mockQuery.eq).toHaveBeenCalledWith('space_id', 'space-1');
    });
  });

  describe('getSharingSettings', () => {
    it('should return sharing settings for user', async () => {
      const mockSettings = {
        id: 'settings-1',
        user_id: 'user-1',
        space_id: 'space-1',
        sharing_enabled: true,
        precision: 'exact' as const,
      };

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSettings, error: null }),
      };

      mockSupabase.from.mockReturnValue({ select: vi.fn().mockReturnValue(mockQuery) });

      const result = await getSharingSettings('user-1', 'space-1');

      expect(result).toEqual(mockSettings);
    });

    it('should create default settings if none exist', async () => {
      const mockSettings = {
        id: 'settings-1',
        user_id: 'user-1',
        space_id: 'space-1',
        sharing_enabled: true,
        precision: 'exact' as const,
      };

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };

      const mockInsert = {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockSettings, error: null }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockQuery) })
        .mockReturnValueOnce({ insert: vi.fn().mockReturnValue(mockInsert) });

      const result = await getSharingSettings('user-1', 'space-1');

      expect(result).toEqual(mockSettings);
    });
  });
});
