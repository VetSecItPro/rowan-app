'use client';

import { Fragment, useEffect, useState } from 'react';
import { Transition } from '@headlessui/react';
import { Trophy, Star, Sparkles, X } from 'lucide-react';
import { AchievementBadge, UserAchievement } from '@/lib/services/achievement-badges-service';
import { cn } from '@/lib/utils';

interface AchievementNotificationProps {
  achievement: UserAchievement & { badge: AchievementBadge };
  isVisible: boolean;
  onClose: () => void;
  duration?: number; // Auto-close duration in ms
}

/** Displays a toast notification when a user earns a new achievement. */
export function AchievementNotification({
  achievement,
  isVisible,
  onClose,
  duration = 5000
}: AchievementNotificationProps) {
  useEffect(() => {
    if (isVisible) {
      // Auto-close after duration
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const getRarityStyles = (rarity: string) => {
    const styles = {
      common: {
        gradient: 'from-gray-400 to-gray-600',
        glow: 'shadow-gray-400/50',
        text: 'text-gray-200'
      },
      uncommon: {
        gradient: 'from-green-400 to-green-600',
        glow: 'shadow-green-400/50',
        text: 'text-green-200'
      },
      rare: {
        gradient: 'from-blue-400 to-blue-600',
        glow: 'shadow-blue-400/50',
        text: 'text-blue-200'
      },
      epic: {
        gradient: 'from-purple-400 to-purple-600',
        glow: 'shadow-purple-400/50',
        text: 'text-purple-200'
      },
      legendary: {
        gradient: 'from-orange-400 via-yellow-400 to-orange-600',
        glow: 'shadow-orange-400/50',
        text: 'text-orange-200'
      }
    };
    return styles[rarity as keyof typeof styles] || styles.common;
  };

  const rarityStyles = getRarityStyles(achievement.badge.rarity);

  return (
    <Transition
      appear
      show={isVisible}
      as={Fragment}
      enter="transform transition duration-300 ease-out"
      enterFrom="translate-y-full opacity-0 scale-95"
      enterTo="translate-y-0 opacity-100 scale-100"
      leave="transform transition duration-300 ease-in"
      leaveFrom="translate-y-0 opacity-100 scale-100"
      leaveTo="translate-y-full opacity-0 scale-95"
    >
      <div className="fixed bottom-4 right-4 z-50 max-w-sm">
        <div className={cn(
          'relative bg-gray-800 border-2 rounded-xl p-4 shadow-2xl',
          `border-transparent bg-gradient-to-r ${rarityStyles.gradient}`,
          rarityStyles.glow
        )}>
          {/* Background overlay for content readability */}
          <div className="absolute inset-1 bg-gray-800 rounded-lg" />

          {/* Content */}
          <div className="relative z-10">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-0 right-0 -mt-1 -mr-1 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
              aria-label="Close"
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>

            {/* Header */}
            <div className="flex items-center space-x-2 mb-3">
              <div className={cn(
                'w-8 h-8 rounded-full bg-gradient-to-r flex items-center justify-center',
                rarityStyles.gradient,
                rarityStyles.glow
              )}>
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">
                  Achievement Unlocked!
                </h3>
                <p className="text-xs text-gray-400">
                  {achievement.badge.points} points earned
                </p>
              </div>
            </div>

            {/* Badge Info */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className={cn(
                  'w-10 h-10 rounded-lg bg-gradient-to-r flex items-center justify-center',
                  rarityStyles.gradient
                )}>
                  <Star className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white truncate">
                    {achievement.badge.name}
                  </h4>
                  <p className="text-sm text-gray-400 line-clamp-2">
                    {achievement.badge.description}
                  </p>
                </div>
              </div>

              {/* Rarity */}
              <div className="flex items-center justify-between">
                <span className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium capitalize',
                  `bg-gradient-to-r ${rarityStyles.gradient} text-white`
                )}>
                  {achievement.badge.rarity}
                </span>
                <div className="flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-yellow-500" />
                  <span className="text-xs font-medium text-yellow-600">
                    +{achievement.badge.points} pts
                  </span>
                </div>
              </div>
            </div>

            {/* Celebration effects for high-rarity badges */}
            {(achievement.badge.rarity === 'epic' || achievement.badge.rarity === 'legendary') && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-2 left-2 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
                <div className="absolute top-4 right-3 w-1 h-1 bg-yellow-300 rounded-full animate-pulse delay-75" />
                <div className="absolute bottom-3 left-4 w-1.5 h-1.5 bg-yellow-500 rounded-full animate-ping delay-150" />
                <div className="absolute bottom-2 right-2 w-1 h-1 bg-yellow-400 rounded-full animate-pulse delay-300" />
              </div>
            )}
          </div>
        </div>
      </div>
    </Transition>
  );
}

// Hook for managing achievement notifications
export function useAchievementNotifications() {
  const [notifications, setNotifications] = useState<Array<UserAchievement & { badge: AchievementBadge }>>([]);

  const showNotification = (achievement: UserAchievement & { badge: AchievementBadge }) => {
    setNotifications(prev => [...prev, achievement]);
  };

  const hideNotification = (achievementId: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== achievementId));
  };

  return {
    notifications,
    showNotification,
    hideNotification
  };
}
