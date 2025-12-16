// Phase 16: Track Notification Dismissal API
// Called by service worker when user dismisses a push notification

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// Validation schema
const trackDismissalSchema = z.object({
  notification_id: z.string().optional(),
  tag: z.string().optional(),
  action: z.enum(['dismissed', 'clicked', 'closed']).default('dismissed'),
  timestamp: z.string().optional(),
  user_id: z.string().uuid().optional(),
});

/**
 * POST /api/notifications/track-dismissal
 * Track when a push notification is dismissed or interacted with
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

    // Parse request body
    const body = await req.json();
    const parseResult = trackDismissalSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { notification_id, tag, action, timestamp, user_id } = parseResult.data;

    // Try to get session (may not always be available from SW)
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    const effectiveUserId = user_id || session?.user?.id;

    // Log the dismissal/interaction to notification_log
    const { error: logError } = await supabase
      .from('notification_log')
      .insert({
        user_id: effectiveUserId,
        notification_type: 'push',
        channel: 'push',
        status: action === 'clicked' ? 'clicked' : 'dismissed',
        metadata: {
          notification_id,
          tag,
          action,
          tracked_at: timestamp || new Date().toISOString(),
        },
      });

    if (logError) {
      // Log error but don't fail - this is analytics, not critical
      logger.error('Error logging notification dismissal:', logError, { component: 'api-route', action: 'api_request' });
    }

    // If we have a notification_id, try to mark it as read if clicked
    if (notification_id && action === 'clicked') {
      await supabase
        .from('in_app_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notification_id);
    }

    return NextResponse.json({
      success: true,
      tracked: true,
    });
  } catch (error) {
    // Don't report to Sentry for tracking failures - too noisy
    logger.error('[API] /api/notifications/track-dismissal POST error:', error, { component: 'api-route', action: 'api_request' });

    // Still return success to SW - we don't want to cause issues
    return NextResponse.json({
      success: true,
      tracked: false,
    });
  }
}
