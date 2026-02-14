/**
 * Email Service
 *
 * Server-side service for sending transactional emails via Resend.
 * Provides typed functions for each email category with React Email templates.
 *
 * Features:
 * - React Email templates for consistent, responsive emails
 * - Automatic retry with exponential backoff for transient failures
 * - Batch sending with parallel processing for high throughput
 * - Email tagging for analytics and deliverability tracking
 *
 * Requires RESEND_API_KEY environment variable to be configured.
 */

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
import { EmailChangeEmail } from '@/lib/emails/templates/email-change-email';

// Initialize Resend with API key
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Email service configuration
const FROM_EMAIL = 'Rowan <notifications@rowanapp.com>';
const REPLY_TO_EMAIL = 'contact@steelmotionllc.com';

/**
 * Executes a function with automatic retry on failure using exponential backoff.
 *
 * Does not retry on authentication or validation errors. Default delays: 1s, 2s, 4s.
 *
 * @param fn - The async function to execute with retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelayMs - Base delay in milliseconds before first retry (default: 1000)
 * @returns The result of the function if successful
 * @throws The last error encountered after all retries are exhausted
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

// ============================================================================
// Email Service Types
// ============================================================================

/**
 * Result of an email send operation.
 */
export interface EmailResult {
  /** Whether the email was sent successfully */
  success: boolean;
  /** The Resend message ID for tracking (if successful) */
  messageId?: string;
  /** Error message (if failed) */
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

export interface EmailChangeData {
  currentEmail: string;
  newEmail: string;
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
 * Sends a task assignment notification email.
 *
 * Notifies a user when they are assigned a new task, including task details,
 * priority level, and optional due date.
 *
 * @param data - Task assignment details including recipient, task info, and space context
 * @returns Result object indicating success or failure with optional message ID
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
 * Sends an event reminder notification email.
 *
 * Notifies a user about an upcoming calendar event at the specified reminder interval.
 *
 * @param data - Event details including title, time, location, and reminder type
 * @returns Result object indicating success or failure with optional message ID
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
 * Sends a new message notification email.
 *
 * Notifies a user when they receive a new message in a conversation.
 *
 * @param data - Message details including sender, content preview, and conversation context
 * @returns Result object indicating success or failure with optional message ID
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
 * Sends a shopping list notification email.
 *
 * Notifies a user about shopping list activity (shared, updated, or completed).
 *
 * @param data - Shopping list details including items, action type, and space context
 * @returns Result object indicating success or failure with optional message ID
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
 * Sends a meal reminder notification email.
 *
 * Notifies a user about meal preparation, cooking, or planning reminders.
 *
 * @param data - Meal details including name, type, time, and optional ingredients
 * @returns Result object indicating success or failure with optional message ID
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
 * Sends a general reminder notification email.
 *
 * Notifies a user about personal, shared, recurring, or important reminders.
 *
 * @param data - Reminder details including title, type, priority, and due date
 * @returns Result object indicating success or failure with optional message ID
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
 * Sends a space invitation email to invite a user to join a family space.
 *
 * Uses retry mechanism with exponential backoff for improved delivery reliability.
 * Includes the inviter's name, space name, and a time-limited invitation link.
 *
 * @param data - Invitation details including recipient email, inviter, and invitation URL
 * @returns Result object indicating success or failure with optional message ID
 */
export async function sendSpaceInvitationEmail(data: SpaceInvitationData): Promise<EmailResult> {
  try {
    if (!resend) {
      logger.error('Resend not initialized - missing RESEND_API_KEY', undefined, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: 'Email service not configured' };
    }

    // Log incoming data for debugging
    logger.info('Attempting to send space invitation email', {
      component: 'lib-email-service',
      data: {
        recipientEmail: data.recipientEmail?.replace(/(.{2}).*(@.*)/, '$1***$2'),
        inviterName: data.inviterName,
        spaceName: data.spaceName,
        hasInvitationUrl: !!data.invitationUrl,
        expiresAt: data.expiresAt
      }
    });

    // Pre-render email HTML before retry loop for efficiency
    let emailHtml: string;
    try {
      emailHtml = await render(SpaceInvitationEmail(data));
      logger.info('Email template rendered successfully', { component: 'lib-email-service' });
    } catch (renderError) {
      logger.error('Failed to render SpaceInvitationEmail template', {
        component: 'lib-email-service',
        error: renderError instanceof Error ? renderError.message : String(renderError)
      });
      return { success: false, error: 'Failed to render email template' };
    }

    // Use retry mechanism for better delivery reliability
    logger.info('Calling Resend API...', { component: 'lib-email-service' });
    const result = await withRetry(
      async () => {
        logger.info('Resend API attempt starting', { component: 'lib-email-service' });
        // Sanitize tag values - Resend only allows ASCII letters, numbers, underscores, dashes
        const sanitizeTag = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
        const response = await resend.emails.send({
          from: FROM_EMAIL,
          to: [data.recipientEmail],
          subject: `You're invited to join "${data.spaceName}" on Rowan`,
          html: emailHtml,
          replyTo: REPLY_TO_EMAIL,
          tags: [
            { name: 'category', value: 'space-invitation' },
            { name: 'inviter', value: sanitizeTag(data.inviterName) },
            { name: 'space_name', value: sanitizeTag(data.spaceName) }
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
    // Extract meaningful error information for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = {
      message: errorMessage,
      name: error instanceof Error ? error.name : 'Unknown',
      // Resend errors often have additional properties
      ...(typeof error === 'object' && error !== null ? { raw: JSON.stringify(error) } : {})
    };
    logger.error('Error sending space invitation email:', errorDetails, { component: 'lib-email-service', action: 'service_call' });
    return { success: false, error: errorMessage };
  }
}

/**
 * Sends a password reset email with a secure reset link.
 *
 * @param data - Reset details including user email, reset URL, and optional context
 * @returns Result object indicating success or failure with optional message ID
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
 * Sends a magic link email for passwordless authentication.
 *
 * @param data - Login details including user email and magic link URL
 * @returns Result object indicating success or failure with optional message ID
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
 * Sends an email verification email for new account signup.
 *
 * @param data - Verification details including user email and verification URL
 * @returns Result object indicating success or failure with optional message ID
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
 * Sends a verification email when a user requests to change their email address.
 *
 * The email is sent to the new email address for verification.
 *
 * @param data - Change details including current email, new email, and verification URL
 * @returns Result object indicating success or failure with optional message ID
 */
export async function sendEmailChangeEmail(data: EmailChangeData): Promise<EmailResult> {
  try {
    if (!resend) {
      logger.error('Resend not initialized - missing RESEND_API_KEY', undefined, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: 'Email service not configured' };
    }

    const emailHtml = await render(EmailChangeEmail({
      currentEmail: data.currentEmail,
      newEmail: data.newEmail,
      verificationUrl: data.verificationUrl,
      userName: data.userName,
    }));

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [data.newEmail],
      subject: 'Confirm your new email address - Rowan',
      html: emailHtml,
      replyTo: REPLY_TO_EMAIL,
      tags: [
        { name: 'category', value: 'email-change' },
        { name: 'auth_type', value: 'email-change' }
      ]
    });

    if (error) {
      logger.error('Failed to send email change email:', error, { component: 'lib-email-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    logger.error('Error sending email change email:', error, { component: 'lib-email-service', action: 'service_call' });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Sends a daily digest email summarizing the user's upcoming day.
 *
 * Includes events, tasks due, overdue tasks, meals, and reminders.
 *
 * @param data - Digest content including all daily activities grouped by type
 * @returns Result object indicating success or failure with optional message ID
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
 * Sends an AI-enhanced daily digest email with personalized narrative content.
 *
 * Similar to the standard daily digest but includes AI-generated introduction
 * and closing messages for a more engaging user experience.
 *
 * @param data - Digest content with AI-generated narrative intro and closing
 * @returns Result object indicating success or failure with optional message ID
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
 * Sends a single email based on the specified type.
 *
 * Internal helper function used by batch sending. Routes to the appropriate
 * typed email function based on the type parameter.
 *
 * @param type - The email type identifier
 * @param data - The email data (type safety enforced at call site)
 * @returns Result object indicating success or failure
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
    case 'email-change':
      return sendEmailChangeEmail(data);
    default:
      return { success: false, error: 'Unknown email type' };
  }
}

/**
 * Sends multiple emails in parallel batches for high throughput.
 *
 * Processes emails in batches of 10 to balance throughput and rate limiting.
 * Significantly faster than sequential processing (100 emails: ~1s vs ~10s).
 *
 * @param emails - Array of email objects with type and data
 * @returns Summary with success/failed counts and individual results
 */
export async function sendBatchEmails(emails: Array<{
  type: 'task' | 'event' | 'message' | 'shopping' | 'meal' | 'reminder' | 'invitation' | 'password-reset' | 'magic-link' | 'email-verification' | 'email-change';
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
 * Verifies that the email service is properly configured and operational.
 *
 * Sends a test email to validate API key configuration and connectivity.
 *
 * @returns Result object indicating whether the service is operational
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
 * Sends a welcome email after a user subscribes to a paid plan.
 *
 * Confirms the subscription tier and billing period, and provides a link
 * to the dashboard.
 *
 * @param data - Subscription details including tier, period, and dashboard URL
 * @returns Result object indicating success or failure with optional message ID
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
 * Sends a payment failed notification email.
 *
 * Notifies the user that their subscription payment could not be processed,
 * includes retry attempt count, and provides a link to update payment method.
 *
 * @param data - Payment failure details including attempt count and grace period
 * @returns Result object indicating success or failure with optional message ID
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
 * Sends a subscription cancellation confirmation email.
 *
 * Confirms the cancellation, indicates when access will end, and provides
 * a link to resubscribe.
 *
 * @param data - Cancellation details including tier, access end date, and resubscribe URL
 * @returns Result object indicating success or failure with optional message ID
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

/** Aggregated email service for sending task, event, message, and shopping notification emails via Resend. */
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
  sendEmailChangeEmail,
  sendBatchEmails,
  verifyEmailService,
  // Subscription emails
  sendSubscriptionWelcomeEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCancelledEmail,
};