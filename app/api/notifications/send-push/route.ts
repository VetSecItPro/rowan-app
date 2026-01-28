// Phase 16: Push Notifications API Route
// Sends push notifications via Web Push protocol

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { z } from 'zod';
import webpush from 'web-push';
import { logger } from '@/lib/logger';

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:noreply@rowanapp.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
}

// Validation schemas
const pushPayloadSchema = z.object({
  title: z.string().min(1).max(255),
  body: z.string().min(1).max(500),
  icon: z.string().optional(),
  badge: z.string().optional(),
  image: z.string().optional(),
  tag: z.string().optional(),
  requireInteraction: z.boolean().optional(),
  data: z.object({
    url: z.string().optional(),
    action: z.string().optional(),
    id: z.string().optional(),
  }).passthrough().optional(),
  actions: z.array(z.object({
    action: z.string(),
    title: z.string(),
    icon: z.string().optional(),
  })).optional(),
});

const sendPushSchema = z.object({
  userId: z.string().uuid(),
  payload: pushPayloadSchema,
});

const sendBulkPushSchema = z.object({
  userIds: z.array(z.string().uuid()),
  payload: pushPayloadSchema,
});

function withTracking(payload: z.infer<typeof pushPayloadSchema>) {
  const data = payload.data ? { ...payload.data } : {};
  if (data.trackDismissal === undefined) {
    data.trackDismissal = true;
  }
  return {
    ...payload,
    data,
  };
}

/**
 * POST /api/notifications/send-push
 * Send push notification to a user or multiple users
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    setSentryUser(user);
    const callerId = user.id;

    // Check if VAPID is configured
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { error: 'Push notifications not configured' },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await req.json();

    // Check if bulk or single send
    const isBulk = 'userIds' in body;

    // SECURITY: Helper to verify caller can notify target user
    // Users can only send notifications to members of their shared spaces
    async function canNotifyUser(targetUserId: string): Promise<boolean> {
      // Users can always notify themselves
      if (targetUserId === callerId) return true;

      // Check if caller and target share at least one space
      const [callerSpacesResult, targetSpacesResult] = await Promise.all([
        supabase
          .from('space_members')
          .select('space_id')
          .eq('user_id', callerId),
        supabase
          .from('space_members')
          .select('space_id')
          .eq('user_id', targetUserId),
      ]);

      if (callerSpacesResult.error || targetSpacesResult.error) {
        logger.error('Error checking space membership:', {
          component: 'api-route',
          action: 'api_request',
          callerError: callerSpacesResult.error,
          targetError: targetSpacesResult.error,
        });
        return false;
      }

      const callerSpaces = callerSpacesResult.data || [];
      const targetSpaces = targetSpacesResult.data || [];
      const targetSpaceIds = new Set(targetSpaces.map((space: { space_id: string }) => space.space_id));
      return callerSpaces.some((space: { space_id: string }) => targetSpaceIds.has(space.space_id));
    }

    if (isBulk) {
      // Bulk send
      const parseResult = sendBulkPushSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { error: 'Invalid request body', details: parseResult.error.flatten() },
          { status: 400 }
        );
      }

      const { userIds, payload } = parseResult.data;
      const payloadWithTracking = withTracking(payload);
      const results = { success: 0, failed: 0, errors: [] as string[], unauthorized: 0 };

      for (const userId of userIds) {
        // SECURITY: Verify authorization for each target user
        const authorized = await canNotifyUser(userId);
        if (!authorized) {
          results.unauthorized++;
          results.errors.push(`${userId}: Not authorized to notify this user`);
          continue;
        }

        const sendResult = await sendPushToUser(supabase, userId, payloadWithTracking);
        if (sendResult.success) {
          results.success += sendResult.sent;
          results.failed += sendResult.failed;
        } else {
          results.failed++;
          if (sendResult.error) {
            results.errors.push(`${userId}: ${sendResult.error}`);
          }
        }
      }

      return NextResponse.json({
        success: true,
        results,
      });
    } else {
      // Single user send
      const parseResult = sendPushSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { error: 'Invalid request body', details: parseResult.error.flatten() },
          { status: 400 }
        );
      }

      const { userId, payload } = parseResult.data;
      const payloadWithTracking = withTracking(payload);

      // SECURITY: Verify caller can notify target user
      const authorized = await canNotifyUser(userId);
      if (!authorized) {
        return NextResponse.json(
          { error: 'Not authorized to send notifications to this user' },
          { status: 403 }
        );
      }

      const result = await sendPushToUser(supabase, userId, payloadWithTracking);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to send push notification' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        sent: result.sent,
        failed: result.failed,
      });
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: '/api/notifications/send-push', method: 'POST' },
    });
    logger.error('[API] /api/notifications/send-push POST error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Send push notification to a specific user's subscribed devices
 */
async function sendPushToUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  payload: z.infer<typeof pushPayloadSchema>
): Promise<{ success: boolean; sent: number; failed: number; error?: string }> {
  try {
    // Get user's active push subscriptions
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (fetchError) {
      logger.error('Error fetching subscriptions:', fetchError, { component: 'api-route', action: 'api_request' });
      return { success: false, sent: 0, failed: 0, error: 'Failed to fetch push subscriptions' };
    }

    if (!subscriptions || subscriptions.length === 0) {
      // No subscriptions is not an error, just no devices to notify
      return { success: true, sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    // Send to all subscribed devices
    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload)
        );

        sent++;
      } catch (pushError: unknown) {
        failed++;
        logger.error('Push send error:', pushError, { component: 'api-route', action: 'api_request' });

        // If subscription is invalid, mark as inactive
        if (pushError instanceof Error) {
          const errorMessage = pushError.message || '';
          if (
            errorMessage.includes('expired') ||
            errorMessage.includes('unsubscribed') ||
            (pushError as { statusCode?: number }).statusCode === 410
          ) {
            await supabase
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('id', sub.id);
          }
        }
      }
    }

    return { success: true, sent, failed };
  } catch (error) {
    logger.error('Error in sendPushToUser:', error, { component: 'api-route', action: 'api_request' });
    return {
      success: false,
      sent: 0,
      failed: 0,
      error: 'Failed to send push notification',
    };
  }
}
