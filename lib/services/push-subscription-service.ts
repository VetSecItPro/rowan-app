import { createClient } from '@/lib/supabase/client';

export interface PushSubscription {
  id: string;
  user_id: string;
  space_id?: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
  device_name?: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string;
  expires_at?: string;
}

// VAPID keys should be in environment variables
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

/**
 * Convert base64 VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as BufferSource;
}

/**
 * Get device name from user agent
 */
function getDeviceName(userAgent: string): string {
  if (/iPhone/.test(userAgent)) return 'iPhone';
  if (/iPad/.test(userAgent)) return 'iPad';
  if (/Android/.test(userAgent)) return 'Android Device';
  if (/Mac/.test(userAgent)) return 'Mac';
  if (/Windows/.test(userAgent)) return 'Windows PC';
  if (/Linux/.test(userAgent)) return 'Linux';
  return 'Unknown Device';
}

export const pushSubscriptionService = {
  /**
   * Register service worker
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service workers not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('Service worker registered:', registration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return null;
    }
  },

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported');
    }

    const permission = await Notification.requestPermission();
    return permission;
  },

  /**
   * Check if push notifications are supported and permitted
   */
  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  },

  /**
   * Subscribe to push notifications
   */
  async subscribe(
    userId: string,
    spaceId?: string
  ): Promise<PushSubscription | null> {
    if (!this.isSupported()) {
      throw new Error('Push notifications not supported');
    }

    // Request permission
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    // Register service worker
    const registration = await this.registerServiceWorker();
    if (!registration) {
      throw new Error('Service worker registration failed');
    }

    try {
      // Subscribe to push
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Extract keys
      const p256dh = btoa(
        String.fromCharCode(...new Uint8Array(pushSubscription.getKey('p256dh')!))
      );
      const auth = btoa(
        String.fromCharCode(...new Uint8Array(pushSubscription.getKey('auth')!))
      );

      // Save to database
      const supabase = createClient();
      const { data, error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          space_id: spaceId || null,
          endpoint: pushSubscription.endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent,
          device_name: getDeviceName(navigator.userAgent),
          is_active: true,
          last_used_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving push subscription:', error);
        throw new Error('Failed to save push subscription');
      }

      return data;
    } catch (error) {
      console.error('Push subscription failed:', error);
      throw error;
    }
  },

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(userId: string): Promise<void> {
    const supabase = createClient();

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    const pushSubscription = await registration.pushManager.getSubscription();

    if (pushSubscription) {
      await pushSubscription.unsubscribe();
    }

    // Deactivate in database
    const { error } = await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (error) {
      console.error('Error deactivating push subscription:', error);
      throw new Error('Failed to unsubscribe');
    }
  },

  /**
   * Get all active subscriptions for a user
   */
  async getSubscriptions(userId: string): Promise<PushSubscription[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      throw new Error('Failed to fetch subscriptions');
    }

    return data || [];
  },

  /**
   * Delete a specific subscription
   */
  async deleteSubscription(subscriptionId: string): Promise<void> {
    const supabase = createClient();

    const { error} = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('id', subscriptionId);

    if (error) {
      console.error('Error deleting subscription:', error);
      throw new Error('Failed to delete subscription');
    }
  },

  /**
   * Check if user is currently subscribed
   */
  async isSubscribed(userId: string): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.getSubscription();

      if (!pushSubscription) return false;

      // Check if subscription exists in database
      const supabase = createClient();
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('endpoint', pushSubscription.endpoint)
        .eq('is_active', true)
        .single();

      return !error && !!data;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  },

  /**
   * Test push notification
   */
  async sendTestNotification(userId: string): Promise<void> {
    const response = await fetch('/api/notifications/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        title: 'Test Notification',
        body: 'This is a test push notification from Rowan',
        data: { test: true },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send test notification');
    }
  },
};
