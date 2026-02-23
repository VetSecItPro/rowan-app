import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/ai/usage/route';

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
  getUsageSummary: vi.fn(),
  checkBudget: vi.fn(),
  getTokenBudget: vi.fn(),
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

describe('/api/ai/usage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 403 when AI companion is disabled', async () => {
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(false);

      const request = new NextRequest('http://localhost/api/ai/usage', { method: 'GET' });
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

      const request = new NextRequest('http://localhost/api/ai/usage', { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 when AI access is denied (wrong tier)', async () => {
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      const { createClient } = await import('@/lib/supabase/server');
      const { validateAIAccess, buildAIAccessDeniedResponse } = await import('@/lib/services/ai/ai-access-guard');

      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(true);
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);
      vi.mocked(validateAIAccess).mockResolvedValue({ allowed: false, tier: 'free' } as any);
      vi.mocked(buildAIAccessDeniedResponse).mockReturnValue(
        new Response(JSON.stringify({ error: 'AI access denied' }), { status: 403 })
      );

      const request = new NextRequest('http://localhost/api/ai/usage', { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    it('should return usage data successfully with default date range', async () => {
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      const { createClient } = await import('@/lib/supabase/server');
      const { validateAIAccess } = await import('@/lib/services/ai/ai-access-guard');
      const { getUsageSummary, checkBudget, getTokenBudget } = await import('@/lib/services/ai/conversation-persistence-service');

      const mockUsageSummary = { total_input_tokens: 5000, total_output_tokens: 3000, conversation_count: 10 };
      const mockBudget = { remaining: 50000, used: 8000, limit: 58000 };
      const mockLimits = { daily: 10000, monthly: 300000 };

      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(true);
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);
      vi.mocked(validateAIAccess).mockResolvedValue({ allowed: true, tier: 'pro' } as any);
      vi.mocked(getUsageSummary).mockResolvedValue(mockUsageSummary as any);
      vi.mocked(checkBudget).mockResolvedValue(mockBudget as any);
      vi.mocked(getTokenBudget).mockReturnValue(mockLimits as any);

      const request = new NextRequest('http://localhost/api/ai/usage', { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.usage).toEqual(mockUsageSummary);
      expect(data.data.budget).toEqual(mockBudget);
      expect(data.data.limits).toEqual(mockLimits);
      expect(data.data.tier).toBe('pro');
    });

    it('should accept custom startDate and endDate query params', async () => {
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      const { createClient } = await import('@/lib/supabase/server');
      const { validateAIAccess } = await import('@/lib/services/ai/ai-access-guard');
      const { getUsageSummary, checkBudget, getTokenBudget } = await import('@/lib/services/ai/conversation-persistence-service');

      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(true);
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);
      vi.mocked(validateAIAccess).mockResolvedValue({ allowed: true, tier: 'pro' } as any);
      vi.mocked(getUsageSummary).mockResolvedValue({} as any);
      vi.mocked(checkBudget).mockResolvedValue({} as any);
      vi.mocked(getTokenBudget).mockReturnValue({} as any);

      const request = new NextRequest(
        `http://localhost/api/ai/usage?startDate=2026-01-01&endDate=2026-01-31&spaceId=${SPACE_ID}`,
        { method: 'GET' }
      );
      await GET(request);

      expect(getUsageSummary).toHaveBeenCalledWith(
        expect.anything(),
        USER_ID,
        '2026-01-01',
        '2026-01-31'
      );
    });
  });
});
