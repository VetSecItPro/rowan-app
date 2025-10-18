import { createClient } from '@/lib/supabase/client';

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: {
    url?: string;
    action?: string;
    id?: string;
    [key: string]: any;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

class PushNotificationService {
  private vapidPublicKey: string;
  private serviceWorkerPath: string;

  constructor() {
    this.vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
    this.serviceWorkerPath = '/sw.js';
  }

  /**
   * Check if push notifications are supported
   */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Get current notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Push notifications are not supported in this browser');
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  /**
   * Register service worker and get push subscription
   */
  async subscribe(): Promise<PushSubscription | null> {
    if (!this.isSupported()) {
      throw new Error('Push notifications are not supported');
    }

    if (!this.vapidPublicKey) {
      throw new Error('VAPID public key is not configured');
    }

    // Request permission first
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register(this.serviceWorkerPath);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Get existing subscription or create new one
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Create new subscription
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey),
        });
      }

      if (!subscription) {
        throw new Error('Failed to create push subscription');
      }

      // Convert to our format
      const subscriptionData: PushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')),
        },
      };

      // Save subscription to database
      await this.saveSubscription(subscriptionData);

      return subscriptionData;
    } catch (error) {
      console.error('Push subscription error:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        return false;
      }

      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        return false;
      }

      // Unsubscribe from push manager
      const success = await subscription.unsubscribe();

      if (success) {
        // Remove from database
        await this.removeSubscription(subscription.endpoint);
      }

      return success;
    } catch (error) {
      console.error('Push unsubscription error:', error);
      return false;
    }
  }

  /**
   * Get current push subscription
   */
  async getCurrentSubscription(): Promise<PushSubscription | null> {
    if (!this.isSupported()) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        return null;
      }

      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        return null;
      }

      return {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')),
        },
      };
    } catch (error) {
      console.error('Error getting current subscription:', error);
      return null;
    }
  }

  /**
   * Send a push notification to specific user
   */
  async sendNotification(
    userId: string,
    payload: PushNotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/notifications/send-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          payload,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending push notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendBulkNotifications(
    userIds: string[],
    payload: PushNotificationPayload
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    // Process in batches to avoid overwhelming the API
    const batchSize = 10;
    const batches = [];
    for (let i = 0; i < userIds.length; i += batchSize) {
      batches.push(userIds.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (userId) => {
        const result = await this.sendNotification(userId, payload);
        if (result.success) {
          results.success++;
        } else {
          results.failed++;
          if (result.error) {
            results.errors.push(`${userId}: ${result.error}`);
          }
        }
      });

      await Promise.all(batchPromises);

      // Small delay between batches
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Test push notification (send to current user)
   */
  async sendTestNotification(): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const payload: PushNotificationPayload = {
      title: 'Test Notification',
      body: 'This is a test push notification from Rowan!',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: 'test-notification',
      data: {
        url: '/',
        action: 'test',
      },
    };

    return this.sendNotification(user.id, payload);
  }

  /**
   * Save subscription to database
   */
  private async saveSubscription(subscription: PushSubscription): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('endpoint', subscription.endpoint)
      .single();

    if (existing) {
      // Update existing subscription
      const { error } = await supabase
        .from('push_subscriptions')
        .update({
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        throw new Error(`Failed to update subscription: ${error.message}`);
      }
    } else {
      // Create new subscription
      const { error } = await supabase
        .from('push_subscriptions')
        .insert([{
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_agent: navigator.userAgent,
          is_active: true,
        }]);

      if (error) {
        throw new Error(`Failed to save subscription: ${error.message}`);
      }
    }
  }

  /**
   * Remove subscription from database
   */
  private async removeSubscription(endpoint: string): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);

    if (error) {
      throw new Error(`Failed to remove subscription: ${error.message}`);
    }
  }

  /**
   * Get user's active push subscriptions
   */
  async getUserSubscriptions(): Promise<PushSubscriptionRecord[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get subscriptions: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Clean up inactive subscriptions
   */
  async cleanupInactiveSubscriptions(): Promise<number> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return 0;
    }

    // Remove subscriptions older than 30 days that are inactive
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const { data, error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('is_active', false)
      .lt('updated_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      console.error('Error cleaning up subscriptions:', error);
      return 0;
    }

    return data?.length || 0;
  }

  // Utility methods

  /**
   * Convert URL-safe base64 string to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer | null): string {
    if (!buffer) return '';

    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Initialize push notifications (call on app load)
   */
  async initialize(): Promise<void> {
    if (!this.isSupported()) {
      console.log('Push notifications not supported');
      return;
    }

    try {
      // Register service worker
      await navigator.serviceWorker.register(this.serviceWorkerPath);

      // Check if already subscribed
      const currentSubscription = await this.getCurrentSubscription();

      if (currentSubscription && this.getPermissionStatus() === 'granted') {
        // Ensure subscription is saved in database
        await this.saveSubscription(currentSubscription);
      }

      // Clean up old subscriptions
      await this.cleanupInactiveSubscriptions();

      console.log('Push notification service initialized');
    } catch (error) {
      console.error('Push notification initialization error:', error);
    }
  }
}

// Export singleton instance
export const pushService = new PushNotificationService();

// Export types
export type {
  PushNotificationPayload,
  PushSubscriptionRecord,
};