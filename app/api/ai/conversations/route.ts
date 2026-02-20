/**
 * GET /api/ai/conversations?spaceId=xxx
 *
 * List conversation history for the current user in a space.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifySpaceAccess } from '@/lib/services/authorization-service';
import { logger } from '@/lib/logger';
import { listConversations } from '@/lib/services/ai/conversation-persistence-service';
import { featureFlags } from '@/lib/constants/feature-flags';
import { validateAIAccess, buildAIAccessDeniedResponse } from '@/lib/services/ai/ai-access-guard';
import { withDynamicDataCache } from '@/lib/utils/cache-headers';

export async function GET(req: NextRequest) {
  try {
    if (!featureFlags.isAICompanionEnabled()) {
      return Response.json({ error: 'AI companion is not enabled' }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const spaceId = req.nextUrl.searchParams.get('spaceId');
    if (!spaceId) {
      return Response.json({ error: 'spaceId is required' }, { status: 400 });
    }

    try {
      await verifySpaceAccess(user.id, spaceId);
    } catch {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    // AI access check (tier only, no budget check for listing conversations)
    const aiAccess = await validateAIAccess(supabase, user.id, spaceId, false);
    if (!aiAccess.allowed) {
      return buildAIAccessDeniedResponse(aiAccess);
    }

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20'), 50);
    const offset = Math.max(parseInt(req.nextUrl.searchParams.get('offset') ?? '0'), 0);

    const conversations = await listConversations(supabase, spaceId, limit, offset);
    return withDynamicDataCache(NextResponse.json({ data: conversations }));
  } catch (error) {
    logger.error('[API] /api/ai/conversations GET error:', error, {
      component: 'api-route',
      action: 'api_request',
    });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
