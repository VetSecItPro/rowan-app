'use client';

import { Target, MoreVertical, Check } from 'lucide-react';
import { Goal } from '@/lib/services/goals-service';
import { formatDate } from '@/lib/utils/date-utils';
import { useState } from 'react';

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
  onStatusChange?: (goalId: string, status: 'not-started' | 'in-progress' | 'completed') => void;
}

export function GoalCard({ goal, onEdit, onDelete, onStatusChange }: GoalCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  // Determine status based on goal.status and progress
  const getGoalState = (): 'not-started' | 'in-progress' | 'completed' => {
    if (goal.status === 'completed') return 'completed';
    if (goal.progress > 0) return 'in-progress';
    return 'not-started';
  };

  const goalState = getGoalState();

  const handleCheckboxClick = () => {
    if (!onStatusChange) return;

    const states: Array<'not-started' | 'in-progress' | 'completed'> = ['not-started', 'in-progress', 'completed'];
    const currentIndex = states.indexOf(goalState);
    const nextIndex = (currentIndex + 1) % states.length;
    onStatusChange(goal.id, states[nextIndex]);
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:border-purple-300 dark:hover:border-purple-600 transition-all">
      <div className="flex items-start gap-3 mb-4">
        {/* Three-state checkbox */}
        <div className="relative group">
          <button
            onClick={handleCheckboxClick}
            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
              goalState === 'completed'
                ? 'bg-green-500 border-green-500'
                : goalState === 'in-progress'
                ? 'bg-amber-500 border-amber-500'
                : 'bg-transparent border-red-500'
            }`}
          >
            {goalState === 'completed' && <Check className="w-4 h-4 text-white" />}
            {goalState === 'in-progress' && <div className="w-2 h-2 bg-white rounded-full" />}
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{goal.title}</h3>
          </div>
          {goal.description && <p className="text-sm text-gray-600 dark:text-gray-400 ml-10">{goal.description}</p>}
        </div>

        {/* Three-dot menu */}
        <div className="relative">
          <div className="relative group">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Options
            </div>
          </div>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
                <button
                  onClick={() => { onEdit(goal); setShowMenu(false); }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  Edit Goal
                </button>
                <button
                  onClick={() => { onDelete(goal.id); setShowMenu(false); }}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
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
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600 dark:text-gray-400">Progress</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{goal.progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-goals transition-all duration-300" style={{ width: `${goal.progress}%` }} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
            goal.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
            goal.status === 'active' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
            'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
          }`}>{goal.status}</span>
          {goal.target_date && <span className="text-xs text-gray-500">{formatDate(goal.target_date, 'MMM d, yyyy')}</span>}
        </div>
      </div>
    </div>
  );
}
