/**
 * GET /api/ai/briefing
 *
 * Returns an AI-generated morning briefing for the current user.
 * Only available between 6am and 11am local time.
 * Checks ai_user_settings.morning_briefing flag.
 * 30-minute server-side cache per user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAIBriefingRateLimit } from '@/lib/ratelimit';
import { featureFlags } from '@/lib/constants/feature-flags';
import { validateAIAccess, buildAIAccessDeniedResponse } from '@/lib/services/ai/ai-access-guard';
import { briefingService } from '@/lib/services/ai/briefing-service';
import { getSettings } from '@/lib/services/ai/conversation-persistence-service';
import { logger } from '@/lib/logger';
import { LRUCache } from 'lru-cache';
import type { BriefingOutput } from '@/lib/services/ai/briefing-service';

// 30-minute cache per user
const briefingCache = new LRUCache<string, BriefingOutput>({
  max: 100,
  ttl: 30 * 60 * 1000,
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

    // AI access check (subscription tier + budget)
    const aiAccess = await validateAIAccess(supabase, user.id, spaceId);
    if (!aiAccess.allowed) {
      return buildAIAccessDeniedResponse(aiAccess);
    }

    // Per-user briefing rate limit (1 per hour)
    const { success: briefingRateOk } = await checkAIBriefingRateLimit(user.id);
    if (!briefingRateOk) {
      return NextResponse.json(
        { error: 'Briefing already generated recently. Try again in an hour.' },
        { status: 429 }
      );
    }

    // Time window check (6am - 11am)
    const hour = new Date().getHours();
    if (hour < 6 || hour >= 11) {
      return NextResponse.json(
        { error: 'Morning briefing is only available between 6am and 11am' },
        { status: 404 }
      );
    }

    // Check user settings
    const settings = await getSettings(supabase, user.id);
    if (!settings.morning_briefing) {
      return NextResponse.json(
        { error: 'Morning briefing is disabled' },
        { status: 404 }
      );
    }

    // Check cache
    const cacheKey = `${user.id}:${spaceId}`;
    const cached = briefingCache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ briefing: cached });
    }

    // Generate briefing
    const briefing = await briefingService.generateBriefing(supabase, spaceId, user);

    // Cache result
    briefingCache.set(cacheKey, briefing);

    return NextResponse.json({ briefing });
  } catch (error) {
    logger.error('[API] /api/ai/briefing error:', error, {
      component: 'api-route',
      action: 'api_request',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
