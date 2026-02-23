import { describe, it, expect, vi, beforeEach } from 'vitest';
import { countdownService } from '@/lib/services/calendar/countdown-service';

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

describe('countdown-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getActiveCountdowns', () => {
    it('should fetch and merge countdowns from both events and important dates', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          space_id: 'space-1',
          title: 'Birthday Party',
          start_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          show_countdown: true,
          countdown_label: 'Party Time',
        },
      ];

      const mockImportantDates = [
        {
          id: 'date-1',
          space_id: 'space-1',
          title: 'Anniversary',
          person_name: 'John',
          date_type: 'anniversary',
          month: 12,
          day_of_month: 25,
          year_started: 2020,
          show_on_countdown: true,
          countdown_days_before: 30,
        },
      ];

      const eventsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockEvents, error: null }),
      };

      const datesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockImportantDates, error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'calendar_events') return eventsQuery;
        if (table === 'important_dates') return datesQuery;
        return eventsQuery;
      });

      const result = await countdownService.getActiveCountdowns('space-1', 10);

      expect(result.countdowns).toBeDefined();
      expect(Array.isArray(result.countdowns)).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('calendar_events');
      expect(mockSupabase.from).toHaveBeenCalledWith('important_dates');
    });

    it('should filter out past countdowns', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          space_id: 'space-1',
          title: 'Past Event',
          start_time: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          show_countdown: true,
        },
      ];

      const eventsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockEvents, error: null }),
      };

      const datesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'calendar_events') return eventsQuery;
        if (table === 'important_dates') return datesQuery;
        return eventsQuery;
      });

      const result = await countdownService.getActiveCountdowns('space-1');

      expect(result.countdowns).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      };

      mockSupabase.from.mockReturnValue(query);

      const result = await countdownService.getActiveCountdowns('space-1');

      expect(result.error).toBeUndefined(); // Service handles errors internally
    });
  });

  describe('getTodayCountdowns', () => {
    it('should fetch countdowns for today only', async () => {
      const today = new Date();
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const mockEvents = [
        {
          id: 'event-1',
          space_id: 'space-1',
          title: 'Today Event',
          start_time: new Date().toISOString(),
          show_countdown: true,
        },
      ];

      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockEvents, error: null }),
      };

      mockSupabase.from.mockReturnValue(query);

      const result = await countdownService.getTodayCountdowns('space-1');

      expect(result.countdowns).toBeDefined();
      expect(query.gte).toHaveBeenCalled();
      expect(query.lte).toHaveBeenCalled();
    });
  });

  describe('toggleCountdown', () => {
    it('should toggle countdown display for an event', async () => {
      const query = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from.mockReturnValue(query);

      const result = await countdownService.toggleCountdown('event-1', true, 'Custom Label');

      expect(result.success).toBe(true);
      expect(query.update).toHaveBeenCalledWith({
        show_countdown: true,
        countdown_label: 'Custom Label',
      });
      expect(query.eq).toHaveBeenCalledWith('id', 'event-1');
    });

    it('should handle errors when toggling countdown', async () => {
      const query = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
      };

      mockSupabase.from.mockReturnValue(query);

      const result = await countdownService.toggleCountdown('event-1', true);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update countdown settings');
    });
  });

  describe('getEventCountdown', () => {
    it('should fetch countdown for a specific event', async () => {
      const mockEvent = {
        id: 'event-1',
        space_id: 'space-1',
        title: 'Test Event',
        start_time: new Date(Date.now() + 86400000).toISOString(),
        show_countdown: true,
      };

      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockEvent, error: null }),
      };

      mockSupabase.from.mockReturnValue(query);

      const result = await countdownService.getEventCountdown('event-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('event-1');
      expect(result?.daysRemaining).toBeGreaterThanOrEqual(0);
    });

    it('should return null for non-existent event', async () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      };

      mockSupabase.from.mockReturnValue(query);

      const result = await countdownService.getEventCountdown('nonexistent');

      expect(result).toBeNull();
    });
  });
});
