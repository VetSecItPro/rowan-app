import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notificationQueueService } from '@/lib/services/notification-queue-service';
import {
  sendTaskAssignmentEmail,
  sendEventReminderEmail,
  sendNewMessageEmail,
  sendShoppingListEmail,
  sendMealReminderEmail,
  sendGeneralReminderEmail
} from '@/lib/services/email-service';

export const dynamic = 'force-dynamic';

// This endpoint should be called by a cron job (e.g., Vercel Cron, or external service)
// Authorization should be via a secret token

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Get all pending notifications ready to send
    const pending = await notificationQueueService.getPendingNotifications(100);

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
                await notificationQueueService.markAsSent([notif.id]);
                sent++;
              } else {
                throw new Error(result.error || 'Failed to send notification');
              }
            } catch (error) {
              console.error('Error sending instant notification:', error);
              await notificationQueueService.markAsFailed(
                notif.id,
                error instanceof Error ? error.message : 'Unknown error',
                notif.retry_count + 1
              );
              failed++;
            }
          }
        } else {
          // Unknown delivery method - mark as failed
          console.error('Unknown delivery method:', deliveryMethod);
          for (const notif of notifications) {
            await notificationQueueService.markAsFailed(
              notif.id,
              `Unsupported delivery method: ${deliveryMethod}`,
              notif.retry_count + 1
            );
          }
          failed += notifications.length;
        }
      } catch (error) {
        console.error('Error processing notification group:', error);
        failed += notifications.length;
      }
    }

    // Cleanup old notifications
    const cleaned = await notificationQueueService.cleanup();

    return NextResponse.json({
      success: true,
      processed: sent + failed,
      sent,
      failed,
      cleaned,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Send instant notification email
 */
async function sendInstantNotification(userId: string, notification: any): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get user details
  const { data: user } = await supabase
    .from('profiles')
    .select('email, first_name, last_name')
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
          recipientName: user.first_name || 'Partner',
          assignerName: notificationData.assignerName || 'System',
          taskTitle: notificationData.title,
          taskDescription: notificationData.description,
          dueDate: notificationData.dueDate,
          priority: notificationData.priority || 'normal',
          spaceId: notificationData.spaceId || '',
          taskId: notificationData.taskId || '',
          spaceName: notificationData.spaceName || 'Unknown Space'
        });

      case 'event':
        return await sendEventReminderEmail({
          recipientEmail: user.email,
          recipientName: user.first_name || 'Partner',
          eventTitle: notificationData.title,
          eventDescription: notificationData.description,
          eventDate: notificationData.eventDate || '',
          eventTime: notificationData.eventTime || '',
          location: notificationData.location,
          reminderType: notificationData.reminderType || '15min',
          eventId: notificationData.eventId || '',
          spaceId: notificationData.spaceId || '',
          spaceName: notificationData.spaceName || 'Unknown Space'
        });

      case 'message':
        return await sendNewMessageEmail({
          recipientEmail: user.email,
          recipientName: user.first_name || 'Partner',
          senderName: notificationData.senderName || 'Someone',
          senderAvatar: notificationData.senderAvatar,
          messageContent: notificationData.content || notificationData.title,
          conversationTitle: notificationData.conversationTitle,
          spaceId: notificationData.spaceId || '',
          conversationId: notificationData.conversationId || '',
          spaceName: notificationData.spaceName || 'Unknown Space',
          messageTimestamp: new Date(notification.created_at).toISOString()
        });

      case 'shopping':
        return await sendShoppingListEmail({
          recipientEmail: user.email,
          recipientName: user.first_name || 'Partner',
          senderName: notificationData.senderName || 'Someone',
          listName: notificationData.title,
          listDescription: notificationData.description,
          items: notificationData.items || [],
          totalItems: notificationData.totalItems || 0,
          completedItems: notificationData.completedItems || 0,
          actionType: notificationData.actionType || 'shared',
          spaceId: notificationData.spaceId || '',
          listId: notificationData.listId || '',
          spaceName: notificationData.spaceName || 'Unknown Space'
        });

      case 'meal':
        return await sendMealReminderEmail({
          recipientEmail: user.email,
          recipientName: user.first_name || 'Partner',
          mealName: notificationData.title,
          mealType: notificationData.mealType || 'dinner',
          mealDate: notificationData.mealDate || '',
          mealTime: notificationData.mealTime || '',
          reminderType: notificationData.reminderType || 'prep',
          ingredients: notificationData.ingredients,
          cookingTime: notificationData.cookingTime,
          recipeUrl: notificationData.recipeUrl,
          spaceId: notificationData.spaceId || '',
          mealId: notificationData.mealId || '',
          spaceName: notificationData.spaceName || 'Unknown Space'
        });

      case 'reminder':
        return await sendGeneralReminderEmail({
          recipientEmail: user.email,
          recipientName: user.first_name || 'Partner',
          reminderTitle: notificationData.title,
          reminderDescription: notificationData.description,
          reminderType: notificationData.reminderType || 'personal',
          dueDate: notificationData.dueDate,
          dueTime: notificationData.dueTime,
          priority: notificationData.priority || 'normal',
          category: notificationData.category,
          spaceId: notificationData.spaceId || '',
          reminderId: notificationData.reminderId || '',
          spaceName: notificationData.spaceName || 'Unknown Space',
          createdBy: notificationData.createdBy
        });

      default:
        return { success: false, error: `Unknown notification type: ${notificationType}` };
    }
  } catch (error) {
    console.error('Error sending instant notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

