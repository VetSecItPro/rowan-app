import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { notificationQueueService } from '@/lib/services/notification-queue-service';
import { logger } from '@/lib/logger';
import { verifyCronSecret } from '@/lib/security/verify-secret';
import {
  sendTaskAssignmentEmail,
  sendEventReminderEmail,
  sendNewMessageEmail,
  sendShoppingListEmail,
  sendMealReminderEmail,
  sendGeneralReminderEmail
} from '@/lib/services/email-service';

export const dynamic = 'force-dynamic';
// PERF: Prevent serverless timeout — FIX-015
export const maxDuration = 60;

// This endpoint should be called by a cron job (e.g., Vercel Cron, or external service)
// Authorization should be via a secret token

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Fail-closed if CRON_SECRET is not configured
    if (!process.env.CRON_SECRET) {
      logger.error('[CRON] CRON_SECRET environment variable not configured', undefined, { component: 'api-route', action: 'api_request' });
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Verify cron secret to prevent unauthorized access (timing-safe comparison)
    const authHeader = request.headers.get('authorization');
    if (!verifyCronSecret(authHeader, process.env.CRON_SECRET)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = supabaseAdmin;

    // Get all pending notifications ready to send
    const pending = await notificationQueueService.getPendingNotifications(100, supabase);

    if (pending.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No pending notifications',
      });
    }

    // Group by user and delivery method
    const groupedByUser = pending.reduce((acc, notification) => {
      const key = `${notification.user_id}-${notification.delivery_method}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(notification);
      return acc;
    }, {} as Record<string, typeof pending>);

    let sent = 0;
    let failed = 0;

    // Process each group
    for (const [key, notifications] of Object.entries(groupedByUser)) {
      try {
        const [userId, deliveryMethod] = key.split('-');

        if (deliveryMethod === 'instant') {
          // Send each instant notification individually
          for (const notif of notifications) {
            try {
              const result = await sendInstantNotification(userId, notif);
              if (result.success) {
                await notificationQueueService.markAsSent([notif.id], supabase);
                sent++;
              } else {
                throw new Error(result.error || 'Failed to send notification');
              }
            } catch (error) {
              logger.error('Error sending instant notification:', error, { component: 'api-route', action: 'api_request' });
              await notificationQueueService.markAsFailed(
                notif.id,
                error instanceof Error ? error.message : 'Unknown error',
                notif.retry_count + 1,
                supabase
              );
              failed++;
            }
          }
        } else {
          // Unknown delivery method - mark as failed
          logger.error('Unknown delivery method:', deliveryMethod, { component: 'api-route', action: 'api_request' });
          for (const notif of notifications) {
            await notificationQueueService.markAsFailed(
              notif.id,
              `Unsupported delivery method: ${deliveryMethod}`,
              notif.retry_count + 1,
              supabase
            );
          }
          failed += notifications.length;
        }
      } catch (error) {
        logger.error('Error processing notification group:', error, { component: 'api-route', action: 'api_request' });
        failed += notifications.length;
      }
    }

    // Cleanup old notifications
    const cleaned = await notificationQueueService.cleanup(supabase);

    return NextResponse.json({
      success: true,
      processed: sent + failed,
      sent,
      failed,
      cleaned,
    });
  } catch (error) {
    logger.error('Cron job error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Send instant notification email
 */
type NotificationPayload = {
  type?: string;
  assignerName?: string;
  title?: string;
  description?: string;
  dueDate?: string;
  priority?: string;
  spaceId?: string;
  taskId?: string;
  spaceName?: string;
  eventDate?: string;
  eventTime?: string;
  location?: string;
  reminderType?: string;
  eventId?: string;
  senderName?: string;
  senderAvatar?: string;
  content?: string;
  conversationTitle?: string;
  conversationId?: string;
  items?: Array<Record<string, unknown>>;
  totalItems?: number;
  completedItems?: number;
  actionType?: string;
  listId?: string;
  mealType?: string;
  mealDate?: string;
  mealTime?: string;
  ingredients?: Array<Record<string, unknown>> | string[] | null;
  cookingTime?: string;
  recipeUrl?: string;
  mealId?: string;
  dueTime?: string;
  category?: string;
  reminderId?: string;
  createdBy?: string;
};

type NotificationRecord = {
  notification_data: NotificationPayload;
};

async function sendInstantNotification(userId: string, notification: NotificationRecord): Promise<{ success: boolean; error?: string }> {
  const supabase = supabaseAdmin;

  // Get user details
  const { data: user } = await supabase
    .from('users')
    .select('email, name')
    .eq('id', userId)
    .single();

  if (!user?.email) {
    return { success: false, error: 'User email not found' };
  }

  const notificationData = notification.notification_data;
  const notificationType = notificationData.type;

  try {
    switch (notificationType) {
      case 'task':
        return await sendTaskAssignmentEmail({
          recipientEmail: user.email,
          recipientName: user.name || 'Partner',
          assignerName: notificationData.assignerName || 'System',
          taskTitle: notificationData.title || 'Untitled Task',
          taskDescription: notificationData.description || '',
          dueDate: notificationData.dueDate || '',
          priority: (notificationData.priority || 'normal') as 'high' | 'low' | 'normal' | 'urgent',
          spaceId: notificationData.spaceId || '',
          taskId: notificationData.taskId || '',
          spaceName: notificationData.spaceName || 'Unknown Space'
        });

      case 'event':
        return await sendEventReminderEmail({
          recipientEmail: user.email,
          recipientName: user.name || 'Partner',
          eventTitle: notificationData.title || 'Untitled Event',
          eventDescription: notificationData.description || '',
          eventDate: notificationData.eventDate || '',
          eventTime: notificationData.eventTime || '',
          location: notificationData.location || '',
          reminderType: (notificationData.reminderType || '15min') as '15min' | '1hour' | '1day',
          eventId: notificationData.eventId || '',
          spaceId: notificationData.spaceId || '',
          spaceName: notificationData.spaceName || 'Unknown Space'
        });

      case 'message':
        return await sendNewMessageEmail({
          recipientEmail: user.email,
          recipientName: user.name || 'Partner',
          senderName: notificationData.senderName || 'Someone',
          senderAvatar: notificationData.senderAvatar || '',
          messageContent: notificationData.content || notificationData.title || '',
          conversationTitle: notificationData.conversationTitle || '',
          spaceId: notificationData.spaceId || '',
          conversationId: notificationData.conversationId || '',
          spaceName: notificationData.spaceName || 'Unknown Space',
          messageTimestamp: new Date().toISOString()
        });

      case 'shopping':
        return await sendShoppingListEmail({
          recipientEmail: user.email,
          recipientName: user.name || 'Partner',
          senderName: notificationData.senderName || 'Someone',
          listName: notificationData.title || 'Shopping List',
          listDescription: notificationData.description || '',
          items: (notificationData.items || []) as { id: string; name: string; quantity?: string; checked: boolean }[],
          totalItems: notificationData.totalItems || 0,
          completedItems: notificationData.completedItems || 0,
          actionType: (notificationData.actionType || 'shared') as 'shared' | 'updated' | 'completed',
          spaceId: notificationData.spaceId || '',
          listId: notificationData.listId || '',
          spaceName: notificationData.spaceName || 'Unknown Space'
        });

      case 'meal':
        return await sendMealReminderEmail({
          recipientEmail: user.email,
          recipientName: user.name || 'Partner',
          mealName: notificationData.title || 'Meal',
          mealType: (notificationData.mealType || 'dinner') as 'breakfast' | 'lunch' | 'dinner' | 'snack',
          mealDate: notificationData.mealDate || '',
          mealTime: notificationData.mealTime || '',
          reminderType: (notificationData.reminderType || 'prep') as 'cook' | 'plan' | 'prep',
          ingredients: (notificationData.ingredients || []) as string[],
          cookingTime: notificationData.cookingTime || '',
          recipeUrl: notificationData.recipeUrl || '',
          spaceId: notificationData.spaceId || '',
          mealId: notificationData.mealId || '',
          spaceName: notificationData.spaceName || 'Unknown Space'
        });

      case 'reminder':
        return await sendGeneralReminderEmail({
          recipientEmail: user.email,
          recipientName: user.name || 'Partner',
          reminderTitle: notificationData.title || 'Reminder',
          reminderDescription: notificationData.description || '',
          reminderType: (notificationData.reminderType || 'personal') as 'personal' | 'shared' | 'recurring',
          dueDate: notificationData.dueDate || '',
          dueTime: notificationData.dueTime || '',
          priority: (notificationData.priority || 'normal') as 'high' | 'low' | 'normal' | 'urgent',
          category: notificationData.category || '',
          spaceId: notificationData.spaceId || '',
          reminderId: notificationData.reminderId || '',
          spaceName: notificationData.spaceName || 'Unknown Space',
          createdBy: notificationData.createdBy || ''
        });

      default:
        return { success: false, error: `Unknown notification type: ${notificationType}` };
    }
  } catch (error) {
    logger.error('Error sending instant notification:', error, { component: 'api-route', action: 'api_request' });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
