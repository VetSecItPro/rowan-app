import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '@/app/api/spaces/members/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/utils/cache-headers', () => ({
  withUserDataCache: vi.fn((response) => response),
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
const OTHER_USER_ID = '00000000-0000-4000-8000-000000000003';

const mockRateLimitSuccess = async () => {
  const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
  vi.mocked(checkGeneralRateLimit).mockResolvedValue({
    success: true,
    limit: 60,
    remaining: 59,
    reset: Date.now() + 60000,
  });
};

describe('/api/spaces/members', () => {
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

      const request = new NextRequest(`http://localhost/api/spaces/members?space_id=${VALID_SPACE_ID}`, {
        method: 'GET',
      });

      const response = await GET(request);
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

      const request = new NextRequest(`http://localhost/api/spaces/members?space_id=${VALID_SPACE_ID}`, {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when space_id is missing', async () => {
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

      const request = new NextRequest('http://localhost/api/spaces/members', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('space_id is required');
    });

    it('should return 403 when user is not a space member', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const membershipChain = createChainMock({ data: null, error: { message: 'Not found' } });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        from: vi.fn(() => membershipChain),
      } as any);

      const request = new NextRequest(`http://localhost/api/spaces/members?space_id=${VALID_SPACE_ID}`, {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this space');
    });

    it('should return members successfully', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');

      const membershipData = { role: 'owner' };
      const membersData = [
        { user_id: USER_ID, role: 'owner', joined_at: '2026-01-01T00:00:00Z' },
        { user_id: OTHER_USER_ID, role: 'member', joined_at: '2026-01-02T00:00:00Z' },
      ];
      const usersData = [
        { id: USER_ID, name: 'Alice', email: 'alice@example.com', color_theme: 'purple' },
        { id: OTHER_USER_ID, name: 'Bob', email: 'bob@example.com', color_theme: 'blue' },
      ];

      let callIndex = 0;
      const fromMock = vi.fn(() => {
        callIndex++;
        if (callIndex === 1) return createChainMock({ data: membershipData, error: null }); // membership check
        if (callIndex === 2) return createChainMock({ data: membersData, error: null }); // all members
        return createChainMock({ data: usersData, error: null }); // user details
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

      const request = new NextRequest(`http://localhost/api/spaces/members?space_id=${VALID_SPACE_ID}`, {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].isCurrentUser).toBe(true);
    });
  });

  describe('PUT', () => {
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

      const request = new NextRequest('http://localhost/api/spaces/members', {
        method: 'PUT',
        body: JSON.stringify({ user_id: OTHER_USER_ID, space_id: VALID_SPACE_ID, new_role: 'admin' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid input', async () => {
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

      const request = new NextRequest('http://localhost/api/spaces/members', {
        method: 'PUT',
        body: JSON.stringify({ user_id: 'not-a-uuid', space_id: VALID_SPACE_ID, new_role: 'superadmin' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should return 403 when caller is not owner or admin', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const callerMembership = { role: 'member' };

      let callIndex = 0;
      const fromMock = vi.fn(() => {
        callIndex++;
        return createChainMock({ data: callerMembership, error: null });
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

      const request = new NextRequest('http://localhost/api/spaces/members', {
        method: 'PUT',
        body: JSON.stringify({ user_id: OTHER_USER_ID, space_id: VALID_SPACE_ID, new_role: 'admin' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only space owners and admins can change member roles');
    });

    it('should update member role successfully', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const callerMembership = { role: 'owner' };
      const targetMembership = { user_id: OTHER_USER_ID, role: 'member' };

      let callIndex = 0;
      const fromMock = vi.fn(() => {
        callIndex++;
        if (callIndex === 1) return createChainMock({ data: callerMembership, error: null }); // caller role
        if (callIndex === 2) return createChainMock({ data: targetMembership, error: null }); // target member
        return createChainMock({ error: null }); // update
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

      const request = new NextRequest('http://localhost/api/spaces/members', {
        method: 'PUT',
        body: JSON.stringify({ user_id: OTHER_USER_ID, space_id: VALID_SPACE_ID, new_role: 'admin' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Member role updated successfully');
    });
  });

  describe('DELETE', () => {
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

      const request = new NextRequest('http://localhost/api/spaces/members', {
        method: 'DELETE',
        body: JSON.stringify({ user_id: OTHER_USER_ID, space_id: VALID_SPACE_ID }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when trying to remove yourself', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const callerMembership = { role: 'owner' };
      // target member is the same user (self-removal attempt)
      const targetMembership = { user_id: USER_ID, role: 'admin' };

      let callIndex = 0;
      const fromMock = vi.fn(() => {
        callIndex++;
        if (callIndex === 1) return createChainMock({ data: callerMembership, error: null });
        return createChainMock({ data: targetMembership, error: null });
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

      const request = new NextRequest('http://localhost/api/spaces/members', {
        method: 'DELETE',
        body: JSON.stringify({ user_id: USER_ID, space_id: VALID_SPACE_ID }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Cannot remove yourself');
    });

    it('should remove member successfully', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const callerMembership = { role: 'owner' };
      const targetMembership = { user_id: OTHER_USER_ID, role: 'member' };

      let callIndex = 0;
      const fromMock = vi.fn(() => {
        callIndex++;
        if (callIndex === 1) return createChainMock({ data: callerMembership, error: null }); // caller
        if (callIndex === 2) return createChainMock({ data: targetMembership, error: null }); // target
        return createChainMock({ error: null }); // delete
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

      const request = new NextRequest('http://localhost/api/spaces/members', {
        method: 'DELETE',
        body: JSON.stringify({ user_id: OTHER_USER_ID, space_id: VALID_SPACE_ID }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Member removed successfully');
    });
  });
});
