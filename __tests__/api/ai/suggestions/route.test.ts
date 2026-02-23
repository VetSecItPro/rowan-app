import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/ai/suggestions/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkAISuggestionsRateLimit: vi.fn(),
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

vi.mock('@/lib/services/ai/ai-context-service', () => ({
  aiContextService: {
    getSummaryContext: vi.fn(),
    getRecentActivity: vi.fn(),
  },
}));

vi.mock('@/lib/services/ai/suggestion-service', () => ({
  generateSuggestions: vi.fn(),
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

describe('/api/ai/suggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 when not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { featureFlags } = await import('@/lib/constants/feature-flags');

      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(true);
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }),
        },
      } as any);

      const request = new NextRequest(`http://localhost/api/ai/suggestions?spaceId=${SPACE_ID}`, { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 when AI companion feature flag is disabled', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { featureFlags } = await import('@/lib/constants/feature-flags');

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);
      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(false);

      const request = new NextRequest(`http://localhost/api/ai/suggestions?spaceId=${SPACE_ID}`, { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('AI companion is not enabled');
    });

    it('should return 400 when spaceId is missing', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { featureFlags } = await import('@/lib/constants/feature-flags');

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);
      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(true);

      const request = new NextRequest('http://localhost/api/ai/suggestions', { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('spaceId is required');
    });

    it('should return 429 when suggestions rate limit is exceeded', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      const { validateAIAccess } = await import('@/lib/services/ai/ai-access-guard');
      const { checkAISuggestionsRateLimit } = await import('@/lib/ratelimit');

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);
      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(true);
      vi.mocked(validateAIAccess).mockResolvedValue({ allowed: true, tier: 'pro' } as any);
      vi.mocked(checkAISuggestionsRateLimit).mockResolvedValue({ success: false } as any);

      const request = new NextRequest(`http://localhost/api/ai/suggestions?spaceId=${SPACE_ID}`, { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many suggestion requests');
    });

    it('should return suggestions successfully', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      const { validateAIAccess } = await import('@/lib/services/ai/ai-access-guard');
      const { checkAISuggestionsRateLimit } = await import('@/lib/ratelimit');
      const { aiContextService } = await import('@/lib/services/ai/ai-context-service');
      const { generateSuggestions } = await import('@/lib/services/ai/suggestion-service');

      const mockSuggestions = [
        { id: 'sug-1', type: 'task', message: 'You have 3 overdue tasks', priority: 'high' },
        { id: 'sug-2', type: 'event', message: 'Team meeting in 30 minutes', priority: 'medium' },
      ];

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);
      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(true);
      vi.mocked(validateAIAccess).mockResolvedValue({ allowed: true, tier: 'pro' } as any);
      vi.mocked(checkAISuggestionsRateLimit).mockResolvedValue({ success: true } as any);
      vi.mocked(aiContextService.getSummaryContext).mockResolvedValue({} as any);
      vi.mocked(aiContextService.getRecentActivity).mockResolvedValue([] as any);
      vi.mocked(generateSuggestions).mockReturnValue(mockSuggestions as any);

      const request = new NextRequest(`http://localhost/api/ai/suggestions?spaceId=${SPACE_ID}`, { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.suggestions).toEqual(mockSuggestions);
    });
  });
});
