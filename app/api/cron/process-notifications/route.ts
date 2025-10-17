import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notificationQueueService } from '@/lib/services/notification-queue-service';
import { reminderNotificationsService } from '@/lib/services/reminder-notifications-service';

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
              await reminderNotificationsService.sendEmailNotification(
                userId,
                notif.notification_data.type,
                {
                  title: notif.notification_data.title,
                  emoji: notif.notification_data.emoji,
                }
              );

              await notificationQueueService.markAsSent([notif.id]);
              sent++;
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
        } else if (deliveryMethod === 'hourly' || deliveryMethod === 'daily') {
          // Send as digest
          try {
            await sendDigestEmail(userId, notifications, deliveryMethod);
            await notificationQueueService.markAsSent(notifications.map((n) => n.id));
            sent += notifications.length;
          } catch (error) {
            console.error('Error sending digest:', error);
            for (const notif of notifications) {
              await notificationQueueService.markAsFailed(
                notif.id,
                error instanceof Error ? error.message : 'Unknown error',
                notif.retry_count + 1
              );
            }
            failed += notifications.length;
          }
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
 * Send digest email
 */
async function sendDigestEmail(
  userId: string,
  notifications: any[],
  type: 'hourly' | 'daily'
): Promise<void> {
  // Group by notification type
  const grouped = notifications.reduce((acc, notif) => {
    const notifType = notif.notification_data.type;
    if (!acc[notifType]) {
      acc[notifType] = [];
    }
    acc[notifType].push(notif);
    return acc;
  }, {} as Record<string, typeof notifications>);

  // Build digest content
  const summary = Object.entries(grouped).map(([notifType, notifs]) => {
    return {
      type: notifType,
      count: notifs.length,
      items: notifs.map((n) => ({
        title: n.notification_data.title,
        emoji: n.notification_data.emoji,
      })),
    };
  });

  // TODO: Send via email service (Resend)
  console.log(`Sending ${type} digest to user ${userId}:`, summary);

  // For now, just log. In production, integrate with Resend:
  /*
  await resend.emails.send({
    from: 'notifications@rowan.app',
    to: userEmail,
    subject: type === 'hourly' ? 'Hourly Notification Digest' : 'Daily Notification Summary',
    html: generateDigestHTML(summary, type),
  });
  */
}
