import { Resend } from 'resend';
import { render } from '@react-email/components';
import { logger } from '@/lib/logger';

// Import all email templates
import TaskAssignmentEmail from '@/lib/emails/templates/TaskAssignmentEmail';
import EventReminderEmail from '@/lib/emails/templates/EventReminderEmail';
import NewMessageEmail from '@/lib/emails/templates/NewMessageEmail';
import ShoppingListEmail from '@/lib/emails/templates/ShoppingListEmail';
import MealReminderEmail from '@/lib/emails/templates/MealReminderEmail';
import GeneralReminderEmail from '@/lib/emails/templates/GeneralReminderEmail';
import SpaceInvitationEmail from '@/lib/emails/templates/SpaceInvitationEmail';
import DailyDigestEmail from '@/lib/emails/templates/DailyDigestEmail';
import { PasswordResetEmail } from '@/lib/emails/templates/password-reset-email';
import { MagicLinkEmail } from '@/lib/emails/templates/magic-link-email';
import { EmailVerificationEmail } from '@/lib/emails/templates/email-verification-email';

// Initialize Resend with API key
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Email service configuration
const FROM_EMAIL = 'Rowan <notifications@rowanapp.com>';
const REPLY_TO_EMAIL = 'support@rowanapp.com';

/**
 * OPTIMIZATION: Retry helper with exponential backoff
 * Retries failed email sends with delays: 1s, 2s, 4s
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on certain errors (auth, validation)
      const errorMessage = lastError.message.toLowerCase();
      if (
        errorMessage.includes('invalid api key') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('invalid email')
      ) {
        throw lastError;
      }

      // Calculate exponential backoff delay
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

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

export interface SpaceInvitationData {
  recipientEmail: string;
  inviterName: string;
  spaceName: string;
  invitationUrl: string;
  expiresAt: string;
}

// Authentication email interfaces
export interface PasswordResetData {
  userEmail: string;
  resetUrl: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface MagicLinkData {
  userEmail: string;
  magicLinkUrl: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface EmailVerificationData {
  userEmail: string;
  verificationUrl: string;
  userName: string;
}

export interface DailyDigestData {
  recipientEmail: string;
  recipientName: string;
  date: string;
  spaceName: string;
  spaceId: string;
  events: Array<{
    id: string;
    title: string;
    start_time: string;
    end_time?: string;
    location?: string;
    all_day?: boolean;
  }>;
  tasksDue: Array<{
    id: string;
    title: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    due_date?: string;
  }>;
  overdueTasks: Array<{
    id: string;
    title: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    due_date?: string;
  }>;
  meals: Array<{
    id: string;
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    recipe_name: string;
  }>;
  reminders: Array<{
    id: string;
    title: string;
    reminder_time?: string;
  }>;
  greeting: string;
}

// AI-Enhanced Daily Digest Data
export interface AIDailyDigestData {
  recipientEmail: string;
  recipientName: string;
  date: string;
  spaceName: string;
  spaceId: string;
  events: Array<{
    id: string;
    title: string;
    start_time: string;
    end_time?: string;
    location?: string;
    all_day?: boolean;
  }>;
  tasksDue: Array<{
    id: string;
    title: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    due_date?: string;
  }>;
  overdueTasks: Array<{
    id: string;
    title: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    due_date?: string;
  }>;
  meals: Array<{
    id: string;
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    recipe_name: string;
  }>;
  reminders: Array<{
    id: string;
    title: string;
    reminder_time?: string;
  }>;
  narrativeIntro: string;
  closingMessage: string;
  aiGenerated: boolean;
}


/**
 * Send a task assignment email notification
 */
export async function sendTaskAssignmentEmail(data: TaskAssignmentData): Promise<EmailResult> {
  try {
    if (!resend) {
      return { success: false, error: 'Email service not configured' };
    }

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
      logger.error('Failed to send task assignment email:', error, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    logger.error('Error sending task assignment email:', error, { component: 'lib-email-service', action: 'service_call' });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send an event reminder email notification
 */
export async function sendEventReminderEmail(data: EventReminderData): Promise<EmailResult> {
  try {
    if (!resend) {
      return { success: false, error: 'Email service not configured' };
    }

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
      logger.error('Failed to send event reminder email:', error, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    logger.error('Error sending event reminder email:', error, { component: 'lib-email-service', action: 'service_call' });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send a new message email notification
 */
export async function sendNewMessageEmail(data: NewMessageData): Promise<EmailResult> {
  try {
    if (!resend) {
      return { success: false, error: 'Email service not configured' };
    }

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
      logger.error('Failed to send new message email:', error, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    logger.error('Error sending new message email:', error, { component: 'lib-email-service', action: 'service_call' });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send a shopping list email notification
 */
export async function sendShoppingListEmail(data: ShoppingListData): Promise<EmailResult> {
  try {
    if (!resend) {
      return { success: false, error: 'Email service not configured' };
    }

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
      logger.error('Failed to send shopping list email:', error, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    logger.error('Error sending shopping list email:', error, { component: 'lib-email-service', action: 'service_call' });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send a meal reminder email notification
 */
export async function sendMealReminderEmail(data: MealReminderData): Promise<EmailResult> {
  try {
    if (!resend) {
      return { success: false, error: 'Email service not configured' };
    }

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
      logger.error('Failed to send meal reminder email:', error, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    logger.error('Error sending meal reminder email:', error, { component: 'lib-email-service', action: 'service_call' });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send a general reminder email notification
 */
export async function sendGeneralReminderEmail(data: GeneralReminderData): Promise<EmailResult> {
  try {
    if (!resend) {
      return { success: false, error: 'Email service not configured' };
    }

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
      logger.error('Failed to send general reminder email:', error, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    logger.error('Error sending general reminder email:', error, { component: 'lib-email-service', action: 'service_call' });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send a space invitation email notification
 * OPTIMIZED: Uses retry mechanism for better delivery reliability
 */
export async function sendSpaceInvitationEmail(data: SpaceInvitationData): Promise<EmailResult> {
  try {
    if (!resend) {
      logger.error('Resend not initialized - missing RESEND_API_KEY', undefined, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: 'Email service not configured' };
    }

    // Pre-render email HTML before retry loop for efficiency
    const emailHtml = await render(SpaceInvitationEmail(data));

    // Use retry mechanism for better delivery reliability
    const result = await withRetry(
      async () => {
        const response = await resend.emails.send({
          from: FROM_EMAIL,
          to: [data.recipientEmail],
          subject: `You're invited to join "${data.spaceName}" on Rowan`,
          html: emailHtml,
          replyTo: REPLY_TO_EMAIL,
          tags: [
            { name: 'category', value: 'space-invitation' },
            { name: 'inviter', value: data.inviterName },
            { name: 'space_name', value: data.spaceName }
          ]
        });
        if (response.error) {
          throw new Error(response.error.message);
        }
        return response.data;
      },
      3, // max 3 retries
      500 // start with 500ms delay (faster initial retry)
    );

    logger.info(`Space invitation email sent successfully to ${data.recipientEmail.replace(/(.{2}).*(@.*)/, '$1***$2')}`, { component: 'lib-email-service' });
    return { success: true, messageId: result?.id };
  } catch (error) {
    logger.error('Error sending space invitation email:', error, { component: 'lib-email-service', action: 'service_call' });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(data: PasswordResetData): Promise<EmailResult> {
  try {
    if (!resend) {
      logger.error('Resend not initialized - missing RESEND_API_KEY', undefined, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: 'Email service not configured' };
    }

    const emailHtml = await render(PasswordResetEmail(data));

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [data.userEmail],
      subject: 'Reset your password - Rowan',
      html: emailHtml,
      replyTo: REPLY_TO_EMAIL,
      tags: [
        { name: 'category', value: 'password-reset' },
        { name: 'auth_type', value: 'password-reset' }
      ]
    });

    if (error) {
      logger.error('Failed to send password reset email:', error, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    logger.error('Error sending password reset email:', error, { component: 'lib-email-service', action: 'service_call' });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send a magic link email
 */
export async function sendMagicLinkEmail(data: MagicLinkData): Promise<EmailResult> {
  try {
    if (!resend) {
      logger.error('Resend not initialized - missing RESEND_API_KEY', undefined, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: 'Email service not configured' };
    }

    const emailHtml = await render(MagicLinkEmail(data));

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [data.userEmail],
      subject: 'Sign in to Rowan - Magic Link',
      html: emailHtml,
      replyTo: REPLY_TO_EMAIL,
      tags: [
        { name: 'category', value: 'magic-link' },
        { name: 'auth_type', value: 'magic-link' }
      ]
    });

    if (error) {
      logger.error('Failed to send magic link email:', error, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    logger.error('Error sending magic link email:', error, { component: 'lib-email-service', action: 'service_call' });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send an email verification email
 */
export async function sendEmailVerificationEmail(data: EmailVerificationData): Promise<EmailResult> {
  try {
    if (!resend) {
      logger.error('Resend not initialized - missing RESEND_API_KEY', undefined, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: 'Email service not configured' };
    }

    const emailHtml = await render(EmailVerificationEmail(data));

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [data.userEmail],
      subject: 'Verify your email address - Welcome to Rowan!',
      html: emailHtml,
      replyTo: REPLY_TO_EMAIL,
      tags: [
        { name: 'category', value: 'email-verification' },
        { name: 'auth_type', value: 'email-verification' }
      ]
    });

    if (error) {
      logger.error('Failed to send email verification email:', error, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    logger.error('Error sending email verification email:', error, { component: 'lib-email-service', action: 'service_call' });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send a daily digest email
 */
export async function sendDailyDigestEmail(data: DailyDigestData): Promise<EmailResult> {
  try {
    if (!resend) {
      logger.error('Resend not initialized - missing RESEND_API_KEY', undefined, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: 'Email service not configured' };
    }

    const emailHtml = await render(DailyDigestEmail({
      recipientName: data.recipientName,
      date: data.date,
      spaceName: data.spaceName,
      spaceId: data.spaceId,
      events: data.events,
      tasksDue: data.tasksDue,
      overdueTasks: data.overdueTasks,
      meals: data.meals,
      reminders: data.reminders,
      greeting: data.greeting,
    }));

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [data.recipientEmail],
      subject: `Your Daily Digest for ${data.date}`,
      html: emailHtml,
      replyTo: REPLY_TO_EMAIL,
      tags: [
        { name: 'category', value: 'daily-digest' },
        { name: 'space_id', value: data.spaceId }
      ]
    });

    if (error) {
      logger.error('Failed to send daily digest email:', error, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    logger.error('Error sending daily digest email:', error, { component: 'lib-email-service', action: 'service_call' });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send an AI-enhanced daily digest email
 */
export async function sendAIDailyDigestEmail(data: AIDailyDigestData): Promise<EmailResult> {
  try {
    if (!resend) {
      logger.error('Resend not initialized - missing RESEND_API_KEY', undefined, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: 'Email service not configured' };
    }

    // Import and use the AI Daily Digest template
    const AIDailyDigestEmail = (await import('@/lib/emails/templates/AIDailyDigestEmail')).default;

    const emailHtml = await render(AIDailyDigestEmail({
      recipientName: data.recipientName,
      date: data.date,
      spaceName: data.spaceName,
      spaceId: data.spaceId,
      events: data.events,
      tasksDue: data.tasksDue,
      overdueTasks: data.overdueTasks,
      meals: data.meals,
      reminders: data.reminders,
      narrativeIntro: data.narrativeIntro,
      closingMessage: data.closingMessage,
      aiGenerated: data.aiGenerated,
    }));

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [data.recipientEmail],
      subject: `Your Daily Briefing for ${data.date}`,
      html: emailHtml,
      replyTo: REPLY_TO_EMAIL,
      tags: [
        { name: 'category', value: 'ai-daily-digest' },
        { name: 'space_id', value: data.spaceId },
        { name: 'ai_generated', value: data.aiGenerated ? 'true' : 'false' }
      ]
    });

    if (error) {
      logger.error('Failed to send AI daily digest email:', error, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    logger.error('Error sending AI daily digest email:', error, { component: 'lib-email-service', action: 'service_call' });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}


/**
 * Send a single email based on type
 * Note: Using 'any' for data to match the batch API signature - type safety is enforced at call site
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendEmailByType(type: string, data: any): Promise<EmailResult> {
  switch (type) {
    case 'task':
      return sendTaskAssignmentEmail(data);
    case 'event':
      return sendEventReminderEmail(data);
    case 'message':
      return sendNewMessageEmail(data);
    case 'shopping':
      return sendShoppingListEmail(data);
    case 'meal':
      return sendMealReminderEmail(data);
    case 'reminder':
      return sendGeneralReminderEmail(data);
    case 'invitation':
      return sendSpaceInvitationEmail(data);
    case 'password-reset':
      return sendPasswordResetEmail(data);
    case 'magic-link':
      return sendMagicLinkEmail(data);
    case 'email-verification':
      return sendEmailVerificationEmail(data);
    default:
      return { success: false, error: 'Unknown email type' };
  }
}

/**
 * Send multiple emails in batch with parallel processing
 * PERFORMANCE: Processes emails in parallel batches of 10 instead of sequential
 * This reduces 100 emails from ~10s to ~1s
 */
export async function sendBatchEmails(emails: Array<{
  type: 'task' | 'event' | 'message' | 'shopping' | 'meal' | 'reminder' | 'invitation' | 'password-reset' | 'magic-link' | 'email-verification';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}>): Promise<{ success: number; failed: number; results: EmailResult[] }> {
  const results: EmailResult[] = [];
  let success = 0;
  let failed = 0;

  // Process emails in parallel batches of 10
  const BATCH_SIZE = 10;

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(email => sendEmailByType(email.type, email.data))
    );

    // Collect results
    for (const result of batchResults) {
      results.push(result);
      if (result.success) {
        success++;
      } else {
        failed++;
      }
    }

    // Small delay between batches to respect rate limits (not between individual emails)
    if (i + BATCH_SIZE < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  return { success, failed, results };
}

/**
 * Verify email configuration and connectivity
 */
export async function verifyEmailService(): Promise<EmailResult> {
  try {
    if (!resend) {
      return { success: false, error: 'Email service not configured' };
    }

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

// ============================================================================
// SUBSCRIPTION EMAIL FUNCTIONS
// ============================================================================

// Import subscription email templates
import SubscriptionWelcomeEmail from '@/lib/emails/templates/SubscriptionWelcomeEmail';
import PaymentFailedEmail from '@/lib/emails/templates/PaymentFailedEmail';
import SubscriptionCancelledEmail from '@/lib/emails/templates/SubscriptionCancelledEmail';

// Subscription email interfaces
export interface SubscriptionWelcomeData {
  recipientEmail: string;
  recipientName: string;
  tier: 'pro' | 'family';
  period: 'monthly' | 'annual';
  dashboardUrl: string;
}

export interface PaymentFailedData {
  recipientEmail: string;
  recipientName: string;
  tier: 'pro' | 'family';
  attemptCount: number;
  updatePaymentUrl: string;
  gracePeriodDays: number;
}

export interface SubscriptionCancelledData {
  recipientEmail: string;
  recipientName: string;
  tier: 'pro' | 'family';
  accessUntil: string;
  resubscribeUrl: string;
}

/**
 * Send a subscription welcome email after successful payment
 */
export async function sendSubscriptionWelcomeEmail(data: SubscriptionWelcomeData): Promise<EmailResult> {
  try {
    if (!resend) {
      logger.error('Resend not initialized - missing RESEND_API_KEY', undefined, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: 'Email service not configured' };
    }

    const tierName = data.tier === 'family' ? 'Family' : 'Pro';
    const emailHtml = await render(SubscriptionWelcomeEmail(data));

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [data.recipientEmail],
      subject: `Welcome to Rowan ${tierName}! Your subscription is active`,
      html: emailHtml,
      replyTo: REPLY_TO_EMAIL,
      tags: [
        { name: 'category', value: 'subscription-welcome' },
        { name: 'tier', value: data.tier },
        { name: 'period', value: data.period }
      ]
    });

    if (error) {
      logger.error('Failed to send subscription welcome email:', error, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    logger.error('Error sending subscription welcome email:', error, { component: 'lib-email-service', action: 'service_call' });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send a payment failed email when subscription payment fails
 */
export async function sendPaymentFailedEmail(data: PaymentFailedData): Promise<EmailResult> {
  try {
    if (!resend) {
      logger.error('Resend not initialized - missing RESEND_API_KEY', undefined, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: 'Email service not configured' };
    }

    const emailHtml = await render(PaymentFailedEmail(data));

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [data.recipientEmail],
      subject: 'Action needed: Your Rowan payment couldn\'t be processed',
      html: emailHtml,
      replyTo: REPLY_TO_EMAIL,
      tags: [
        { name: 'category', value: 'payment-failed' },
        { name: 'tier', value: data.tier },
        { name: 'attempt_count', value: String(data.attemptCount) }
      ]
    });

    if (error) {
      logger.error('Failed to send payment failed email:', error, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    logger.error('Error sending payment failed email:', error, { component: 'lib-email-service', action: 'service_call' });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send a subscription cancelled confirmation email
 */
export async function sendSubscriptionCancelledEmail(data: SubscriptionCancelledData): Promise<EmailResult> {
  try {
    if (!resend) {
      logger.error('Resend not initialized - missing RESEND_API_KEY', undefined, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: 'Email service not configured' };
    }

    const tierName = data.tier === 'family' ? 'Family' : 'Pro';
    const emailHtml = await render(SubscriptionCancelledEmail(data));

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [data.recipientEmail],
      subject: `Your Rowan ${tierName} subscription has been cancelled`,
      html: emailHtml,
      replyTo: REPLY_TO_EMAIL,
      tags: [
        { name: 'category', value: 'subscription-cancelled' },
        { name: 'tier', value: data.tier }
      ]
    });

    if (error) {
      logger.error('Failed to send subscription cancelled email:', error, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    logger.error('Error sending subscription cancelled email:', error, { component: 'lib-email-service', action: 'service_call' });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Export emailService object for compatibility
export const emailService = {
  sendTaskAssignmentEmail,
  sendEventReminderEmail,
  sendNewMessageEmail,
  sendShoppingListEmail,
  sendMealReminderEmail,
  sendGeneralReminderEmail,
  sendSpaceInvitationEmail,
  sendDailyDigestEmail,
  sendAIDailyDigestEmail,
  sendPasswordResetEmail,
  sendMagicLinkEmail,
  sendEmailVerificationEmail,
  sendBatchEmails,
  verifyEmailService,
  // Subscription emails
  sendSubscriptionWelcomeEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCancelledEmail,
};