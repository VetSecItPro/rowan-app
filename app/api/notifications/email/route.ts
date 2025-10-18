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
      case 'goal_achievement':
        result = await emailService.sendGoalAchievementEmail(
          recipient,
          data.userName,
          data.spaceName,
          {
            achievementType: data.achievementType,
            goalTitle: data.goalTitle,
            milestoneTitle: data.milestoneTitle,
            completedBy: data.completedBy,
            completionDate: data.completionDate,
            streakCount: data.streakCount,
            nextMilestone: data.nextMilestone,
            goalUrl: data.goalUrl,
          }
        );
        break;

      case 'task_assignment':
        result = await emailService.sendTaskAssignmentEmail(
          recipient,
          data.userName,
          data.spaceName,
          {
            taskTitle: data.taskTitle,
            assignedBy: data.assignedBy,
            assignedTo: data.assignedTo,
            priority: data.priority,
            dueDate: data.dueDate,
            description: data.description,
            taskUrl: data.taskUrl,
          }
        );
        break;

      case 'event_reminder':
        result = await emailService.sendEventReminderEmail(
          recipient,
          data.userName,
          data.spaceName,
          {
            eventTitle: data.eventTitle,
            eventDescription: data.description,
            startTime: data.startTime,
            endTime: data.endTime,
            location: data.location,
            reminderTime: data.reminderTime,
            eventUrl: data.eventUrl,
          }
        );
        break;

      case 'new_message':
        result = await emailService.sendNewMessageEmail(
          recipient,
          data.userName,
          data.spaceName,
          {
            senderName: data.senderName,
            senderAvatar: data.senderAvatar,
            messagePreview: data.messagePreview,
            conversationTitle: data.conversationTitle,
            isDirectMessage: data.isDirectMessage,
            messageUrl: data.messageUrl,
          }
        );
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