import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/spaces/[spaceId]/delete/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/spaces-service', () => ({
  deleteSpace: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/security/csrf-validation', () => ({
  validateCsrfRequest: vi.fn(() => null), // null = no error by default
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
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

describe('/api/spaces/[spaceId]/delete', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    // Re-establish default mock: no CSRF error
    const { validateCsrfRequest } = await import('@/lib/security/csrf-validation');
    vi.mocked(validateCsrfRequest).mockReturnValue(null);
  });

  describe('DELETE', () => {
    it('should return CSRF error when CSRF validation fails', async () => {
      const { validateCsrfRequest } = await import('@/lib/security/csrf-validation');
      const { NextResponse } = await import('next/server');

      vi.mocked(validateCsrfRequest).mockReturnValue(
        NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
      );

      const request = new NextRequest(`http://localhost/api/spaces/${VALID_SPACE_ID}/delete`, {
        method: 'DELETE',
        body: JSON.stringify({ confirmation: 'DELETE_SPACE', spaceName: 'Smith Family' }),
      });

      const response = await DELETE(request, makeParams(VALID_SPACE_ID));
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

      const request = new NextRequest(`http://localhost/api/spaces/${VALID_SPACE_ID}/delete`, {
        method: 'DELETE',
        body: JSON.stringify({ confirmation: 'DELETE_SPACE', spaceName: 'Smith Family' }),
      });

      const response = await DELETE(request, makeParams(VALID_SPACE_ID));
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

      const request = new NextRequest(`http://localhost/api/spaces/${VALID_SPACE_ID}/delete`, {
        method: 'DELETE',
        body: JSON.stringify({ confirmation: 'DELETE_SPACE', spaceName: 'Smith Family' }),
      });

      const response = await DELETE(request, makeParams(VALID_SPACE_ID));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid body (missing confirmation)', async () => {
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

      const request = new NextRequest(`http://localhost/api/spaces/${VALID_SPACE_ID}/delete`, {
        method: 'DELETE',
        body: JSON.stringify({ spaceName: 'Smith Family' }), // missing confirmation
      });

      const response = await DELETE(request, makeParams(VALID_SPACE_ID));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request');
    });

    it('should return 404 when space not found', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const spaceChain = createChainMock({ data: null, error: { message: 'Not found' } });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        from: vi.fn(() => spaceChain),
      } as any);

      const request = new NextRequest(`http://localhost/api/spaces/${VALID_SPACE_ID}/delete`, {
        method: 'DELETE',
        body: JSON.stringify({ confirmation: 'DELETE_SPACE', spaceName: 'Smith Family' }),
      });

      const response = await DELETE(request, makeParams(VALID_SPACE_ID));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Space not found');
    });

    it('should return 403 when user is not the owner', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const spaceChain = createChainMock({ data: { id: VALID_SPACE_ID, name: 'Smith Family' }, error: null });
      const membershipChain = createChainMock({ data: { role: 'member' }, error: null });

      let callIndex = 0;
      const fromMock = vi.fn(() => {
        callIndex++;
        if (callIndex === 1) return spaceChain;
        return membershipChain;
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

      const request = new NextRequest(`http://localhost/api/spaces/${VALID_SPACE_ID}/delete`, {
        method: 'DELETE',
        body: JSON.stringify({ confirmation: 'DELETE_SPACE', spaceName: 'Smith Family' }),
      });

      const response = await DELETE(request, makeParams(VALID_SPACE_ID));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only space owners can delete spaces');
    });

    it('should return 400 when space name does not match', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const spaceChain = createChainMock({ data: { id: VALID_SPACE_ID, name: 'Smith Family' }, error: null });
      const membershipChain = createChainMock({ data: { role: 'owner' }, error: null });

      let callIndex = 0;
      const fromMock = vi.fn(() => {
        callIndex++;
        if (callIndex === 1) return spaceChain;
        return membershipChain;
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

      const request = new NextRequest(`http://localhost/api/spaces/${VALID_SPACE_ID}/delete`, {
        method: 'DELETE',
        body: JSON.stringify({ confirmation: 'DELETE_SPACE', spaceName: 'Wrong Name' }),
      });

      const response = await DELETE(request, makeParams(VALID_SPACE_ID));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Space name does not match');
    });

    it('should delete space successfully', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const { deleteSpace } = await import('@/lib/services/spaces-service');

      const spaceChain = createChainMock({ data: { id: VALID_SPACE_ID, name: 'Smith Family' }, error: null });
      const membershipChain = createChainMock({ data: { role: 'owner' }, error: null });

      let callIndex = 0;
      const fromMock = vi.fn(() => {
        callIndex++;
        if (callIndex === 1) return spaceChain;
        return membershipChain;
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

      vi.mocked(deleteSpace).mockResolvedValue({ success: true });

      const request = new NextRequest(`http://localhost/api/spaces/${VALID_SPACE_ID}/delete`, {
        method: 'DELETE',
        body: JSON.stringify({ confirmation: 'DELETE_SPACE', spaceName: 'Smith Family' }),
      });

      const response = await DELETE(request, makeParams(VALID_SPACE_ID));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Space deleted successfully');
    });
  });
});
