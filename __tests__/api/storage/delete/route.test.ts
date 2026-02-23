import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/storage/delete/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/storage-service', () => ({
  recalculateStorageUsage: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/security/csrf-validation', () => ({
  validateCsrfRequest: vi.fn(() => null),
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
const FILE_ID_1 = 'file-id-1';
const FILE_ID_2 = 'file-id-2';

const mockRateLimitSuccess = async () => {
  const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
  vi.mocked(checkGeneralRateLimit).mockResolvedValue({
    success: true,
    limit: 60,
    remaining: 59,
    reset: Date.now() + 60000,
  });
};

describe('/api/storage/delete', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    const { validateCsrfRequest } = await import('@/lib/security/csrf-validation');
    vi.mocked(validateCsrfRequest).mockReturnValue(null);
  });

  describe('DELETE', () => {
    it('should return error when CSRF validation fails', async () => {
      const { validateCsrfRequest } = await import('@/lib/security/csrf-validation');
      const { NextResponse } = await import('next/server');

      vi.mocked(validateCsrfRequest).mockReturnValue(
        NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
      );

      const request = new NextRequest('http://localhost/api/storage/delete', {
        method: 'DELETE',
        body: JSON.stringify({ spaceId: VALID_SPACE_ID, fileIds: [FILE_ID_1] }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Invalid CSRF token');
    });

    it('should return 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost/api/storage/delete', {
        method: 'DELETE',
        body: JSON.stringify({ spaceId: VALID_SPACE_ID, fileIds: [FILE_ID_1] }),
      });

      const response = await DELETE(request);
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

      const request = new NextRequest('http://localhost/api/storage/delete', {
        method: 'DELETE',
        body: JSON.stringify({ spaceId: VALID_SPACE_ID, fileIds: [FILE_ID_1] }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid body (empty fileIds)', async () => {
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

      const request = new NextRequest('http://localhost/api/storage/delete', {
        method: 'DELETE',
        body: JSON.stringify({ spaceId: VALID_SPACE_ID, fileIds: [] }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request');
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

      const request = new NextRequest('http://localhost/api/storage/delete', {
        method: 'DELETE',
        body: JSON.stringify({ spaceId: VALID_SPACE_ID, fileIds: [FILE_ID_1] }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied to this space');
    });

    it('should return 404 when no files found', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const spaceMemberChain = createChainMock({ data: { space_id: VALID_SPACE_ID }, error: null });
      const filesChain = createChainMock({ data: [], error: null });

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

      const request = new NextRequest('http://localhost/api/storage/delete', {
        method: 'DELETE',
        body: JSON.stringify({ spaceId: VALID_SPACE_ID, fileIds: [FILE_ID_1] }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('No files found to delete');
    });

    it('should return 403 when files do not belong to specified space', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const spaceMemberChain = createChainMock({ data: { space_id: VALID_SPACE_ID }, error: null });
      const filesChain = createChainMock({
        data: [
          {
            id: FILE_ID_1,
            name: 'file.pdf',
            bucket_id: 'space-files',
            metadata: { space_id: 'different-space-id' }, // wrong space
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

      const request = new NextRequest('http://localhost/api/storage/delete', {
        method: 'DELETE',
        body: JSON.stringify({ spaceId: VALID_SPACE_ID, fileIds: [FILE_ID_1] }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Some files do not belong to the specified space');
    });

    it('should delete files successfully and recalculate usage', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const { recalculateStorageUsage } = await import('@/lib/services/storage-service');

      const spaceMemberChain = createChainMock({ data: { space_id: VALID_SPACE_ID }, error: null });
      const filesChain = createChainMock({
        data: [
          { id: FILE_ID_1, name: 'file1.pdf', bucket_id: 'space-files', metadata: { space_id: VALID_SPACE_ID } },
          { id: FILE_ID_2, name: 'file2.pdf', bucket_id: 'space-files', metadata: { space_id: VALID_SPACE_ID } },
        ],
        error: null,
      });

      let callIndex = 0;
      const fromMock = vi.fn(() => {
        callIndex++;
        if (callIndex === 1) return spaceMemberChain;
        return filesChain;
      });

      const storageBucketMock = {
        remove: vi.fn().mockResolvedValue({ error: null }),
      };

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        from: fromMock,
        storage: {
          from: vi.fn(() => storageBucketMock),
        },
      } as any);

      vi.mocked(recalculateStorageUsage).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/storage/delete', {
        method: 'DELETE',
        body: JSON.stringify({ spaceId: VALID_SPACE_ID, fileIds: [FILE_ID_1, FILE_ID_2] }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deleted).toBe(2);
      expect(data.failed).toBe(0);
      expect(recalculateStorageUsage).toHaveBeenCalledWith(VALID_SPACE_ID);
    });
  });
});
