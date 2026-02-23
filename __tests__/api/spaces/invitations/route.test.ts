import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, DELETE, PUT } from '@/app/api/spaces/invitations/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/invitations-service', () => ({
  getPendingInvitations: vi.fn(),
  cancelInvitation: vi.fn(),
  resendInvitation: vi.fn(),
}));

vi.mock('@/lib/services/email-service', () => ({
  sendSpaceInvitationEmail: vi.fn(),
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

vi.mock('@/lib/utils/app-url', () => ({
  buildAppUrl: vi.fn((path: string, params: Record<string, string>) =>
    `https://app.example.com${path}?token=${params.token}`
  ),
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
const VALID_INVITATION_ID = '00000000-0000-4000-8000-000000000020';

const mockRateLimitSuccess = async () => {
  const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
  vi.mocked(checkGeneralRateLimit).mockResolvedValue({
    success: true,
    limit: 60,
    remaining: 59,
    reset: Date.now() + 60000,
  });
};

const mockAuthUser = async (userId = 'user-123') => {
  const { createClient } = await import('@/lib/supabase/server');
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  } as any);
};

describe('/api/spaces/invitations', () => {
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

      const request = new NextRequest(`http://localhost/api/spaces/invitations?space_id=${VALID_SPACE_ID}`, {
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

      const request = new NextRequest(`http://localhost/api/spaces/invitations?space_id=${VALID_SPACE_ID}`, {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when space_id is missing', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const request = new NextRequest('http://localhost/api/spaces/invitations', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('space_id is required');
    });

    it('should return pending invitations successfully', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { getPendingInvitations } = await import('@/lib/services/invitations-service');

      const mockInvitations = [
        {
          id: VALID_INVITATION_ID,
          email: 'invitee@example.com',
          role: 'member',
          token: 'token-abc',
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        },
      ];

      vi.mocked(getPendingInvitations).mockResolvedValue({
        success: true,
        data: mockInvitations as any,
      });

      const request = new NextRequest(`http://localhost/api/spaces/invitations?space_id=${VALID_SPACE_ID}`, {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].invitation_url).toContain('token-abc');
    });

    it('should return 400 when service fails', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { getPendingInvitations } = await import('@/lib/services/invitations-service');
      vi.mocked(getPendingInvitations).mockResolvedValue({
        success: false,
        error: 'Permission denied',
        data: [] as any,
      });

      const request = new NextRequest(`http://localhost/api/spaces/invitations?space_id=${VALID_SPACE_ID}`, {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Permission denied');
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

      const request = new NextRequest('http://localhost/api/spaces/invitations', {
        method: 'DELETE',
        body: JSON.stringify({ invitation_id: VALID_INVITATION_ID }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid input', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const request = new NextRequest('http://localhost/api/spaces/invitations', {
        method: 'DELETE',
        body: JSON.stringify({ invitation_id: 'not-a-uuid' }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });

    it('should cancel invitation successfully', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { cancelInvitation } = await import('@/lib/services/invitations-service');
      vi.mocked(cancelInvitation).mockResolvedValue({
        success: true,
        data: {} as any,
      });

      const request = new NextRequest('http://localhost/api/spaces/invitations', {
        method: 'DELETE',
        body: JSON.stringify({ invitation_id: VALID_INVITATION_ID }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Invitation cancelled');
    });

    it('should return 400 when cancel fails', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { cancelInvitation } = await import('@/lib/services/invitations-service');
      vi.mocked(cancelInvitation).mockResolvedValue({
        success: false,
        error: 'Invitation not found or already cancelled',
      });

      const request = new NextRequest('http://localhost/api/spaces/invitations', {
        method: 'DELETE',
        body: JSON.stringify({ invitation_id: VALID_INVITATION_ID }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invitation not found or already cancelled');
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

      const request = new NextRequest('http://localhost/api/spaces/invitations', {
        method: 'PUT',
        body: JSON.stringify({ invitation_id: VALID_INVITATION_ID }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when resend fails', async () => {
      await mockRateLimitSuccess();
      await mockAuthUser();

      const { resendInvitation } = await import('@/lib/services/invitations-service');
      vi.mocked(resendInvitation).mockResolvedValue({
        success: false,
        error: 'Invitation expired or not found',
      });

      const request = new NextRequest('http://localhost/api/spaces/invitations', {
        method: 'PUT',
        body: JSON.stringify({ invitation_id: VALID_INVITATION_ID }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invitation expired or not found');
    });

    it('should resend invitation with email successfully', async () => {
      await mockRateLimitSuccess();

      const { createClient } = await import('@/lib/supabase/server');
      const { resendInvitation } = await import('@/lib/services/invitations-service');
      const { sendSpaceInvitationEmail } = await import('@/lib/services/email-service');

      const spacesChain = createChainMock({ data: { name: 'Smith Family' }, error: null });
      const usersChain = createChainMock({ data: { name: 'John' }, error: null });

      let callIndex = 0;
      const fromMock = vi.fn(() => {
        callIndex++;
        if (callIndex === 1) return spacesChain;
        return usersChain;
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: fromMock,
      } as any);

      vi.mocked(resendInvitation).mockResolvedValue({
        success: true,
        data: {
          id: VALID_INVITATION_ID,
          token: 'new-token-xyz',
          email: 'invitee@example.com',
          space_id: VALID_SPACE_ID,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        } as any,
      });

      vi.mocked(sendSpaceInvitationEmail).mockResolvedValue({ success: true } as any);

      const request = new NextRequest('http://localhost/api/spaces/invitations', {
        method: 'PUT',
        body: JSON.stringify({ invitation_id: VALID_INVITATION_ID, space_id: VALID_SPACE_ID }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.email_sent).toBe(true);
      expect(data.data.token).toBe('new-token-xyz');
    });
  });
});
