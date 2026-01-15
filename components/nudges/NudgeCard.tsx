'use client';

import { useState } from 'react';
import {
  Bell,
  Clock,
  Target,
  TrendingUp,
  Trophy,
  Star,
  AlertTriangle,
  Calendar,
  BarChart,
  CheckCircle,
  X,
  Pause,
  MoreHorizontal
} from 'lucide-react';
import { SmartNudge } from '@/lib/services/smart-nudges-service';
import { cn } from '@/lib/utils';

interface NudgeCardProps {
  nudge: SmartNudge;
  onAction?: (nudgeId: string, action: 'clicked' | 'dismissed' | 'snoozed') => void;
  onGoalClick?: (goalId: string) => void;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export function NudgeCard({
  nudge,
  onAction,
  onGoalClick,
  className,
  size = 'medium'
}: NudgeCardProps) {
  const [isActioned, setIsActioned] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const getIcon = (iconName?: string) => {
    const iconMap = {
      'target': Target,
      'trending-up': TrendingUp,
      'trophy': Trophy,
      'star': Star,
      'clock': Clock,
      'alert-triangle': AlertTriangle,
      'calendar': Calendar,
      'bar-chart': BarChart,
      'zap': Star, // Using Star as fallback for zap
      'award': Trophy,
      'flag': Target,
      'bell': Bell
    };

    const IconComponent = iconMap[iconName as keyof typeof iconMap] || Bell;
    return IconComponent;
  };

  const getCategoryStyles = (category: string) => {
    const styles = {
      reminder: {
        bg: 'bg-blue-900/20',
        border: 'border-blue-700',
        icon: 'text-blue-400',
        accent: 'bg-blue-500'
      },
      motivation: {
        bg: 'bg-purple-900/20',
        border: 'border-purple-700',
        icon: 'text-purple-400',
        accent: 'bg-purple-500'
      },
      milestone: {
        bg: 'bg-green-900/20',
        border: 'border-green-700',
        icon: 'text-green-400',
        accent: 'bg-green-500'
      },
      deadline: {
        bg: 'bg-orange-900/20',
        border: 'border-orange-700',
        icon: 'text-orange-400',
        accent: 'bg-orange-500'
      },
      celebration: {
        bg: 'bg-yellow-900/20',
        border: 'border-yellow-700',
        icon: 'text-yellow-400',
        accent: 'bg-yellow-500'
      },
      summary: {
        bg: 'bg-gray-800',
        border: 'border-gray-700',
        icon: 'text-gray-400',
        accent: 'bg-gray-500'
      }
    };

    return styles[category as keyof typeof styles] || styles.reminder;
  };

  const getPriorityStyles = (priority: number) => {
    if (priority >= 3) return 'ring-2 ring-red-600';
    if (priority >= 2) return 'ring-1 ring-orange-600';
    return '';
  };

  const getSizeStyles = (size: string) => {
    switch (size) {
      case 'small':
        return 'p-3 text-sm';
      case 'large':
        return 'p-6 text-base';
      default:
        return 'p-4 text-sm';
    }
  };

  const IconComponent = getIcon(nudge.icon);
  const categoryStyles = getCategoryStyles(nudge.category);
  const priorityStyles = getPriorityStyles(nudge.priority);

  const handleAction = (action: 'clicked' | 'dismissed' | 'snoozed') => {
    setIsActioned(true);
    onAction?.(nudge.nudge_id, action);
  };

  const handleGoalClick = () => {
    if (nudge.goal_id) {
      onGoalClick?.(nudge.goal_id);
      handleAction('clicked');
    }
  };

  if (isActioned && (showMenu === false)) {
    return null; // Hide card after action
  }

  return (
    <div className={cn(
      'rounded-xl border transition-all duration-200 hover:shadow-md relative',
      categoryStyles.bg,
      categoryStyles.border,
      priorityStyles,
      getSizeStyles(size),
      isActioned && 'opacity-50 pointer-events-none',
      className
    )}>
      {/* Priority indicator */}
      {nudge.priority >= 3 && (
        <div className={cn('absolute top-2 left-2 w-2 h-2 rounded-full', categoryStyles.accent)} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            categoryStyles.bg,
            'ring-1 ring-gray-700'
          )}>
            <IconComponent className={cn('w-4 h-4', categoryStyles.icon)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white line-clamp-1">
              {nudge.title}
            </h3>
            {nudge.goal_title && (
              <p className="text-xs text-gray-400 capitalize">
                {nudge.category} • {nudge.goal_title}
              </p>
            )}
          </div>
        </div>

        {/* Actions menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4 text-gray-500" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-6 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
              <button
                onClick={() => {
                  handleAction('snoozed');
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-700 flex items-center space-x-2"
              >
                <Pause className="w-3 h-3" />
                <span>Snooze</span>
              </button>
              <button
                onClick={() => {
                  handleAction('dismissed');
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-700 flex items-center space-x-2 text-red-400"
              >
                <X className="w-3 h-3" />
                <span>Dismiss</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Message */}
      <p className="text-gray-300 mb-4 line-clamp-2">
        {nudge.message}
      </p>

      {/* Metadata */}
      {(nudge.days_since_activity !== null || nudge.days_until_deadline !== null) && (
        <div className="flex items-center space-x-4 mb-4 text-xs text-gray-400">
          {nudge.days_since_activity !== null && nudge.days_since_activity !== undefined && nudge.days_since_activity > 0 && (
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{nudge.days_since_activity}d since update</span>
            </div>
          )}
          {nudge.days_until_deadline !== null && nudge.days_until_deadline !== undefined && (
            <div className="flex items-center space-x-1">
              <Target className="w-3 h-3" />
              <span>
                {nudge.days_until_deadline > 0
                  ? `${nudge.days_until_deadline}d remaining`
                  : `${Math.abs(nudge.days_until_deadline)}d overdue`
                }
              </span>
            </div>
          )}
        </div>
      )}

      {/* Action button */}
      {nudge.action_text && (
        <button
          onClick={handleGoalClick}
          className={cn(
            'w-full py-2 px-4 rounded-lg font-medium text-white transition-colors',
            categoryStyles.accent,
            'hover:opacity-90'
          )}
        >
          {nudge.action_text}
        </button>
      )}

      {/* Completion checkmark overlay */}
      {isActioned && (
        <div className="absolute inset-0 bg-green-500/10 rounded-xl flex items-center justify-center">
          <div className="bg-green-500 rounded-full p-2">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}