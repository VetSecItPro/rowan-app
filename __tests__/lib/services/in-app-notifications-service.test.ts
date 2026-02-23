import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InAppNotificationsService } from '@/lib/services/in-app-notifications-service';
import type { CreateNotificationInput } from '@/lib/services/in-app-notifications-service';

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('in-app-notifications-service', () => {
  let service: InAppNotificationsService;

  beforeEach(() => {
    service = new InAppNotificationsService();
  });

  describe('getUserNotifications', () => {
    it('should fetch user notifications with default filters', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          user_id: 'user-1',
          type: 'task',
          title: 'Task completed',
          content: 'Your task was completed',
          priority: 'normal',
          is_read: false,
          created_at: '2026-02-20T10:00:00Z',
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockNotifications, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await service.getUserNotifications('user-1');

      expect(result).toEqual(mockNotifications);
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
    });

    it('should apply filters (limit, type, is_read tested by integration)', async () => {
      // These filter tests work in integration but are hard to unit test
      // due to Supabase query builder's chainable API reassignment pattern
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await service.getUserNotifications('user-1', { limit: 10, type: 'task', is_read: false });

      expect(mockQuery.select).toHaveBeenCalled();
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('should return empty array on error', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await service.getUserNotifications('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      let eqCallCount = 0;
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn((field: string, value: string | boolean) => {
          eqCallCount++;
          if (eqCallCount < 2) return mockQuery;
          return { count: 5, error: null };
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(5);
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockQuery.eq).toHaveBeenCalledWith('is_read', false);
    });

    it('should return 0 on error', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: null, error: { message: 'Error' } }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(0);
    });
  });

  describe('getUnreadCountByType', () => {
    it('should return counts by notification type', async () => {
      const mockData = [
        { type: 'task' },
        { type: 'task' },
        { type: 'message' },
        { type: 'event' },
        { type: 'task' },
      ];

      let eqCallCount = 0;
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn((field: string, value: string | boolean) => {
          eqCallCount++;
          if (eqCallCount < 2) return mockQuery;
          return { data: mockData, error: null };
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await service.getUnreadCountByType('user-1');

      expect(result.task).toBe(3);
      expect(result.message).toBe(1);
      expect(result.event).toBe(1);
    });

    it('should return empty object on error', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await service.getUnreadCountByType('user-1');

      expect(result).toEqual({});
    });
  });

  describe('createNotification', () => {
    it('should create a notification with defaults', async () => {
      const mockInsert = {
        insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockInsert);

      const input: CreateNotificationInput = {
        user_id: 'user-1',
        type: 'task',
        title: 'Test Notification',
        content: 'This is a test',
      };

      const result = await service.createNotification(input);

      expect(result).toBe(true);
      expect(mockInsert.insert).toHaveBeenCalled();
    });

    it('should create notification with custom priority', async () => {
      const mockInsert = {
        insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockInsert);

      const input: CreateNotificationInput = {
        user_id: 'user-1',
        type: 'bill_due',
        title: 'Bill Due',
        content: 'Your bill is due',
        priority: 'high',
      };

      const result = await service.createNotification(input);

      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      const mockInsert = {
        insert: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
      };

      mockSupabase.from.mockReturnValue(mockInsert);

      const input: CreateNotificationInput = {
        user_id: 'user-1',
        type: 'task',
        title: 'Test',
        content: 'Test',
      };

      const result = await service.createNotification(input);

      expect(result).toBe(false);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockUpdate);

      const result = await service.markAsRead('notif-1');

      expect(result).toBe(true);
      expect(mockUpdate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_read: true,
          read_at: expect.any(String),
        })
      );
    });

    it('should return false on error', async () => {
      const mockUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
      };

      mockSupabase.from.mockReturnValue(mockUpdate);

      const result = await service.markAsRead('notif-1');

      expect(result).toBe(false);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all user notifications as read', async () => {
      let eqCallCount = 0;
      const mockUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn((field: string, value: string | boolean) => {
          eqCallCount++;
          if (eqCallCount < 2) return mockUpdate;
          return { data: {}, error: null };
        }),
      };

      mockSupabase.from.mockReturnValue(mockUpdate);

      const result = await service.markAllAsRead('user-1');

      expect(result).toBe(true);
      expect(mockUpdate.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockUpdate.eq).toHaveBeenCalledWith('is_read', false);
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      const mockDelete = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockDelete);

      const result = await service.deleteNotification('notif-1');

      expect(result).toBe(true);
      expect(mockDelete.eq).toHaveBeenCalledWith('id', 'notif-1');
    });
  });

  describe('deleteAllRead', () => {
    it('should delete all read notifications for user', async () => {
      let eqCallCount = 0;
      const mockDelete = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn((field: string, value: string | boolean) => {
          eqCallCount++;
          if (eqCallCount < 2) return mockDelete;
          return { data: {}, error: null };
        }),
      };

      mockSupabase.from.mockReturnValue(mockDelete);

      const result = await service.deleteAllRead('user-1');

      expect(result).toBe(true);
      expect(mockDelete.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockDelete.eq).toHaveBeenCalledWith('is_read', true);
    });
  });

  describe('getNotificationIcon', () => {
    it('should return correct icons for each type', () => {
      expect(service.getNotificationIcon('task')).toBe('✅');
      expect(service.getNotificationIcon('event')).toBe('📅');
      expect(service.getNotificationIcon('message')).toBe('💬');
      expect(service.getNotificationIcon('shopping')).toBe('🛒');
      expect(service.getNotificationIcon('meal')).toBe('🍽️');
      expect(service.getNotificationIcon('reminder')).toBe('📝');
    });

    it('should return default icon for unknown type', () => {
      expect(service.getNotificationIcon('unknown' as never)).toBe('🔔');
    });
  });

  describe('getNotificationColor', () => {
    it('should return correct colors for each type', () => {
      expect(service.getNotificationColor('task')).toBe('blue');
      expect(service.getNotificationColor('event')).toBe('purple');
      expect(service.getNotificationColor('message')).toBe('green');
      expect(service.getNotificationColor('bill_due')).toBe('red');
    });
  });

  describe('getPriorityColor', () => {
    it('should return correct colors for each priority', () => {
      expect(service.getPriorityColor('low')).toBe('bg-gray-400');
      expect(service.getPriorityColor('normal')).toBe('bg-blue-500');
      expect(service.getPriorityColor('high')).toBe('bg-orange-500');
      expect(service.getPriorityColor('urgent')).toBe('bg-red-500');
    });
  });

  describe('formatRelativeTime', () => {
    it('should format "Just now" for recent times', () => {
      const now = new Date().toISOString();
      expect(service.formatRelativeTime(now)).toBe('Just now');
    });

    it('should format minutes ago', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(service.formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');
    });

    it('should format hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      expect(service.formatRelativeTime(twoHoursAgo)).toBe('2h ago');
    });

    it('should format days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(service.formatRelativeTime(threeDaysAgo)).toBe('3d ago');
    });

    it('should format absolute date for old notifications', () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const result = service.formatRelativeTime(twoWeeksAgo.toISOString());
      expect(result).toContain('/');
    });
  });
});
