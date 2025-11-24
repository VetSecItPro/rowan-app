import { NextRequest, NextResponse } from 'next/server';
import {
  sendTaskAssignmentEmail,
  sendEventReminderEmail,
  sendNewMessageEmail,
  sendShoppingListEmail,
  sendMealReminderEmail,
  sendGeneralReminderEmail,
  sendPasswordResetEmail,
  sendMagicLinkEmail,
  sendEmailVerificationEmail,
  verifyEmailService,
  type TaskAssignmentData,
  type EventReminderData,
  type NewMessageData,
  type ShoppingListData,
  type MealReminderData,
  type GeneralReminderData,
  type PasswordResetData,
  type MagicLinkData,
  type EmailVerificationData
} from '@/lib/services/email-service';

export const dynamic = 'force-dynamic';

// Test endpoint for email templates
// Usage: POST /api/test/email-templates with { type: 'task', email: 'test@example.com' }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Verify email service first
    const verification = await verifyEmailService();
    if (!verification.success) {
      return NextResponse.json({
        error: 'Email service verification failed',
        details: verification.error
      }, { status: 500 });
    }

    let result;

    switch (type) {
      case 'task':
        const taskData: TaskAssignmentData = {
          recipientEmail: email,
          recipientName: 'Test Partner',
          assignerName: 'Claude',
          taskTitle: 'Complete the quarterly review',
          taskDescription: 'Please review the Q4 performance metrics and prepare the summary report.',
          dueDate: 'December 31, 2024',
          priority: 'high',
          spaceId: 'test-space-123',
          taskId: 'test-task-456',
          spaceName: 'Home Office'
        };
        result = await sendTaskAssignmentEmail(taskData);
        break;

      case 'event':
        const eventData: EventReminderData = {
          recipientEmail: email,
          recipientName: 'Test Partner',
          eventTitle: 'Weekly Planning Meeting',
          eventDescription: 'Review the upcoming week and assign priorities',
          eventDate: 'Tomorrow',
          eventTime: '9:00 AM',
          location: 'Living Room',
          reminderType: '15min',
          eventId: 'test-event-789',
          spaceId: 'test-space-123',
          spaceName: 'Home Office'
        };
        result = await sendEventReminderEmail(eventData);
        break;

      case 'message':
        const messageData: NewMessageData = {
          recipientEmail: email,
          recipientName: 'Test Partner',
          senderName: 'Claude',
          messageContent: 'Hey! Just wanted to remind you about our dinner plans tonight. Should we try that new Italian place?',
          conversationTitle: 'Dinner Plans',
          spaceId: 'test-space-123',
          conversationId: 'test-conversation-101',
          spaceName: 'Home Office',
          messageTimestamp: new Date().toISOString()
        };
        result = await sendNewMessageEmail(messageData);
        break;

      case 'shopping':
        const shoppingData: ShoppingListData = {
          recipientEmail: email,
          recipientName: 'Test Partner',
          senderName: 'Claude',
          listName: 'Weekly Groceries',
          listDescription: 'Items needed for this week\'s meal prep',
          items: [
            { id: '1', name: 'Organic bananas', quantity: '1 bunch', checked: false },
            { id: '2', name: 'Whole grain bread', quantity: '1 loaf', checked: false },
            { id: '3', name: 'Greek yogurt', quantity: '2 containers', checked: true },
            { id: '4', name: 'Fresh spinach', quantity: '1 bag', checked: false },
            { id: '5', name: 'Chicken breast', quantity: '2 lbs', checked: false }
          ],
          totalItems: 5,
          completedItems: 1,
          actionType: 'shared',
          spaceId: 'test-space-123',
          listId: 'test-list-202',
          spaceName: 'Home Office'
        };
        result = await sendShoppingListEmail(shoppingData);
        break;

      case 'meal':
        const mealData: MealReminderData = {
          recipientEmail: email,
          recipientName: 'Test Partner',
          mealName: 'Grilled Salmon with Vegetables',
          mealType: 'dinner',
          mealDate: 'Today',
          mealTime: '7:00 PM',
          reminderType: 'prep',
          ingredients: ['Salmon fillet', 'Broccoli', 'Carrots', 'Olive oil', 'Lemon', 'Garlic'],
          cookingTime: '25 minutes',
          recipeUrl: 'https://rowanapp.com/recipes/grilled-salmon',
          spaceId: 'test-space-123',
          mealId: 'test-meal-303',
          spaceName: 'Home Office'
        };
        result = await sendMealReminderEmail(mealData);
        break;

      case 'reminder':
        const reminderData: GeneralReminderData = {
          recipientEmail: email,
          recipientName: 'Test Partner',
          reminderTitle: 'Schedule annual check-up',
          reminderDescription: 'Call Dr. Smith\'s office to schedule your annual physical exam',
          reminderType: 'important',
          dueDate: 'Next week',
          dueTime: '10:00 AM',
          priority: 'high',
          category: 'Health',
          spaceId: 'test-space-123',
          reminderId: 'test-reminder-404',
          spaceName: 'Home Office',
          createdBy: 'Claude'
        };
        result = await sendGeneralReminderEmail(reminderData);
        break;

      case 'password-reset':
        const passwordResetData: PasswordResetData = {
          userEmail: email,
          resetUrl: 'https://rowanapp.com/reset-password?token=test-reset-token-12345',
          userName: 'Test User',
          ipAddress: '192.168.1.1',
          userAgent: 'Chrome on macOS'
        };
        result = await sendPasswordResetEmail(passwordResetData);
        break;

      case 'magic-link':
        const magicLinkData: MagicLinkData = {
          userEmail: email,
          magicLinkUrl: 'https://rowanapp.com/auth/magic?token=test-magic-token-67890',
          userName: 'Test User',
          ipAddress: '192.168.1.1',
          userAgent: 'Safari on iPhone'
        };
        result = await sendMagicLinkEmail(magicLinkData);
        break;

      case 'email-verification':
        const emailVerificationData: EmailVerificationData = {
          userEmail: email,
          verificationUrl: 'https://rowanapp.com/auth/verify?token=test-verify-token-abcdef',
          userName: 'Test User'
        };
        result = await sendEmailVerificationEmail(emailVerificationData);
        break;

      case 'verify':
        result = await verifyEmailService();
        break;

      default:
        return NextResponse.json({
          error: 'Invalid email type',
          validTypes: ['task', 'event', 'message', 'shopping', 'meal', 'reminder', 'password-reset', 'magic-link', 'email-verification', 'verify']
        }, { status: 400 });
    }

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      type,
      email,
      error: result.error
    });

  } catch (error) {
    console.error('Email test error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Email Templates Test Endpoint',
    usage: 'POST with { type: "task|event|message|shopping|meal|reminder|password-reset|magic-link|email-verification|verify", email: "test@example.com" }',
    availableTypes: [
      'task - Task assignment email',
      'event - Event reminder email',
      'message - New message notification',
      'shopping - Shopping list notification',
      'meal - Meal reminder email',
      'reminder - General reminder email',
      'password-reset - Password reset email',
      'magic-link - Magic link sign-in email',
      'email-verification - Email verification email',
      'verify - Verify email service'
    ]
  });
}