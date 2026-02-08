/**
 * Push Notifications Native Bridge
 *
 * Handles native push notifications for iOS and Android.
 * Falls back to Web Push API when running in browser.
 */

import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { isNative, isPluginAvailable } from './capacitor';

export interface PushNotificationToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

type NotificationReceivedCallback = (notification: PushNotificationSchema) => void;
type NotificationActionCallback = (action: ActionPerformed) => void;

let onNotificationReceived: NotificationReceivedCallback | null = null;
let onNotificationAction: NotificationActionCallback | null = null;

/**
 * Check if push notifications are available
 */
export function isPushAvailable(): boolean {
  if (isNative) {
    return isPluginAvailable('PushNotifications');
  }
  // Check for Web Push support
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Request push notification permissions
 * Returns true if granted, false otherwise
 */
export async function requestPushPermissions(): Promise<boolean> {
  if (!isPushAvailable()) {
    return false;
  }

  if (isNative) {
    const result = await PushNotifications.requestPermissions();
    return result.receive === 'granted';
  }

  // Web Push
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Register for push notifications and get device token
 * The token should be sent to your backend to store for sending notifications
 */
export async function registerForPush(): Promise<PushNotificationToken | null> {
  if (!isPushAvailable()) {
    return null;
  }

  const hasPermission = await requestPushPermissions();
  if (!hasPermission) {
    return null;
  }

  if (isNative) {
    return new Promise((resolve, reject) => {
      // Listen for registration success
      PushNotifications.addListener('registration', (token: Token) => {
        resolve({
          token: token.value,
          platform: getPlatformForPush(),
        });
      });

      // Listen for registration errors
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
        reject(error);
      });

      // Trigger registration
      PushNotifications.register();
    });
  }

  // Web Push - would need service worker and VAPID key setup
  // For now, return null and handle web push separately
  console.info('Web push registration requires service worker setup');
  return null;
}

/**
 * Set up notification listeners
 */
export function setupNotificationListeners(
  onReceived: NotificationReceivedCallback,
  onAction: NotificationActionCallback
): () => void {
  onNotificationReceived = onReceived;
  onNotificationAction = onAction;

  if (!isNative) {
    return () => {}; // No cleanup needed for web
  }

  // Notification received while app is in foreground
  const receivedListener = PushNotifications.addListener(
    'pushNotificationReceived',
    (notification: PushNotificationSchema) => {
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    }
  );

  // User tapped on notification
  const actionListener = PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (action: ActionPerformed) => {
      if (onNotificationAction) {
        onNotificationAction(action);
      }
    }
  );

  // Return cleanup function
  return () => {
    receivedListener.then(l => l.remove());
    actionListener.then(l => l.remove());
  };
}

/**
 * Get delivered notifications (Android only)
 */
export async function getDeliveredNotifications() {
  if (!isNative) {
    return { notifications: [] };
  }
  return PushNotifications.getDeliveredNotifications();
}

/**
 * Remove specific delivered notifications
 */
export async function removeDeliveredNotifications(ids: string[]) {
  if (!isNative) {
    return;
  }
  // The Capacitor API expects DeliveredNotifications with id, tag, and data properties
  await PushNotifications.removeDeliveredNotifications({
    notifications: ids.map(id => ({ id, tag: '', data: {} })),
  });
}

/**
 * Remove all delivered notifications
 */
export async function removeAllDeliveredNotifications() {
  if (!isNative) {
    return;
  }
  await PushNotifications.removeAllDeliveredNotifications();
}

function getPlatformForPush(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web';
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
}
