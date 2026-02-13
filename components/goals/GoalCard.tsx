'use client';

import Image from 'next/image';
import { MoreVertical, Check, Minus, History, Settings, Pin } from 'lucide-react';
import { Goal } from '@/lib/services/goals-service';
import { formatDate } from '@/lib/utils/date-utils';
import { useState, memo, type ReactNode } from 'react';

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
  onCheckIn?: (goal: Goal) => void;
  onShowHistory?: (goal: Goal) => void;
  onFrequencySettings?: (goal: Goal) => void;
  onStatusChange?: (goalId: string, status: 'not-started' | 'in-progress' | 'completed') => void;
  onPriorityChange?: (goalId: string, priority: 'none' | 'p1' | 'p2' | 'p3' | 'p4') => void;
  onTogglePin?: (goalId: string, isPinned: boolean) => void;
  extraActions?: ReactNode;
}

const priorityColors: Record<string, string> = {
  p1: 'text-red-400',
  p2: 'text-orange-400',
  p3: 'text-yellow-400',
  p4: 'text-blue-400',
};

export const GoalCard = memo(function GoalCard({ goal, onEdit, onDelete, onCheckIn, onShowHistory, onFrequencySettings, onStatusChange, onPriorityChange, onTogglePin, extraActions }: GoalCardProps) {
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
    if (goal.progress >= 75) return 'text-green-400';
    if (goal.progress >= 50) return 'text-blue-400';
    if (goal.progress >= 25) return 'text-blue-300';
    return 'text-gray-400';
  };

  const handleCheckboxClick = () => {
    if (!onStatusChange) return;

    const states: Array<'not-started' | 'in-progress' | 'completed'> = ['not-started', 'in-progress', 'completed'];
    const currentIndex = states.indexOf(goalState);
    const nextIndex = (currentIndex + 1) % states.length;
    onStatusChange(goal.id, states[nextIndex]);
  };

  return (
    <div className="group relative bg-gray-900 border border-gray-800 rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-4">
        {/* Three-state checkbox */}
        <button
          onClick={handleCheckboxClick}
          aria-label={`Toggle goal status: ${goalState === 'not-started' ? 'Not Started' : goalState === 'in-progress' ? 'In Progress' : 'Completed'}`}
          className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
            goalState === 'completed'
              ? 'bg-green-500 border-green-500'
              : goalState === 'in-progress'
              ? 'border-amber-500'
              : 'border-gray-600 hover:border-gray-500'
          }`}
        >
          {goalState === 'completed' && <Check className="w-3 h-3 text-white" />}
          {goalState === 'in-progress' && <Minus className="w-3 h-3 text-amber-500" />}
        </button>

        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white line-clamp-2">{goal.title}</h3>
          {goal.description && <p className="text-sm text-gray-400 break-words line-clamp-2 mt-0.5">{goal.description}</p>}
        </div>

        {/* Right actions row */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onTogglePin && (
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePin(goal.id, !goal.is_pinned); }}
              className={`transition-colors ${goal.is_pinned ? 'text-yellow-400' : 'text-gray-600 hover:text-gray-400'}`}
              title={goal.is_pinned ? 'Unpin goal' : 'Pin goal'}
            >
              <Pin className={`w-3.5 h-3.5 ${goal.is_pinned ? 'fill-current' : ''}`} />
            </button>
          )}

          {onPriorityChange && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const priorities: Array<'none' | 'p1' | 'p2' | 'p3' | 'p4'> = ['none', 'p1', 'p2', 'p3', 'p4'];
                const currentIndex = priorities.indexOf(goal.priority || 'none');
                const nextIndex = (currentIndex + 1) % priorities.length;
                onPriorityChange(goal.id, priorities[nextIndex]);
              }}
              className={`text-xs font-medium transition-colors ${priorityColors[goal.priority || ''] || 'text-gray-600 hover:text-gray-400'}`}
              title="Click to change priority"
            >
              {goal.priority && goal.priority !== 'none' ? goal.priority.toUpperCase() : '—'}
            </button>
          )}

          {extraActions}

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              aria-label="Goal options menu"
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="w-48 absolute right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden">
                  {onCheckIn && goal.status === 'active' && (
                    <button
                      onClick={() => { onCheckIn(goal); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm text-blue-400 hover:bg-blue-900/20 transition-colors flex items-center gap-2"
                    >
                      Check In
                    </button>
                  )}
                  {onShowHistory && (
                    <button
                      onClick={() => { onShowHistory(goal); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm text-purple-400 hover:bg-purple-900/20 transition-colors flex items-center gap-2"
                    >
                      <History className="w-4 h-4" />
                      Check-In History
                    </button>
                  )}
                  {onFrequencySettings && goal.status === 'active' && (
                    <button
                      onClick={() => { onFrequencySettings(goal); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm text-indigo-400 hover:bg-indigo-900/20 transition-colors flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Check-In Settings
                    </button>
                  )}
                  <button
                    onClick={() => { onEdit(goal); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    Edit Goal
                  </button>
                  <button
                    onClick={() => { onDelete(goal.id); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-900/20 transition-colors flex items-center gap-2"
                  >
                    Delete Goal
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Progress</span>
            <span className={`text-sm font-bold ${getProgressTextColor()}`}>{goal.progress}%</span>
          </div>
          <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${getProgressColor()} transition-all duration-700 ease-out rounded-full shadow-sm`}
              style={{ width: `${goal.progress}%` }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
              goal.status === 'completed' ? 'bg-green-900/30 text-green-300' :
              goal.status === 'active' ? 'bg-blue-900/30 text-blue-300' :
              'bg-gray-900/30 text-gray-300'
            }`}>{goal.status}</span>
            {goal.assignee && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-900/30 rounded-full">
                {goal.assignee.avatar_url ? (
                  <Image
                    src={goal.assignee.avatar_url}
                    alt={goal.assignee.name}
                    width={16}
                    height={16}
                    className="w-4 h-4 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-gradient-goals flex items-center justify-center">
                    <span className="text-[8px] font-semibold text-white">
                      {goal.assignee.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-xs text-indigo-300 font-medium">{goal.assignee.name}</span>
              </div>
            )}
          </div>
          {goal.target_date && <span className="text-xs text-gray-500">{formatDate(goal.target_date, 'MMM d, yyyy')}</span>}
        </div>
      </div>
    </div>
  );
});
