import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseUserAgent, getLocationFromIP } from '@/lib/services/session-tracking-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { logger } from '@/lib/logger';

/**
 * POST /api/user/track-session
 * Create or update user session with device and location information
 */
export async function POST(request: Request) {
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

    const supabase = await createClient();

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

    // Get client information from request headers
    const userAgent = request.headers.get('user-agent') || '';

    // Use standardized IP extraction
    const ipAddress = ip;

    // Parse device information
    const deviceInfo = parseUserAgent(userAgent);

    // Get location information
    const locationInfo = await getLocationFromIP(ipAddress);

    // Generate a session token (user is already authenticated above)
    const sessionToken = crypto.randomUUID();

    // Use upsert to handle race conditions gracefully
    const sessionData = {
      user_id: user.id,
      session_token: sessionToken,
      device_type: deviceInfo.device_type,
      browser: deviceInfo.browser,
      browser_version: deviceInfo.browser_version,
      os: deviceInfo.os,
      os_version: deviceInfo.os_version,
      device_name: deviceInfo.device_name,
      ip_address: locationInfo.ip_address,
      city: locationInfo.city,
      region: locationInfo.region,
      country: locationInfo.country,
      country_code: locationInfo.country_code,
      latitude: locationInfo.latitude,
      longitude: locationInfo.longitude,
      is_current: true,
      user_agent: userAgent,
      last_active: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };

    // Use Supabase's upsert functionality to handle race conditions
    const { data: sessionResult, error: sessionError } = await supabase
      .from('user_sessions')
      .upsert(sessionData, {
        onConflict: 'session_token',
        ignoreDuplicates: false
      })
      .select()
      .single();


    if (sessionError) {
      logger.error('[API] Session tracking creation error', sessionError, {
        component: 'SessionTrackingAPI',
        action: 'CREATE',
        userId: user.id,
      });
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    // Mark all other sessions as not current
    await supabase
      .from('user_sessions')
      .update({ is_current: false })
      .eq('user_id', user.id)
      .neq('id', sessionResult.id);

    return NextResponse.json({
      success: true,
      sessionId: sessionResult.id,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/user/track-session',
        method: 'POST',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/user/track-session POST error', error, {
      component: 'SessionTrackingAPI',
      action: 'POST',
    });
    return NextResponse.json(
      { error: 'Failed to track session' },
      { status: 500 }
    );
  }
}
