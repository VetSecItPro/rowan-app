'use client';

import { Target, MoreVertical, Check, History, Settings } from 'lucide-react';
import { Goal } from '@/lib/services/goals-service';
import { formatDate } from '@/lib/utils/date-utils';
import { useState } from 'react';

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
  onCheckIn?: (goal: Goal) => void;
  onShowHistory?: (goal: Goal) => void;
  onFrequencySettings?: (goal: Goal) => void;
  onStatusChange?: (goalId: string, status: 'not-started' | 'in-progress' | 'completed') => void;
}

export function GoalCard({ goal, onEdit, onDelete, onCheckIn, onShowHistory, onFrequencySettings, onStatusChange }: GoalCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  // Determine status based on goal.status and progress
  const getGoalState = (): 'not-started' | 'in-progress' | 'completed' => {
    if (goal.status === 'completed') return 'completed';
    if (goal.progress > 0) return 'in-progress';
    return 'not-started';
  };

  const goalState = getGoalState();

  // Get color-coded progress styling based on percentage
  const getProgressColor = () => {
    if (goal.progress === 0) return 'from-gray-300 to-gray-400'; // Not started
    if (goal.progress <= 25) return 'from-blue-300 to-blue-400'; // Just started
    if (goal.progress <= 50) return 'from-blue-400 to-blue-500'; // Making progress
    if (goal.progress <= 75) return 'from-blue-500 to-green-400'; // Getting there
    if (goal.progress < 100) return 'from-green-400 to-green-500'; // Almost done
    return 'from-green-500 to-green-600'; // Completed
  };

  // Get text color for progress percentage
  const getProgressTextColor = () => {
    if (goal.progress >= 75) return 'text-green-600 dark:text-green-400';
    if (goal.progress >= 50) return 'text-blue-600 dark:text-blue-400';
    if (goal.progress >= 25) return 'text-blue-500 dark:text-blue-300';
    return 'text-gray-600 dark:text-gray-400';
  };

  const handleCheckboxClick = () => {
    if (!onStatusChange) return;

    const states: Array<'not-started' | 'in-progress' | 'completed'> = ['not-started', 'in-progress', 'completed'];
    const currentIndex = states.indexOf(goalState);
    const nextIndex = (currentIndex + 1) % states.length;
    onStatusChange(goal.id, states[nextIndex]);
  };

  return (
    <div className="group relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-4">
        {/* Three-state checkbox */}
        <div className="relative group">
          <button
            onClick={handleCheckboxClick}
            aria-label={`Toggle goal status: ${goalState === 'not-started' ? 'Not Started' : goalState === 'in-progress' ? 'In Progress' : 'Completed'}`}
            className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
              goalState === 'completed'
                ? 'bg-green-500 border-green-500'
                : goalState === 'in-progress'
                ? 'bg-amber-500 border-amber-500'
                : 'bg-transparent border-gray-300 dark:border-gray-600'
            }`}
          >
            {goalState === 'completed' && <Check className="w-4 h-4 text-white" />}
            {goalState === 'in-progress' && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
          </button>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {goalState === 'not-started' ? 'Not Started' : goalState === 'in-progress' ? 'In Progress' : 'Completed'}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-gradient-goals rounded-lg flex items-center justify-center flex-shrink-0">
              <Target className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{goal.title}</h3>
          </div>
          {goal.description && <p className="text-sm text-gray-600 dark:text-gray-400 ml-10 break-words line-clamp-2">{goal.description}</p>}
        </div>

        {/* Three-dot menu */}
        <div className="relative">
          <div className="relative group">
            <button
              onClick={() => setShowMenu(!showMenu)}
              aria-label="Goal options menu"
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Options
            </div>
          </div>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="w-48 absolute right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden">
                {onCheckIn && goal.status === 'active' && (
                  <button
                    onClick={() => { onCheckIn(goal); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-2"
                  >
                    Check In
                  </button>
                )}
                {onShowHistory && (
                  <button
                    onClick={() => { onShowHistory(goal); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center gap-2"
                  >
                    <History className="w-4 h-4" />
                    Check-In History
                  </button>
                )}
                {onFrequencySettings && goal.status === 'active' && (
                  <button
                    onClick={() => { onFrequencySettings(goal); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Check-In Settings
                  </button>
                )}
                <button
                  onClick={() => { onEdit(goal); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  Edit Goal
                </button>
                <button
                  onClick={() => { onDelete(goal.id); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                >
                  Delete Goal
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Progress</span>
            <span className={`text-sm font-bold ${getProgressTextColor()}`}>{goal.progress}%</span>
          </div>
          <div className="h-3 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
            <div
              className={`h-full bg-gradient-to-r ${getProgressColor()} transition-all duration-700 ease-out rounded-full shadow-sm`}
              style={{ width: `${goal.progress}%` }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
              goal.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
              goal.status === 'active' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
              'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
            }`}>{goal.status}</span>
            {goal.assignee && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
                {goal.assignee.avatar_url ? (
                  <img src={goal.assignee.avatar_url} alt={goal.assignee.name} className="w-4 h-4 rounded-full object-cover" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-gradient-goals flex items-center justify-center">
                    <span className="text-[8px] font-semibold text-white">
                      {goal.assignee.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">{goal.assignee.name}</span>
              </div>
            )}
          </div>
          {goal.target_date && <span className="text-xs text-gray-500">{formatDate(goal.target_date, 'MMM d, yyyy')}</span>}
        </div>
      </div>
    </div>
  );
}
