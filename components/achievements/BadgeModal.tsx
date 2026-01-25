'use client';

import { Trophy } from 'lucide-react';
import {
  AchievementBadge,
  UserAchievement,
  AchievementProgress,
} from '@/lib/services/achievement-badges-service';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';

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

  const getRarityDisplayInfo = (rarity: string) => {
    const info = {
      common: { label: 'Common', color: 'text-gray-400', bg: 'bg-gray-800', gradient: 'bg-gray-600' },
      uncommon: { label: 'Uncommon', color: 'text-green-400', bg: 'bg-green-900/20', gradient: 'bg-green-600' },
      rare: { label: 'Rare', color: 'text-blue-400', bg: 'bg-blue-900/20', gradient: 'bg-blue-600' },
      epic: { label: 'Epic', color: 'text-purple-400', bg: 'bg-purple-900/20', gradient: 'bg-purple-600' },
      legendary: { label: 'Legendary', color: 'text-orange-400', bg: 'bg-orange-900/20', gradient: 'bg-gradient-to-r from-orange-500 to-yellow-500' }
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

  const footerContent = (
    <button
      onClick={onClose}
      className="w-full px-6 py-3 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-colors font-medium"
    >
      Close
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isLocked ? '???' : badge.name}
      subtitle={`${badge.category} Badge`}
      maxWidth="md"
      headerGradient={rarityInfo.gradient}
      footer={footerContent}
    >
      <div className="space-y-6">
        {/* Badge Status */}
        {isEarned && (
          <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg">
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
        <div>
          <h4 className="font-medium text-white mb-2">Description</h4>
          <p className="text-gray-400">
            {isLocked ? 'This is a secret badge. Complete certain actions to reveal and earn it!' : badge.description}
          </p>
        </div>

        {/* Requirements */}
        {!isLocked && (
          <div>
            <h4 className="font-medium text-white mb-2">Requirements</h4>
            <p className="text-gray-400">
              {formatCriteria()}
            </p>
          </div>
        )}

        {/* Progress */}
        {progress && !isEarned && !isLocked && (
          <div>
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
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-800 rounded-lg">
            <div className="text-lg font-bold text-white">
              {isLocked ? '?' : badge.points}
            </div>
            <div className="text-sm text-gray-400">Points</div>
          </div>
          <div className="text-center p-3 bg-gray-800 rounded-lg">
            <div className={cn('text-lg font-bold capitalize', rarityInfo.color)}>
              {badge.rarity}
            </div>
            <div className="text-sm text-gray-400">Rarity</div>
          </div>
        </div>

        {/* Additional Info */}
        {userAchievement?.progress_data && (
          <div>
            <h4 className="font-medium text-white mb-2">Achievement Details</h4>
            <div className="text-sm text-gray-400 space-y-1">
              {typeof userAchievement.progress_data.trigger !== 'undefined' && userAchievement.progress_data.trigger !== null && (
                <p>Trigger: {String(userAchievement.progress_data.trigger)}</p>
              )}
              {typeof userAchievement.progress_data.context !== 'undefined' && userAchievement.progress_data.context !== null && (
                <p>Context: {String(userAchievement.progress_data.context)}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
