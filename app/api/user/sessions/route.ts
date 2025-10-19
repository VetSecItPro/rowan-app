import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserSessions, formatLastActive } from '@/lib/services/session-tracking-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/sessions
 * Fetch all active sessions for the authenticated user
 */
export async function GET(request: Request) {
  try {
    // Rate limiting with automatic fallback
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Set user context for Sentry error tracking
    setSentryUser(user);

    // Get user sessions
    console.log('Fetching sessions for user ID:', user.id);
    const result = await getUserSessions(user.id);
    console.log('getUserSessions result:', result);

    if (!result.success) {
      console.error('getUserSessions failed:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    console.log('Raw sessions from database:', result.sessions);

    // Format sessions for display
    const formattedSessions = result.sessions?.map((session) => ({
      id: session.id,
      device: session.device_name || `${session.os} - ${session.browser}`,
      location: session.city && session.region
        ? `${session.city}, ${session.region}`
        : session.country || 'Unknown',
      lastActive: formatLastActive(session.last_active),
      isCurrent: session.is_current,
      createdAt: session.created_at,
      browser: session.browser,
      os: session.os,
      ipAddress: session.ip_address,
    }));

    console.log('Formatted sessions for frontend:', formattedSessions);

    return NextResponse.json({
      success: true,
      sessions: formattedSessions || [],
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/user/sessions',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/user/sessions GET error', error, {
      component: 'SessionTrackingAPI',
      action: 'GET',
    });
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
