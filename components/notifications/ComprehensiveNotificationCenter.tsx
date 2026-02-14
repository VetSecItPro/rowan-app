'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Bell, Check, Trash2, X, Filter, CheckCircle2, DollarSign } from 'lucide-react';
import { logger } from '@/lib/logger';
import {
  inAppNotificationsService,
  type InAppNotification,
  type NotificationType,
  type NotificationFilters
} from '@/lib/services/in-app-notifications-service';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { billsService } from '@/lib/services/bills-service';
import { showError } from '@/lib/utils/toast';

interface ComprehensiveNotificationCenterProps {
  userId: string;
  spaceId?: string;
}

/** Renders a full notification center with categorized notification feeds. */
export function ComprehensiveNotificationCenter({ userId, spaceId }: ComprehensiveNotificationCenterProps) {
  void spaceId;
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  type NotificationFilter = 'all' | 'unread' | NotificationType;
  const [selectedFilter, setSelectedFilter] = useState<NotificationFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);

      const filters: NotificationFilters = {
        limit: 50,
      };

      if (selectedFilter === 'unread') {
        filters.is_read = false;
      } else if (selectedFilter !== 'all') {
        filters.type = selectedFilter as NotificationType;
      }

      const data = await inAppNotificationsService.getUserNotifications(userId, filters);
      setNotifications(data);

      const count = await inAppNotificationsService.getUnreadCount(userId);
      setUnreadCount(count);
    } catch (error) {
      logger.error('Error fetching notifications:', error, { component: 'ComprehensiveNotificationCenter', action: 'component_action' });
    } finally {
      setLoading(false);
    }
  }, [selectedFilter, userId]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('in_app_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'in_app_notifications',
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
  }, [fetchNotifications, supabase, userId]);

  // Mark as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const success = await inAppNotificationsService.markAsRead(notificationId);
      if (success) {
        await fetchNotifications();
      }
    } catch (error) {
      logger.error('Error marking notification as read:', error, { component: 'ComprehensiveNotificationCenter', action: 'component_action' });
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      const success = await inAppNotificationsService.markAllAsRead(userId);
      if (success) {
        await fetchNotifications();
      }
    } catch (error) {
      logger.error('Error marking all notifications as read:', error, { component: 'ComprehensiveNotificationCenter', action: 'component_action' });
    }
  };

  // Delete notification
  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const success = await inAppNotificationsService.deleteNotification(notificationId);
      if (success) {
        await fetchNotifications();
      }
    } catch (error) {
      logger.error('Error deleting notification:', error, { component: 'ComprehensiveNotificationCenter', action: 'component_action' });
    }
  };

  // Mark bill as paid from notification
  const handleMarkBillPaid = async (notification: InAppNotification) => {
    // Get bill ID from related_item_id or metadata
    const rawBillId = notification.related_item_id || notification.metadata?.billId;
    if (!rawBillId || typeof rawBillId === 'boolean') {
      logger.error('No bill ID found in notification', undefined, { component: 'ComprehensiveNotificationCenter', action: 'component_action' });
      return;
    }
    const billId = String(rawBillId);

    try {
      await billsService.markBillAsPaid(billId);
      // Mark the notification as read after action
      if (!notification.is_read) {
        await handleMarkAsRead(notification.id);
      }
      // Refresh notifications
      await fetchNotifications();
    } catch (error) {
      logger.error('Error marking bill as paid:', error, { component: 'ComprehensiveNotificationCenter', action: 'component_action' });
      showError('Failed to mark bill as paid. Please try again.');
    }
  };

  // Navigate to notification target
  const handleNotificationClick = async (notification: InAppNotification) => {
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }

    setIsOpen(false);

    if (notification.action_url) {
      // SECURITY: Validate URL is internal path only to prevent open redirect
      if (!notification.action_url.startsWith('/')) {
        logger.warn('Rejected external redirect from notification', {
          component: 'ComprehensiveNotificationCenter',
          action: 'open_redirect_blocked',
        });
        router.push('/dashboard');
        return;
      }
      router.push(notification.action_url);
    } else {
      // Default navigation based on type
      switch (notification.type) {
        case 'task':
          router.push('/tasks');
          break;
        case 'event':
          router.push('/calendar');
          break;
        case 'message':
          router.push('/messages');
          break;
        case 'shopping':
          router.push('/shopping');
          break;
        case 'meal':
          router.push('/meals');
          break;
        case 'reminder':
          router.push('/reminders');
          break;
        case 'goal_update':
        case 'milestone':
          router.push('/goals');
          break;
        case 'expense':
        case 'bill_due':
          router.push('/budget');
          break;
        case 'space_invite':
          router.push('/spaces');
          break;
        default:
          router.push('/dashboard');
      }
    }
  };

  // Filter options
  const filterOptions: Array<{ value: NotificationFilter; label: string; icon?: string; count?: number }> = [
    { value: 'all', label: 'All', count: notifications.length },
    { value: 'unread', label: 'Unread', count: unreadCount },
    { value: 'task', label: 'Tasks', icon: '✅' },
    { value: 'event', label: 'Events', icon: '📅' },
    { value: 'message', label: 'Messages', icon: '💬' },
    { value: 'shopping', label: 'Shopping', icon: '🛒' },
    { value: 'meal', label: 'Meals', icon: '🍽️' },
    { value: 'reminder', label: 'Reminders', icon: '📝' },
    { value: 'milestone', label: 'Goals', icon: '🎯' },
    { value: 'expense', label: 'Budget', icon: '💰' },
  ];

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:bg-gray-800 rounded-lg transition-colors active:scale-95"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
            {unreadCount > 99 ? '99+' : unreadCount}
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
            aria-hidden="true"
          />

          {/* Panel with Glassmorphism */}
          <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-gray-800/95 border border-gray-700/50 rounded-xl shadow-2xl z-50 max-h-[600px] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-white">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-semibold rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-1.5 hover:bg-gray-700 rounded transition-colors ${
                    showFilters ? 'bg-gray-700' : ''
                  }`}
                  aria-label="Filter notifications"
                >
                  <Filter className="w-4 h-4" />
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                    aria-label="Mark all as read"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                  aria-label="Close notifications"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="p-3 border-b border-gray-700/50 bg-gray-700/30">
                <div className="flex flex-wrap gap-2">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSelectedFilter(option.value);
                        setShowFilters(false);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        selectedFilter === option.value
                          ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {option.icon && <span>{option.icon}</span>}
                      <span>{option.label}</span>
                      {option.count !== undefined && (
                        <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                          selectedFilter === option.value
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-600 text-gray-300'
                        }`}>
                          {option.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-8 text-center text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                    Loading notifications...
                  </div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                  <p className="text-gray-400 font-medium mb-1">
                    {selectedFilter === 'unread' ? 'No unread notifications' : 'No notifications'}
                  </p>
                  <p className="text-sm text-gray-400">
                    {selectedFilter === 'unread'
                      ? "You're all caught up!"
                      : "We'll notify you when something happens"
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                      onMarkAsRead={() => handleMarkAsRead(notification.id)}
                      onDelete={() => handleDeleteNotification(notification.id)}
                      onMarkBillPaid={
                        notification.type === 'bill_due' &&
                        (notification.related_item_id || notification.metadata?.billId)
                          ? () => handleMarkBillPaid(notification)
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-700/50 text-center">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/notifications');
                  }}
                  className="text-sm bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent hover:from-pink-700 hover:to-purple-700 font-medium active:opacity-80"
                >
                  View all notifications →
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
  notification: InAppNotification;
  onClick: () => void;
  onMarkAsRead: () => void;
  onDelete: () => void;
  onMarkBillPaid?: () => void;
}

function NotificationItem({ notification, onClick, onMarkAsRead, onDelete, onMarkBillPaid }: NotificationItemProps) {
  const icon = inAppNotificationsService.getNotificationIcon(notification.type);
  const color = inAppNotificationsService.getNotificationColor(notification.type);
  const priorityColor = inAppNotificationsService.getPriorityColor(notification.priority);
  const timeAgo = inAppNotificationsService.formatRelativeTime(notification.created_at);

  const typeColors: Record<string, string> = {
    blue: 'bg-blue-900/30 text-blue-400',
    purple: 'bg-purple-900/30 text-purple-400',
    green: 'bg-green-900/30 text-green-400',
    emerald: 'bg-emerald-900/30 text-emerald-400',
    orange: 'bg-orange-900/30 text-orange-400',
    pink: 'bg-pink-900/30 text-pink-400',
    indigo: 'bg-indigo-900/30 text-indigo-400',
    amber: 'bg-amber-900/30 text-amber-400',
    red: 'bg-red-900/30 text-red-400',
    cyan: 'bg-cyan-900/30 text-cyan-400',
    gray: 'bg-gray-700 text-gray-400',
  };

  return (
    <div
      className={`p-4 hover:bg-gray-700/50 transition-colors cursor-pointer relative group ${
        !notification.is_read ? 'bg-gradient-to-r from-pink-900/10 to-purple-900/10' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
          typeColors[color] || typeColors.gray
        }`}>
          <span className="text-lg">{notification.emoji || icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <p className={`text-sm ${
              !notification.is_read
                ? 'font-semibold text-white'
                : 'font-medium text-gray-300'
            }`}>
              {notification.title}
            </p>
            {notification.priority !== 'normal' && (
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ml-2 ${priorityColor}`} />
            )}
          </div>

          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
            {notification.content}
          </p>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-400">
                {timeAgo}
              </p>
              {notification.space_name && (
                <>
                  <span className="text-xs text-gray-400">•</span>
                  <p className="text-xs text-gray-400">
                    📍 {notification.space_name}
                  </p>
                </>
              )}
              {notification.sender_name && (
                <>
                  <span className="text-xs text-gray-400">•</span>
                  <p className="text-xs text-gray-400">
                    👤 {notification.sender_name}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Quick Pay for Bill Notifications */}
          {onMarkBillPaid && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkBillPaid();
              }}
              className="p-1.5 hover:bg-green-900/20 rounded-full transition-colors"
              aria-label="Mark bill as paid"
              title="Mark bill as paid"
            >
              <DollarSign className="w-3.5 h-3.5 text-green-400" />
            </button>
          )}
          {!notification.is_read && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead();
              }}
              className="p-1.5 hover:bg-gray-600 rounded-full transition-colors"
              aria-label="Mark as read"
            >
              <Check className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 hover:bg-red-900/20 rounded-full transition-colors"
            aria-label="Delete notification"
          >
            <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-400" />
          </button>
        </div>
      </div>

      {/* Unread indicator */}
      {!notification.is_read && (
        <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full" />
      )}
    </div>
  );
}
