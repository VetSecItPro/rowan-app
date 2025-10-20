import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/services/email-service';

export async function POST(request: NextRequest) {
  try {
    const { type, recipient, subject, data } = await request.json();

    if (!type || !recipient || !subject || !data) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'task_assignment':
        result = await emailService.sendTaskAssignmentEmail({
          recipientEmail: recipient,
          recipientName: data.userName,
          assignerName: data.assignedBy,
          taskTitle: data.taskTitle,
          taskDescription: data.description,
          dueDate: data.dueDate,
          priority: data.priority || 'normal',
          spaceId: data.spaceId,
          taskId: data.taskId,
          spaceName: data.spaceName,
        });
        break;

      case 'event_reminder':
        result = await emailService.sendEventReminderEmail({
          recipientEmail: recipient,
          recipientName: data.userName,
          eventTitle: data.eventTitle,
          eventDescription: data.description,
          eventDate: data.eventDate,
          eventTime: data.eventTime,
          location: data.location,
          reminderType: data.reminderType || '15min',
          eventId: data.eventId,
          spaceId: data.spaceId,
          spaceName: data.spaceName,
        });
        break;

      case 'new_message':
        result = await emailService.sendNewMessageEmail({
          recipientEmail: recipient,
          recipientName: data.userName,
          senderName: data.senderName,
          senderAvatar: data.senderAvatar,
          messageContent: data.messageContent || data.messagePreview,
          conversationTitle: data.conversationTitle,
          spaceId: data.spaceId,
          conversationId: data.conversationId,
          spaceName: data.spaceName,
          messageTimestamp: data.messageTimestamp || new Date().toISOString(),
        });
        break;

      case 'digest':
        result = await emailService.sendDailyDigestEmail({
          recipientEmail: recipient,
          recipientName: data.userName,
          digestDate: new Date().toISOString(),
          digestType: data.frequency,
          notifications: data.notifications.map((n: any) => ({
            id: crypto.randomUUID(),
            type: n.type,
            title: n.title,
            content: n.description,
            priority: 'normal' as const,
            spaceName: data.spaceName,
            url: n.url,
            timestamp: n.timestamp,
          })),
          totalCount: data.notifications.length,
          unreadTasksCount: data.notifications.filter((n: any) => n.type === 'task').length,
          upcomingEventsCount: data.notifications.filter((n: any) => n.type === 'event').length,
          unreadMessagesCount: data.notifications.filter((n: any) => n.type === 'message').length,
        });
        break;

      case 'custom':
        // Handle custom HTML emails from notification-service
        try {
          const { Resend } = await import('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);

          const { data: emailResult, error } = await resend.emails.send({
            from: 'Rowan <notifications@rowanapp.com>',
            to: [recipient],
            subject,
            html: data.html,
          });

          if (error) {
            result = { success: false, error: error.message };
          } else {
            result = { success: true, messageId: emailResult?.id };
          }
        } catch (error) {
          result = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown email type' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}