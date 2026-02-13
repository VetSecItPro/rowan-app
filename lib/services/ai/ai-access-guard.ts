/**
 * AI Access Guard
 *
 * Shared helper for validating AI feature access across all AI API routes.
 * Combines subscription tier check + budget check in one call.
 *
 * Usage in API routes:
 *   const access = await validateAIAccess(supabase, userId, spaceId);
 *   if (!access.allowed) return buildAIAccessDeniedResponse(access);
 */

import { createClient } from '@/lib/supabase/server';
import { canAccessFeature } from '@/lib/services/feature-access-service';
import { checkBudget } from '@/lib/services/ai/conversation-persistence-service';
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
}

/**
 * Validate that a user has AI access (subscription tier + budget).
 *
 * @param supabase - Authenticated Supabase client from the API route
 * @param userId - The authenticated user's ID
 * @param spaceId - The space ID for per-space budget checks
 * @param checkBudgetToo - Whether to also check token budget (default: true).
 *   Set to false for non-token-consuming routes like settings GET.
 */
export async function validateAIAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  spaceId?: string,
  checkBudgetToo: boolean = true
): Promise<AIAccessResult> {
  // 1. Check subscription tier (pass the route's authenticated client to avoid JWT race conditions)
  const featureAccess = await canAccessFeature(userId, 'canUseAI', supabase);

  if (!featureAccess.allowed) {
    return {
      allowed: false,
      tier: featureAccess.tier ?? 'free',
      reason: 'AI features require a Pro or Family subscription. Upgrade to unlock Rowan AI.',
      statusCode: 403,
    };
  }

  const tier = featureAccess.tier ?? 'free';

  // 2. Check token budget (optional)
  if (checkBudgetToo && spaceId) {
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
      // Budget check failed — allow request but log warning
      // Better to let a request through than block due to infra error
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

  return new Response(JSON.stringify(body), {
    status: result.statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}
