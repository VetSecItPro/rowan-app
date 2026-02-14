'use client';

import { useState, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  subscribeToNotifications,
  type Notification,
} from '@/lib/services/milestone-notification-service';
import { formatDistanceToNow } from 'date-fns';

/** Displays a notification bell icon with unread count badge in the header. */
export default function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserAndNotifications();
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to new notifications
    const channel = subscribeToNotifications(userId, (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icon-192.png',
        });
      }
    });

    return () => {
      const supabase = createClient();
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadUserAndNotifications = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        logger.warn('Auth error loading user:', { component: 'NotificationBell', error: userError });
        return;
      }

      if (user) {
        setUserId(user.id);
        try {
          const [notifs, count] = await Promise.all([
            getUserNotifications(user.id, 20),
            getUnreadNotificationCount(user.id),
          ]);
          setNotifications(notifs);
          setUnreadCount(count);
        } catch (notificationError) {
          logger.warn('Error loading notifications:', { component: 'NotificationBell', error: notificationError });
          // Set empty state instead of crashing
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    } catch (error) {
      logger.warn('Error in loadUserAndNotifications:', { component: 'NotificationBell', error: error });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      logger.error('Error marking notification as read:', error, { component: 'NotificationBell', action: 'component_action' });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userId) return;
    try {
      await markAllNotificationsAsRead(userId);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      logger.error('Error marking all as read:', error, { component: 'NotificationBell', action: 'component_action' });
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      const notification = notifications.find((n) => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      logger.error('Error deleting notification:', error, { component: 'NotificationBell', action: 'component_action' });
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification.id);
    if (notification.link) {
      // SECURITY: Validate URL is internal path only to prevent open redirect
      if (!notification.link.startsWith('/')) {
        logger.warn('Rejected external redirect from notification', {
          component: 'NotificationBell',
          action: 'open_redirect_blocked',
        });
        return;
      }
      router.push(notification.link);
      setIsOpen(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'goal_milestone':
        return '🎉';
      case 'task':
        return '✓';
      case 'reminder':
        return '⏰';
      case 'message':
        return '💬';
      default:
        return '📢';
    }
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-800 transition-colors"
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5 text-gray-400" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Notification Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 z-50 max-h-[600px] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1 text-sm text-blue-400 hover:underline"
                >
                  <CheckCheck className="w-4 h-4" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-400">
                  Loading...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">
                    No notifications yet
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-700/50 transition-colors ${
                        !notification.read ? 'bg-blue-900/10' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <span className="text-2xl flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </span>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div
                            onClick={() => handleNotificationClick(notification)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNotificationClick(notification); } }}
                            role="button"
                            tabIndex={0}
                            className="cursor-pointer"
                          >
                            <h4 className="text-sm font-semibold text-white mb-1">
                              {notification.title}
                            </h4>
                            <p className="text-sm text-gray-400 mb-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-2">
                            {notification.link && (
                              <button
                                onClick={() => handleNotificationClick(notification)}
                                className="flex items-center gap-1 text-xs text-blue-400 hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                View
                              </button>
                            )}
                            {!notification.read && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="text-xs text-gray-400 hover:underline"
                              >
                                Mark read
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(notification.id)}
                              className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
                              aria-label={`Delete notification: ${notification.title}`}
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
