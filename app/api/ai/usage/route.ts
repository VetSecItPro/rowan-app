/**
 * GET /api/ai/usage?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *
 * Get AI usage summary and budget status for the current user.
 * Returns real subscription tier (no longer hardcoded).
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import {
  getUsageSummary,
  checkBudget,
  getTokenBudget,
} from '@/lib/services/ai/conversation-persistence-service';
import { featureFlags } from '@/lib/constants/feature-flags';
import { validateAIAccess, buildAIAccessDeniedResponse } from '@/lib/services/ai/ai-access-guard';

export async function GET(req: NextRequest) {
  try {
    const ip = extractIP(req.headers);
    const { success } = await checkGeneralRateLimit(ip);
    if (!success) {
      return Response.json({ error: 'Too many requests' }, { status: 429 });
    }

    if (!featureFlags.isAICompanionEnabled()) {
      return Response.json({ error: 'AI companion is not enabled' }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // AI access check (tier only, no budget check for reading usage)
    const aiAccess = await validateAIAccess(supabase, user.id, undefined, false);
    if (!aiAccess.allowed) {
      return buildAIAccessDeniedResponse(aiAccess);
    }

    const tier = aiAccess.tier;

    // Default to last 30 days
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const startDate = req.nextUrl.searchParams.get('startDate') ?? thirtyDaysAgo;
    const endDate = req.nextUrl.searchParams.get('endDate') ?? today;

    const spaceId = req.nextUrl.searchParams.get('spaceId');

    const [usageSummary, budgetStatus] = await Promise.all([
      getUsageSummary(supabase, user.id, startDate, endDate),
      checkBudget(supabase, user.id, tier, spaceId ?? undefined),
    ]);

    return Response.json({
      data: {
        usage: usageSummary,
        budget: budgetStatus,
        limits: getTokenBudget(tier),
        tier,
      },
    });
  } catch (error) {
    logger.error('[API] /api/ai/usage GET error:', error, {
      component: 'api-route',
      action: 'api_request',
    });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
