/**
 * Push Notification Service
 *
 * Server-side service for managing push notifications across iOS, Android, and web platforms.
 * Handles device token registration, notification delivery via FCM or Expo, and token lifecycle
 * management including automatic deactivation of invalid tokens.
 *
 * Supported providers:
 * - Firebase Cloud Messaging (FCM v1 API) - requires FIREBASE_SERVICE_ACCOUNT env var
 * - Expo Push Notifications - requires EXPO_ACCESS_TOKEN env var
 */

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

/**
 * Represents a registered push notification token for a user's device.
 */
export interface PushToken {
  id: string;
  user_id: string;
  space_id: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  device_name: string | null;
  is_active: boolean;
  last_used_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Payload structure for push notification content and behavior.
 */
export interface NotificationPayload {
  /** The notification title displayed to the user */
  title: string;
  /** The notification body text */
  body: string;
  /** Custom data payload passed to the app when notification is tapped */
  data?: Record<string, string>;
  /** Badge count to display on app icon (iOS) */
  badge?: number;
  /** Sound file name or 'default' */
  sound?: string;
  /** URL of an image to display with the notification */
  image?: string;
  /** Deep link URL when notification is tapped */
  actionUrl?: string;
}

/**
 * Result of sending a notification to a single device token.
 */
export interface NotificationResult {
  /** Whether the notification was sent successfully */
  success: boolean;
  /** The database ID of the push token that was targeted */
  tokenId: string;
  /** Error message if the send failed */
  error?: string;
}

/**
 * Notification type categories used for routing to appropriate Android channels
 * and for analytics tracking.
 */
export type NotificationType =
  | 'location_arrival'
  | 'location_departure'
  | 'location_emergency'
  | 'task_assigned'
  | 'task_due_soon'
  | 'task_overdue'
  | 'chore_reminder'
  | 'message_received'
  | 'event_reminder'
  | 'goal_milestone'
  | 'reward_earned'
  | 'family_update'
  | 'system';

// ============================================================================
// Validation Schemas
// ============================================================================

const registerTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web']),
  deviceName: z.string().optional(),
});

const sendNotificationSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1),
  spaceId: z.string().uuid(),
  notification: z.object({
    title: z.string().min(1).max(100),
    body: z.string().min(1).max(500),
    data: z.record(z.string(), z.string()).optional(),
    badge: z.number().optional(),
    sound: z.string().optional(),
    image: z.string().url().optional(),
    actionUrl: z.string().optional(),
  }),
  type: z.enum([
    'location_arrival',
    'location_departure',
    'location_emergency',
    'task_assigned',
    'task_due_soon',
    'task_overdue',
    'chore_reminder',
    'message_received',
    'event_reminder',
    'goal_milestone',
    'reward_earned',
    'family_update',
    'system',
  ]),
});

// ============================================================================
// Token Management
// ============================================================================

/**
 * Registers or updates a push notification token for a user's device.
 *
 * If the token already exists for this user, updates its metadata. Otherwise,
 * creates a new token record. Tokens are associated with both the user and
 * their current space for proper notification targeting.
 *
 * @param userId - The unique identifier of the user
 * @param spaceId - The unique identifier of the user's current space
 * @param input - Token registration data including the token string, platform, and device name
 * @returns An object with success status and the token ID if successful
 */
export async function registerPushToken(
  userId: string,
  spaceId: string,
  input: z.infer<typeof registerTokenSchema>
): Promise<{ success: boolean; tokenId?: string; error?: string }> {
  try {
    const validated = registerTokenSchema.parse(input);
    const supabase = await createClient();

    // Check if token already exists for this user
    const { data: existingToken } = await supabase
      .from('push_tokens')
      .select('id')
      .eq('user_id', userId)
      .eq('token', validated.token)
      .single();

    if (existingToken) {
      // Update existing token
      const { error } = await supabase
        .from('push_tokens')
        .update({
          space_id: spaceId,
          platform: validated.platform,
          device_name: validated.deviceName || null,
          is_active: true,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingToken.id);

      if (error) throw error;

      return { success: true, tokenId: existingToken.id };
    }

    // Insert new token
    const { data: newToken, error } = await supabase
      .from('push_tokens')
      .insert({
        user_id: userId,
        space_id: spaceId,
        token: validated.token,
        platform: validated.platform,
        device_name: validated.deviceName || null,
        is_active: true,
        last_used_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;

    logger.info('Push token registered', { userId, platform: validated.platform });
    return { success: true, tokenId: newToken.id };
  } catch (error) {
    logger.error('Failed to register push token', error instanceof Error ? error : undefined, { userId });
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Failed to register push token' };
  }
}

/**
 * Unregisters a push token by marking it as inactive.
 *
 * Call this when a user logs out to stop sending notifications to their device.
 * The token record is kept for auditing but marked inactive.
 *
 * @param userId - The unique identifier of the user
 * @param token - The push token string to deactivate
 * @returns An object indicating success or failure
 */
export async function unregisterPushToken(
  userId: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('push_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('token', token);

    if (error) throw error;

    logger.info('Push token unregistered', { userId });
    return { success: true };
  } catch (error) {
    logger.error('Failed to unregister push token', error instanceof Error ? error : undefined, { userId });
    return { success: false, error: 'Failed to unregister push token' };
  }
}

/**
 * Deactivates all push tokens for a user.
 *
 * Use this during account deletion or when a user revokes notification permissions.
 * All active tokens are marked inactive in a single operation.
 *
 * @param userId - The unique identifier of the user
 * @returns An object with success status and the count of deactivated tokens
 */
export async function deactivateAllTokens(
  userId: string
): Promise<{ success: boolean; count: number }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('push_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_active', true)
      .select('id');

    if (error) throw error;

    return { success: true, count: data?.length || 0 };
  } catch (error) {
    logger.error('Failed to deactivate tokens', error instanceof Error ? error : undefined, { userId });
    return { success: false, count: 0 };
  }
}

/**
 * Retrieves all active push tokens for specified users within a space.
 *
 * Used to gather device tokens before sending notifications. Only returns
 * tokens that are marked as active and belong to the specified space.
 *
 * @param userIds - Array of user IDs to fetch tokens for
 * @param spaceId - The space ID to filter tokens by
 * @returns Array of active push token records
 */
export async function getActiveTokensForUsers(
  userIds: string[],
  spaceId: string
): Promise<PushToken[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('push_tokens')
      .select('id, user_id, space_id, token, platform, device_name, is_active, last_used_at, created_at, updated_at')
      .in('user_id', userIds)
      .eq('space_id', spaceId)
      .eq('is_active', true);

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error('Failed to get active tokens', error instanceof Error ? error : undefined);
    return [];
  }
}

// ============================================================================
// Notification Sending
// ============================================================================

/**
 * Sends push notifications to specific users in a space.
 *
 * Fetches active tokens for the target users and sends the notification to each
 * device. Automatically handles token validation, updating last_used timestamps
 * for successful sends, and deactivating invalid tokens.
 *
 * Requires a push notification provider to be configured:
 * - Firebase Cloud Messaging: Set FIREBASE_SERVICE_ACCOUNT env var
 * - Expo Push: Set EXPO_ACCESS_TOKEN env var
 *
 * @param input - Validated input containing userIds, spaceId, notification payload, and type
 * @returns An object with overall success status and per-token delivery results
 */
export async function sendPushNotification(
  input: z.infer<typeof sendNotificationSchema>
): Promise<{ success: boolean; results: NotificationResult[]; error?: string }> {
  try {
    const validated = sendNotificationSchema.parse(input);

    // Get active tokens for the target users
    const tokens = await getActiveTokensForUsers(validated.userIds, validated.spaceId);

    if (tokens.length === 0) {
      logger.info('No active push tokens found for users', { userIds: validated.userIds });
      return { success: true, results: [] };
    }

    const results: NotificationResult[] = [];

    // Send to each token
    for (const tokenRecord of tokens) {
      try {
        const notificationPayload: NotificationPayload = {
          ...validated.notification,
          data: validated.notification.data as Record<string, string> | undefined,
        };
        const result = await sendToProvider(tokenRecord, notificationPayload, validated.type);
        results.push({
          success: result.success,
          tokenId: tokenRecord.id,
          error: result.error,
        });

        // Update last_used_at on successful send
        if (result.success) {
          await updateTokenLastUsed(tokenRecord.id);
        } else if (result.shouldDeactivate) {
          // Deactivate invalid tokens
          await deactivateToken(tokenRecord.id);
        }
      } catch (err) {
        results.push({
          success: false,
          tokenId: tokenRecord.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    logger.info('Push notifications sent', {
      type: validated.type,
      total: results.length,
      success: successCount,
      failed: results.length - successCount,
    });

    return { success: true, results };
  } catch (error) {
    logger.error('Failed to send push notifications', error instanceof Error ? error : undefined);
    if (error instanceof z.ZodError) {
      return { success: false, results: [], error: error.issues[0].message };
    }
    return { success: false, results: [], error: 'Failed to send notifications' };
  }
}

/**
 * Sends a push notification to all members of a space.
 *
 * Fetches all space members and sends the notification to each, optionally
 * excluding a specific user (typically the action initiator).
 *
 * @param spaceId - The unique identifier of the space
 * @param excludeUserId - Optional user ID to exclude from notifications (e.g., the sender)
 * @param notification - The notification payload to send
 * @param type - The notification type for channel routing
 * @returns An object with success status and count of notifications sent
 */
export async function notifySpaceMembers(
  spaceId: string,
  excludeUserId: string | null,
  notification: NotificationPayload,
  type: NotificationType
): Promise<{ success: boolean; sentCount: number }> {
  try {
    const supabase = await createClient();

    // Get all space members
    const { data: members, error } = await supabase
      .from('space_members')
      .select('user_id')
      .eq('space_id', spaceId);

    if (error) throw error;

    // Filter out the sender
    const userIds = (members || [])
      .map((m: { user_id: string }) => m.user_id)
      .filter((id: string) => id !== excludeUserId);

    if (userIds.length === 0) {
      return { success: true, sentCount: 0 };
    }

    const result = await sendPushNotification({
      userIds,
      spaceId,
      notification,
      type,
    });

    const sentCount = result.results.filter(r => r.success).length;
    return { success: true, sentCount };
  } catch (error) {
    logger.error('Failed to notify space members', error instanceof Error ? error : undefined, { spaceId });
    return { success: false, sentCount: 0 };
  }
}

// ============================================================================
// Provider Integration
// ============================================================================

interface ProviderResult {
  success: boolean;
  error?: string;
  shouldDeactivate?: boolean;
}

/**
 * Send notification through the configured provider
 */
async function sendToProvider(
  token: PushToken,
  notification: NotificationPayload,
  type: NotificationType
): Promise<ProviderResult> {
  // Check which provider is configured
  const firebaseServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  const expoToken = process.env.EXPO_ACCESS_TOKEN;

  if (firebaseServiceAccount) {
    return sendViaFCM(token, notification, type, firebaseServiceAccount);
  }

  if (expoToken && token.platform !== 'web') {
    return sendViaExpo(token, notification, type, expoToken);
  }

  // No provider configured - log and return success (silent fail)
  logger.warn('No push notification provider configured', {
    hint: 'Set FIREBASE_SERVICE_ACCOUNT or EXPO_ACCESS_TOKEN environment variable',
  });

  // In development, we'll just log the notification
  if (process.env.NODE_ENV === 'development') {
    logger.info('Push notification (dev mode)', {
      to: token.user_id,
      platform: token.platform,
      title: notification.title,
      body: notification.body,
      type,
    });
  }

  return { success: true };
}

/**
 * Send via Firebase Cloud Messaging (HTTP v1 API)
 *
 * Uses the modern FCM HTTP v1 API with OAuth 2.0 service account auth.
 * The legacy API (fcm.googleapis.com/fcm/send) was deprecated June 2024.
 *
 * Requires FIREBASE_SERVICE_ACCOUNT env var containing the service account JSON.
 */
async function sendViaFCM(
  token: PushToken,
  notification: NotificationPayload,
  type: NotificationType,
  _serverKey: string // kept for interface compat, ignored — uses service account
): Promise<ProviderResult> {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      logger.warn('FIREBASE_SERVICE_ACCOUNT not set — cannot send FCM notification');
      return { success: false, error: 'Firebase service account not configured' };
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id;

    if (!projectId) {
      return { success: false, error: 'Invalid Firebase service account: missing project_id' };
    }

    // Get OAuth 2.0 access token via google-auth-library (bundled with googleapis)
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const accessToken = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse.token;

    if (!accessToken) {
      return { success: false, error: 'Failed to obtain Firebase access token' };
    }

    // FCM v1 API message format
    const message = {
      message: {
        token: token.token,
        notification: {
          title: notification.title,
          body: notification.body,
          image: notification.image,
        },
        data: {
          ...notification.data,
          type,
          ...(notification.actionUrl && { actionUrl: notification.actionUrl }),
        },
        apns: {
          payload: {
            aps: {
              sound: notification.sound || 'default',
              badge: notification.badge,
              'mutable-content': 1,
            },
          },
        },
        android: {
          priority: 'high' as const,
          notification: {
            sound: notification.sound || 'default',
            channelId: getChannelForType(type),
          },
        },
      },
    };

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(message),
      }
    );

    if (response.ok) {
      return { success: true };
    }

    const errorBody = await response.json().catch(() => ({}));
    const errorCode = errorBody?.error?.details?.[0]?.errorCode || errorBody?.error?.status;

    // Token is no longer valid — deactivate it
    if (errorCode === 'UNREGISTERED' || errorCode === 'INVALID_ARGUMENT') {
      return { success: false, error: errorCode, shouldDeactivate: true };
    }

    logger.error('FCM v1 API error', undefined, {
      status: response.status,
      errorCode,
      message: errorBody?.error?.message,
    });

    return { success: false, error: errorBody?.error?.message || `FCM error ${response.status}` };
  } catch (error) {
    logger.error('FCM send error', error instanceof Error ? error : undefined);
    return { success: false, error: 'FCM request failed' };
  }
}

/**
 * Send via Expo Push Notifications
 */
async function sendViaExpo(
  token: PushToken,
  notification: NotificationPayload,
  type: NotificationType,
  accessToken: string
): Promise<ProviderResult> {
  try {
    const message = {
      to: token.token,
      title: notification.title,
      body: notification.body,
      data: {
        ...notification.data,
        type,
        actionUrl: notification.actionUrl,
      },
      sound: notification.sound || 'default',
      badge: notification.badge,
      channelId: getChannelForType(type),
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();

    if (result.data?.status === 'ok') {
      return { success: true };
    }

    // Check for device not registered
    if (result.data?.details?.error === 'DeviceNotRegistered') {
      return { success: false, error: 'Device not registered', shouldDeactivate: true };
    }

    return { success: false, error: result.data?.message || 'Expo send failed' };
  } catch (error) {
    logger.error('Expo push error', error instanceof Error ? error : undefined);
    return { success: false, error: 'Expo request failed' };
  }
}

/**
 * Get Android notification channel for notification type
 */
function getChannelForType(type: NotificationType): string {
  switch (type) {
    case 'message_received':
      return 'messages';
    case 'task_assigned':
    case 'task_due_soon':
    case 'task_overdue':
    case 'chore_reminder':
      return 'tasks';
    case 'location_arrival':
    case 'location_departure':
      return 'location';
    case 'event_reminder':
      return 'calendar';
    case 'goal_milestone':
    case 'reward_earned':
      return 'achievements';
    default:
      return 'default';
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function updateTokenLastUsed(tokenId: string): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase
      .from('push_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', tokenId);
  } catch (error) {
    // Non-critical, just log
    logger.warn('Failed to update token last_used_at', { tokenId });
  }
}

async function deactivateToken(tokenId: string): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase
      .from('push_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', tokenId);
    logger.info('Deactivated invalid push token', { tokenId });
  } catch (error) {
    logger.warn('Failed to deactivate token', { tokenId });
  }
}

// ============================================================================
// Convenience Functions for Common Notifications
// ============================================================================

/**
 * Notifies space members when a family member arrives at a location.
 *
 * Sends notifications to all space members except the person who arrived.
 *
 * @param spaceId - The unique identifier of the space
 * @param userId - The user ID of the person who arrived (excluded from notifications)
 * @param userName - The display name of the person who arrived
 * @param placeName - The name of the location (e.g., "Home", "School")
 */
export async function notifyLocationArrival(
  spaceId: string,
  userId: string,
  userName: string,
  placeName: string
): Promise<void> {
  await notifySpaceMembers(
    spaceId,
    userId, // Don't notify the person who arrived
    {
      title: `${userName} arrived`,
      body: `${userName} has arrived at ${placeName}`,
      data: { userId, placeName },
      actionUrl: '/location',
    },
    'location_arrival'
  );
}

/**
 * Notifies space members when a family member leaves a location.
 *
 * Sends notifications to all space members except the person who left.
 *
 * @param spaceId - The unique identifier of the space
 * @param userId - The user ID of the person who left (excluded from notifications)
 * @param userName - The display name of the person who left
 * @param placeName - The name of the location (e.g., "Home", "Work")
 */
export async function notifyLocationDeparture(
  spaceId: string,
  userId: string,
  userName: string,
  placeName: string
): Promise<void> {
  await notifySpaceMembers(
    spaceId,
    userId,
    {
      title: `${userName} left`,
      body: `${userName} has left ${placeName}`,
      data: { userId, placeName },
      actionUrl: '/location',
    },
    'location_departure'
  );
}

/**
 * Notifies a user when they are assigned a task.
 *
 * @param spaceId - The unique identifier of the space containing the task
 * @param assignedToUserId - The user ID of the person assigned to the task
 * @param taskTitle - The title of the assigned task
 * @param assignedByName - The display name of the person who assigned the task
 */
export async function notifyTaskAssigned(
  spaceId: string,
  assignedToUserId: string,
  taskTitle: string,
  assignedByName: string
): Promise<void> {
  await sendPushNotification({
    userIds: [assignedToUserId],
    spaceId,
    notification: {
      title: 'New task assigned',
      body: `${assignedByName} assigned you: ${taskTitle}`,
      data: { taskTitle },
      actionUrl: '/tasks',
    },
    type: 'task_assigned',
  });
}

/**
 * Notifies a user that their task is overdue.
 *
 * @param spaceId - The unique identifier of the space containing the task
 * @param userId - The user ID of the task assignee
 * @param taskTitle - The title of the overdue task
 */
export async function notifyTaskOverdue(
  spaceId: string,
  userId: string,
  taskTitle: string
): Promise<void> {
  await sendPushNotification({
    userIds: [userId],
    spaceId,
    notification: {
      title: 'Task overdue',
      body: `"${taskTitle}" is now overdue`,
      data: { taskTitle },
      actionUrl: '/tasks',
    },
    type: 'task_overdue',
  });
}

/**
 * Notifies users of a new message in a conversation.
 *
 * Truncates message previews longer than 100 characters for cleaner display.
 *
 * @param spaceId - The unique identifier of the space
 * @param recipientUserIds - Array of user IDs to notify (conversation participants minus sender)
 * @param senderName - The display name of the message sender
 * @param messagePreview - A preview of the message content
 */
export async function notifyNewMessage(
  spaceId: string,
  recipientUserIds: string[],
  senderName: string,
  messagePreview: string
): Promise<void> {
  await sendPushNotification({
    userIds: recipientUserIds,
    spaceId,
    notification: {
      title: senderName,
      body: messagePreview.length > 100 ? messagePreview.slice(0, 100) + '...' : messagePreview,
      data: { senderName },
      actionUrl: '/messages',
    },
    type: 'message_received',
  });
}

/**
 * Notifies users of an upcoming calendar event.
 *
 * Formats the time until the event appropriately (minutes or hours).
 *
 * @param spaceId - The unique identifier of the space
 * @param userIds - Array of user IDs to notify (event participants)
 * @param eventTitle - The title of the upcoming event
 * @param minutesUntil - Minutes until the event starts
 */
export async function notifyEventReminder(
  spaceId: string,
  userIds: string[],
  eventTitle: string,
  minutesUntil: number
): Promise<void> {
  const timeText = minutesUntil <= 60
    ? `in ${minutesUntil} minutes`
    : `in ${Math.round(minutesUntil / 60)} hours`;

  await sendPushNotification({
    userIds,
    spaceId,
    notification: {
      title: 'Upcoming event',
      body: `${eventTitle} starts ${timeText}`,
      data: { eventTitle },
      actionUrl: '/calendar',
    },
    type: 'event_reminder',
  });
}

/**
 * Notifies users when a goal reaches a milestone.
 *
 * @param spaceId - The unique identifier of the space
 * @param userIds - Array of user IDs to notify (goal participants)
 * @param goalTitle - The title of the goal
 * @param percentComplete - The current completion percentage of the goal
 */
export async function notifyGoalMilestone(
  spaceId: string,
  userIds: string[],
  goalTitle: string,
  percentComplete: number
): Promise<void> {
  await sendPushNotification({
    userIds,
    spaceId,
    notification: {
      title: 'Goal milestone reached! 🎉',
      body: `"${goalTitle}" is now ${percentComplete}% complete`,
      data: { goalTitle, percentComplete: percentComplete.toString() },
      actionUrl: '/goals',
    },
    type: 'goal_milestone',
  });
}
