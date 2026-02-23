import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/spaces/[spaceId]/export/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/space-export-service', () => ({
  exportSpaceData: vi.fn(),
  getSpaceExportSummary: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
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

function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  [
    'select', 'eq', 'order', 'insert', 'update', 'delete',
    'single', 'limit', 'maybeSingle', 'gte', 'lte', 'in',
    'neq', 'is', 'not', 'upsert', 'match', 'or', 'filter', 'ilike',
  ].forEach((m) => { mock[m] = vi.fn(handler); });
  mock.then = vi.fn((resolve: (value: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

const VALID_SPACE_ID = '00000000-0000-4000-8000-000000000002';
const USER_ID = '00000000-0000-4000-8000-000000000001';

const makeParams = (spaceId: string) => ({ params: Promise.resolve({ spaceId }) });

const mockRateLimitSuccess = async () => {
  const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
  vi.mocked(checkGeneralRateLimit).mockResolvedValue({
    success: true,
    limit: 60,
    remaining: 59,
    reset: Date.now() + 60000,
  });
};

describe('/api/spaces/[spaceId]/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest(`http://localhost/api/spaces/${VALID_SPACE_ID}/export`, {
        method: 'GET',
      });

      const response = await GET(request, makeParams(VALID_SPACE_ID));
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('should return 401 when not authenticated', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      } as any);

      const request = new NextRequest(`http://localhost/api/spaces/${VALID_SPACE_ID}/export`, {
        method: 'GET',
      });

      const response = await GET(request, makeParams(VALID_SPACE_ID));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid space ID format', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/spaces/not-a-uuid/export', {
        method: 'GET',
      });

      const response = await GET(request, makeParams('not-a-uuid'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid Space ID format');
    });

    it('should return 403 when user is not the owner', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const { getSpaceExportSummary } = await import('@/lib/services/space-export-service');

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
      } as any);

      vi.mocked(getSpaceExportSummary).mockResolvedValue({
        success: false,
        error: 'Only the space owner can export data',
      });

      const request = new NextRequest(`http://localhost/api/spaces/${VALID_SPACE_ID}/export`, {
        method: 'GET',
      });

      const response = await GET(request, makeParams(VALID_SPACE_ID));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only the space owner can export data');
    });

    it('should return export summary successfully', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const { getSpaceExportSummary } = await import('@/lib/services/space-export-service');

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
      } as any);

      const summaryData = {
        spaceName: 'Smith Family',
        memberCount: 3,
        taskCount: 42,
        shoppingListCount: 5,
      };

      vi.mocked(getSpaceExportSummary).mockResolvedValue({
        success: true,
        data: summaryData as any,
      });

      const request = new NextRequest(`http://localhost/api/spaces/${VALID_SPACE_ID}/export`, {
        method: 'GET',
      });

      const response = await GET(request, makeParams(VALID_SPACE_ID));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.spaceName).toBe('Smith Family');
      expect(data.data.memberCount).toBe(3);
    });
  });

  describe('POST', () => {
    it('should return 401 when not authenticated', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      } as any);

      const request = new NextRequest(`http://localhost/api/spaces/${VALID_SPACE_ID}/export`, {
        method: 'POST',
        body: JSON.stringify({ format: 'json' }),
      });

      const response = await POST(request, makeParams(VALID_SPACE_ID));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid format', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
      } as any);

      const request = new NextRequest(`http://localhost/api/spaces/${VALID_SPACE_ID}/export`, {
        method: 'POST',
        body: JSON.stringify({ format: 'xml' }),
      });

      const response = await POST(request, makeParams(VALID_SPACE_ID));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid format. Must be json or csv.');
    });

    it('should return 403 when user is not the owner', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const { exportSpaceData } = await import('@/lib/services/space-export-service');

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        from: vi.fn(() => createChainMock({ data: null, error: null })),
      } as any);

      vi.mocked(exportSpaceData).mockResolvedValue({
        success: false,
        error: 'Only the space owner can export data',
      });

      const request = new NextRequest(`http://localhost/api/spaces/${VALID_SPACE_ID}/export`, {
        method: 'POST',
        body: JSON.stringify({ format: 'json' }),
      });

      const response = await POST(request, makeParams(VALID_SPACE_ID));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only the space owner can export data');
    });

    it('should export space data as JSON successfully', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const { exportSpaceData } = await import('@/lib/services/space-export-service');

      const spaceChain = createChainMock({ data: { name: 'Smith Family' }, error: null });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        from: vi.fn(() => spaceChain),
      } as any);

      const exportData = { tasks: [], shoppingLists: [], members: [] };
      vi.mocked(exportSpaceData).mockResolvedValue({
        success: true,
        data: exportData as any,
      });

      const request = new NextRequest(`http://localhost/api/spaces/${VALID_SPACE_ID}/export`, {
        method: 'POST',
        body: JSON.stringify({ format: 'json' }),
      });

      const response = await POST(request, makeParams(VALID_SPACE_ID));

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/json');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('.json');
    });

    it('should export space data as CSV successfully', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const { exportSpaceData } = await import('@/lib/services/space-export-service');

      const spaceChain = createChainMock({ data: { name: 'Smith Family' }, error: null });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        from: vi.fn(() => spaceChain),
      } as any);

      vi.mocked(exportSpaceData).mockResolvedValue({
        success: true,
        data: 'id,name\n1,Task One' as any,
      });

      const request = new NextRequest(`http://localhost/api/spaces/${VALID_SPACE_ID}/export`, {
        method: 'POST',
        body: JSON.stringify({ format: 'csv' }),
      });

      const response = await POST(request, makeParams(VALID_SPACE_ID));

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('.csv');
    });
  });
});
