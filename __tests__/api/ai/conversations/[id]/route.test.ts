import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, DELETE } from '@/app/api/ai/conversations/[id]/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/constants/feature-flags', () => ({
  featureFlags: {
    isAICompanionEnabled: vi.fn(),
  },
}));

vi.mock('@/lib/services/ai/ai-access-guard', () => ({
  validateAIAccess: vi.fn(),
  buildAIAccessDeniedResponse: vi.fn(() =>
    new Response(JSON.stringify({ error: 'AI access denied' }), { status: 403 })
  ),
}));

vi.mock('@/lib/services/ai/conversation-persistence-service', () => ({
  getConversation: vi.fn(),
  getMessages: vi.fn(),
  deleteConversation: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

const USER_ID = '00000000-0000-4000-8000-000000000001';
const CONVERSATION_ID = '00000000-0000-4000-8000-000000000050';

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('/api/ai/conversations/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 403 when AI companion is disabled', async () => {
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(false);

      const request = new NextRequest(`http://localhost/api/ai/conversations/${CONVERSATION_ID}`, { method: 'GET' });
      const response = await GET(request, makeParams(CONVERSATION_ID));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('AI companion is not enabled');
    });

    it('should return 401 when not authenticated', async () => {
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(true);
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }),
        },
      } as any);

      const request = new NextRequest(`http://localhost/api/ai/conversations/${CONVERSATION_ID}`, { method: 'GET' });
      const response = await GET(request, makeParams(CONVERSATION_ID));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when conversation is not found', async () => {
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      const { createClient } = await import('@/lib/supabase/server');
      const { validateAIAccess } = await import('@/lib/services/ai/ai-access-guard');
      const { getConversation } = await import('@/lib/services/ai/conversation-persistence-service');

      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(true);
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);
      vi.mocked(validateAIAccess).mockResolvedValue({ allowed: true, tier: 'pro' } as any);
      vi.mocked(getConversation).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/ai/conversations/${CONVERSATION_ID}`, { method: 'GET' });
      const response = await GET(request, makeParams(CONVERSATION_ID));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Conversation not found');
    });

    it('should return conversation and messages successfully', async () => {
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      const { createClient } = await import('@/lib/supabase/server');
      const { validateAIAccess } = await import('@/lib/services/ai/ai-access-guard');
      const { getConversation, getMessages } = await import('@/lib/services/ai/conversation-persistence-service');

      const mockConversation = { id: CONVERSATION_ID, title: 'Morning chat', message_count: 2 };
      const mockMessages = [
        { id: 'msg-1', role: 'user', content: 'Hello' },
        { id: 'msg-2', role: 'assistant', content: 'Hi there!' },
      ];

      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(true);
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);
      vi.mocked(validateAIAccess).mockResolvedValue({ allowed: true, tier: 'pro' } as any);
      vi.mocked(getConversation).mockResolvedValue(mockConversation as any);
      vi.mocked(getMessages).mockResolvedValue(mockMessages as any);

      const request = new NextRequest(`http://localhost/api/ai/conversations/${CONVERSATION_ID}`, { method: 'GET' });
      const response = await GET(request, makeParams(CONVERSATION_ID));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.conversation).toEqual(mockConversation);
      expect(data.data.messages).toEqual(mockMessages);
    });
  });

  describe('DELETE', () => {
    it('should return 403 when AI companion is disabled', async () => {
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(false);

      const request = new NextRequest(`http://localhost/api/ai/conversations/${CONVERSATION_ID}`, { method: 'DELETE' });
      const response = await DELETE(request, makeParams(CONVERSATION_ID));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('AI companion is not enabled');
    });

    it('should return 401 when not authenticated', async () => {
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(true);
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }),
        },
      } as any);

      const request = new NextRequest(`http://localhost/api/ai/conversations/${CONVERSATION_ID}`, { method: 'DELETE' });
      const response = await DELETE(request, makeParams(CONVERSATION_ID));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when conversation is not found', async () => {
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      const { createClient } = await import('@/lib/supabase/server');
      const { validateAIAccess } = await import('@/lib/services/ai/ai-access-guard');
      const { getConversation } = await import('@/lib/services/ai/conversation-persistence-service');

      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(true);
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);
      vi.mocked(validateAIAccess).mockResolvedValue({ allowed: true, tier: 'pro' } as any);
      vi.mocked(getConversation).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/ai/conversations/${CONVERSATION_ID}`, { method: 'DELETE' });
      const response = await DELETE(request, makeParams(CONVERSATION_ID));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Conversation not found');
    });

    it('should delete conversation successfully', async () => {
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      const { createClient } = await import('@/lib/supabase/server');
      const { validateAIAccess } = await import('@/lib/services/ai/ai-access-guard');
      const { getConversation, deleteConversation } = await import('@/lib/services/ai/conversation-persistence-service');

      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(true);
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);
      vi.mocked(validateAIAccess).mockResolvedValue({ allowed: true, tier: 'pro' } as any);
      vi.mocked(getConversation).mockResolvedValue({ id: CONVERSATION_ID } as any);
      vi.mocked(deleteConversation).mockResolvedValue(undefined);

      const request = new NextRequest(`http://localhost/api/ai/conversations/${CONVERSATION_ID}`, { method: 'DELETE' });
      const response = await DELETE(request, makeParams(CONVERSATION_ID));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(deleteConversation).toHaveBeenCalledWith(expect.anything(), CONVERSATION_ID);
    });
  });
});
