'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Trophy, Calendar, Users, Target, Star, Award } from 'lucide-react';
import {
  AchievementBadge,
  UserAchievement,
  AchievementProgress,
  getBadgeRarityColor
} from '@/lib/services/achievement-badges-service';
import { cn } from '@/lib/utils';

interface BadgeModalProps {
  badge: AchievementBadge;
  userAchievement?: UserAchievement;
  progress?: AchievementProgress;
  isOpen: boolean;
  onClose: () => void;
}

export function BadgeModal({
  badge,
  userAchievement,
  progress,
  isOpen,
  onClose
}: BadgeModalProps) {
  const isEarned = !!userAchievement;
  const isLocked = badge.is_secret && !isEarned;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'goals': return Target;
      case 'milestones': return Award;
      case 'streaks': return Star;
      case 'social': return Users;
      case 'special': return Trophy;
      case 'seasonal': return Calendar;
      default: return Award;
    }
  };

  const CategoryIcon = getCategoryIcon(badge.category);

  const getRarityDisplayInfo = (rarity: string) => {
    const info = {
      common: { label: 'Common', color: 'text-gray-600', bg: 'bg-gray-100' },
      uncommon: { label: 'Uncommon', color: 'text-green-600', bg: 'bg-green-100' },
      rare: { label: 'Rare', color: 'text-blue-600', bg: 'bg-blue-100' },
      epic: { label: 'Epic', color: 'text-purple-600', bg: 'bg-purple-100' },
      legendary: { label: 'Legendary', color: 'text-orange-600', bg: 'bg-orange-100' }
    };
    return info[rarity as keyof typeof info] || info.common;
  };

  const rarityInfo = getRarityDisplayInfo(badge.rarity);

  const formatCriteria = () => {
    const criteria = badge.criteria;
    switch (criteria.type) {
      case 'goals_completed':
        return `Complete ${criteria.count} goal${criteria.count !== 1 ? 's' : ''}`;
      case 'milestones_completed':
        return `Complete ${criteria.count} milestone${criteria.count !== 1 ? 's' : ''}`;
      case 'goal_streak':
        return `Maintain a ${criteria.days}-day goal completion streak`;
      case 'collaborative_goal':
        return 'Complete a goal with team members';
      case 'early_adopter':
        return 'Join during the beta period';
      case 'new_year_goal':
        return 'Set a goal in January';
      default:
        return badge.description;
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="absolute top-14 left-0 right-0 bottom-0 sm:relative sm:inset-auto sm:top-auto sm:flex sm:min-h-full sm:items-center sm:justify-center text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full sm:max-w-md transform overflow-hidden sm:rounded-2xl bg-gray-800 text-left align-middle shadow-xl transition-all h-full sm:h-auto flex flex-col">
                {/* Header */}
                <div className="flex-shrink-0 flex justify-between items-start p-4 sm:p-6 border-b border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center',
                      rarityInfo.bg
                    )}>
                      <CategoryIcon className={cn('w-6 h-6', rarityInfo.color)} />
                    </div>
                    <div>
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-bold leading-6 text-white"
                      >
                        {isLocked ? '???' : badge.name}
                      </Dialog.Title>
                      <p className="text-sm text-gray-400 capitalize">
                        {badge.category} Badge
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {/* Badge Status */}
                {isEarned && (
                  <div className="mb-6 p-4 bg-green-900/20 border border-green-800 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Trophy className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-200">
                        Badge Earned!
                      </span>
                    </div>
                    {userAchievement && (
                      <p className="text-sm text-green-300 mt-1">
                        Earned on {new Date(userAchievement.earned_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    )}
                  </div>
                )}

                {/* Badge Description */}
                <div className="mb-6">
                  <h4 className="font-medium text-white mb-2">Description</h4>
                  <p className="text-gray-400">
                    {isLocked ? 'This is a secret badge. Complete certain actions to reveal and earn it!' : badge.description}
                  </p>
                </div>

                {/* Requirements */}
                {!isLocked && (
                  <div className="mb-6">
                    <h4 className="font-medium text-white mb-2">Requirements</h4>
                    <p className="text-gray-400">
                      {formatCriteria()}
                    </p>
                  </div>
                )}

                {/* Progress */}
                {progress && !isEarned && !isLocked && (
                  <div className="mb-6">
                    <h4 className="font-medium text-white mb-2">Progress</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-400">
                        <span>{progress.current_progress} / {progress.target_progress}</span>
                        <span>{Math.round((progress.current_progress / progress.target_progress) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={cn(
                            'h-2 rounded-full transition-all duration-500',
                            `bg-${badge.color}-500`
                          )}
                          style={{
                            width: `${Math.min((progress.current_progress / progress.target_progress) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Badge Details */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-3 bg-gray-700 rounded-lg">
                    <div className="text-lg font-bold text-white">
                      {isLocked ? '?' : badge.points}
                    </div>
                    <div className="text-sm text-gray-400">Points</div>
                  </div>
                  <div className="text-center p-3 bg-gray-700 rounded-lg">
                    <div className={cn('text-lg font-bold capitalize', rarityInfo.color)}>
                      {badge.rarity}
                    </div>
                    <div className="text-sm text-gray-400">Rarity</div>
                  </div>
                </div>

                {/* Additional Info */}
                {userAchievement?.progress_data && (
                  <div className="mb-6">
                    <h4 className="font-medium text-white mb-2">Achievement Details</h4>
                    <div className="text-sm text-gray-400 space-y-1">
                      {userAchievement.progress_data.trigger && (
                        <p>Trigger: {userAchievement.progress_data.trigger}</p>
                      )}
                      {userAchievement.progress_data.context && (
                        <p>Context: {userAchievement.progress_data.context}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Close Button */}
                <div className="flex justify-end">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}