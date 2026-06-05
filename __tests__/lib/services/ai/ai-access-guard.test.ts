/**
 * Tests for ai-access-guard.ts
 * Covers validateAIAccess and buildAIAccessDeniedResponse
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateAIAccess,
  buildAIAccessDeniedResponse,
  type AIAccessResult,
} from '@/lib/services/ai/ai-access-guard';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/feature-access-service', () => ({
  canAccessFeature: vi.fn(),
}));

vi.mock('@/lib/services/ai/conversation-persistence-service', () => ({
  checkBudget: vi.fn(),
  FREE_DAILY_AI_MESSAGES: 3,
}));

vi.mock('@/lib/ratelimit', () => ({
  checkFreeAIDailyLimit: vi.fn(),
}));

import { canAccessFeature } from '@/lib/services/feature-access-service';
import { checkBudget } from '@/lib/services/ai/conversation-persistence-service';
import { checkFreeAIDailyLimit } from '@/lib/ratelimit';

const mockSupabase = {} as Parameters<typeof validateAIAccess>[0];

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// validateAIAccess
// ---------------------------------------------------------------------------

describe('validateAIAccess', () => {
  describe('subscription tier check', () => {
    it('returns 403 when user does not have AI feature access', async () => {
      vi.mocked(canAccessFeature).mockResolvedValue({
        allowed: false,
        tier: 'free',
      });

      const result = await validateAIAccess(mockSupabase, 'user-1', 'space-1');

      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403);
      expect(result.tier).toBe('free');
      expect(result.reason).toMatch(/Plus or Family/);
    });

    it('returns 500 when canAccessFeature throws (DB error)', async () => {
      vi.mocked(canAccessFeature).mockRejectedValue(new Error('DB down'));

      const result = await validateAIAccess(mockSupabase, 'user-1', 'space-1');

      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.reason).toMatch(/Unable to verify/);
    });

    it('returns 200 when user has AI access and budget check is skipped', async () => {
      vi.mocked(canAccessFeature).mockResolvedValue({
        allowed: true,
        tier: 'plus',
      });

      const result = await validateAIAccess(mockSupabase, 'user-1', undefined, false);

      expect(result.allowed).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.tier).toBe('plus');
    });

    it('still runs the budget check without a spaceId (per-user cap — Phase 11.6 fix)', async () => {
      vi.mocked(canAccessFeature).mockResolvedValue({
        allowed: true,
        tier: 'family',
      });
      vi.mocked(checkBudget).mockResolvedValue({
        allowed: true,
        remaining: { input_tokens: 100, output_tokens: 100 },
      } as never);

      // checkBudgetToo=true, no spaceId: the per-user daily + monthly COGS caps
      // must STILL run (gating on spaceId would let a spaceId-less caller bypass
      // the cap — a cost leak now that free users have AI).
      const result = await validateAIAccess(mockSupabase, 'user-1', undefined, true);

      expect(result.allowed).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(checkBudget).toHaveBeenCalledWith(mockSupabase, 'user-1', 'family', undefined);
    });
  });

  describe('budget check', () => {
    beforeEach(() => {
      vi.mocked(canAccessFeature).mockResolvedValue({
        allowed: true,
        tier: 'plus',
      });
    });

    it('returns 200 with budgetRemaining when budget is sufficient', async () => {
      vi.mocked(checkBudget).mockResolvedValue({
        allowed: true,
        remaining_input_tokens: 200_000,
        remaining_output_tokens: 60_000,
        remaining_voice_seconds: 500,
        remaining_conversations: 40,
        reset_at: '2026-02-23T00:00:00.000Z',
        remaining: { input_tokens: 200_000, output_tokens: 60_000 },
      });

      const result = await validateAIAccess(mockSupabase, 'user-1', 'space-1', true);

      expect(result.allowed).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.budgetRemaining?.input_tokens).toBe(200_000);
      expect(result.budgetRemaining?.output_tokens).toBe(60_000);
    });

    it('returns 429 with household reason when space limit is exceeded', async () => {
      vi.mocked(checkBudget).mockResolvedValue({
        allowed: false,
        remaining_input_tokens: 0,
        remaining_output_tokens: 0,
        remaining_voice_seconds: 0,
        remaining_conversations: 0,
        reset_at: '2026-02-23T00:00:00.000Z',
        reason: 'Your household has reached its daily AI limit',
        remaining: { input_tokens: 0, output_tokens: 0 },
      });

      const result = await validateAIAccess(mockSupabase, 'user-1', 'space-1', true);

      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(429);
      expect(result.reason).toMatch(/household/);
      expect(result.resetAt).toBe('2026-02-23T00:00:00.000Z');
    });

    it('returns 429 with personal reason when user daily limit is exceeded', async () => {
      vi.mocked(checkBudget).mockResolvedValue({
        allowed: false,
        remaining_input_tokens: 0,
        remaining_output_tokens: 0,
        remaining_voice_seconds: 0,
        remaining_conversations: 0,
        reset_at: '2026-02-23T00:00:00.000Z',
        reason: 'User daily limit exceeded',
        remaining: { input_tokens: 0, output_tokens: 0 },
      });

      const result = await validateAIAccess(mockSupabase, 'user-1', 'space-1', true);

      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(429);
      expect(result.reason).toMatch(/daily AI limit/);
    });

    it('returns 200 and allows request through when budget check throws', async () => {
      vi.mocked(checkBudget).mockRejectedValue(new Error('Redis timeout'));

      const result = await validateAIAccess(mockSupabase, 'user-1', 'space-1', true);

      // Lenient: infra failure should not block paying users
      expect(result.allowed).toBe(true);
      expect(result.statusCode).toBe(200);
    });
  });

  // Phase 10.7: free-tier teaser hard cap (3/day) via the ATOMIC Redis limiter
  // (race-proof; replaced the TOCTOU-racy SELECT-count per sec-ship 2026-06-05).
  describe('free-tier message cap (10.7, atomic)', () => {
    beforeEach(() => {
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'free' } as never);
      vi.mocked(checkBudget).mockResolvedValue({
        allowed: true,
        remaining: { input_tokens: 100, output_tokens: 100 },
      } as never);
      vi.mocked(checkFreeAIDailyLimit).mockResolvedValue({ success: true });
    });

    it('blocks a free user once the atomic daily limiter is exhausted, with an upgrade nudge', async () => {
      vi.mocked(checkFreeAIDailyLimit).mockResolvedValue({ success: false });

      const result = await validateAIAccess(mockSupabase, 'user-1', 'space-1', true);

      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(429);
      expect(result.upgrade).toBe(true);
      expect(result.reason).toMatch(/3 free Rowan AI messages/);
      // The token budget check must NOT run once the message cap blocks.
      expect(checkBudget).not.toHaveBeenCalled();
    });

    it('lets a free user under the cap through to the budget check', async () => {
      vi.mocked(checkFreeAIDailyLimit).mockResolvedValue({ success: true });

      const result = await validateAIAccess(mockSupabase, 'user-1', 'space-1', true);

      expect(result.allowed).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(checkBudget).toHaveBeenCalled();
    });

    it('does NOT consume free quota on display/metadata reads (checkBudgetToo=false)', async () => {
      // usage / conversations / suggestions pass checkBudgetToo=false — they must
      // not burn one of the user's 3 daily messages.
      const result = await validateAIAccess(mockSupabase, 'user-1', undefined, false);

      expect(result.allowed).toBe(true);
      expect(checkFreeAIDailyLimit).not.toHaveBeenCalled();
    });

    it('does NOT message-cap paid tiers (limiter not even called)', async () => {
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'plus' } as never);

      const result = await validateAIAccess(mockSupabase, 'user-1', 'space-1', true);

      expect(result.allowed).toBe(true);
      expect(checkFreeAIDailyLimit).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// buildAIAccessDeniedResponse
// ---------------------------------------------------------------------------

describe('buildAIAccessDeniedResponse', () => {
  it('returns a 403 Response with upgrade_url for subscription denial', async () => {
    const accessResult: AIAccessResult = {
      allowed: false,
      tier: 'free',
      reason: 'AI features require a Pro or Family subscription.',
      statusCode: 403,
    };

    const response = buildAIAccessDeniedResponse(accessResult);
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toBe(accessResult.reason);
    expect(body.tier).toBe('free');
    expect(body.upgrade_url).toBe('/settings/subscription');
    expect(body.reset_at).toBeUndefined();
  });

  it('returns a 429 Response with upgrade_url + upgrade flag for the free teaser nudge (10.7)', async () => {
    const accessResult: AIAccessResult = {
      allowed: false,
      tier: 'free',
      reason: "You've used your 3 free Rowan AI messages for today. Upgrade to Plus for 50 messages a day (and Family for 100).",
      statusCode: 429,
      upgrade: true,
    };

    const response = buildAIAccessDeniedResponse(accessResult);
    expect(response.status).toBe(429);

    const body = await response.json();
    expect(body.upgrade).toBe(true);
    expect(body.upgrade_url).toBe('/pricing');
    expect(body.error).toMatch(/3 free Rowan AI messages/);
  });

  it('returns a 429 Response with reset_at for rate limit denial', async () => {
    const accessResult: AIAccessResult = {
      allowed: false,
      tier: 'plus',
      reason: 'Daily AI limit reached.',
      statusCode: 429,
      resetAt: '2026-02-23T00:00:00.000Z',
    };

    const response = buildAIAccessDeniedResponse(accessResult);
    expect(response.status).toBe(429);

    const body = await response.json();
    expect(body.reset_at).toBe('2026-02-23T00:00:00.000Z');
    expect(body.upgrade_url).toBeUndefined();
  });

  it('sets Content-Type to application/json', () => {
    const accessResult: AIAccessResult = {
      allowed: false,
      tier: 'free',
      reason: 'No access.',
      statusCode: 403,
    };

    const response = buildAIAccessDeniedResponse(accessResult);
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('returns 500 Response for infrastructure errors', async () => {
    const accessResult: AIAccessResult = {
      allowed: false,
      tier: 'free',
      reason: 'Unable to verify subscription status.',
      statusCode: 500,
    };

    const response = buildAIAccessDeniedResponse(accessResult);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBe(accessResult.reason);
  });
});
