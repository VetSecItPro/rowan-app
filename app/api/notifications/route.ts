// Phase 16: Notifications API Routes
// GET - Fetch user notifications
// POST - Create notification (internal/service use)
// PATCH - Mark notifications as read

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  inAppNotificationsService,
  type NotificationFilters,
  type CreateNotificationInput
} from '@/lib/services/in-app-notifications-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { z } from 'zod';

// Validation schemas
const getNotificationsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
  type: z.enum([
    'task', 'event', 'message', 'shopping', 'meal', 'reminder',
    'milestone', 'goal_update', 'expense', 'bill_due', 'space_invite', 'system'
  ]).optional(),
  is_read: z.enum(['true', 'false']).optional().transform(v => v === 'true' ? true : v === 'false' ? false : undefined),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  space_id: z.string().uuid().optional(),
});

const createNotificationSchema = z.object({
  user_id: z.string().uuid(),
  type: z.enum([
    'task', 'event', 'message', 'shopping', 'meal', 'reminder',
    'milestone', 'goal_update', 'expense', 'bill_due', 'space_invite', 'system'
  ]),
  title: z.string().min(1).max(255),
  content: z.string().min(1).max(1000),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
  space_id: z.string().uuid().optional(),
  space_name: z.string().optional(),
  related_item_id: z.string().optional(),
  related_item_type: z.string().optional(),
  action_url: z.string().optional(),
  emoji: z.string().optional(),
  sender_id: z.string().uuid().optional(),
  sender_name: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const markReadSchema = z.object({
  notification_ids: z.array(z.string().uuid()).optional(),
  mark_all: z.boolean().optional(),
});

/**
 * GET /api/notifications
 * Get notifications for the authenticated user
 */
export async function GET(req: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const parseResult = getNotificationsSchema.safeParse(queryParams);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const filters: NotificationFilters = {
      limit: parseResult.data.limit,
      offset: parseResult.data.offset,
      type: parseResult.data.type,
      is_read: parseResult.data.is_read,
      priority: parseResult.data.priority,
      space_id: parseResult.data.space_id,
    };

    // Get notifications
    const notifications = await inAppNotificationsService.getUserNotifications(
      user.id,
      filters
    );

    // Get unread count
    const unreadCount = await inAppNotificationsService.getUnreadCount(user.id);

    return NextResponse.json({
      success: true,
      data: notifications,
      unread_count: unreadCount,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: '/api/notifications', method: 'GET' },
    });
    logger.error('[API] /api/notifications GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Create a new notification (typically called by other services)
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

    // Parse request body
    const body = await req.json();
    const parseResult = createNotificationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const input: CreateNotificationInput = parseResult.data;

    // Create notification
    const success = await inAppNotificationsService.createNotification(input);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to create notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification created',
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: '/api/notifications', method: 'POST' },
    });
    logger.error('[API] /api/notifications POST error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Mark notifications as read
 */
export async function PATCH(req: NextRequest) {
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

    // Parse request body
    const body = await req.json();
    const parseResult = markReadSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { notification_ids, mark_all } = parseResult.data;

    if (mark_all) {
      // Mark all as read
      const success = await inAppNotificationsService.markAllAsRead(user.id);
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to mark all notifications as read' },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
      });
    }

    if (notification_ids && notification_ids.length > 0) {
      // Mark specific notifications as read
      const results = await Promise.all(
        notification_ids.map(id => inAppNotificationsService.markAsRead(id))
      );
      const successCount = results.filter(Boolean).length;

      return NextResponse.json({
        success: true,
        message: `${successCount} notification(s) marked as read`,
        marked_count: successCount,
      });
    }

    return NextResponse.json(
      { error: 'Either notification_ids or mark_all must be provided' },
      { status: 400 }
    );
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: '/api/notifications', method: 'PATCH' },
    });
    logger.error('[API] /api/notifications PATCH error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications
 * Delete notifications
 */
export async function DELETE(req: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const notificationId = searchParams.get('id');
    const deleteAllRead = searchParams.get('delete_all_read') === 'true';

    if (deleteAllRead) {
      // Delete all read notifications
      const success = await inAppNotificationsService.deleteAllRead(user.id);
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to delete read notifications' },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        message: 'All read notifications deleted',
      });
    }

    if (notificationId) {
      // Delete specific notification
      const success = await inAppNotificationsService.deleteNotification(notificationId);
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to delete notification' },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        message: 'Notification deleted',
      });
    }

    return NextResponse.json(
      { error: 'Either id or delete_all_read must be provided' },
      { status: 400 }
    );
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: '/api/notifications', method: 'DELETE' },
    });
    logger.error('[API] /api/notifications DELETE error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
