import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/ai-usage/realtime/route';

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock('@/lib/utils/admin-auth', () => ({
  verifyAdminAuth: vi.fn(),
}));

function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'limit',
   'maybeSingle', 'gte', 'lte', 'lt', 'in', 'neq', 'is', 'not', 'upsert',
   'match', 'or', 'filter', 'ilike', 'range', 'textSearch', 'contains'].forEach(m => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

describe('/api/admin/ai-usage/realtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost/api/admin/ai-usage/realtime', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when admin auth fails', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { verifyAdminAuth } = await import('@/lib/utils/admin-auth');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(verifyAdminAuth).mockResolvedValue({
        isValid: false,
        error: 'Admin authentication required',
      });

      const request = new NextRequest('http://localhost/api/admin/ai-usage/realtime', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Admin authentication required');
    });

    it('returns 200 with today cost totals', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { verifyAdminAuth } = await import('@/lib/utils/admin-auth');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(verifyAdminAuth).mockResolvedValue({
        isValid: true,
        adminId: 'admin-1',
      });

      const todayRows = [
        {
          user_id: '550e8400-e29b-41d4-a716-446655440001',
          estimated_cost_usd: 0.005,
          input_tokens: 2000,
          output_tokens: 1000,
        },
        {
          user_id: '550e8400-e29b-41d4-a716-446655440002',
          estimated_cost_usd: 0.003,
          input_tokens: 1000,
          output_tokens: 500,
        },
      ];

      const chain = createChainMock({ data: todayRows, error: null });
      vi.mocked(supabaseAdmin.from).mockReturnValue(chain as any);

      const request = new NextRequest('http://localhost/api/admin/ai-usage/realtime', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.today_cost_usd).toBeCloseTo(0.008, 5);
      expect(data.today_input_tokens).toBe(3000);
      expect(data.today_output_tokens).toBe(1500);
      expect(data.active_users).toBe(2);
      expect(data.timestamp).toBeDefined();
    });

    it('returns 200 with zeros when no usage data for today', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { verifyAdminAuth } = await import('@/lib/utils/admin-auth');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(verifyAdminAuth).mockResolvedValue({
        isValid: true,
        adminId: 'admin-1',
      });

      const chain = createChainMock({ data: null, error: null });
      vi.mocked(supabaseAdmin.from).mockReturnValue(chain as any);

      const request = new NextRequest('http://localhost/api/admin/ai-usage/realtime', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.today_cost_usd).toBe(0);
      expect(data.today_input_tokens).toBe(0);
      expect(data.today_output_tokens).toBe(0);
      expect(data.active_users).toBe(0);
    });

    it('deduplicates users for active_users count', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { verifyAdminAuth } = await import('@/lib/utils/admin-auth');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(verifyAdminAuth).mockResolvedValue({
        isValid: true,
        adminId: 'admin-1',
      });

      // Same user appearing twice (two different feature sources)
      const rows = [
        { user_id: '550e8400-e29b-41d4-a716-446655440001', estimated_cost_usd: 0.001, input_tokens: 100, output_tokens: 50 },
        { user_id: '550e8400-e29b-41d4-a716-446655440001', estimated_cost_usd: 0.002, input_tokens: 200, output_tokens: 100 },
      ];

      const chain = createChainMock({ data: rows, error: null });
      vi.mocked(supabaseAdmin.from).mockReturnValue(chain as any);

      const request = new NextRequest('http://localhost/api/admin/ai-usage/realtime', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.active_users).toBe(1);
    });
  });
});
