import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ratelimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { z } from 'zod';

/**
 * Notification Preferences Schema
 * Validates all notification preference fields
 */
const NotificationPreferencesSchema = z.object({
  // Email preferences
  email_enabled: z.boolean().optional(),
  email_reminders: z.boolean().optional(),
  email_task_assignments: z.boolean().optional(),
  email_events: z.boolean().optional(),
  email_shopping_lists: z.boolean().optional(),
  email_meal_reminders: z.boolean().optional(),
  email_messages: z.boolean().optional(),
  email_digest_frequency: z.enum(['realtime', 'daily', 'weekly', 'never']).optional(),

  // Push preferences
  push_enabled: z.boolean().optional(),
  push_reminders: z.boolean().optional(),
  push_tasks: z.boolean().optional(),
  push_messages: z.boolean().optional(),
  push_shopping_updates: z.boolean().optional(),
  push_events: z.boolean().optional(),

  // Quiet hours
  quiet_hours_enabled: z.boolean().optional(),
  quiet_hours_start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(), // HH:MM format
  quiet_hours_end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(), // HH:MM format
  timezone: z.string().optional(),
});

/**
 * GET /api/notifications/preferences
 * Get user's notification preferences
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting (with graceful fallback)
    try {
      const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
      const { success: rateLimitSuccess } = await ratelimit.limit(ip);

      if (!rateLimitSuccess) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
    } catch (rateLimitError) {
      // Continue if rate limiting fails
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

    // Get notification preferences
    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    // If no preferences exist, create default ones
    if (!preferences) {
      const { data: newPreferences, error: createError } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: session.user.id,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return NextResponse.json({
        success: true,
        data: newPreferences,
      });
    }

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/notifications/preferences',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    console.error('[API] /api/notifications/preferences GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications/preferences
 * Update user's notification preferences
 */
export async function PATCH(req: NextRequest) {
  try {
    // Rate limiting (with graceful fallback)
    try {
      const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
      const { success: rateLimitSuccess } = await ratelimit.limit(ip);

      if (!rateLimitSuccess) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
    } catch (rateLimitError) {
      // Continue if rate limiting fails
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
    const validation = NotificationPreferencesSchema.safeParse(body);

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
      .from('notification_preferences')
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
      message: 'Notification preferences updated successfully',
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/notifications/preferences',
        method: 'PATCH',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    console.error('[API] /api/notifications/preferences PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}
