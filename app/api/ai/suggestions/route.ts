/**
 * GET /api/ai/suggestions
 *
 * Returns rule-based proactive suggestions for the current user's space.
 * No LLM call — purely derived from space summary and recent activity.
 * Feature-flag gated, rate limited, 5-min server-side cache.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAISuggestionsRateLimit } from '@/lib/ratelimit';
import { featureFlags } from '@/lib/constants/feature-flags';
import { validateAIAccess, buildAIAccessDeniedResponse } from '@/lib/services/ai/ai-access-guard';
import { aiContextService } from '@/lib/services/ai/ai-context-service';
import { generateSuggestions } from '@/lib/services/ai/suggestion-service';
import { logger } from '@/lib/logger';
import { LRUCache } from 'lru-cache';
import type { AISuggestion } from '@/lib/services/ai/suggestion-service';

// Server-side cache for suggestions (5 minutes)
const suggestionsCache = new LRUCache<string, AISuggestion[]>({
  max: 100,
  ttl: 5 * 60 * 1000,
});

export async function GET(req: NextRequest) {
  try {
    // Auth
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Feature flag
    if (!featureFlags.isAICompanionEnabled()) {
      return NextResponse.json(
        { error: 'AI companion is not enabled' },
        { status: 403 }
      );
    }

    // Space ID from query param
    const spaceId = req.nextUrl.searchParams.get('spaceId');
    if (!spaceId) {
      return NextResponse.json(
        { error: 'spaceId is required' },
        { status: 400 }
      );
    }

    // Check cache FIRST — cached responses shouldn't consume rate limit tokens
    const cacheKey = `${user.id}:${spaceId}`;
    const cached = suggestionsCache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ suggestions: cached });
    }

    // AI access check (subscription tier — no budget check for rule-based suggestions)
    const aiAccess = await validateAIAccess(supabase, user.id, spaceId, false);
    if (!aiAccess.allowed) {
      return buildAIAccessDeniedResponse(aiAccess);
    }

    // Per-user suggestions rate limit (checked after cache to avoid consuming tokens on cache hits)
    const { success: suggestionsRateOk } = await checkAISuggestionsRateLimit(user.id);
    if (!suggestionsRateOk) {
      return NextResponse.json(
        { error: 'Too many suggestion requests. Try again later.' },
        { status: 429 }
      );
    }

    // Build context and generate suggestions
    const [summary, activity] = await Promise.all([
      aiContextService.getSummaryContext(supabase, spaceId),
      aiContextService.getRecentActivity(supabase, spaceId),
    ]);

    const suggestions = generateSuggestions(summary, activity);

    // Cache result
    suggestionsCache.set(cacheKey, suggestions);

    return NextResponse.json({ suggestions });
  } catch (error) {
    logger.error('[API] /api/ai/suggestions error:', error, {
      component: 'api-route',
      action: 'api_request',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
