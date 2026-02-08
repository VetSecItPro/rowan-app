'use client';

/**
 * Push Notifications Hook
 *
 * Provides easy-to-use push notification management for React components.
 * Handles token registration, permission requests, and notification listeners.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  isPushAvailable,
  requestPushPermissions,
  registerForPush,
  setupNotificationListeners,
  type PushNotificationToken,
} from '@/lib/native/push-notifications';
import { isNative } from '@/lib/native';
import { logger } from '@/lib/logger';

interface UsePushNotificationsOptions {
  /** Space ID to register the token for */
  spaceId: string;
  /** Whether to automatically request permissions and register */
  autoRegister?: boolean;
  /** Callback when a notification is received while app is in foreground */
  onNotificationReceived?: (notification: PushNotification) => void;
  /** Callback when user taps on a notification */
  onNotificationTapped?: (notification: PushNotification) => void;
}

interface PushNotification {
  id?: string;
  title?: string;
  body?: string;
  data?: Record<string, string>;
}

interface UsePushNotificationsResult {
  /** Whether push notifications are available on this platform */
  isAvailable: boolean;
  /** Whether push permissions have been granted */
  isPermissionGranted: boolean;
  /** Whether the device is registered for push notifications */
  isRegistered: boolean;
  /** Whether registration is in progress */
  isLoading: boolean;
  /** Current push token (if registered) */
  token: string | null;
  /** Any error that occurred */
  error: string | null;
  /** Request push notification permissions */
  requestPermissions: () => Promise<boolean>;
  /** Register for push notifications */
  register: () => Promise<boolean>;
  /** Unregister from push notifications */
  unregister: () => Promise<boolean>;
}

export function usePushNotifications(
  options: UsePushNotificationsOptions
): UsePushNotificationsResult {
  const { spaceId, autoRegister = false, onNotificationReceived, onNotificationTapped } = options;
  const router = useRouter();

  const [isAvailable] = useState(() => isPushAvailable());
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track if we've already set up listeners
  const listenersSetup = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  /**
   * Handle navigation from notification tap
   */
  const handleNotificationNavigation = useCallback((data?: Record<string, string>) => {
    if (data?.actionUrl) {
      router.push(data.actionUrl);
    }
  }, [router]);

  /**
   * Request push notification permissions
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) {
      setError('Push notifications not available on this platform');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const granted = await requestPushPermissions();
      setIsPermissionGranted(granted);

      if (!granted) {
        setError('Push notification permission denied');
      }

      return granted;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to request permissions';
      setError(message);
      logger.error('Push permission request failed', { error: err });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  /**
   * Register for push notifications
   */
  const register = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) {
      setError('Push notifications not available');
      return false;
    }

    if (!spaceId) {
      setError('Space ID is required');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get the push token from the native bridge
      const pushToken = await registerForPush();

      if (!pushToken) {
        setError('Failed to get push token');
        return false;
      }

      // Register the token with our backend
      const response = await fetch('/api/push/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: pushToken.token,
          platform: pushToken.platform,
          spaceId,
          deviceName: await getDeviceName(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Registration failed');
      }

      setToken(pushToken.token);
      setIsRegistered(true);
      setIsPermissionGranted(true);

      logger.info('Push notifications registered', { platform: pushToken.platform });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      logger.error('Push registration failed', { error: err });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, spaceId]);

  /**
   * Unregister from push notifications
   */
  const unregister = useCallback(async (): Promise<boolean> => {
    if (!token) {
      return true; // Already unregistered
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/push/register', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Unregistration failed');
      }

      setToken(null);
      setIsRegistered(false);

      logger.info('Push notifications unregistered');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unregistration failed';
      setError(message);
      logger.error('Push unregistration failed', { error: err });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  /**
   * Set up notification listeners
   */
  useEffect(() => {
    if (!isNative || listenersSetup.current) {
      return;
    }

    listenersSetup.current = true;

    cleanupRef.current = setupNotificationListeners(
      // Notification received in foreground
      (notification) => {
        const pushNotification: PushNotification = {
          id: notification.id,
          title: notification.title,
          body: notification.body,
          data: notification.data as Record<string, string>,
        };

        logger.info('Push notification received', { title: notification.title });

        if (onNotificationReceived) {
          onNotificationReceived(pushNotification);
        }
      },
      // Notification tapped
      (action) => {
        const notification = action.notification;
        const pushNotification: PushNotification = {
          id: notification.id,
          title: notification.title,
          body: notification.body,
          data: notification.data as Record<string, string>,
        };

        logger.info('Push notification tapped', { title: notification.title });

        if (onNotificationTapped) {
          onNotificationTapped(pushNotification);
        }

        // Handle navigation
        handleNotificationNavigation(pushNotification.data);
      }
    );

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      listenersSetup.current = false;
    };
  }, [onNotificationReceived, onNotificationTapped, handleNotificationNavigation]);

  /**
   * Auto-register if enabled
   */
  useEffect(() => {
    if (autoRegister && isAvailable && spaceId && !isRegistered && !isLoading) {
      register();
    }
  }, [autoRegister, isAvailable, spaceId, isRegistered, isLoading, register]);

  return {
    isAvailable,
    isPermissionGranted,
    isRegistered,
    isLoading,
    token,
    error,
    requestPermissions,
    register,
    unregister,
  };
}

/**
 * Get a friendly device name
 */
async function getDeviceName(): Promise<string> {
  if (typeof window === 'undefined') return 'Unknown';

  const { Capacitor } = await import('@capacitor/core');
  const platform = Capacitor.getPlatform();

  if (platform === 'ios') {
    return 'iPhone';
  } else if (platform === 'android') {
    return 'Android Device';
  }

  // Web - try to get browser name
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome Browser';
  if (ua.includes('Safari')) return 'Safari Browser';
  if (ua.includes('Firefox')) return 'Firefox Browser';

  return 'Web Browser';
}

/**
 * Simplified hook just for checking push notification status
 */
export function usePushStatus(): {
  isAvailable: boolean;
  isNativeApp: boolean;
} {
  return {
    isAvailable: isPushAvailable(),
    isNativeApp: isNative,
  };
}
