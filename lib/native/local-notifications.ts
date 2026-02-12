/**
 * Local Notifications Native Bridge
 *
 * Schedules and manages local notifications using @capacitor/local-notifications.
 * Falls back to the Web Notification API when available, no-op otherwise.
 */

import { isNative } from './capacitor';

// Types from the plugin
type LocalNotificationsPlugin =
  typeof import('@capacitor/local-notifications').LocalNotifications;

// Dynamic import to avoid bundling issues on web
let LocalNotificationsPlugin: LocalNotificationsPlugin | null = null;

async function getLocalNotificationsPlugin(): Promise<LocalNotificationsPlugin | null> {
  if (!isNative) return null;

  if (!LocalNotificationsPlugin) {
    const mod = await import('@capacitor/local-notifications');
    LocalNotificationsPlugin = mod.LocalNotifications;
  }
  return LocalNotificationsPlugin;
}

export interface ScheduleNotificationOptions {
  title: string;
  body: string;
  id: number;
  schedule?: { at: Date };
}

export interface PendingNotification {
  id: number;
}

export interface PermissionStatus {
  display: string;
}

/**
 * Check current notification permissions
 */
export async function checkPermissions(): Promise<PermissionStatus> {
  const plugin = await getLocalNotificationsPlugin();

  if (plugin) {
    try {
      const result = await plugin.checkPermissions();
      return { display: result.display };
    } catch {
      // Plugin unavailable — fall through to web
    }
  }

  // Web fallback
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return { display: Notification.permission };
  }

  return { display: 'denied' };
}

/**
 * Request notification permissions
 */
export async function requestPermissions(): Promise<PermissionStatus> {
  const plugin = await getLocalNotificationsPlugin();

  if (plugin) {
    try {
      const result = await plugin.requestPermissions();
      return { display: result.display };
    } catch {
      // Plugin unavailable — fall through to web
    }
  }

  // Web fallback
  if (typeof window !== 'undefined' && 'Notification' in window) {
    const permission = await Notification.requestPermission();
    return { display: permission };
  }

  return { display: 'denied' };
}

/**
 * Schedule a local notification
 *
 * On native, uses the full local notification system with optional scheduling.
 * On web, fires a Web Notification immediately (scheduled timing is not supported).
 */
export async function scheduleNotification(
  options: ScheduleNotificationOptions
): Promise<void> {
  const plugin = await getLocalNotificationsPlugin();

  if (plugin) {
    try {
      await plugin.schedule({
        notifications: [
          {
            title: options.title,
            body: options.body,
            id: options.id,
            schedule: options.schedule
              ? { at: options.schedule.at }
              : undefined,
          },
        ],
      });
      return;
    } catch (error) {
      console.error('Failed to schedule local notification:', error);
      return;
    }
  }

  // Web fallback — fire immediately (no scheduling support)
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(options.title, { body: options.body });
    }
  }
}

/**
 * Cancel a specific pending notification by ID
 */
export async function cancelNotification(id: number): Promise<void> {
  const plugin = await getLocalNotificationsPlugin();

  if (plugin) {
    try {
      await plugin.cancel({ notifications: [{ id }] });
    } catch {
      // Silently fail — cancellation is non-critical
    }
  }

  // Web: no-op (no scheduled notifications to cancel)
}

/**
 * Cancel all pending notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  const plugin = await getLocalNotificationsPlugin();

  if (plugin) {
    try {
      const pending = await plugin.getPending();
      if (pending.notifications.length > 0) {
        await plugin.cancel({
          notifications: pending.notifications.map((n) => ({ id: n.id })),
        });
      }
    } catch {
      // Silently fail
    }
  }

  // Web: no-op
}

/**
 * Get all pending (scheduled but not yet fired) notifications
 */
export async function getPendingNotifications(): Promise<{
  notifications: PendingNotification[];
}> {
  const plugin = await getLocalNotificationsPlugin();

  if (plugin) {
    try {
      const result = await plugin.getPending();
      return {
        notifications: result.notifications.map((n) => ({ id: n.id })),
      };
    } catch {
      // Plugin unavailable — fall through
    }
  }

  return { notifications: [] };
}
