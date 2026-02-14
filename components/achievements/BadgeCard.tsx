'use client';

import { useState } from 'react';
import { Badge, Lock, Star, Trophy, Crown, Gem, type LucideIcon } from 'lucide-react';
import { AchievementBadge, UserAchievement, BadgeRarity } from '@/lib/services/achievement-badges-service';
import { cn } from '@/lib/utils';

interface BadgeCardProps {
  badge: AchievementBadge;
  userAchievement?: UserAchievement;
  progress?: {
    current: number;
    target: number;
    percentage: number;
  };
  onClick?: () => void;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
}

const rarityIcons: Record<BadgeRarity, LucideIcon> = {
  common: Badge,
  uncommon: Star,
  rare: Trophy,
  epic: Crown,
  legendary: Gem,
};

const rarityColors = {
  common: {
    bg: 'bg-gray-800',
    border: 'border-gray-600',
    icon: 'text-gray-400',
    glow: 'shadow-gray-800/50'
  },
  uncommon: {
    bg: 'bg-green-900/20',
    border: 'border-green-600',
    icon: 'text-green-400',
    glow: 'shadow-green-800/50'
  },
  rare: {
    bg: 'bg-blue-900/20',
    border: 'border-blue-600',
    icon: 'text-blue-400',
    glow: 'shadow-blue-800/50'
  },
  epic: {
    bg: 'bg-purple-900/20',
    border: 'border-purple-600',
    icon: 'text-purple-400',
    glow: 'shadow-purple-800/50'
  },
  legendary: {
    bg: 'bg-orange-900/20',
    border: 'border-orange-600',
    icon: 'text-orange-400',
    glow: 'shadow-orange-800/50'
  }
} as const;

const getRarityColors = (rarity: BadgeRarity) => rarityColors[rarity] || rarityColors.common;

/** Renders an individual achievement badge with its icon, title, and unlock status. */
export function BadgeCard({
  badge,
  userAchievement,
  progress,
  onClick,
  className,
  size = 'medium',
  showProgress = true
}: BadgeCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isEarned = !!userAchievement;
  const isLocked = badge.is_secret && !isEarned;

  const sizeClasses = {
    small: 'p-3',
    medium: 'p-4',
    large: 'p-6'
  };

  const iconSizes = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  const colors = getRarityColors(badge.rarity);
  const RarityIcon = rarityIcons[badge.rarity] || Badge;

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 transition-all duration-300 cursor-pointer group',
        sizeClasses[size],
        colors.bg,
        colors.border,
        isEarned
          ? `${colors.glow} shadow-lg hover:shadow-xl transform hover:scale-105`
          : 'opacity-60 hover:opacity-80',
        isLocked && 'grayscale',
        className
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Earned indicator */}
      {isEarned && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
          <Trophy className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Lock indicator for secret badges */}
      {isLocked && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
          <Lock className="w-3 h-3 text-white" />
        </div>
      )}

      <div className="flex flex-col items-center space-y-2 text-center">
        {/* Badge Icon */}
        <div className={cn(
          'rounded-full flex items-center justify-center',
          colors.bg,
          iconSizes[size]
        )}>
          <RarityIcon className={cn('w-2/3 h-2/3', colors.icon)} />
        </div>

        {/* Badge Details */}
        <div className="space-y-1">
          <h3 className={cn(
            'font-bold text-white',
            size === 'small' ? 'text-sm' : size === 'medium' ? 'text-base' : 'text-lg'
          )}>
            {isLocked ? '???' : badge.name}
          </h3>

          <p className={cn(
            'text-gray-400',
            size === 'small' ? 'text-xs' : 'text-sm'
          )}>
            {isLocked ? 'Secret Badge' : badge.description}
          </p>

          {/* Rarity and Points */}
          <div className="flex items-center justify-center space-x-2">
            <span className={cn(
              'px-2 py-1 rounded-full text-xs font-medium capitalize',
              colors.bg,
              colors.icon
            )}>
              {badge.rarity}
            </span>
            {!isLocked && (
              <span className="text-xs font-medium text-yellow-400">
                {badge.points}pts
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {showProgress && progress && !isEarned && !isLocked && (
          <div className="w-full space-y-1">
            <div className="flex justify-between text-xs text-gray-400">
              <span>{progress.current}</span>
              <span>{progress.target}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={cn(
                  'h-2 rounded-full transition-all duration-500',
                  `bg-${badge.color}-500`
                )}
                style={{ width: `${Math.min(progress.percentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Earned Date */}
        {isEarned && userAchievement && size !== 'small' && (
          <div className="text-xs text-gray-400">
            Earned {new Date(userAchievement.earned_at).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Hover effect overlay */}
      {isHovered && isEarned && (
        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-black/20 rounded-xl" />
      )}
    </div>
  );
}
