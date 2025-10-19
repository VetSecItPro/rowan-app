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

    // Get client information from request headers
    const userAgent = request.headers.get('user-agent') || '';

    // Use standardized IP extraction
    const ipAddress = ip;

    // Parse device information
    const deviceInfo = parseUserAgent(userAgent);

    // Get location information
    const locationInfo = await getLocationFromIP(ipAddress);

    // Get or create session token from auth session
    const { data: { session } } = await supabase.auth.getSession();
    const sessionToken = session?.access_token || crypto.randomUUID();

    // Check if session already exists
    const { data: existingSession } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('session_token', sessionToken)
      .single();

    if (existingSession) {
      // Update existing session
      const { error: updateError } = await supabase
        .from('user_sessions')
        .update({
          last_active: new Date().toISOString(),
          is_current: true,
        })
        .eq('id', existingSession.id);

      if (updateError) {
        logger.error('[API] Session tracking update error', updateError, {
          component: 'SessionTrackingAPI',
          action: 'UPDATE',
          userId: user.id,
        });
        return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
      }

      // Mark all other sessions as not current
      await supabase
        .from('user_sessions')
        .update({ is_current: false })
        .eq('user_id', user.id)
        .neq('id', existingSession.id);

      return NextResponse.json({
        success: true,
        sessionId: existingSession.id,
      });
    }

    // Create new session
    console.log('Creating new session with data:', {
      user_id: user.id,
      session_token: sessionToken,
      device_type: deviceInfo.device_type,
      browser: deviceInfo.browser,
      device_name: deviceInfo.device_name,
      ip_address: locationInfo.ip_address,
      city: locationInfo.city,
      country: locationInfo.country,
    });

    const { data: newSession, error: insertError } = await supabase
      .from('user_sessions')
      .insert({
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
      })
      .select()
      .single();

    console.log('Session creation result:', { newSession, insertError });

    if (insertError) {
      logger.error('[API] Session tracking creation error', insertError, {
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
      .neq('id', newSession.id);

    return NextResponse.json({
      success: true,
      sessionId: newSession.id,
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
