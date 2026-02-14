'use client';

import { useState } from 'react';
import type { BadgeProgress } from '@/lib/types';
import type { AchievementBadge, UserBadge } from '@/lib/services/achievement-service';
import { format } from 'date-fns';

interface BadgeCardProps {
  badge: AchievementBadge;
  userBadge?: UserBadge;
  progress?: BadgeProgress;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
}

const rarityStyles = {
  common: {
    border: 'border-gray-600',
    bg: 'bg-gray-800/50',
    glow: '',
    text: 'text-gray-300',
  },
  uncommon: {
    border: 'border-green-600',
    bg: 'bg-green-900/20',
    glow: 'shadow-md shadow-green-500/20',
    text: 'text-green-300',
  },
  rare: {
    border: 'border-blue-600',
    bg: 'bg-blue-900/20',
    glow: 'shadow-lg shadow-blue-500/20',
    text: 'text-blue-300',
  },
  epic: {
    border: 'border-purple-600',
    bg: 'bg-purple-900/20',
    glow: 'shadow-lg shadow-purple-500/30',
    text: 'text-purple-300',
  },
  legendary: {
    border: 'border-amber-600',
    bg: 'bg-amber-900/20',
    glow: 'shadow-xl shadow-amber-500/40 animate-pulse',
    text: 'text-amber-300',
  },
};

const sizeStyles = {
  small: {
    container: 'p-3',
    icon: 'text-3xl',
    title: 'text-sm',
    description: 'text-xs',
  },
  medium: {
    container: 'p-4',
    icon: 'text-5xl',
    title: 'text-base',
    description: 'text-sm',
  },
  large: {
    container: 'p-6',
    icon: 'text-7xl',
    title: 'text-lg',
    description: 'text-base',
  },
};

/** Renders a goal achievement badge card with progress and unlock status. */
export default function BadgeCard({
  badge,
  userBadge,
  progress,
  size = 'medium',
  showProgress = true,
}: BadgeCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const isEarned = !!userBadge;
  const rarity = rarityStyles[badge.rarity];
  const sizing = sizeStyles[size];

  return (
    <div
      className={`
        relative rounded-lg border-2 transition-all duration-300
        ${rarity.border} ${rarity.bg} ${isEarned ? rarity.glow : ''}
        ${sizing.container}
        ${isEarned ? 'opacity-100' : 'opacity-60 hover:opacity-80'}
        ${showDetails ? 'ring-2 ring-offset-2 ring-offset-gray-900' : ''}
        cursor-pointer hover:scale-105
      `}
      onClick={() => setShowDetails(!showDetails)}
    >
      {/* Rarity indicator */}
      <div className="absolute top-2 right-2">
        <span
          className={`
            inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
            ${rarity.bg} ${rarity.text} ${rarity.border} border
          `}
        >
          {badge.rarity}
        </span>
      </div>

      {/* Badge icon */}
      <div className="flex justify-center mb-3">
        <div
          className={`
            ${sizing.icon}
            ${isEarned ? 'filter-none' : 'grayscale'}
            transition-all duration-300
          `}
        >
          {badge.icon}
        </div>
      </div>

      {/* Badge info */}
      <div className="text-center space-y-1">
        <h3
          className={`
            font-semibold ${sizing.title}
            ${isEarned ? 'text-white' : 'text-gray-400'}
          `}
        >
          {badge.name}
        </h3>

        <p
          className={`
            ${sizing.description}
            ${isEarned ? 'text-gray-300' : 'text-gray-400'}
          `}
        >
          {badge.description}
        </p>

        {/* Points */}
        <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
          <span>⭐</span>
          <span>{badge.points} points</span>
        </div>

        {/* Earned date */}
        {isEarned && userBadge && (
          <p className="text-xs text-green-400 font-medium mt-2">
            Earned {format(new Date(userBadge.earned_at), 'MMM d, yyyy')}
          </p>
        )}

        {/* Progress bar */}
        {!isEarned && showProgress && progress && progress.current > 0 && (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs text-gray-400">
              <span>
                {progress.current} / {progress.target}
              </span>
              <span>{Math.round(progress.percentage)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  badge.rarity === 'legendary'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-600'
                    : badge.rarity === 'epic'
                      ? 'bg-gradient-to-r from-purple-400 to-purple-600'
                      : badge.rarity === 'rare'
                        ? 'bg-gradient-to-r from-blue-400 to-blue-600'
                        : 'bg-gradient-to-r from-gray-400 to-gray-600'
                }`}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Locked indicator */}
      {!isEarned && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-4xl opacity-20">🔒</div>
        </div>
      )}

      {/* Detailed view */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="space-y-2 text-xs text-gray-400">
            <div>
              <span className="font-medium">Category:</span> {badge.category}
            </div>
            {progress && !isEarned && (
              <div>
                <span className="font-medium">Progress:</span> {progress.current} /{' '}
                {progress.target}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
