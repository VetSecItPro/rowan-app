import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkInsService } from '@/lib/services/checkins-service';

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  channel: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock('@/lib/utils/date-utils', () => ({
  getCurrentDateString: vi.fn(() => '2024-12-08'),
}));

describe('checkins-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCheckIns', () => {
    it('should fetch check-ins for a space', async () => {
      const mockCheckIns = [
        { id: 'checkin-1', space_id: 'space-1', user_id: 'user-1', mood: 'great', date: '2024-12-08' },
        { id: 'checkin-2', space_id: 'space-1', user_id: 'user-2', mood: 'good', date: '2024-12-07' },
      ];

      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockCheckIns, error: null }),
      };

      mockSupabase.from.mockReturnValue(query);

      const result = await checkInsService.getCheckIns('space-1');

      expect(result).toHaveLength(2);
      expect(query.eq).toHaveBeenCalledWith('space_id', 'space-1');
      expect(query.limit).toHaveBeenCalledWith(30);
    });

    it('should respect custom limit', async () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockSupabase.from.mockReturnValue(query);

      await checkInsService.getCheckIns('space-1', 10);

      expect(query.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('getTodayCheckIn', () => {
    it('should fetch today check-in for a user', async () => {
      const mockCheckIn = {
        id: 'checkin-1',
        space_id: 'space-1',
        user_id: 'user-1',
        mood: 'great',
        date: '2024-12-08',
      };

      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockCheckIn, error: null }),
      };

      mockSupabase.from.mockReturnValue(query);

      const result = await checkInsService.getTodayCheckIn('space-1', 'user-1');

      expect(result).toBeDefined();
      expect(result?.mood).toBe('great');
      expect(query.eq).toHaveBeenCalledWith('date', '2024-12-08');
    });

    it('should return null if no check-in exists', async () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockSupabase.from.mockReturnValue(query);

      const result = await checkInsService.getTodayCheckIn('space-1', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('createCheckIn', () => {
    it('should create or update a check-in', async () => {
      const input = {
        space_id: 'space-1',
        mood: 'great',
        energy_level: 5,
        note: 'Great day!',
      };

      const mockCheckIn = { id: 'checkin-1', user_id: 'user-1', ...input, date: '2024-12-08' };

      const query = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCheckIn, error: null }),
      };

      mockSupabase.from.mockReturnValue(query);

      const result = await checkInsService.createCheckIn('user-1', input);

      expect(result.id).toBe('checkin-1');
      expect(query.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ mood: 'great' }),
        { onConflict: 'user_id,space_id,date' }
      );
    });

    it('should use provided date', async () => {
      const input = {
        space_id: 'space-1',
        mood: 'good',
        date: '2024-12-07',
      };

      const query = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { ...input, id: 'checkin-1' }, error: null }),
      };

      mockSupabase.from.mockReturnValue(query);

      await checkInsService.createCheckIn('user-1', input);

      expect(query.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ date: '2024-12-07' }),
        { onConflict: 'user_id,space_id,date' }
      );
    });
  });

  describe('getCheckInStats', () => {
    it('should calculate check-in statistics', async () => {
      const mockCheckIns = [
        { id: '1', date: '2024-12-08', mood: 'great' },
        { id: '2', date: '2024-12-07', mood: 'good' },
        { id: '3', date: '2024-12-06', mood: 'great' },
        { id: '4', date: '2024-12-01', mood: 'okay' },
      ];

      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockCheckIns, error: null }),
      };

      mockSupabase.from.mockReturnValue(query);

      const result = await checkInsService.getCheckInStats('space-1', 'user-1');

      expect(result.totalCheckIns).toBe(4);
      expect(result.currentStreak).toBeGreaterThanOrEqual(0);
      expect(result.moodDistribution).toBeDefined();
      expect(result.moodDistribution.great).toBe(2);
      expect(result.moodDistribution.good).toBe(1);
    });

    it('should calculate current streak correctly', async () => {
      const today = new Date('2024-12-08');
      const mockCheckIns = [
        { id: '1', date: '2024-12-08', mood: 'great' },
        { id: '2', date: '2024-12-07', mood: 'good' },
        { id: '3', date: '2024-12-06', mood: 'great' },
        // Gap here
        { id: '4', date: '2024-12-04', mood: 'okay' },
      ];

      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockCheckIns, error: null }),
      };

      mockSupabase.from.mockReturnValue(query);

      const result = await checkInsService.getCheckInStats('space-1', 'user-1');

      expect(result.currentStreak).toBe(3);
    });
  });

  describe('subscribeToCheckIns', () => {
    it('should subscribe to check-in changes', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      };

      mockSupabase.channel.mockReturnValue(mockChannel);

      const callback = vi.fn();
      const channel = checkInsService.subscribeToCheckIns('space-1', callback);

      expect(mockSupabase.channel).toHaveBeenCalledWith('checkins:space-1');
      expect(mockChannel.on).toHaveBeenCalled();
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });
  });
});
