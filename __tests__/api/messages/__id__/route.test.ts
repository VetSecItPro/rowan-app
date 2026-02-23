import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/messages/[id]/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

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

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/sanitize', () => ({
  sanitizePlainText: vi.fn((text) => text),
  sanitizeUrl: vi.fn((url) => url),
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

const MSG_ID = '00000000-0000-4000-8000-000000000030';
const USER_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_USER_ID = '00000000-0000-4000-8000-000000000099';

const mockMessage = {
  id: MSG_ID,
  content: 'Hello!',
  sender_id: USER_ID,
  space_id: '00000000-0000-4000-8000-000000000002',
};

function makeProps() {
  return { params: Promise.resolve({ id: MSG_ID }) };
}

function mockRateLimitAndAuth(
  createClient: ReturnType<typeof vi.fn>,
  checkGeneralRateLimit: ReturnType<typeof vi.fn>,
  userId = USER_ID
) {
  vi.mocked(checkGeneralRateLimit).mockResolvedValue({
    success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
  });

  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  } as any);
}

describe('/api/messages/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      } as any);

      const request = new NextRequest(`http://localhost/api/messages/${MSG_ID}`, { method: 'GET' });
      const response = await GET(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when message not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { messagesService } = await import('@/lib/services/messages-service');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any);
      vi.mocked(messagesService.getMessageById).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/messages/${MSG_ID}`, { method: 'GET' });
      const response = await GET(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Message not found');
    });

    it('should return 403 when user lacks resource access', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { messagesService } = await import('@/lib/services/messages-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any);
      vi.mocked(messagesService.getMessageById).mockResolvedValue(mockMessage as any);
      vi.mocked(verifyResourceAccess).mockRejectedValue(new Error('Forbidden'));

      const request = new NextRequest(`http://localhost/api/messages/${MSG_ID}`, { method: 'GET' });
      const response = await GET(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this message');
    });

    it('should return message successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { messagesService } = await import('@/lib/services/messages-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any);
      vi.mocked(messagesService.getMessageById).mockResolvedValue(mockMessage as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const request = new NextRequest(`http://localhost/api/messages/${MSG_ID}`, { method: 'GET' });
      const response = await GET(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(MSG_ID);
    });
  });

  describe('PATCH', () => {
    it('should return 403 when non-sender tries to edit', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { messagesService } = await import('@/lib/services/messages-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any, OTHER_USER_ID);
      vi.mocked(messagesService.getMessageById).mockResolvedValue(mockMessage as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const request = new NextRequest(`http://localhost/api/messages/${MSG_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: 'Edited content' }),
      });

      const response = await PATCH(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only the sender can edit this message');
    });

    it('should return 400 for invalid update body', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { messagesService } = await import('@/lib/services/messages-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any);
      vi.mocked(messagesService.getMessageById).mockResolvedValue(mockMessage as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      // Empty body fails the refine check (no content or attachments)
      const request = new NextRequest(`http://localhost/api/messages/${MSG_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      });

      const response = await PATCH(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('should update message successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { messagesService } = await import('@/lib/services/messages-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any);
      vi.mocked(messagesService.getMessageById).mockResolvedValue(mockMessage as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const updatedMessage = { ...mockMessage, content: 'Updated content' };
      vi.mocked(messagesService.updateMessage).mockResolvedValue(updatedMessage as any);

      const request = new NextRequest(`http://localhost/api/messages/${MSG_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: 'Updated content' }),
      });

      const response = await PATCH(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.content).toBe('Updated content');
    });
  });

  describe('DELETE', () => {
    it('should return 403 when non-sender tries to delete for everyone', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { messagesService } = await import('@/lib/services/messages-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any, OTHER_USER_ID);
      vi.mocked(messagesService.getMessageById).mockResolvedValue(mockMessage as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const request = new NextRequest(
        `http://localhost/api/messages/${MSG_ID}?mode=for_everyone`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only the sender can delete this message for everyone');
    });

    it('should delete message for_me successfully (any space member)', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { messagesService } = await import('@/lib/services/messages-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any, OTHER_USER_ID);
      vi.mocked(messagesService.getMessageById).mockResolvedValue(mockMessage as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);
      vi.mocked(messagesService.deleteMessage).mockResolvedValue(undefined);

      const request = new NextRequest(
        `http://localhost/api/messages/${MSG_ID}?mode=for_me`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should delete message for_everyone successfully when sender', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { messagesService } = await import('@/lib/services/messages-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any, USER_ID);
      vi.mocked(messagesService.getMessageById).mockResolvedValue(mockMessage as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);
      vi.mocked(messagesService.deleteMessage).mockResolvedValue(undefined);

      const request = new NextRequest(
        `http://localhost/api/messages/${MSG_ID}?mode=for_everyone`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Message deleted successfully');
    });
  });
});
