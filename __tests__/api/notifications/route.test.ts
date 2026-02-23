import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PATCH, DELETE } from '@/app/api/notifications/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/in-app-notifications-service', () => ({
  InAppNotificationsService: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/utils/cache-headers', () => ({
  withDynamicDataCache: vi.fn((response) => response),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/lib/sentry-utils', () => ({
  setSentryUser: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

const USER_ID = '00000000-0000-4000-8000-000000000001';

function mockRateLimitAndAuth(
  createClient: ReturnType<typeof vi.fn>,
  checkGeneralRateLimit: ReturnType<typeof vi.fn>,
  userId = USER_ID,
  authenticated = true
) {
  vi.mocked(checkGeneralRateLimit).mockResolvedValue({
    success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
  });

  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authenticated ? { id: userId } : null },
        error: authenticated ? null : { message: 'Not authenticated' },
      }),
    },
  } as any);
}

describe('/api/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false, limit: 60, remaining: 0, reset: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost/api/notifications', { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
    });

    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any, USER_ID, false);

      const request = new NextRequest('http://localhost/api/notifications', { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid query params', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any);

      const request = new NextRequest(
        'http://localhost/api/notifications?type=invalid_type',
        { method: 'GET' }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should return notifications successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { InAppNotificationsService } = await import('@/lib/services/in-app-notifications-service');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any);

      const mockNotifications = [
        { id: 'notif-1', title: 'Task due', type: 'task', is_read: false },
        { id: 'notif-2', title: 'Message received', type: 'message', is_read: true },
      ];

      const serviceMock = {
        getUserNotifications: vi.fn().mockResolvedValue(mockNotifications),
        getUnreadCount: vi.fn().mockResolvedValue(1),
      };

      vi.mocked(InAppNotificationsService).mockImplementation(function() { return serviceMock as any; });

      const request = new NextRequest('http://localhost/api/notifications', { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockNotifications);
      expect(data.unread_count).toBe(1);
    });
  });

  describe('POST', () => {
    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any, USER_ID, false);

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          user_id: USER_ID,
          type: 'task',
          title: 'New task',
          content: 'You have a new task',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid body', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any);

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        // Missing required fields
        body: JSON.stringify({ user_id: USER_ID }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should return 403 when creating notification for another user', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any);

      const OTHER_USER = '00000000-0000-4000-8000-000000000099';

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          user_id: OTHER_USER,
          type: 'task',
          title: 'New task',
          content: 'You have a new task',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Not authorized to create notifications for other users');
    });

    it('should create notification successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { InAppNotificationsService } = await import('@/lib/services/in-app-notifications-service');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any);

      const serviceMock = {
        createNotification: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(InAppNotificationsService).mockImplementation(function() { return serviceMock as any; });

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          user_id: USER_ID,
          type: 'task',
          title: 'New task',
          content: 'You have a new task',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Notification created');
    });
  });

  describe('PATCH', () => {
    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any, USER_ID, false);

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ mark_all: true }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when neither notification_ids nor mark_all provided', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { InAppNotificationsService } = await import('@/lib/services/in-app-notifications-service');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any);

      const serviceMock = { markAllAsRead: vi.fn(), markAsRead: vi.fn() };
      vi.mocked(InAppNotificationsService).mockImplementation(function() { return serviceMock as any; });

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify({}),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Either notification_ids or mark_all must be provided');
    });

    it('should mark all notifications as read successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { InAppNotificationsService } = await import('@/lib/services/in-app-notifications-service');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any);

      const serviceMock = { markAllAsRead: vi.fn().mockResolvedValue(true) };
      vi.mocked(InAppNotificationsService).mockImplementation(function() { return serviceMock as any; });

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ mark_all: true }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('All notifications marked as read');
    });

    it('should mark specific notifications as read', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { InAppNotificationsService } = await import('@/lib/services/in-app-notifications-service');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any);

      const serviceMock = { markAsRead: vi.fn().mockResolvedValue(true) };
      vi.mocked(InAppNotificationsService).mockImplementation(function() { return serviceMock as any; });

      const notifId1 = '00000000-0000-4000-8000-000000000050';
      const notifId2 = '00000000-0000-4000-8000-000000000051';

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ notification_ids: [notifId1, notifId2] }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.marked_count).toBe(2);
    });
  });

  describe('DELETE', () => {
    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any, USER_ID, false);

      const request = new NextRequest(
        'http://localhost/api/notifications?delete_all_read=true',
        { method: 'DELETE' }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when neither id nor delete_all_read provided', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { InAppNotificationsService } = await import('@/lib/services/in-app-notifications-service');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any);

      const serviceMock = { deleteAllRead: vi.fn(), deleteNotification: vi.fn() };
      vi.mocked(InAppNotificationsService).mockImplementation(function() { return serviceMock as any; });

      const request = new NextRequest('http://localhost/api/notifications', { method: 'DELETE' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Either id or delete_all_read must be provided');
    });

    it('should delete all read notifications successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { InAppNotificationsService } = await import('@/lib/services/in-app-notifications-service');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any);

      const serviceMock = { deleteAllRead: vi.fn().mockResolvedValue(true) };
      vi.mocked(InAppNotificationsService).mockImplementation(function() { return serviceMock as any; });

      const request = new NextRequest(
        'http://localhost/api/notifications?delete_all_read=true',
        { method: 'DELETE' }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('All read notifications deleted');
    });
  });
});
