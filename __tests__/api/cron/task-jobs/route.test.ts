import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/cron/task-jobs/route';

vi.mock('@/lib/jobs/task-recurrence-job', () => ({ generateRecurringTasks: vi.fn() }));
vi.mock('@/lib/jobs/task-reminders-job', () => ({ processTaskReminders: vi.fn() }));
vi.mock('@/lib/jobs/cleanup-jobs', () => ({
  runDailyCleanup: vi.fn(),
  refreshMaterializedViews: vi.fn(),
}));
vi.mock('@/lib/jobs/chore-rotation-job', () => ({ processChoreRotations: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/security/verify-secret', () => ({ verifyCronSecret: vi.fn() }));

const CRON_SECRET = 'test-secret';

beforeEach(() => {
  process.env.CRON_SECRET = CRON_SECRET;
  vi.clearAllMocks();
});

describe('/api/cron/task-jobs', () => {
  describe('GET', () => {
    it('returns 500 when CRON_SECRET is not set', async () => {
      delete process.env.CRON_SECRET;
      const req = new Request('http://localhost/api/cron/task-jobs?job=reminders');
      const res = await GET(req);
      expect(res.status).toBe(500);
      process.env.CRON_SECRET = CRON_SECRET;
    });

    it('returns 401 when secret is invalid', async () => {
      const { verifyCronSecret } = await import('@/lib/security/verify-secret');
      vi.mocked(verifyCronSecret).mockReturnValue(false);

      const req = new Request('http://localhost/api/cron/task-jobs?job=reminders', {
        headers: { authorization: 'Bearer wrong' },
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 for an invalid job parameter', async () => {
      const { verifyCronSecret } = await import('@/lib/security/verify-secret');
      vi.mocked(verifyCronSecret).mockReturnValue(true);

      const req = new Request('http://localhost/api/cron/task-jobs?job=unknown', {
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });
      const res = await GET(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/invalid job/i);
    });

    it('runs reminders job and returns result', async () => {
      const { verifyCronSecret } = await import('@/lib/security/verify-secret');
      const { processTaskReminders } = await import('@/lib/jobs/task-reminders-job');
      vi.mocked(verifyCronSecret).mockReturnValue(true);
      vi.mocked(processTaskReminders).mockResolvedValue({ sent: 3 } as any);

      const req = new Request('http://localhost/api/cron/task-jobs?job=reminders', {
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(processTaskReminders).toHaveBeenCalledOnce();
    });

    it('runs cleanup job and returns success', async () => {
      const { verifyCronSecret } = await import('@/lib/security/verify-secret');
      const { runDailyCleanup } = await import('@/lib/jobs/cleanup-jobs');
      vi.mocked(verifyCronSecret).mockReturnValue(true);
      vi.mocked(runDailyCleanup).mockResolvedValue(undefined);

      const req = new Request('http://localhost/api/cron/task-jobs?job=cleanup', {
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });
      const res = await GET(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
