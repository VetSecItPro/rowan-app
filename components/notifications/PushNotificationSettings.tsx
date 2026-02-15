'use client';

/**
 * Push Notification Settings Component
 *
 * Allows users to manage their push notification preferences.
 * Shows registration status and provides enable/disable controls.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellOff,
  Smartphone,
  Check,
  AlertCircle,
  Loader2,
  Settings,
  MapPin,
  MessageCircle,
  CheckSquare,
  Calendar,
  Target,
} from 'lucide-react';
import { usePushNotifications, usePushStatus } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

interface PushNotificationSettingsProps {
  spaceId: string;
  className?: string;
}

interface NotificationCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
}

/** Renders push notification preference controls for each notification type. */
export function PushNotificationSettings({ spaceId, className }: PushNotificationSettingsProps) {
  const {
    isAvailable,
    isPermissionGranted,
    isRegistered,
    isLoading,
    error,
    register,
    unregister,
  } = usePushNotifications({ spaceId });

  const { isNativeApp } = usePushStatus();

  // Notification category preferences (would be stored in user settings)
  const [categories, setCategories] = useState<NotificationCategory[]>([
    {
      id: 'location',
      name: 'Location Updates',
      description: 'Family arrivals and departures',
      icon: MapPin,
      enabled: true,
    },
    {
      id: 'messages',
      name: 'Messages',
      description: 'New messages from family',
      icon: MessageCircle,
      enabled: true,
    },
    {
      id: 'tasks',
      name: 'Tasks & Chores',
      description: 'Assignments, reminders, and due dates',
      icon: CheckSquare,
      enabled: true,
    },
    {
      id: 'calendar',
      name: 'Calendar Events',
      description: 'Event reminders and updates',
      icon: Calendar,
      enabled: true,
    },
    {
      id: 'goals',
      name: 'Goals & Milestones',
      description: 'Progress updates and achievements',
      icon: Target,
      enabled: true,
    },
  ]);

  const handleToggle = async () => {
    if (isRegistered) {
      await unregister();
    } else {
      await register();
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId ? { ...cat, enabled: !cat.enabled } : cat
      )
    );
    // TODO: Save to user preferences in database
  };

  // Not available on this platform
  if (!isAvailable) {
    return (
      <div className={cn('rounded-xl border border-gray-700 bg-gray-800 p-6', className)}>
        <div className="flex items-center gap-3 text-gray-400">
          <BellOff className="w-5 h-5" />
          <div>
            <p className="font-medium">Push Notifications Unavailable</p>
            <p className="text-sm">
              {isNativeApp
                ? 'Push notifications are not supported on this device.'
                : 'Download the Rowan mobile app to receive push notifications.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-gray-700 bg-gray-800 overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-700">
        <div className="w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center">
          <Bell className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white">Push Notifications</h3>
          <p className="text-sm text-gray-400">
            {isRegistered ? 'Notifications enabled' : 'Enable to stay updated'}
          </p>
        </div>
      </div>

      {/* Main Toggle */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium text-white">
                {isRegistered ? 'Notifications On' : 'Enable Notifications'}
              </p>
              <p className="text-sm text-gray-400">
                {isRegistered
                  ? 'You\'ll receive alerts for family activity'
                  : 'Get notified about family updates'}
              </p>
            </div>
          </div>

          <button
            onClick={handleToggle}
            disabled={isLoading}
            className={cn(
              'relative w-14 h-7 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500',
              isRegistered ? 'bg-blue-500' : 'bg-gray-600',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform flex items-center justify-center',
                isRegistered && 'translate-x-7'
              )}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              ) : isRegistered ? (
                <Check className="w-4 h-4 text-blue-500" />
              ) : null}
            </span>
          </button>
        </div>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 flex items-center gap-2 text-red-400 text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Category Settings (only show when registered) */}
      <AnimatePresence>
        {isRegistered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-4 h-4 text-gray-400" />
                <h4 className="text-sm font-medium text-gray-300">
                  Notification Categories
                </h4>
              </div>

              <div className="space-y-3">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {category.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {category.description}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleCategoryToggle(category.id)}
                        className={cn(
                          'relative w-10 h-5 rounded-full transition-colors',
                          category.enabled ? 'bg-blue-500' : 'bg-gray-600'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                            category.enabled && 'translate-x-5'
                          )}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Permission Info */}
      {!isRegistered && !isPermissionGranted && (
        <div className="p-4 bg-amber-900/20 border-t border-amber-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-300">
              When you enable notifications, you&apos;ll be asked to allow Rowan to send you alerts.
              You can change this anytime in your device settings.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for embedding in other settings pages
 */
export function PushNotificationToggle({ spaceId }: { spaceId: string }) {
  const { isAvailable, isRegistered, isLoading, register, unregister } =
    usePushNotifications({ spaceId });

  if (!isAvailable) {
    return null;
  }

  const handleToggle = async () => {
    if (isRegistered) {
      await unregister();
    } else {
      await register();
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Bell className="w-5 h-5 text-gray-400" />
        <span className="text-white">Push Notifications</span>
      </div>
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={cn(
          'relative w-12 h-6 rounded-full transition-colors',
          isRegistered ? 'bg-blue-500' : 'bg-gray-600',
          isLoading && 'opacity-50'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
            isRegistered && 'translate-x-6'
          )}
        />
      </button>
    </div>
  );
}
