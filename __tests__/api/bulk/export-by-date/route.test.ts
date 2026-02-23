import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/bulk/export-by-date/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/services/bulk-operations-service', () => ({ bulkExportByDateRange: vi.fn() }));
vi.mock('@/lib/ratelimit', () => ({ checkExpensiveOperationRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

function makeRateLimit(success: boolean) {
  return { success, limit: 5, remaining: success ? 4 : 0, reset: Date.now() + 3600000 };
}

function makeSupabase(user: unknown) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: user ? null : { message: 'No auth' } }) } };
}

describe('/api/bulk/export-by-date', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 429 when rate limited', async () => {
      const { checkExpensiveOperationRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkExpensiveOperationRateLimit).mockResolvedValue(makeRateLimit(false));

      const res = await GET(new NextRequest('http://localhost/api/bulk/export-by-date?type=expenses&start_date=2024-01-01&end_date=2024-01-31'));
      expect(res.status).toBe(429);
    });

    it('returns 401 when not authenticated', async () => {
      const { checkExpensiveOperationRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkExpensiveOperationRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase(null) as any);

      const res = await GET(new NextRequest('http://localhost/api/bulk/export-by-date?type=expenses&start_date=2024-01-01&end_date=2024-01-31'));
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid query params', async () => {
      const { checkExpensiveOperationRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkExpensiveOperationRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);

      const res = await GET(new NextRequest('http://localhost/api/bulk/export-by-date?type=invalid_type&start_date=2024-01-01&end_date=2024-01-31'));
      expect(res.status).toBe(400);
    });

    it('returns 200 with JSON export data on success', async () => {
      const { checkExpensiveOperationRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { bulkExportByDateRange } = await import('@/lib/services/bulk-operations-service');
      vi.mocked(checkExpensiveOperationRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);
      vi.mocked(bulkExportByDateRange).mockResolvedValue({
        success: true, data: [{ id: '1', amount: 50 }], count: 1,
      } as any);

      const res = await GET(new NextRequest('http://localhost/api/bulk/export-by-date?type=expenses&start_date=2024-01-01&end_date=2024-01-31'));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.count).toBe(1);
    });

    it('returns CSV content type when format=csv', async () => {
      const { checkExpensiveOperationRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { bulkExportByDateRange } = await import('@/lib/services/bulk-operations-service');
      vi.mocked(checkExpensiveOperationRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);
      vi.mocked(bulkExportByDateRange).mockResolvedValue({
        success: true, data: [{ id: '1', amount: 50 }], count: 1,
      } as any);

      const res = await GET(new NextRequest('http://localhost/api/bulk/export-by-date?type=expenses&start_date=2024-01-01&end_date=2024-01-31&format=csv'));
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('text/csv');
    });
  });
});
