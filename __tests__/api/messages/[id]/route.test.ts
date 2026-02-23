import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/messages/[id]/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/services/messages-service', () => ({
  messagesService: {
    getMessageById: vi.fn(),
    updateMessage: vi.fn(),
    deleteMessage: vi.fn(),
  },
}));
vi.mock('@/lib/services/authorization-service', () => ({
  verifyResourceAccess: vi.fn(),
}));
vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/sanitize', () => ({
  sanitizePlainText: vi.fn((t: string) => t),
  sanitizeUrl: vi.fn((u: string) => u),
}));
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));
vi.mock('@/lib/sentry-utils', () => ({ setSentryUser: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const USER_ID = '550e8400-e29b-41d4-a716-446655440002';
const OTHER_USER_ID = '550e8400-e29b-41d4-a716-446655440009';
const SPACE_ID = '550e8400-e29b-41d4-a716-446655440001';
const MESSAGE_ID = '550e8400-e29b-41d4-a716-446655440005';

const mockRateLimitOk = { success: true, limit: 60, remaining: 59, reset: Date.now() + 60000 };
const mockRateLimitFail = { success: false, limit: 60, remaining: 0, reset: Date.now() + 60000 };

const mockMessage = {
  id: MESSAGE_ID,
  space_id: SPACE_ID,
  sender_id: USER_ID,
  content: 'Hello, family!',
  attachments: [],
};

function makeMockSupabase(user?: unknown) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: user !== undefined ? user : { id: USER_ID, email: 'test@example.com' } },
        error: null,
      }),
    },
  };
}

const routeParams = { params: Promise.resolve({ id: MESSAGE_ID }) };

describe('/api/messages/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitFail);

      const req = new NextRequest(`http://localhost/api/messages/${MESSAGE_ID}`);
      const res = await GET(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase(null) as never);

      const req = new NextRequest(`http://localhost/api/messages/${MESSAGE_ID}`);
      const res = await GET(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 404 when message is not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { messagesService } = await import('@/lib/services/messages-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(messagesService.getMessageById).mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/messages/${MESSAGE_ID}`);
      const res = await GET(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('returns 403 when user has no access to message space', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { messagesService } = await import('@/lib/services/messages-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(messagesService.getMessageById).mockResolvedValue(mockMessage as never);
      vi.mocked(verifyResourceAccess).mockRejectedValue(new Error('Access denied'));

      const req = new NextRequest(`http://localhost/api/messages/${MESSAGE_ID}`);
      const res = await GET(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('access');
    });

    it('returns 200 with message data on success', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { messagesService } = await import('@/lib/services/messages-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(messagesService.getMessageById).mockResolvedValue(mockMessage as never);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const req = new NextRequest(`http://localhost/api/messages/${MESSAGE_ID}`);
      const res = await GET(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(MESSAGE_ID);
    });

    it('returns 500 on unexpected error', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockRejectedValue(new Error('DB error'));

      const req = new NextRequest(`http://localhost/api/messages/${MESSAGE_ID}`);
      const res = await GET(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(500);
    });
  });

  describe('PATCH', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitFail);

      const req = new NextRequest(`http://localhost/api/messages/${MESSAGE_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: 'Updated message' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await PATCH(req, routeParams);

      expect(res.status).toBe(429);
    });

    it('returns 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase(null) as never);

      const req = new NextRequest(`http://localhost/api/messages/${MESSAGE_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: 'Updated' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await PATCH(req, routeParams);

      expect(res.status).toBe(401);
    });

    it('returns 404 when message is not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { messagesService } = await import('@/lib/services/messages-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(messagesService.getMessageById).mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/messages/${MESSAGE_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: 'Updated' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await PATCH(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(404);
    });

    it('returns 403 when user is not the sender', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { messagesService } = await import('@/lib/services/messages-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      // User is OTHER_USER_ID (not the sender)
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: OTHER_USER_ID, email: 'other@example.com' } },
            error: null,
          }),
        },
      } as never);
      vi.mocked(messagesService.getMessageById).mockResolvedValue(mockMessage as never); // sender_id: USER_ID
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const req = new NextRequest(`http://localhost/api/messages/${MESSAGE_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: 'Trying to edit someone else\'s message' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await PATCH(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('sender');
    });

    it('returns 400 when validation fails (no content or attachments)', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { messagesService } = await import('@/lib/services/messages-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(messagesService.getMessageById).mockResolvedValue(mockMessage as never);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const req = new NextRequest(`http://localhost/api/messages/${MESSAGE_ID}`, {
        method: 'PATCH',
        // Empty body - no content or attachments - fails the refine check
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await PATCH(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Validation');
    });

    it('returns 200 with updated message on success', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { messagesService } = await import('@/lib/services/messages-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(messagesService.getMessageById).mockResolvedValue(mockMessage as never);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);
      vi.mocked(messagesService.updateMessage).mockResolvedValue({ ...mockMessage, content: 'Updated message' } as never);

      const req = new NextRequest(`http://localhost/api/messages/${MESSAGE_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: 'Updated message' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await PATCH(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.content).toBe('Updated message');
    });
  });

  describe('DELETE', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitFail);

      const req = new NextRequest(`http://localhost/api/messages/${MESSAGE_ID}`, { method: 'DELETE' });
      const res = await DELETE(req, routeParams);

      expect(res.status).toBe(429);
    });

    it('returns 404 when message is not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { messagesService } = await import('@/lib/services/messages-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(messagesService.getMessageById).mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/messages/${MESSAGE_ID}`, { method: 'DELETE' });
      const res = await DELETE(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(404);
    });

    it('returns 403 when non-sender tries to delete for everyone', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { messagesService } = await import('@/lib/services/messages-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: OTHER_USER_ID, email: 'other@example.com' } },
            error: null,
          }),
        },
      } as never);
      vi.mocked(messagesService.getMessageById).mockResolvedValue(mockMessage as never);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const req = new NextRequest(`http://localhost/api/messages/${MESSAGE_ID}?mode=for_everyone`, { method: 'DELETE' });
      const res = await DELETE(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('sender');
    });

    it('returns 200 when sender deletes message for everyone', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { messagesService } = await import('@/lib/services/messages-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(messagesService.getMessageById).mockResolvedValue(mockMessage as never);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);
      vi.mocked(messagesService.deleteMessage).mockResolvedValue(undefined);

      const req = new NextRequest(`http://localhost/api/messages/${MESSAGE_ID}?mode=for_everyone`, { method: 'DELETE' });
      const res = await DELETE(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 200 when any member deletes message for themselves', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { messagesService } = await import('@/lib/services/messages-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      // Even a non-sender can delete for themselves
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: OTHER_USER_ID, email: 'other@example.com' } },
            error: null,
          }),
        },
      } as never);
      vi.mocked(messagesService.getMessageById).mockResolvedValue(mockMessage as never);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);
      vi.mocked(messagesService.deleteMessage).mockResolvedValue(undefined);

      const req = new NextRequest(`http://localhost/api/messages/${MESSAGE_ID}?mode=for_me`, { method: 'DELETE' });
      const res = await DELETE(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
