import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/storage/files/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
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

const mockRateLimitSuccess = async () => {
  const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
  vi.mocked(checkGeneralRateLimit).mockResolvedValue({
    success: true,
    limit: 60,
    remaining: 59,
    reset: Date.now() + 60000,
  });
};

describe('/api/storage/files', () => {
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

      const request = new NextRequest(`http://localhost/api/storage/files?spaceId=${VALID_SPACE_ID}`, {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Too many requests');
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

      const request = new NextRequest(`http://localhost/api/storage/files?spaceId=${VALID_SPACE_ID}`, {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when spaceId is missing', async () => {
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

      const request = new NextRequest('http://localhost/api/storage/files', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Space ID is required');
    });

    it('should return 403 when user is not a space member', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const memberChain = createChainMock({ data: null, error: { message: 'Not found' } });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        from: vi.fn(() => memberChain),
      } as any);

      const request = new NextRequest(`http://localhost/api/storage/files?spaceId=${VALID_SPACE_ID}`, {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied to this space');
    });

    it('should return empty files array when fetch error occurs (graceful degradation)', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');

      const spaceMemberChain = createChainMock({ data: { space_id: VALID_SPACE_ID }, error: null });
      const filesChain = createChainMock({ data: null, error: { message: 'Permission denied' } });

      let callIndex = 0;
      const fromMock = vi.fn(() => {
        callIndex++;
        if (callIndex === 1) return spaceMemberChain;
        return filesChain;
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        from: fromMock,
      } as any);

      const request = new NextRequest(`http://localhost/api/storage/files?spaceId=${VALID_SPACE_ID}`, {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      // Storage files API gracefully degrades to empty array on fetch error
      expect(response.status).toBe(200);
      expect(data.files).toEqual([]);
    });

    it('should return files filtered by space metadata successfully', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');

      const spaceMemberChain = createChainMock({ data: { space_id: VALID_SPACE_ID }, error: null });
      const filesChain = createChainMock({
        data: [
          {
            id: 'file-1',
            name: `${VALID_SPACE_ID}/photo.jpg`,
            metadata: { space_id: VALID_SPACE_ID, size: '204800' },
            created_at: '2026-01-01T00:00:00Z',
          },
          {
            id: 'file-2',
            name: `${VALID_SPACE_ID}/doc.pdf`,
            metadata: { space_id: VALID_SPACE_ID, size: '1048576' },
            created_at: '2026-01-02T00:00:00Z',
          },
          // This file should be filtered out by defense-in-depth check
          {
            id: 'file-3',
            name: 'other-space/file.txt',
            metadata: { space_id: 'another-space', size: '512' },
            created_at: '2026-01-03T00:00:00Z',
          },
        ],
        error: null,
      });

      let callIndex = 0;
      const fromMock = vi.fn(() => {
        callIndex++;
        if (callIndex === 1) return spaceMemberChain;
        return filesChain;
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        from: fromMock,
      } as any);

      const request = new NextRequest(`http://localhost/api/storage/files?spaceId=${VALID_SPACE_ID}`, {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Defense-in-depth filters out the file from another space
      expect(data.files).toHaveLength(2);
      expect(data.files[0].id).toBe('file-1');
      expect(data.files[0].size).toBe(204800);
    });
  });
});
