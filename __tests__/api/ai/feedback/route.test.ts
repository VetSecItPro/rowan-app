import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/ai/feedback/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

const USER_ID = '00000000-0000-4000-8000-000000000001';
const MESSAGE_ID = '00000000-0000-4000-8000-000000000010';
const CONVERSATION_ID = '00000000-0000-4000-8000-000000000050';

function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  mock.select = vi.fn(handler);
  mock.eq = vi.fn(handler);
  mock.update = vi.fn(handler);
  mock.single = vi.fn(() => Promise.resolve(resolvedValue));
  mock.then = vi.fn((resolve: (val: unknown) => void) => resolve(resolvedValue));
  return mock;
}

describe('/api/ai/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should return 401 when not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/ai/feedback', {
        method: 'POST',
        body: JSON.stringify({
          messageId: MESSAGE_ID,
          conversationId: CONVERSATION_ID,
          feedback: 'positive',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid request body', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/ai/feedback', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required fields
          feedback: 'invalid_value',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request');
    });

    it('should return 400 when feedback value is not positive or negative', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/ai/feedback', {
        method: 'POST',
        body: JSON.stringify({
          messageId: MESSAGE_ID,
          conversationId: CONVERSATION_ID,
          feedback: 'neutral',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request');
    });

    it('should return 404 when conversation is not found', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const conversationChain = createChainMock({ data: null, error: null });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
        from: vi.fn().mockReturnValue(conversationChain),
      } as any);

      const request = new NextRequest('http://localhost/api/ai/feedback', {
        method: 'POST',
        body: JSON.stringify({
          messageId: MESSAGE_ID,
          conversationId: CONVERSATION_ID,
          feedback: 'positive',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Conversation not found');
    });

    it('should save positive feedback successfully', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const fromMock = vi.fn((table: string) => {
        if (table === 'ai_conversations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: CONVERSATION_ID }, error: null }),
          };
        }
        if (table === 'ai_messages') {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn((resolve: (val: { error: null }) => void) => resolve({ error: null })),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
        from: fromMock,
      } as any);

      const request = new NextRequest('http://localhost/api/ai/feedback', {
        method: 'POST',
        body: JSON.stringify({
          messageId: MESSAGE_ID,
          conversationId: CONVERSATION_ID,
          feedback: 'positive',
          feedbackText: 'This was very helpful!',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should save negative feedback with optional text', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const fromMock = vi.fn((table: string) => {
        if (table === 'ai_conversations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: CONVERSATION_ID }, error: null }),
          };
        }
        if (table === 'ai_messages') {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn((resolve: (val: { error: null }) => void) => resolve({ error: null })),
          };
        }
        return {};
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
        from: fromMock,
      } as any);

      const request = new NextRequest('http://localhost/api/ai/feedback', {
        method: 'POST',
        body: JSON.stringify({
          messageId: MESSAGE_ID,
          conversationId: CONVERSATION_ID,
          feedback: 'negative',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
