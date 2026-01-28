'use client';

/**
 * Push Notification Provider
 *
 * Wraps the app to provide push notification functionality.
 * Handles in-app notification display and automatic registration.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Bell, MapPin, MessageCircle, CheckSquare, Calendar, Target, Gift } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { cn } from '@/lib/utils';

interface InAppNotification {
  id: string;
  title: string;
  body: string;
  type?: string;
  actionUrl?: string;
  timestamp: Date;
}

interface PushNotificationContextValue {
  /** Whether push is registered */
  isRegistered: boolean;
  /** Register for push notifications */
  register: () => Promise<boolean>;
  /** Show an in-app notification toast */
  showNotification: (notification: Omit<InAppNotification, 'id' | 'timestamp'>) => void;
  /** Dismiss a notification */
  dismissNotification: (id: string) => void;
}

const PushNotificationContext = createContext<PushNotificationContextValue | null>(null);

export function usePushContext() {
  const context = useContext(PushNotificationContext);
  if (!context) {
    throw new Error('usePushContext must be used within PushNotificationProvider');
  }
  return context;
}

interface PushNotificationProviderProps {
  children: ReactNode;
}

export function PushNotificationProvider({ children }: PushNotificationProviderProps) {
  const { currentSpace } = useAuthWithSpaces();
  const spaceId = currentSpace?.id || '';

  const [inAppNotifications, setInAppNotifications] = useState<InAppNotification[]>([]);

  const {
    isRegistered,
    register,
  } = usePushNotifications({
    spaceId,
    autoRegister: false, // Don't auto-register, let user opt-in
    onNotificationReceived: (notification) => {
      // Show in-app toast when notification received in foreground
      showNotification({
        title: notification.title || 'Notification',
        body: notification.body || '',
        type: notification.data?.type,
        actionUrl: notification.data?.actionUrl,
      });
    },
  });

  /**
   * Dismiss a notification
   */
  const dismissNotification = useCallback((id: string) => {
    setInAppNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  /**
   * Show an in-app notification toast
   */
  const showNotification = useCallback((notification: Omit<InAppNotification, 'id' | 'timestamp'>) => {
    const id = crypto.randomUUID();
    const newNotification: InAppNotification = {
      ...notification,
      id,
      timestamp: new Date(),
    };

    setInAppNotifications(prev => [...prev, newNotification]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      dismissNotification(id);
    }, 5000);
  }, [dismissNotification]);

  const value: PushNotificationContextValue = {
    isRegistered,
    register,
    showNotification,
    dismissNotification,
  };

  return (
    <PushNotificationContext.Provider value={value}>
      {children}

      {/* In-app notification toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {inAppNotifications.map((notification) => (
            <NotificationToast
              key={notification.id}
              notification={notification}
              onDismiss={() => dismissNotification(notification.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </PushNotificationContext.Provider>
  );
}

/**
 * Individual notification toast
 */
function NotificationToast({
  notification,
  onDismiss,
}: {
  notification: InAppNotification;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="pointer-events-auto bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-4 flex items-start gap-3"
    >
      <div className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
        getColorForType(notification.type)
      )}>
        <NotificationIcon type={notification.type} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-sm">
          {notification.title}
        </p>
        <p className="text-gray-400 text-sm mt-0.5 line-clamp-2">
          {notification.body}
        </p>
      </div>

      <button
        onClick={onDismiss}
        className="p-1 rounded-full hover:bg-gray-700 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </motion.div>
  );
}

/**
 * Icon component for notifications - declared outside render to avoid recreating
 */
function NotificationIcon({ type }: { type?: string }) {
  switch (type) {
    case 'location_arrival':
    case 'location_departure':
      return <MapPin className="w-5 h-5 text-white" />;
    case 'message_received':
      return <MessageCircle className="w-5 h-5 text-white" />;
    case 'task_assigned':
    case 'task_due_soon':
    case 'task_overdue':
    case 'chore_reminder':
      return <CheckSquare className="w-5 h-5 text-white" />;
    case 'event_reminder':
      return <Calendar className="w-5 h-5 text-white" />;
    case 'goal_milestone':
      return <Target className="w-5 h-5 text-white" />;
    case 'reward_earned':
      return <Gift className="w-5 h-5 text-white" />;
    default:
      return <Bell className="w-5 h-5 text-white" />;
  }
}

function getColorForType(type?: string): string {
  switch (type) {
    case 'location_arrival':
    case 'location_departure':
      return 'bg-cyan-500';
    case 'message_received':
      return 'bg-green-500';
    case 'task_assigned':
    case 'task_due_soon':
    case 'task_overdue':
    case 'chore_reminder':
      return 'bg-blue-500';
    case 'event_reminder':
      return 'bg-purple-500';
    case 'goal_milestone':
      return 'bg-indigo-500';
    case 'reward_earned':
      return 'bg-amber-500';
    default:
      return 'bg-gray-500';
  }
}
