import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/cron/reminder-notifications/route';

vi.mock('@/lib/jobs/reminder-notifications-job', () => ({
  processReminderNotifications: vi.fn(),
}));
vi.mock('@/lib/security/verify-secret', () => ({ verifyCronSecret: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

const CRON_SECRET = 'test-cron-secret';

beforeEach(() => {
  process.env.CRON_SECRET = CRON_SECRET;
  vi.clearAllMocks();
});

describe('/api/cron/reminder-notifications', () => {
  describe('GET', () => {
    it('returns 500 when CRON_SECRET is not configured', async () => {
      delete process.env.CRON_SECRET;

      const req = new NextRequest('http://localhost/api/cron/reminder-notifications');
      const res = await GET(req);
      expect(res.status).toBe(500);
      process.env.CRON_SECRET = CRON_SECRET;
    });

    it('returns 401 when cron secret is invalid', async () => {
      const { verifyCronSecret } = await import('@/lib/security/verify-secret');
      vi.mocked(verifyCronSecret).mockReturnValue(false);

      const req = new NextRequest('http://localhost/api/cron/reminder-notifications', {
        headers: { authorization: 'Bearer wrong' },
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('returns 200 with notification results on success', async () => {
      const { verifyCronSecret } = await import('@/lib/security/verify-secret');
      const { processReminderNotifications } = await import('@/lib/jobs/reminder-notifications-job');
      vi.mocked(verifyCronSecret).mockReturnValue(true);
      vi.mocked(processReminderNotifications).mockResolvedValue({
        success: true, notificationsSent: 4, emailsSent: 2, errors: [],
      } as any);

      const req = new NextRequest('http://localhost/api/cron/reminder-notifications', {
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });
      const res = await GET(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.notificationsSent).toBe(4);
    });

    it('returns 500 on unexpected error', async () => {
      const { verifyCronSecret } = await import('@/lib/security/verify-secret');
      const { processReminderNotifications } = await import('@/lib/jobs/reminder-notifications-job');
      vi.mocked(verifyCronSecret).mockReturnValue(true);
      vi.mocked(processReminderNotifications).mockRejectedValue(new Error('crash'));

      const req = new NextRequest('http://localhost/api/cron/reminder-notifications', {
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });
      const res = await GET(req);
      expect(res.status).toBe(500);
    });
  });
});
