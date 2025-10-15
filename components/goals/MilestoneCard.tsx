'use client';

import { Milestone } from '@/lib/services/goals-service';
import { MoreVertical, Check, DollarSign, Percent, Hash, Calendar, CheckCircle2 } from 'lucide-react';
import { formatDate, formatTimestamp } from '@/lib/utils/date-utils';
import { useState } from 'react';

interface MilestoneCardProps {
  milestone: Milestone;
  goalTitle?: string;
  onEdit: (milestone: Milestone) => void;
  onDelete: (milestoneId: string) => void;
  onToggle: (milestoneId: string, completed: boolean) => void;
}

export function MilestoneCard({ milestone, goalTitle, onEdit, onDelete, onToggle }: MilestoneCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const getProgressPercentage = () => {
    if (milestone.type === 'date') {
      if (!milestone.target_date) return 0;
      const now = new Date();
      const target = new Date(milestone.target_date);
      return now >= target ? 100 : 0;
    }

    if (!milestone.target_value) return 0;
    const current = milestone.current_value || 0;
    return Math.min(Math.round((current / milestone.target_value) * 100), 100);
  };

  const getGradientColor = () => {
    switch (milestone.type) {
      case 'money':
        return 'from-green-500 to-emerald-600';
      case 'percentage':
        return 'from-blue-500 to-cyan-600';
      case 'count':
        return 'from-purple-500 to-pink-600';
      case 'date':
        return 'from-orange-500 to-red-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getIcon = () => {
    switch (milestone.type) {
      case 'money':
        return <DollarSign className="w-4 h-4" />;
      case 'percentage':
        return <Percent className="w-4 h-4" />;
      case 'count':
        return <Hash className="w-4 h-4" />;
      case 'date':
        return <Calendar className="w-4 h-4" />;
    }
  };

  const formatValue = (value: number | undefined) => {
    if (value === undefined) return '0';
    if (milestone.type === 'money') {
      return `$${value.toLocaleString()}`;
    }
    if (milestone.type === 'percentage') {
      return `${value}%`;
    }
    return value.toLocaleString();
  };

  const progressPercentage = getProgressPercentage();
  const isCompleted = milestone.completed || progressPercentage >= 100;

  // Determine milestone state
  const getMilestoneState = (): 'not-started' | 'in-progress' | 'completed' => {
    if (isCompleted) return 'completed';
    if (milestone.current_value && milestone.current_value > 0) return 'in-progress';
    return 'not-started';
  };

  const milestoneState = getMilestoneState();

  const handleCheckboxClick = () => {
    const states: Array<'not-started' | 'in-progress' | 'completed'> = ['not-started', 'in-progress', 'completed'];
    const currentIndex = states.indexOf(milestoneState);
    const nextIndex = (currentIndex + 1) % states.length;

    // Toggle completed status when clicking through states
    if (nextIndex === 2) { // Moving to completed
      onToggle(milestone.id, true);
    } else if (currentIndex === 2) { // Moving from completed
      onToggle(milestone.id, false);
    }
  };

  return (
    <div
      className={`bg-gray-50 dark:bg-gray-800 border-2 rounded-xl p-6 transition-all ${
        isCompleted
          ? 'border-green-500 dark:border-green-600'
          : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        {/* Three-state checkbox */}
        <div className="relative group">
          <button
            onClick={handleCheckboxClick}
            aria-label={`Toggle milestone status: ${milestoneState === 'not-started' ? 'Not Started' : milestoneState === 'in-progress' ? 'In Progress' : 'Completed'}`}
            className={`w-6 h-6 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 active:scale-95 ${
              milestoneState === 'completed'
                ? 'bg-green-500 border-green-500'
                : milestoneState === 'in-progress'
                ? 'bg-amber-500 border-amber-500'
                : 'bg-transparent border-red-500'
            }`}
          >
            {milestoneState === 'completed' && <Check className="w-4 h-4 sm:w-3 sm:h-3 text-white" />}
            {milestoneState === 'in-progress' && <div className="w-2 h-2 bg-white rounded-full" />}
          </button>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {milestoneState === 'not-started' ? 'Not Started' : milestoneState === 'in-progress' ? 'In Progress' : 'Completed'}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-8 h-8 bg-gradient-to-br ${getGradientColor()} rounded-lg flex items-center justify-center text-white flex-shrink-0`}>
              {getIcon()}
            </div>
            <h3
              className={`text-lg font-semibold ${
                isCompleted ? 'text-green-600 dark:text-green-400 line-through' : 'text-gray-900 dark:text-white'
              }`}
            >
              {milestone.title} {goalTitle && <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">({goalTitle})</span>}
            </h3>
          </div>
          {milestone.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 ml-10">{milestone.description}</p>
          )}
        </div>

        {/* Three-dot menu */}
        <div className="relative">
          <div className="relative group">
            <button
              onClick={() => setShowMenu(!showMenu)}
              aria-label="Milestone options menu"
              className="p-2 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors active:scale-95 flex items-center justify-center"
            >
              <MoreVertical className="w-5 h-5 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Options
            </div>
          </div>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-2 w-48 dropdown-mobile bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
                <button
                  onClick={() => { onEdit(milestone); setShowMenu(false); }}
                  className="w-full px-4 py-3 sm:py-2 text-left text-base sm:text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 active:scale-[0.98]"
                >
                  Edit Milestone
                </button>
                <button
                  onClick={() => { onDelete(milestone.id); setShowMenu(false); }}
                  className="w-full px-4 py-3 sm:py-2 text-left text-base sm:text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2 active:scale-[0.98]"
                >
                  Delete Milestone
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Progress Section */}
      {milestone.type !== 'date' && (
        <div className="space-y-2">
          {/* Values */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Progress</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatValue(milestone.current_value)} / {formatValue(milestone.target_value)}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="relative w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-full bg-gradient-to-r ${getGradientColor()} transition-all duration-500 ease-out`}
              style={{ width: `${progressPercentage}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-white drop-shadow-lg">{progressPercentage}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Date Milestone */}
      {milestone.type === 'date' && milestone.target_date && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Target Date</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatDate(milestone.target_date, 'MMM d, yyyy')}
          </span>
        </div>
      )}

      {/* Completion Info */}
      {isCompleted && milestone.completed_at && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Completed on {formatTimestamp(milestone.completed_at, 'MMM d, yyyy')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
