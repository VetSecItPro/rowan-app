/**
 * GET /api/notifications/digest-preview
 *
 * Renders the AI Daily Digest email for the authenticated user and returns
 * the HTML so it can be displayed in-app. Does NOT send an email. Used by
 * the "Preview today's digest" button in Settings -> Notifications.
 *
 * The render path goes through the same job-side helper (renderDigestForUser)
 * that the cron uses, so preview output matches what would actually be sent.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { renderDigestForUser } from '@/lib/jobs/daily-digest-job';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';

export async function GET(req: NextRequest) {
  try {
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { html, aiGenerated } = await renderDigestForUser(user.id);

    return NextResponse.json({
      success: true,
      html,
      aiGenerated,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: '/api/notifications/digest-preview', method: 'GET' },
    });
    logger.error(
      '[API] /api/notifications/digest-preview GET error:',
      error,
      { component: 'api-route', action: 'api_request' }
    );
    const message = error instanceof Error ? error.message : 'Failed to render digest preview';
    // "No space found for user" is an expected user-facing condition (new
    // accounts before space creation). Surface as 400 for clearer client UX.
    if (message === 'No space found for user' || message === 'User profile not found') {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to render digest preview' }, { status: 500 });
  }
}
