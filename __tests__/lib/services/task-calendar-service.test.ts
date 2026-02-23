import { describe, it, expect, vi, beforeEach } from 'vitest';
import { taskCalendarService } from '@/lib/services/task-calendar-service';

const mockSupabaseClient = vi.hoisted(() => ({
  from: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  insert: vi.fn(() => mockSupabaseClient),
  update: vi.fn(() => mockSupabaseClient),
  delete: vi.fn(() => mockSupabaseClient),
  eq: vi.fn(() => mockSupabaseClient),
  single: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('taskCalendarService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('syncTaskToCalendar', () => {
    it('should create calendar event for task', async () => {
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'task1', space_id: 'space1', title: 'Task', due_date: '2024-01-01', created_by: 'user1' },
        error: null,
      });

      mockSupabaseClient.insert.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'event1' },
        error: null,
      });

      mockSupabaseClient.insert.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'sync1', task_id: 'task1', event_id: 'event1' },
        error: null,
      });

      const result = await taskCalendarService.syncTaskToCalendar('task1');

      expect(result).not.toBeNull();
      if (result) {
        expect(result.task_id).toBe('task1');
      }
    });

    it('should return null for task without due date', async () => {
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'task1', due_date: null },
        error: null,
      });

      const result = await taskCalendarService.syncTaskToCalendar('task1');

      expect(result).toBeNull();
    });
  });

  describe('unsyncFromCalendar', () => {
    it('should delete event and sync record', async () => {
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { event_id: 'event1' },
        error: null,
      });

      mockSupabaseClient.delete.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.eq.mockResolvedValue({ error: null });

      await expect(taskCalendarService.unsyncFromCalendar('task1')).resolves.toBeUndefined();
    });
  });

  describe('getCalendarPreferences', () => {
    it('should return user preferences', async () => {
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { show_tasks_on_calendar: true, calendar_task_filter: 'all' },
        error: null,
      });

      const result = await taskCalendarService.getCalendarPreferences('user1');

      expect(result.auto_sync_tasks).toBe(true);
    });
  });

  describe('updateCalendarPreferences', () => {
    it('should update preferences', async () => {
      mockSupabaseClient.update.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockResolvedValueOnce({ error: null });

      await expect(taskCalendarService.updateCalendarPreferences('user1', true)).resolves.toBeUndefined();
    });
  });
});
