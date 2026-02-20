/**
 * GET/PUT /api/ai/settings
 *
 * Manage AI companion user settings (enabled, voice, suggestions, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { getSettings, updateSettings } from '@/lib/services/ai/conversation-persistence-service';
import { featureFlags } from '@/lib/constants/feature-flags';
import { withDynamicDataCache } from '@/lib/utils/cache-headers';

export async function GET(_req: NextRequest) {
  try {
    if (!featureFlags.isAICompanionEnabled()) {
      return Response.json({ error: 'AI companion is not enabled' }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getSettings(supabase, user.id);
    return withDynamicDataCache(NextResponse.json({ data: settings }));
  } catch (error) {
    logger.error('[API] /api/ai/settings GET error:', error, {
      component: 'api-route',
      action: 'api_request',
    });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!featureFlags.isAICompanionEnabled()) {
      return Response.json({ error: 'AI companion is not enabled' }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Only allow known fields
    const allowedFields = ['ai_enabled', 'voice_enabled', 'proactive_suggestions', 'morning_briefing', 'preferred_voice_lang', 'ai_onboarding_seen'];
    const updateData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) {
        updateData[key] = body[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return Response.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    const settings = await updateSettings(supabase, user.id, updateData);
    return Response.json({ data: settings });
  } catch (error) {
    logger.error('[API] /api/ai/settings PUT error:', error, {
      component: 'api-route',
      action: 'api_request',
    });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
