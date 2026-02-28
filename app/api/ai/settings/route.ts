/**
 * GET/PUT /api/ai/settings
 *
 * Manage AI companion user settings (enabled, voice, suggestions, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { getSettings, updateSettings } from '@/lib/services/ai/conversation-persistence-service';
import { featureFlags } from '@/lib/constants/feature-flags';
import { withDynamicDataCache } from '@/lib/utils/cache-headers';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';

const AISettingsUpdateSchema = z.object({
  ai_enabled: z.boolean().optional(),
  voice_enabled: z.boolean().optional(),
  proactive_suggestions: z.boolean().optional(),
  morning_briefing: z.boolean().optional(),
  preferred_voice_lang: z.string().optional(),
  ai_onboarding_seen: z.boolean().optional(),
}).strict();

export async function GET(req: NextRequest) {
  try {
    const ip = extractIP(req.headers);
    const { success: rateLimitOk } = await checkGeneralRateLimit(ip);
    if (!rateLimitOk) {
      return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

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
    const ip = extractIP(req.headers);
    const { success: rateLimitOk } = await checkGeneralRateLimit(ip);
    if (!rateLimitOk) {
      return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    if (!featureFlags.isAICompanionEnabled()) {
      return Response.json({ error: 'AI companion is not enabled' }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const parsed = AISettingsUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const updateData = parsed.data;

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
