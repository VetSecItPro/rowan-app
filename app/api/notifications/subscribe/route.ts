import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ratelimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { z } from 'zod';

/**
 * Push Subscription Schema
 * Validates Web Push API subscription object
 */
const PushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

/**
 * POST /api/notifications/subscribe
 * Subscribe to push notifications
 */
export async function POST(req: NextRequest) {
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
    const validation = PushSubscriptionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid subscription data',
          details: validation.error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    const { endpoint, keys } = validation.data;
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // Upsert subscription (update if exists, insert if new)
    const { data: subscription, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: session.user.id,
          endpoint,
          p256dh_key: keys.p256dh,
          auth_key: keys.auth,
          user_agent: userAgent,
          last_used_at: new Date().toISOString(),
        },
        {
          onConflict: 'endpoint',
        }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Also enable push notifications in preferences
    await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: session.user.id,
          push_enabled: true,
        },
        {
          onConflict: 'user_id',
        }
      );

    return NextResponse.json({
      success: true,
      data: subscription,
      message: 'Successfully subscribed to push notifications',
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/notifications/subscribe',
        method: 'POST',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    console.error('[API] /api/notifications/subscribe POST error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe to push notifications' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/subscribe
 * Unsubscribe from push notifications
 */
export async function DELETE(req: NextRequest) {
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

    // Parse endpoint from body
    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      );
    }

    // Delete subscription
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', session.user.id)
      .eq('endpoint', endpoint);

    if (error) {
      throw error;
    }

    // Check if user has any remaining subscriptions
    const { count } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id);

    // If no subscriptions left, disable push in preferences
    if (count === 0) {
      await supabase
        .from('notification_preferences')
        .update({ push_enabled: false })
        .eq('user_id', session.user.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from push notifications',
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/notifications/subscribe',
        method: 'DELETE',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    console.error('[API] /api/notifications/subscribe DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe from push notifications' },
      { status: 500 }
    );
  }
}
