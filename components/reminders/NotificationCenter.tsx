'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { reminderNotificationsService, ReminderNotification } from '@/lib/services/reminder-notifications-service';
import { formatRelativeTime } from '@/lib/utils/date-utils';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

interface NotificationCenterProps {
  userId: string;
}

export function NotificationCenter({ userId }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<ReminderNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await reminderNotificationsService.getUserNotifications(userId, {
        limit: 20,
      });
      setNotifications(data);

      const count = await reminderNotificationsService.getUnreadCount(userId);
      setUnreadCount(count);
    } catch (error) {
      logger.error('Error fetching notifications:', error, { component: 'NotificationCenter', action: 'component_action' });
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [userId]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('reminder_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reminder_notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Refresh notifications when changes occur
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Mark as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await reminderNotificationsService.markAsRead(notificationId);
      await fetchNotifications();
    } catch (error) {
      logger.error('Error marking notification as read:', error, { component: 'NotificationCenter', action: 'component_action' });
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await reminderNotificationsService.markAllAsRead(userId);
      await fetchNotifications();
    } catch (error) {
      logger.error('Error marking all notifications as read:', error, { component: 'NotificationCenter', action: 'component_action' });
    }
  };

  // Navigate to reminder
  const handleNotificationClick = async (notification: ReminderNotification) => {
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }
    setIsOpen(false);
    router.push('/reminders');
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors active:scale-95"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel with Glassmorphism */}
          <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-2xl z-50 max-h-[600px] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between backdrop-blur-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Notifications
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-sm text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 font-medium active:opacity-80"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors active:scale-95"
                  aria-label="Close notifications"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">
                    No notifications
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    We'll notify you when reminders are due
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                      onMarkAsRead={() => handleMarkAsRead(notification.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200/50 dark:border-gray-700/50 text-center backdrop-blur-md">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/reminders');
                  }}
                  className="text-sm text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 font-medium active:opacity-80"
                >
                  View all reminders →
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// =============================================
// NOTIFICATION ITEM COMPONENT
// =============================================

interface NotificationItemProps {
  notification: ReminderNotification;
  onClick: () => void;
  onMarkAsRead: () => void;
}

function NotificationItem({ notification, onClick, onMarkAsRead }: NotificationItemProps) {
  const iconName = reminderNotificationsService.getNotificationIcon(notification.type);
  const colorClasses = reminderNotificationsService.getNotificationColor(notification.type);
  const message = reminderNotificationsService.formatNotificationMessage(notification);

  return (
    <div
      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
        !notification.is_read ? 'bg-pink-50/50 dark:bg-pink-900/10' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          !notification.is_read ? 'bg-pink-100 dark:bg-pink-900/30' : 'bg-gray-100 dark:bg-gray-700'
        }`}>
          <span className="text-xl">{notification.reminder?.emoji || '🔔'}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${
            !notification.is_read
              ? 'font-semibold text-gray-900 dark:text-white'
              : 'text-gray-700 dark:text-gray-300'
          }`}>
            {message}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formatRelativeTime(notification.created_at)}
          </p>
        </div>

        {/* Mark as Read Button */}
        {!notification.is_read && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead();
            }}
            className="flex-shrink-0 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
            aria-label="Mark as read"
          >
            <Check className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
}
