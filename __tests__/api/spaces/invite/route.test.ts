import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/spaces/invite/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/invitations-service', () => ({
  createInvitation: vi.fn(),
}));

vi.mock('@/lib/services/email-service', () => ({
  sendSpaceInvitationEmail: vi.fn(),
}));

vi.mock('@/lib/services/authorization-service', () => ({
  verifySpaceAccess: vi.fn(),
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

vi.mock('@/lib/validations/space-schemas', () => ({
  validateAndSanitizeInvite: vi.fn(),
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

describe('/api/spaces/invite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should return 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost/api/spaces/invite', {
        method: 'POST',
        body: JSON.stringify({ space_id: VALID_SPACE_ID, email: 'test@example.com', role: 'member' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/spaces/invite', {
        method: 'POST',
        body: JSON.stringify({ space_id: VALID_SPACE_ID, email: 'test@example.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid input (Zod validation failure)', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { validateAndSanitizeInvite } = await import('@/lib/validations/space-schemas');
      const { z } = await import('zod');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      } as any);

      vi.mocked(validateAndSanitizeInvite).mockImplementation(() => {
        throw new z.ZodError([
          {
            code: 'invalid_type',
            expected: 'string',
            received: 'undefined',
            path: ['email'],
            message: 'Email is required',
          },
        ]);
      });

      const request = new NextRequest('http://localhost/api/spaces/invite', {
        method: 'POST',
        body: JSON.stringify({ space_id: VALID_SPACE_ID }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should return 403 when user lacks space access', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { validateAndSanitizeInvite } = await import('@/lib/validations/space-schemas');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      } as any);

      vi.mocked(validateAndSanitizeInvite).mockReturnValue({
        space_id: VALID_SPACE_ID,
        email: 'invitee@example.com',
        role: 'member',
      } as any);

      vi.mocked(verifySpaceAccess).mockRejectedValue(new Error('Access denied'));

      const request = new NextRequest('http://localhost/api/spaces/invite', {
        method: 'POST',
        body: JSON.stringify({ space_id: VALID_SPACE_ID, email: 'invitee@example.com', role: 'member' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have permission to invite users to this space');
    });

    it('should return 400 when invitation service fails', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { validateAndSanitizeInvite } = await import('@/lib/validations/space-schemas');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { createInvitation } = await import('@/lib/services/invitations-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      } as any);

      vi.mocked(validateAndSanitizeInvite).mockReturnValue({
        space_id: VALID_SPACE_ID,
        email: 'invitee@example.com',
        role: 'member',
      } as any);

      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);
      vi.mocked(createInvitation).mockResolvedValue({
        success: false,
        error: 'User already invited',
      });

      const request = new NextRequest('http://localhost/api/spaces/invite', {
        method: 'POST',
        body: JSON.stringify({ space_id: VALID_SPACE_ID, email: 'invitee@example.com', role: 'member' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User already invited');
    });

    it('should create invitation and send email successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { validateAndSanitizeInvite } = await import('@/lib/validations/space-schemas');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { createInvitation } = await import('@/lib/services/invitations-service');
      const { sendSpaceInvitationEmail } = await import('@/lib/services/email-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000,
      });

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

      vi.mocked(validateAndSanitizeInvite).mockReturnValue({
        space_id: VALID_SPACE_ID,
        email: 'invitee@example.com',
        role: 'member',
      } as any);

      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);
      vi.mocked(createInvitation).mockResolvedValue({
        success: true,
        data: {
          token: 'invitation-token-abc',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          email: 'invitee@example.com',
        },
      });

      vi.mocked(sendSpaceInvitationEmail).mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      } as any);

      const request = new NextRequest('http://localhost/api/spaces/invite', {
        method: 'POST',
        body: JSON.stringify({ space_id: VALID_SPACE_ID, email: 'invitee@example.com', role: 'member' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.email_sent).toBe(true);
      expect(data.data.token).toBe('invitation-token-abc');
    });
  });
});
