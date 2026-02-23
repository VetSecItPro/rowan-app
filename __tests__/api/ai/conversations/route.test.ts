import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/ai/conversations/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/authorization-service', () => ({
  verifySpaceAccess: vi.fn(),
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
  listConversations: vi.fn(),
}));

vi.mock('@/lib/utils/cache-headers', () => ({
  withDynamicDataCache: vi.fn((response) => response),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

const USER_ID = '00000000-0000-4000-8000-000000000001';
const SPACE_ID = '00000000-0000-4000-8000-000000000002';

describe('/api/ai/conversations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 403 when AI companion is disabled', async () => {
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(false);

      const request = new NextRequest(`http://localhost/api/ai/conversations?spaceId=${SPACE_ID}`, { method: 'GET' });
      const response = await GET(request);
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

      const request = new NextRequest(`http://localhost/api/ai/conversations?spaceId=${SPACE_ID}`, { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when spaceId is missing', async () => {
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(true);
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/ai/conversations', { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('spaceId is required');
    });

    it('should return 403 when user lacks space access', async () => {
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      const { createClient } = await import('@/lib/supabase/server');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');

      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(true);
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);
      vi.mocked(verifySpaceAccess).mockRejectedValue(new Error('Access denied'));

      const request = new NextRequest(`http://localhost/api/ai/conversations?spaceId=${SPACE_ID}`, { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
    });

    it('should return conversation list successfully', async () => {
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      const { createClient } = await import('@/lib/supabase/server');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { validateAIAccess } = await import('@/lib/services/ai/ai-access-guard');
      const { listConversations } = await import('@/lib/services/ai/conversation-persistence-service');

      const mockConversations = [
        { id: 'conv-1', title: 'Morning chat', message_count: 5 },
        { id: 'conv-2', title: 'Task help', message_count: 3 },
      ];

      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(true);
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);
      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);
      vi.mocked(validateAIAccess).mockResolvedValue({ allowed: true, tier: 'pro' } as any);
      vi.mocked(listConversations).mockResolvedValue(mockConversations as any);

      const request = new NextRequest(`http://localhost/api/ai/conversations?spaceId=${SPACE_ID}`, { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(mockConversations);
    });

    it('should respect limit and offset query parameters', async () => {
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      const { createClient } = await import('@/lib/supabase/server');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { validateAIAccess } = await import('@/lib/services/ai/ai-access-guard');
      const { listConversations } = await import('@/lib/services/ai/conversation-persistence-service');

      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(true);
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);
      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);
      vi.mocked(validateAIAccess).mockResolvedValue({ allowed: true, tier: 'pro' } as any);
      vi.mocked(listConversations).mockResolvedValue([]);

      const request = new NextRequest(
        `http://localhost/api/ai/conversations?spaceId=${SPACE_ID}&limit=10&offset=5`,
        { method: 'GET' }
      );
      await GET(request);

      expect(listConversations).toHaveBeenCalledWith(expect.anything(), SPACE_ID, 10, 5);
    });
  });
});
