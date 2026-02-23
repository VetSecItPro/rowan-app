import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/cron/process-notifications/route';

vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: vi.fn() } }));
vi.mock('@/lib/services/notification-queue-service', () => ({
  notificationQueueService: {
    getPendingNotifications: vi.fn(),
    markAsSent: vi.fn(),
    markAsFailed: vi.fn(),
    cleanup: vi.fn(),
  },
}));
vi.mock('@/lib/services/email-service', () => ({
  sendTaskAssignmentEmail: vi.fn(),
  sendEventReminderEmail: vi.fn(),
  sendNewMessageEmail: vi.fn(),
  sendShoppingListEmail: vi.fn(),
  sendMealReminderEmail: vi.fn(),
  sendGeneralReminderEmail: vi.fn(),
}));
vi.mock('@/lib/security/verify-secret', () => ({ verifyCronSecret: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

const CRON_SECRET = 'test-cron-secret';

beforeEach(() => {
  process.env.CRON_SECRET = CRON_SECRET;
  vi.clearAllMocks();
});

describe('/api/cron/process-notifications', () => {
  describe('GET', () => {
    it('returns 500 when CRON_SECRET is not configured', async () => {
      delete process.env.CRON_SECRET;

      const req = new NextRequest('http://localhost/api/cron/process-notifications');
      const res = await GET(req);
      expect(res.status).toBe(500);
      process.env.CRON_SECRET = CRON_SECRET;
    });

    it('returns 401 when cron secret is invalid', async () => {
      const { verifyCronSecret } = await import('@/lib/security/verify-secret');
      vi.mocked(verifyCronSecret).mockReturnValue(false);

      const req = new NextRequest('http://localhost/api/cron/process-notifications', {
        headers: { authorization: 'Bearer wrong' },
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('returns 200 with no pending notifications', async () => {
      const { verifyCronSecret } = await import('@/lib/security/verify-secret');
      const { notificationQueueService } = await import('@/lib/services/notification-queue-service');
      vi.mocked(verifyCronSecret).mockReturnValue(true);
      vi.mocked(notificationQueueService.getPendingNotifications).mockResolvedValue([]);
      vi.mocked(notificationQueueService.cleanup).mockResolvedValue(0 as any);

      const req = new NextRequest('http://localhost/api/cron/process-notifications', {
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });
      const res = await GET(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.processed).toBe(0);
      expect(data.message).toMatch(/no pending/i);
    });

    it('processes pending notifications and returns counts', async () => {
      const { verifyCronSecret } = await import('@/lib/security/verify-secret');
      const { notificationQueueService } = await import('@/lib/services/notification-queue-service');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(verifyCronSecret).mockReturnValue(true);
      vi.mocked(notificationQueueService.getPendingNotifications).mockResolvedValue([
        {
          id: 'notif-1', user_id: 'user-1', delivery_method: 'instant',
          retry_count: 0,
          notification_data: { type: 'task', title: 'Do laundry' },
        },
      ] as any);
      vi.mocked(notificationQueueService.markAsSent).mockResolvedValue(undefined as any);
      vi.mocked(notificationQueueService.cleanup).mockResolvedValue(0 as any);

      const chainMock: Record<string, unknown> = {};
      const handler = () => chainMock;
      ['select', 'eq', 'single'].forEach(m => { chainMock[m] = vi.fn(handler); });
      chainMock.then = vi.fn((resolve: (v: unknown) => unknown) =>
        resolve({ data: { email: 'test@example.com', name: 'Test' }, error: null })
      );
      vi.mocked(supabaseAdmin.from).mockReturnValue(chainMock as any);

      const { sendTaskAssignmentEmail } = await import('@/lib/services/email-service');
      vi.mocked(sendTaskAssignmentEmail).mockResolvedValue({ success: true } as any);

      const req = new NextRequest('http://localhost/api/cron/process-notifications', {
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });
      const res = await GET(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
