import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/cron/daily-digest/route';

vi.mock('@/lib/jobs/daily-digest-job', () => ({ processDailyDigest: vi.fn() }));
vi.mock('@/lib/security/verify-secret', () => ({ verifyCronSecret: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

const CRON_SECRET = 'test-cron-secret';

beforeEach(() => {
  process.env.CRON_SECRET = CRON_SECRET;
  vi.clearAllMocks();
});

describe('/api/cron/daily-digest', () => {
  describe('GET', () => {
    it('returns 500 when CRON_SECRET is not configured', async () => {
      delete process.env.CRON_SECRET;

      const req = new NextRequest('http://localhost/api/cron/daily-digest');
      const res = await GET(req);
      expect(res.status).toBe(500);
      process.env.CRON_SECRET = CRON_SECRET;
    });

    it('returns 401 when cron secret is invalid', async () => {
      const { verifyCronSecret } = await import('@/lib/security/verify-secret');
      vi.mocked(verifyCronSecret).mockReturnValue(false);

      const req = new NextRequest('http://localhost/api/cron/daily-digest', {
        headers: { authorization: 'Bearer wrong' },
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('returns 200 with digest result on success', async () => {
      const { verifyCronSecret } = await import('@/lib/security/verify-secret');
      const { processDailyDigest } = await import('@/lib/jobs/daily-digest-job');
      vi.mocked(verifyCronSecret).mockReturnValue(true);
      vi.mocked(processDailyDigest).mockResolvedValue({
        success: true, emailsSent: 5, usersProcessed: 10, errors: [],
      } as any);

      const req = new NextRequest('http://localhost/api/cron/daily-digest', {
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });
      const res = await GET(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.emailsSent).toBe(5);
      expect(data.usersProcessed).toBe(10);
    });

    it('returns 500 on unexpected error', async () => {
      const { verifyCronSecret } = await import('@/lib/security/verify-secret');
      const { processDailyDigest } = await import('@/lib/jobs/daily-digest-job');
      vi.mocked(verifyCronSecret).mockReturnValue(true);
      vi.mocked(processDailyDigest).mockRejectedValue(new Error('Unexpected failure'));

      const req = new NextRequest('http://localhost/api/cron/daily-digest', {
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });
      const res = await GET(req);
      expect(res.status).toBe(500);
    });
  });
});
