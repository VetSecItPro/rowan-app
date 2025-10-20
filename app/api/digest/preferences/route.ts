import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { z } from 'zod';

/**
 * Simplified Digest Preferences Schema
 * Only the essential fields for daily digest delivery
 */
const DigestPreferencesSchema = z.object({
  digest_enabled: z.boolean().optional(),
  digest_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).optional(), // HH:MM:SS format
  timezone: z.string().optional(),
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

    // Verify authentication
    const supabase = createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Set user context for Sentry error tracking
    setSentryUser(session.user);

    // Get or create digest preferences
    let { data: preferences, error } = await supabase
      .from('user_notification_preferences')
      .select('id, user_id, digest_enabled, digest_time, timezone, created_at, updated_at')
      .eq('user_id', session.user.id)
      .single();

    if (error && error.code === 'PGRST116') { // Not found
      // Create default preferences
      const { data: newPrefs, error: createError } = await supabase
        .from('user_notification_preferences')
        .insert({
          user_id: session.user.id,
          digest_enabled: true,
          digest_time: '07:00:00',
          timezone: 'America/New_York'
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

    return NextResponse.json({
      success: true,
      data: preferences,
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

    // Verify authentication
    const supabase = createClient();
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

    // Update preferences (upsert to handle if not exists)
    const { data: updatedPreferences, error } = await supabase
      .from('user_notification_preferences')
      .upsert(
        {
          user_id: session.user.id,
          ...validation.data,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )
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