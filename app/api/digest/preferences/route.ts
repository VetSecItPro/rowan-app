import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { z } from 'zod';

/**
 * Simplified Digest Preferences Schema
 * Only digest_enabled toggle - time/timezone fixed at 7 AM Central
 */
const DigestPreferencesSchema = z.object({
  digest_enabled: z.boolean(),
});

/**
 * GET /api/digest/preferences
 * Get user's digest preferences
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting with automatic fallback
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Verify authentication - Use direct cookie access like middleware
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const cookieHeader = req.headers.get('cookie');
            if (!cookieHeader) return undefined;

            const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
              const [key, value] = cookie.trim().split('=');
              acc[key] = value;
              return acc;
            }, {} as Record<string, string>);

            return cookies[name];
          },
          set() {
            // Not needed for API routes
          },
          remove() {
            // Not needed for API routes
          },
        },
      }
    );

    const { data: { session }, error: authError } = await supabase.auth.getSession();

    console.log('[API] Direct cookie auth result:', {
      hasSession: !!session,
      sessionId: session?.user?.id?.substring(0, 8),
      authError: authError?.message,
      userEmail: session?.user?.email
    });

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Set user context for Sentry error tracking
    setSentryUser(session.user);

    // Get or create digest preferences - simplified for fixed 7 AM Central
    let { data: preferences, error } = await supabase
      .from('user_notification_preferences')
      .select('id, user_id, digest_enabled, created_at, updated_at')
      .eq('user_id', session.user.id)
      .single();

    if (error && error.code === 'PGRST116') { // Not found
      // Create default preferences - enabled by default
      const { data: newPrefs, error: createError } = await supabase
        .from('user_notification_preferences')
        .insert({
          user_id: session.user.id,
          digest_enabled: true
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      preferences = newPrefs;
    } else if (error) {
      throw error;
    }

    // Ensure preferences exist
    if (!preferences) {
      throw new Error('No preferences found');
    }

    // Return simple preferences (time/timezone are fixed at 7 AM Central)
    const transformedPreferences = {
      ...preferences,
      digest_enabled: preferences.digest_enabled ?? true,
      digest_time: '07:00:00',
      timezone: 'America/New_York'
    };

    return NextResponse.json({
      success: true,
      data: transformedPreferences,
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/digest/preferences',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    console.error('[API] /api/digest/preferences GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch digest preferences' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/digest/preferences
 * Update user's digest preferences
 */
export async function PATCH(req: NextRequest) {
  try {
    // Rate limiting with automatic fallback
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Verify authentication - Use direct cookie access like middleware
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const cookieHeader = req.headers.get('cookie');
            if (!cookieHeader) return undefined;

            const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
              const [key, value] = cookie.trim().split('=');
              acc[key] = value;
              return acc;
            }, {} as Record<string, string>);

            return cookies[name];
          },
          set() {
            // Not needed for API routes
          },
          remove() {
            // Not needed for API routes
          },
        },
      }
    );

    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Set user context for Sentry error tracking
    setSentryUser(session.user);

    // Parse and validate request body
    const body = await req.json();
    const validation = DigestPreferencesSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    // Update preferences (use UPDATE since record should exist)
    const { data: updatedPreferences, error } = await supabase
      .from('user_notification_preferences')
      .update({
        digest_enabled: validation.data.digest_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: updatedPreferences,
      message: 'Digest preferences updated successfully',
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/digest/preferences',
        method: 'PATCH',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    console.error('[API] /api/digest/preferences PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update digest preferences' },
      { status: 500 }
    );
  }
}