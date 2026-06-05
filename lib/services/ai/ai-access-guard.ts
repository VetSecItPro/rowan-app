/**
 * AI Access Guard
 *
 * Shared helper for validating AI feature access across all AI API routes.
 * Combines subscription tier check + per-space token budget check in one call.
 *
 * # Tier Policy (single source of truth)
 *
 * AI features (Companion chat, briefings, suggestions, conversation history,
 * tool execution) require **Pro tier or higher**. Specifically:
 *
 *   | Tier      | canUseAI | Source                                |
 *   |-----------|----------|---------------------------------------|
 *   | free      | false    | `lib/config/feature-limits.ts:38`     |
 *   | pro       | true     | `lib/config/feature-limits.ts:80`     |
 *   | family    | true     | `lib/config/feature-limits.ts:122`    |
 *   | business  | true     | `lib/config/feature-limits.ts:164`    |
 *
 * If you're adding a new AI-powered feature, gate it through this guard.
 * Do NOT introduce ad-hoc tier checks in individual routes — they drift.
 *
 * # Usage in API routes
 *
 *   const access = await validateAIAccess(supabase, userId, spaceId);
 *   if (!access.allowed) return buildAIAccessDeniedResponse(access);
 *
 * # Why the guard returns 500 on DB errors instead of 403
 *
 * If we can't determine the user's tier (Supabase unreachable, RLS bug, etc.),
 * we MUST NOT show "upgrade to unlock" to a paying customer. The guard
 * deliberately fails open with 500 in that case so the client retries.
 * See the "BULLETPROOF STRATEGY" comment on validateAIAccess below.
 */

import { createClient } from '@/lib/supabase/server';
import { canAccessFeature } from '@/lib/services/feature-access-service';
import { checkBudget, FREE_DAILY_AI_MESSAGES } from '@/lib/services/ai/conversation-persistence-service';
import { checkFreeAIDailyLimit } from '@/lib/ratelimit';
import type { SubscriptionTier } from '@/lib/types';

export interface AIAccessResult {
  allowed: boolean;
  tier: SubscriptionTier;
  reason?: string;
  statusCode: number;
  budgetRemaining?: {
    input_tokens: number;
    output_tokens: number;
  };
  resetAt?: string;
  /** When true, the denial is a subscribe-nudge (free teaser used up) — the
   *  client shows an upgrade CTA rather than a plain "limit reached" message. */
  upgrade?: boolean;
}

/**
 * Validate that a user has AI access (subscription tier + budget).
 *
 * BULLETPROOF STRATEGY:
 * - If tier check fails due to DB error, return 500 (not 403)
 * - A paying user should NEVER see "upgrade to unlock" due to infra issues
 * - Budget check failures are lenient (allow through)
 *
 * @param supabase - Authenticated Supabase client from the API route
 * @param userId - The authenticated user's ID
 * @param spaceId - The space ID for per-space budget checks
 * @param checkBudgetToo - Whether to also check token budget (default: true).
 */
export async function validateAIAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  spaceId?: string,
  checkBudgetToo: boolean = true
): Promise<AIAccessResult> {
  // 1. Check subscription tier
  // canAccessFeature THROWS on DB errors — catch and return 500, not 403
  let featureAccess: Awaited<ReturnType<typeof canAccessFeature>>;
  try {
    featureAccess = await canAccessFeature(userId, 'canUseAI', supabase);
  } catch {
    // DB error fetching subscription — DO NOT return 403.
    // Return 500 so the client retries instead of showing "upgrade" to a paying user.
    return {
      allowed: false,
      tier: 'free', // placeholder — we don't actually know the tier
      reason: 'Unable to verify subscription status. Please try again.',
      statusCode: 500,
    };
  }

  if (!featureAccess.allowed) {
    return {
      allowed: false,
      tier: featureAccess.tier ?? 'free',
      reason: 'AI features require a Plus or Family subscription. Upgrade to unlock Rowan AI.',
      statusCode: 403,
    };
  }

  const tier = featureAccess.tier ?? 'free';

  // 1.5 Free-tier teaser cap (Phase 10.7): free users get FREE_DAILY_AI_MESSAGES
  //     AI messages/day, then a subscribe nudge. ATOMICALLY reserved via Redis
  //     (checkFreeAIDailyLimit). The original SELECT-count had a TOCTOU race
  //     where N concurrent requests each read fewer-than-cap prior messages and
  //     all passed (found by sec-ship 2026-06-05); Redis INCR can't be raced.
  //     Gated on `checkBudgetToo` so this only consumes quota on real
  //     AI-consuming requests (chat/briefing pass true), never on display reads
  //     (usage/conversations/suggestions pass false). Paid tiers skip it.
  if (tier === 'free' && checkBudgetToo) {
    const { success } = await checkFreeAIDailyLimit(userId);
    if (!success) {
      return {
        allowed: false,
        tier,
        reason: `You've used your ${FREE_DAILY_AI_MESSAGES} free Rowan AI messages for today. Upgrade to Plus for 50 messages a day (and Family for 100).`,
        statusCode: 429,
        upgrade: true,
      };
    }
  }

  // 2. Check token budget. Keyed on userId (NOT gated on spaceId): the per-user
  //    daily + monthly COGS caps must always run, especially now that free users
  //    have AI (Phase 11.6) — gating on spaceId would let a spaceId-less caller
  //    bypass the cap entirely. The per-space budget inside checkBudget is the
  //    part that needs spaceId, and it self-skips when spaceId is absent.
  if (checkBudgetToo) {
    try {
      const budgetResult = await checkBudget(supabase, userId, tier, spaceId);

      if (!budgetResult.allowed) {
        const isSpaceLimit = budgetResult.reason?.includes('household');
        return {
          allowed: false,
          tier,
          reason: isSpaceLimit
            ? 'Your household has reached its daily AI limit. Resets at midnight UTC.'
            : 'You\'ve reached your daily AI limit. Resets at midnight UTC.',
          statusCode: 429,
          resetAt: budgetResult.reset_at,
        };
      }

      return {
        allowed: true,
        tier,
        statusCode: 200,
        budgetRemaining: budgetResult.remaining
          ? {
              input_tokens: budgetResult.remaining.input_tokens,
              output_tokens: budgetResult.remaining.output_tokens,
            }
          : undefined,
      };
    } catch {
      // Fail OPEN for paid tiers: better to serve a paying customer than block
      // on a transient infra error (and their revenue covers the marginal cost).
      // Fail CLOSED for free: the budget is the ONLY thing bounding $0-revenue
      // marketing spend, so a DB error must not silently uncap free AI.
      if (tier === 'free') {
        return {
          allowed: false,
          tier,
          reason: 'AI is briefly unavailable. Please try again in a moment.',
          statusCode: 503,
        };
      }
      return {
        allowed: true,
        tier,
        statusCode: 200,
      };
    }
  }

  return {
    allowed: true,
    tier,
    statusCode: 200,
  };
}

/**
 * Build a standard JSON error response for denied AI access.
 */
export function buildAIAccessDeniedResponse(result: AIAccessResult): Response {
  const body: Record<string, unknown> = {
    error: result.reason,
    tier: result.tier,
  };

  if (result.resetAt) {
    body.reset_at = result.resetAt;
  }

  if (result.statusCode === 403) {
    body.upgrade_url = '/settings/subscription';
  }

  // Free teaser used up (Phase 10.7): a 429 with an upgrade nudge. Point at the
  // pricing page (where a free user chooses a plan), not subscription settings.
  if (result.upgrade) {
    body.upgrade_url = '/pricing';
    body.upgrade = true;
  }

  return new Response(JSON.stringify(body), {
    status: result.statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}
