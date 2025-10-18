import { Resend } from 'resend';
import { render } from '@react-email/components';

// Import all email templates
import TaskAssignmentEmail from '@/lib/emails/templates/TaskAssignmentEmail';
import EventReminderEmail from '@/lib/emails/templates/EventReminderEmail';
import NewMessageEmail from '@/lib/emails/templates/NewMessageEmail';
import ShoppingListEmail from '@/lib/emails/templates/ShoppingListEmail';
import MealReminderEmail from '@/lib/emails/templates/MealReminderEmail';
import GeneralReminderEmail from '@/lib/emails/templates/GeneralReminderEmail';
import DailyDigestEmail from '@/lib/emails/templates/DailyDigestEmail';

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Email service configuration
const FROM_EMAIL = 'Rowan <notifications@rowanapp.com>';
const REPLY_TO_EMAIL = 'support@rowanapp.com';

// Email service types
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface TaskAssignmentData {
  recipientEmail: string;
  recipientName: string;
  assignerName: string;
  taskTitle: string;
  taskDescription?: string;
  dueDate?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  spaceId: string;
  taskId: string;
  spaceName: string;
}

export interface EventReminderData {
  recipientEmail: string;
  recipientName: string;
  eventTitle: string;
  eventDescription?: string;
  eventDate: string;
  eventTime: string;
  location?: string;
  reminderType: '15min' | '1hour' | '1day';
  eventId: string;
  spaceId: string;
  spaceName: string;
}

export interface NewMessageData {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  senderAvatar?: string;
  messageContent: string;
  conversationTitle?: string;
  spaceId: string;
  conversationId: string;
  spaceName: string;
  messageTimestamp: string;
}

export interface ShoppingListData {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  listName: string;
  listDescription?: string;
  items: Array<{
    id: string;
    name: string;
    quantity?: string;
    checked: boolean;
  }>;
  totalItems: number;
  completedItems: number;
  actionType: 'shared' | 'updated' | 'completed';
  spaceId: string;
  listId: string;
  spaceName: string;
}

export interface MealReminderData {
  recipientEmail: string;
  recipientName: string;
  mealName: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  mealDate: string;
  mealTime: string;
  reminderType: 'prep' | 'cook' | 'plan';
  ingredients?: string[];
  cookingTime?: string;
  recipeUrl?: string;
  spaceId: string;
  mealId: string;
  spaceName: string;
}

export interface GeneralReminderData {
  recipientEmail: string;
  recipientName: string;
  reminderTitle: string;
  reminderDescription?: string;
  reminderType: 'personal' | 'shared' | 'recurring' | 'important';
  dueDate?: string;
  dueTime?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category?: string;
  spaceId: string;
  reminderId: string;
  spaceName: string;
  createdBy?: string;
}

export interface DigestNotification {
  id: string;
  type: 'task' | 'event' | 'message' | 'shopping' | 'meal' | 'reminder';
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  spaceName: string;
  url: string;
  timestamp: string;
}

export interface DailyDigestData {
  recipientEmail: string;
  recipientName: string;
  digestDate: string;
  digestType: 'daily' | 'weekly';
  notifications: DigestNotification[];
  totalCount: number;
  unreadTasksCount: number;
  upcomingEventsCount: number;
  unreadMessagesCount: number;
}

/**
 * Send a task assignment email notification
 */
export async function sendTaskAssignmentEmail(data: TaskAssignmentData): Promise<EmailResult> {
  try {
    const emailHtml = await render(TaskAssignmentEmail(data));

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [data.recipientEmail],
      subject: `New Task Assignment: ${data.taskTitle}`,
      html: emailHtml,
      replyTo: REPLY_TO_EMAIL,
      tags: [
        { name: 'category', value: 'task-assignment' },
        { name: 'priority', value: data.priority },
        { name: 'space_id', value: data.spaceId }
      ]
    });

    if (error) {
      console.error('Failed to send task assignment email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    console.error('Error sending task assignment email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send an event reminder email notification
 */
export async function sendEventReminderEmail(data: EventReminderData): Promise<EmailResult> {
  try {
    const emailHtml = await render(EventReminderEmail(data));

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [data.recipientEmail],
      subject: `Event Reminder: ${data.eventTitle}`,
      html: emailHtml,
      replyTo: REPLY_TO_EMAIL,
      tags: [
        { name: 'category', value: 'event-reminder' },
        { name: 'reminder_type', value: data.reminderType },
        { name: 'space_id', value: data.spaceId }
      ]
    });

    if (error) {
      console.error('Failed to send event reminder email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    console.error('Error sending event reminder email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send a new message email notification
 */
export async function sendNewMessageEmail(data: NewMessageData): Promise<EmailResult> {
  try {
    const emailHtml = await render(NewMessageEmail(data));

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [data.recipientEmail],
      subject: `New message from ${data.senderName}`,
      html: emailHtml,
      replyTo: REPLY_TO_EMAIL,
      tags: [
        { name: 'category', value: 'new-message' },
        { name: 'space_id', value: data.spaceId }
      ]
    });

    if (error) {
      console.error('Failed to send new message email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    console.error('Error sending new message email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send a shopping list email notification
 */
export async function sendShoppingListEmail(data: ShoppingListData): Promise<EmailResult> {
  try {
    const emailHtml = await render(ShoppingListEmail(data));

    const actionLabels = {
      shared: 'shared',
      updated: 'updated',
      completed: 'completed'
    };

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [data.recipientEmail],
      subject: `Shopping list ${actionLabels[data.actionType]}: ${data.listName}`,
      html: emailHtml,
      replyTo: REPLY_TO_EMAIL,
      tags: [
        { name: 'category', value: 'shopping-list' },
        { name: 'action_type', value: data.actionType },
        { name: 'space_id', value: data.spaceId }
      ]
    });

    if (error) {
      console.error('Failed to send shopping list email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    console.error('Error sending shopping list email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send a meal reminder email notification
 */
export async function sendMealReminderEmail(data: MealReminderData): Promise<EmailResult> {
  try {
    const emailHtml = await render(MealReminderEmail(data));

    const reminderLabels = {
      prep: 'Meal prep reminder',
      cook: 'Cooking reminder',
      plan: 'Meal planning reminder'
    };

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [data.recipientEmail],
      subject: `${reminderLabels[data.reminderType]}: ${data.mealName}`,
      html: emailHtml,
      replyTo: REPLY_TO_EMAIL,
      tags: [
        { name: 'category', value: 'meal-reminder' },
        { name: 'reminder_type', value: data.reminderType },
        { name: 'meal_type', value: data.mealType },
        { name: 'space_id', value: data.spaceId }
      ]
    });

    if (error) {
      console.error('Failed to send meal reminder email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    console.error('Error sending meal reminder email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send a general reminder email notification
 */
export async function sendGeneralReminderEmail(data: GeneralReminderData): Promise<EmailResult> {
  try {
    const emailHtml = await render(GeneralReminderEmail(data));

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [data.recipientEmail],
      subject: `Reminder: ${data.reminderTitle}`,
      html: emailHtml,
      replyTo: REPLY_TO_EMAIL,
      tags: [
        { name: 'category', value: 'general-reminder' },
        { name: 'reminder_type', value: data.reminderType },
        { name: 'priority', value: data.priority },
        { name: 'space_id', value: data.spaceId }
      ]
    });

    if (error) {
      console.error('Failed to send general reminder email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    console.error('Error sending general reminder email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send a daily/weekly digest email notification
 */
export async function sendDailyDigestEmail(data: DailyDigestData): Promise<EmailResult> {
  try {
    const emailHtml = await render(DailyDigestEmail(data));

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [data.recipientEmail],
      subject: `Your ${data.digestType} digest - ${data.totalCount} notification${data.totalCount !== 1 ? 's' : ''}`,
      html: emailHtml,
      replyTo: REPLY_TO_EMAIL,
      tags: [
        { name: 'category', value: 'digest' },
        { name: 'digest_type', value: data.digestType },
        { name: 'notification_count', value: data.totalCount.toString() }
      ]
    });

    if (error) {
      console.error('Failed to send daily digest email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    console.error('Error sending daily digest email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send multiple emails in batch (for digest processing)
 */
export async function sendBatchEmails(emails: Array<{
  type: 'task' | 'event' | 'message' | 'shopping' | 'meal' | 'reminder' | 'digest';
  data: any;
}>): Promise<{ success: number; failed: number; results: EmailResult[] }> {
  const results: EmailResult[] = [];
  let success = 0;
  let failed = 0;

  for (const email of emails) {
    let result: EmailResult;

    switch (email.type) {
      case 'task':
        result = await sendTaskAssignmentEmail(email.data);
        break;
      case 'event':
        result = await sendEventReminderEmail(email.data);
        break;
      case 'message':
        result = await sendNewMessageEmail(email.data);
        break;
      case 'shopping':
        result = await sendShoppingListEmail(email.data);
        break;
      case 'meal':
        result = await sendMealReminderEmail(email.data);
        break;
      case 'reminder':
        result = await sendGeneralReminderEmail(email.data);
        break;
      case 'digest':
        result = await sendDailyDigestEmail(email.data);
        break;
      default:
        result = { success: false, error: 'Unknown email type' };
    }

    results.push(result);
    if (result.success) {
      success++;
    } else {
      failed++;
    }

    // Add a small delay between emails to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { success, failed, results };
}

/**
 * Verify email configuration and connectivity
 */
export async function verifyEmailService(): Promise<EmailResult> {
  try {
    // Send a test email to verify the service is working
    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ['test@rowanapp.com'],
      subject: 'Email Service Test',
      html: '<p>This is a test email to verify the email service is working.</p>',
      tags: [{ name: 'category', value: 'test' }]
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}