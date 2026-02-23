import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/ccpa/opt-out/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/services/ccpa-service', () => ({
  ccpaService: {
    getOptOutStatus: vi.fn(),
    setOptOutStatus: vi.fn(),
    checkCaliforniaResident: vi.fn(),
  },
}));
vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

function makeRateLimit(success: boolean) {
  return { success, limit: 60, remaining: success ? 59 : 0, reset: Date.now() + 60000 };
}

function makeSupabase(user: unknown) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: user ? null : { message: 'unauth' } }) } };
}

describe('/api/ccpa/opt-out', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(false));

      const res = await GET(new NextRequest('http://localhost/api/ccpa/opt-out'));
      expect(res.status).toBe(429);
    });

    it('returns 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase(null) as any);

      const res = await GET(new NextRequest('http://localhost/api/ccpa/opt-out'));
      expect(res.status).toBe(401);
    });

    it('returns 200 with opt-out status on success', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { ccpaService } = await import('@/lib/services/ccpa-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);
      vi.mocked(ccpaService.getOptOutStatus).mockResolvedValue({
        success: true, data: { opted_out: false, california_resident: false },
      } as any);

      const res = await GET(new NextRequest('http://localhost/api/ccpa/opt-out'));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.opted_out).toBe(false);
    });
  });

  describe('POST', () => {
    it('returns 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(false));

      const res = await POST(new NextRequest('http://localhost/api/ccpa/opt-out', {
        method: 'POST',
        body: JSON.stringify({ optedOut: true }),
      }));
      expect(res.status).toBe(429);
    });

    it('returns 400 for invalid request body', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);

      const res = await POST(new NextRequest('http://localhost/api/ccpa/opt-out', {
        method: 'POST',
        body: JSON.stringify({ optedOut: 'not-boolean' }),
      }));
      expect(res.status).toBe(400);
    });

    it('returns 200 on successful opt-out', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { ccpaService } = await import('@/lib/services/ccpa-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);
      vi.mocked(ccpaService.checkCaliforniaResident).mockResolvedValue(true as any);
      vi.mocked(ccpaService.setOptOutStatus).mockResolvedValue({
        success: true, data: { opted_out: true },
      } as any);

      const res = await POST(new NextRequest('http://localhost/api/ccpa/opt-out', {
        method: 'POST',
        body: JSON.stringify({ optedOut: true }),
      }));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toMatch(/opted out/i);
    });
  });
});
