import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import webpush from 'web-push';

// Configure VAPID keys (should be in environment variables)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:noreply@rowan.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { userId, title, bodyText, data, icon, url, tag } = body;

    // Verify user can send to this userId (must be same user or admin)
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get active push subscriptions for user
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'No active subscriptions found' },
        { status: 404 }
      );
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title,
      body: bodyText,
      icon: icon || '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: tag || 'rowan-notification',
      data: {
        ...data,
        url: url || '/',
        timestamp: Date.now(),
      },
    });

    // Send push notifications to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          const pushConfig = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          };

          await webpush.sendNotification(pushConfig, payload);

          // Update last_used_at
          await supabase
            .from('push_subscriptions')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', subscription.id);

          return { success: true, subscriptionId: subscription.id };
        } catch (error: any) {
          console.error('Push notification failed:', error);

          // If subscription is invalid, deactivate it
          if (error.statusCode === 410 || error.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('id', subscription.id);
          }

          return {
            success: false,
            subscriptionId: subscription.id,
            error: error.message,
          };
        }
      })
    );

    // Count successes and failures
    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    return NextResponse.json({
      success: true,
      sent: successful,
      failed,
      total: results.length,
      results,
    });
  } catch (error) {
    console.error('Send push error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
