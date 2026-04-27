'use client';

/**
 * Push Notification Settings Component
 *
 * Allows users to manage their push notification preferences.
 * Shows registration status and provides enable/disable controls.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Bell,
  BellOff,
  Smartphone,
  Check,
  AlertCircle,
  Loader2,
  Settings,
  Clock,
  UserPlus,
  AtSign,
  MessageSquare,
} from 'lucide-react';
import { usePushNotifications, usePushStatus } from '@/hooks/usePushNotifications';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import {
  notificationPreferencesService,
  type NotificationPreferencesRow,
} from '@/lib/services/notification-preferences-service';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

interface PushNotificationSettingsProps {
  spaceId: string;
  className?: string;
}

type PushCategoryKey = 'push_due_reminders' | 'push_assignments' | 'push_mentions' | 'push_comments';

interface PushCategoryDef {
  key: PushCategoryKey;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PUSH_CATEGORIES: PushCategoryDef[] = [
  {
    key: 'push_due_reminders',
    name: 'Due Reminders',
    description: 'Tasks and events approaching their due date',
    icon: Clock,
  },
  {
    key: 'push_assignments',
    name: 'Assignments',
    description: "When you're assigned a task, chore, or shopping item",
    icon: UserPlus,
  },
  {
    key: 'push_mentions',
    name: 'Mentions',
    description: "When you're @-mentioned in a message or comment",
    icon: AtSign,
  },
  {
    key: 'push_comments',
    name: 'Comments & Replies',
    description: 'Replies on items you own or follow (off by default)',
    icon: MessageSquare,
  },
];

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
  const { user } = useAuthWithSpaces();

  const [prefs, setPrefs] = useState<NotificationPreferencesRow | null>(null);
  const [savingKey, setSavingKey] = useState<PushCategoryKey | null>(null);

  // Load preferences when user is known
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    notificationPreferencesService
      .getPreferences(user.id, spaceId)
      .then((row) => {
        if (!cancelled) setPrefs(row);
      })
      .catch((err) => {
        logger.error('Failed to load notification preferences', err, {
          component: 'PushNotificationSettings',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, spaceId]);

  const handleToggle = async () => {
    if (isRegistered) {
      await unregister();
    } else {
      await register();
    }
  };

  const handleCategoryToggle = async (key: PushCategoryKey) => {
    if (!prefs) return;
    const next = !prefs[key];
    const previous = prefs;
    setPrefs({ ...prefs, [key]: next });
    setSavingKey(key);
    try {
      await notificationPreferencesService.updatePreferences(prefs.id, { [key]: next });
    } catch (err) {
      setPrefs(previous);
      logger.error('Failed to save push preference', err, {
        component: 'PushNotificationSettings',
      });
      toast.error('Could not save preference. Please try again.');
    } finally {
      setSavingKey(null);
    }
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
                {!prefs ? (
                  <div className="flex items-center justify-center py-4 text-sm text-gray-400">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading preferences...
                  </div>
                ) : (
                  PUSH_CATEGORIES.map((category) => {
                    const Icon = category.icon;
                    const enabled = Boolean(prefs[category.key]);
                    const saving = savingKey === category.key;
                    return (
                      <div
                        key={category.key}
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
                          onClick={() => handleCategoryToggle(category.key)}
                          disabled={saving}
                          aria-pressed={enabled}
                          className={cn(
                            'relative w-10 h-5 rounded-full transition-colors',
                            enabled ? 'bg-blue-500' : 'bg-gray-600',
                            saving && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                              enabled && 'translate-x-5'
                            )}
                          />
                        </button>
                      </div>
                    );
                  })
                )}
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
