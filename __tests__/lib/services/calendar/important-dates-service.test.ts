import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importantDatesService } from '@/lib/services/calendar/important-dates-service';

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

/**
 * Creates a chainable mock where ALL methods return `this`,
 * and the chain is awaitable via a custom `then`.
 */
function createChainMock(resolvedValue: { data: unknown; error: unknown }) {
  const mock: Record<string, ReturnType<typeof vi.fn>> = {};
  const handler = () => mock;

  mock.select = vi.fn(handler);
  mock.eq = vi.fn(handler);
  mock.order = vi.fn(handler);
  mock.insert = vi.fn(handler);
  mock.update = vi.fn(handler);
  mock.delete = vi.fn(handler);
  mock.single = vi.fn(handler);
  mock.limit = vi.fn(handler);
  mock.then = vi.fn((resolve) => resolve(resolvedValue));

  return mock;
}

describe('important-dates-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getImportantDates', () => {
    it('should fetch and enrich important dates', async () => {
      const mockDates = [
        {
          id: 'date-1',
          space_id: 'space-1',
          title: "John's Birthday",
          person_name: 'John',
          date_type: 'birthday',
          month: 12,
          day_of_month: 25,
          year_started: 1990,
          is_active: true,
          show_on_calendar: true,
        },
      ];

      mockSupabase.from.mockReturnValue(
        createChainMock({ data: mockDates, error: null })
      );

      const result = await importantDatesService.getImportantDates('space-1');

      expect(result.dates).toBeDefined();
      expect(result.dates.length).toBeGreaterThan(0);
      expect(result.dates[0]).toHaveProperty('next_occurrence');
      expect(result.dates[0]).toHaveProperty('days_until');
    });

    it('should filter by date type', async () => {
      const chain = createChainMock({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chain);

      await importantDatesService.getImportantDates('space-1', { date_type: 'birthday' });

      expect(chain.eq).toHaveBeenCalledWith('date_type', 'birthday');
    });
  });

  describe('createImportantDate', () => {
    it('should create important date', async () => {
      const input = {
        space_id: 'space-1',
        title: 'Anniversary',
        date_type: 'anniversary' as const,
        month: 6,
        day_of_month: 15,
        year_started: 2020,
        created_by: 'user-1',
      };

      const mockDate = {
        id: 'date-1',
        ...input,
        show_on_calendar: true,
        is_active: true,
        person_name: null,
        emoji: '🎂',
        color: 'pink',
        notes: null,
        notify_days_before: [7, 1, 0],
        shopping_reminder_enabled: false,
        shopping_reminder_days_before: 7,
        shopping_reminder_text: null,
        calendar_all_day: true,
        show_on_countdown: true,
        countdown_days_before: 14,
        countdown_label: null,
        linked_calendar_event_id: null,
        year_ended: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const insertChain = createChainMock({ data: mockDate, error: null });

      // syncToCalendar will call from('events').insert().select().single()
      const eventChain = createChainMock({ data: { id: 'event-1' }, error: null });

      // After syncing, it updates the important_date with linked_calendar_event_id
      const updateChain = createChainMock({ data: null, error: null });

      let fromCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        fromCallCount++;
        if (table === 'important_dates' && fromCallCount === 1) return insertChain;
        if (table === 'events') return eventChain;
        return updateChain;
      });

      const result = await importantDatesService.createImportantDate(input);

      expect(result).toBeDefined();
      expect(result?.title).toBe('Anniversary');
    });
  });

  describe('updateImportantDate', () => {
    it('should update important date', async () => {
      const mockUpdated = {
        id: 'date-1',
        space_id: 'space-1',
        title: 'Updated Birthday',
        person_name: 'John',
        date_type: 'birthday',
        month: 12,
        day_of_month: 25,
        year_started: 1990,
        show_on_calendar: true,
        is_active: true,
        emoji: '🎂',
        color: 'pink',
        linked_calendar_event_id: null,
        year_ended: null,
        notes: null,
        notify_days_before: [7, 1, 0],
        shopping_reminder_enabled: false,
        shopping_reminder_days_before: 7,
        shopping_reminder_text: null,
        calendar_all_day: true,
        show_on_countdown: true,
        countdown_days_before: 30,
        countdown_label: null,
        created_by: 'user-1',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const updateChain = createChainMock({ data: mockUpdated, error: null });
      const eventChain = createChainMock({ data: { id: 'event-1' }, error: null });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'events') return eventChain;
        return updateChain;
      });

      const result = await importantDatesService.updateImportantDate('date-1', {
        title: 'Updated Birthday',
      });

      expect(result?.title).toBe('Updated Birthday');
    });
  });

  describe('deleteImportantDate', () => {
    it('should delete important date and linked calendar event', async () => {
      const deleteChain = createChainMock({ data: null, error: null });
      mockSupabase.from.mockReturnValue(deleteChain);

      const result = await importantDatesService.deleteImportantDate('date-1');

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('important_dates');
    });

    it('should handle deletion errors', async () => {
      const deleteChain = createChainMock({ data: null, error: { message: 'Delete failed' } });
      mockSupabase.from.mockReturnValue(deleteChain);

      const result = await importantDatesService.deleteImportantDate('date-1');

      expect(result).toBe(false);
    });
  });

  describe('getUpcomingDates', () => {
    it('should filter upcoming dates within time window', async () => {
      const now = new Date();
      const futureMonth = ((now.getMonth() + 1) % 12) + 1;
      const mockDates = [
        {
          id: 'date-1',
          space_id: 'space-1',
          title: 'Future Birthday',
          date_type: 'birthday',
          month: futureMonth,
          day_of_month: 15,
          is_active: true,
          show_on_calendar: true,
        },
      ];

      const chain = createChainMock({ data: mockDates, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await importantDatesService.getUpcomingDates('space-1', 30, 5);

      expect(result.dates).toBeDefined();
      expect(chain.eq).toHaveBeenCalledWith('is_active', true);
    });
  });

  describe('syncAllToCalendar', () => {
    it('should sync all important dates to calendar', async () => {
      const mockDates = [
        {
          id: 'date-1',
          space_id: 'space-1',
          title: 'Birthday',
          person_name: 'John',
          date_type: 'birthday',
          month: 12,
          day_of_month: 25,
          show_on_calendar: true,
          is_active: true,
          emoji: '🎂',
          year_started: 1990,
          linked_calendar_event_id: null,
        },
      ];

      const selectChain = createChainMock({ data: mockDates, error: null });
      const eventChain = createChainMock({ data: { id: 'event-1' }, error: null });
      const updateChain = createChainMock({ data: null, error: null });

      let selectDone = false;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'events') return eventChain;
        if (!selectDone) {
          selectDone = true;
          return selectChain;
        }
        return updateChain;
      });

      const result = await importantDatesService.syncAllToCalendar('space-1');

      expect(result.synced).toBeGreaterThanOrEqual(0);
      expect(result.errors).toBeGreaterThanOrEqual(0);
    });
  });
});
