import { describe, it, expect, vi, beforeEach } from 'vitest';
import { smartSchedulingService } from '@/lib/services/smart-scheduling-service';
import type { FindTimeOptions, TimeSlot, AvailabilityBlock } from '@/lib/services/smart-scheduling-service';
import type { CalendarEvent } from '@/lib/services/calendar-service';

// Mock Supabase client
const mockSupabaseClient = vi.hoisted(() => ({
  from: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  insert: vi.fn(() => mockSupabaseClient),
  update: vi.fn(() => mockSupabaseClient),
  delete: vi.fn(() => mockSupabaseClient),
  eq: vi.fn(() => mockSupabaseClient),
  gte: vi.fn(() => mockSupabaseClient),
  lte: vi.fn(() => mockSupabaseClient),
  is: vi.fn(() => mockSupabaseClient),
  in: vi.fn(() => mockSupabaseClient),
  order: vi.fn(() => mockSupabaseClient),
  single: vi.fn(),
  upsert: vi.fn(() => mockSupabaseClient),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('smartSchedulingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findOptimalTimeSlots', () => {
    it('should find optimal time slots without conflicts', async () => {
      const options: FindTimeOptions = {
        duration: 60,
        dateRange: {
          start: new Date('2024-01-01T00:00:00Z'),
          end: new Date('2024-01-02T00:00:00Z'),
        },
        participants: ['user1'],
        spaceId: 'space1',
      };

      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.gte.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.lte.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.is.mockResolvedValueOnce({ data: [], error: null });

      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.in.mockResolvedValueOnce({ data: [], error: null });

      const result = await smartSchedulingService.findOptimalTimeSlots(options);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should throw error when events query fails', async () => {
      const options: FindTimeOptions = {
        duration: 60,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-02'),
        },
        participants: ['user1'],
        spaceId: 'space1',
      };

      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.gte.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.lte.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.is.mockResolvedValueOnce({ data: null, error: new Error('DB error') });

      await expect(smartSchedulingService.findOptimalTimeSlots(options)).rejects.toThrow('DB error');
    });

    it('should throw error when availability query fails', async () => {
      const options: FindTimeOptions = {
        duration: 60,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-02'),
        },
        participants: ['user1'],
        spaceId: 'space1',
      };

      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.gte.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.lte.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.is.mockResolvedValueOnce({ data: [], error: null });

      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.in.mockResolvedValueOnce({ data: null, error: new Error('Availability error') });

      await expect(smartSchedulingService.findOptimalTimeSlots(options)).rejects.toThrow('Availability error');
    });
  });

  describe('findAvailableGaps', () => {
    it('should find gaps without conflicts', () => {
      const events: CalendarEvent[] = [];
      const options: FindTimeOptions = {
        duration: 60,
        dateRange: {
          start: new Date('2024-01-01T00:00:00Z'),
          end: new Date('2024-01-01T23:59:59Z'),
        },
        participants: ['user1'],
        spaceId: 'space1',
      };
      const availabilityBlocks: AvailabilityBlock[] = [];

      const result = smartSchedulingService.findAvailableGaps(events, options, availabilityBlocks);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should exclude conflicting time slots', () => {
      const events: CalendarEvent[] = [
        {
          id: 'event1',
          space_id: 'space1',
          title: 'Test Event',
          start_time: '2024-01-01T10:00:00Z',
          end_time: '2024-01-01T11:00:00Z',
          event_type: 'meeting',
          is_recurring: false,
          created_by: 'user1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        } as CalendarEvent,
      ];

      const options: FindTimeOptions = {
        duration: 60,
        dateRange: {
          start: new Date('2024-01-01T09:00:00Z'),
          end: new Date('2024-01-01T12:00:00Z'),
        },
        participants: ['user1'],
        spaceId: 'space1',
      };

      const result = smartSchedulingService.findAvailableGaps(events, options, []);

      // No slot should overlap with 10:00-11:00
      const hasConflict = result.some((slot) => {
        const slotStart = new Date(slot.start_time);
        const slotEnd = new Date(slot.end_time);
        return slotStart < new Date('2024-01-01T11:00:00Z') && slotEnd > new Date('2024-01-01T10:00:00Z');
      });

      expect(hasConflict).toBe(false);
    });
  });

  describe('scoreTimeSlots', () => {
    it('should score business hours higher', () => {
      const slots: TimeSlot[] = [
        {
          start_time: '2024-01-01T14:00:00Z',
          end_time: '2024-01-01T15:00:00Z',
          score: 0,
        },
        {
          start_time: '2024-01-01T22:00:00Z',
          end_time: '2024-01-01T23:00:00Z',
          score: 0,
        },
      ];

      const options: FindTimeOptions = {
        duration: 60,
        dateRange: { start: new Date(), end: new Date() },
        participants: [],
        spaceId: 'space1',
      };

      const result = smartSchedulingService.scoreTimeSlots(slots, options);

      expect(result[0].score).toBeGreaterThan(0);
      expect(result[0].score).toBeGreaterThan(result[1].score);
    });

    it('should prefer matched time preferences', () => {
      const slots: TimeSlot[] = [
        {
          start_time: '2024-01-01T14:00:00Z',
          end_time: '2024-01-01T15:00:00Z',
          score: 0,
        },
      ];

      const options: FindTimeOptions = {
        duration: 60,
        dateRange: { start: new Date(), end: new Date() },
        participants: [],
        spaceId: 'space1',
        preferredTimes: [
          {
            startTime: '14:00',
            endTime: '16:00',
          },
        ],
      };

      const result = smartSchedulingService.scoreTimeSlots(slots, options);

      expect(result[0].score).toBeGreaterThan(50);
    });
  });

  describe('upsertAvailabilityBlock', () => {
    it('should create availability block successfully', async () => {
      const block = {
        user_id: 'user1',
        day_of_week: 1,
        start_time: '09:00',
        end_time: '17:00',
        block_type: 'available' as const,
      };

      mockSupabaseClient.upsert.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.single.mockResolvedValueOnce({ data: { id: 'block1', ...block, created_at: '2024-01-01' }, error: null });

      const result = await smartSchedulingService.upsertAvailabilityBlock(block);

      expect(result).toHaveProperty('id');
      expect(result.user_id).toBe('user1');
    });

    it('should throw error on database failure', async () => {
      const block = {
        user_id: 'user1',
        day_of_week: 1,
        start_time: '09:00',
        end_time: '17:00',
        block_type: 'available' as const,
      };

      mockSupabaseClient.upsert.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: new Error('Insert failed') });

      await expect(smartSchedulingService.upsertAvailabilityBlock(block)).rejects.toThrow('Insert failed');
    });
  });

  describe('getAvailabilityBlocks', () => {
    it('should fetch availability blocks for user', async () => {
      const blocks = [
        { id: '1', user_id: 'user1', day_of_week: 1, start_time: '09:00', end_time: '17:00', block_type: 'available', created_at: '2024-01-01' },
      ];

      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.order.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.order.mockResolvedValueOnce({ data: blocks, error: null });

      const result = await smartSchedulingService.getAvailabilityBlocks('user1');

      expect(result).toEqual(blocks);
    });

    it('should return empty array when no blocks found', async () => {
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.order.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.order.mockResolvedValueOnce({ data: null, error: null });

      const result = await smartSchedulingService.getAvailabilityBlocks('user1');

      expect(result).toEqual([]);
    });
  });

  describe('deleteAvailabilityBlock', () => {
    it('should delete availability block successfully', async () => {
      mockSupabaseClient.delete.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockResolvedValueOnce({ data: null, error: null });

      await expect(smartSchedulingService.deleteAvailabilityBlock('block1')).resolves.toBeUndefined();
    });

    it('should throw error on delete failure', async () => {
      mockSupabaseClient.delete.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockResolvedValueOnce({ data: null, error: new Error('Delete failed') });

      await expect(smartSchedulingService.deleteAvailabilityBlock('block1')).rejects.toThrow('Delete failed');
    });
  });
});
