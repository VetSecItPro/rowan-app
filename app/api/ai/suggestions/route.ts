/**
 * GET /api/ai/suggestions
 *
 * Returns rule-based proactive suggestions for the current user's space.
 * No LLM call — purely derived from space summary and recent activity.
 * Feature-flag gated, rate limited, 5-min server-side cache.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { featureFlags } from '@/lib/constants/feature-flags';
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
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success } = await checkGeneralRateLimit(ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

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

    // Check cache
    const cacheKey = `${user.id}:${spaceId}`;
    const cached = suggestionsCache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ suggestions: cached });
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
