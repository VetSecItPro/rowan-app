import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/cron/cleanup-deleted-accounts/route';

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    auth: { admin: { getUserById: vi.fn(), deleteUser: vi.fn() } },
  },
}));
vi.mock('@/lib/services/account-deletion-service', () => ({
  accountDeletionService: { logDeletionAction: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('@/lib/services/email-notification-service', () => ({
  send30DayWarningEmail: vi.fn().mockResolvedValue(undefined),
  sendPermanentDeletionConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/security/verify-secret', () => ({ verifyCronSecret: vi.fn() }));

const CRON_SECRET = 'test-cron-secret';

function makeChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'limit',
    'maybeSingle', 'gte', 'lte', 'lt', 'in', 'neq', 'is', 'not', 'upsert'].forEach(m => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

beforeEach(() => {
  process.env.CRON_SECRET = CRON_SECRET;
  vi.clearAllMocks();
});

describe('/api/cron/cleanup-deleted-accounts', () => {
  describe('GET', () => {
    it('returns 500 when CRON_SECRET is not configured', async () => {
      delete process.env.CRON_SECRET;
      const req = new Request('http://localhost/api/cron/cleanup-deleted-accounts');
      const res = await GET(req);
      expect(res.status).toBe(500);
      process.env.CRON_SECRET = CRON_SECRET;
    });

    it('returns 401 when authorization is invalid', async () => {
      const { verifyCronSecret } = await import('@/lib/security/verify-secret');
      vi.mocked(verifyCronSecret).mockReturnValue(false);

      const req = new Request('http://localhost/api/cron/cleanup-deleted-accounts', {
        headers: { authorization: 'Bearer wrong-secret' },
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('returns 200 with summary when authorized and no accounts need processing', async () => {
      const { verifyCronSecret } = await import('@/lib/security/verify-secret');
      vi.mocked(verifyCronSecret).mockReturnValue(true);

      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      const emptyChain = makeChainMock({ data: [], error: null });
      vi.mocked(supabaseAdmin.from).mockReturnValue(emptyChain as any);
      vi.mocked(supabaseAdmin.auth.admin.getUserById).mockResolvedValue({ data: { user: null }, error: null } as any);

      const req = new Request('http://localhost/api/cron/cleanup-deleted-accounts', {
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });
      const res = await GET(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(typeof data.warnings_sent).toBe('number');
    });
  });
});
