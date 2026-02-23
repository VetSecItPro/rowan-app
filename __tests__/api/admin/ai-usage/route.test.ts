import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/ai-usage/route';

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

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
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

const mockUsageRows = [
  {
    user_id: '550e8400-e29b-41d4-a716-446655440001',
    space_id: '550e8400-e29b-41d4-a716-446655440002',
    date: new Date().toISOString().split('T')[0],
    input_tokens: 1000,
    output_tokens: 500,
    voice_seconds: 0,
    conversation_count: 3,
    tool_calls_count: 5,
    feature_source: 'chat',
    estimated_cost_usd: 0.0025,
  },
];

const mockProfiles = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'user1@example.com',
    full_name: 'User One',
  },
];

const mockMembers = [
  {
    user_id: '550e8400-e29b-41d4-a716-446655440001',
    role: 'owner',
    spaces: { plan_type: 'pro' },
  },
];

describe('/api/admin/ai-usage', () => {
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

      const request = new NextRequest('http://localhost/api/admin/ai-usage', {
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

      const request = new NextRequest('http://localhost/api/admin/ai-usage', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Admin authentication required');
    });

    it('returns 500 when usage query fails', async () => {
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

      const chain = createChainMock({ data: null, error: { message: 'DB error' } });
      vi.mocked(supabaseAdmin.from).mockReturnValue(chain as any);

      const request = new NextRequest('http://localhost/api/admin/ai-usage', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to fetch usage data');
    });

    it('returns 200 with aggregated usage data for today range', async () => {
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

      // First call: usage rows; subsequent calls: profiles and members
      let callCount = 0;
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'ai_usage_daily') {
          return createChainMock({ data: mockUsageRows, error: null }) as any;
        }
        if (table === 'profiles') {
          return createChainMock({ data: mockProfiles, error: null }) as any;
        }
        if (table === 'space_members') {
          return createChainMock({ data: mockMembers, error: null }) as any;
        }
        callCount++;
        return createChainMock({ data: [], error: null }) as any;
      });

      const request = new NextRequest('http://localhost/api/admin/ai-usage?range=today', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.range).toBe('today');
      expect(data.totals).toBeDefined();
      expect(data.totals.input_tokens).toBe(1000);
      expect(data.totals.output_tokens).toBe(500);
      expect(data.top_users).toBeDefined();
      expect(data.cost_by_feature).toBeDefined();
    });

    it('returns 200 with week range query', async () => {
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

      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'ai_usage_daily') {
          return createChainMock({ data: [], error: null }) as any;
        }
        return createChainMock({ data: [], error: null }) as any;
      });

      const request = new NextRequest('http://localhost/api/admin/ai-usage?range=week', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.range).toBe('week');
    });

    it('returns 200 with empty data when no usage rows exist', async () => {
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

      vi.mocked(supabaseAdmin.from).mockReturnValue(
        createChainMock({ data: [], error: null }) as any
      );

      const request = new NextRequest('http://localhost/api/admin/ai-usage', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totals.input_tokens).toBe(0);
      expect(data.totals.output_tokens).toBe(0);
      expect(data.totals.cost_usd).toBe(0);
      expect(data.top_users).toEqual([]);
    });
  });
});
