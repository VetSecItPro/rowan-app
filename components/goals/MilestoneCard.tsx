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

/** Displays a single milestone card with completion status and actions. */
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

  // Color-coded progress styling based on percentage (consistent with GoalCard)
  const getProgressColor = () => {
    if (progressPercentage === 0) return 'from-gray-300 to-gray-400'; // Not started
    if (progressPercentage <= 25) return 'from-blue-300 to-blue-400'; // Just started
    if (progressPercentage <= 50) return 'from-blue-400 to-blue-500'; // Making progress
    if (progressPercentage <= 75) return 'from-blue-500 to-green-400'; // Getting there
    if (progressPercentage < 100) return 'from-green-400 to-green-500'; // Almost done
    return 'from-green-500 to-green-600'; // Completed
  };

  // Get text color for progress percentage
  const getProgressTextColor = () => {
    if (progressPercentage >= 75) return 'text-green-400';
    if (progressPercentage >= 50) return 'text-blue-400';
    if (progressPercentage >= 25) return 'text-blue-300';
    return 'text-gray-400';
  };

  // Keep type-specific colors for icon badges
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
      className={`group relative rounded-xl p-5 transition-shadow ${
        isCompleted
          ? 'bg-green-900/20 border border-green-800'
          : 'bg-gray-900 border border-gray-800 hover:shadow-md'
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        {/* Three-state checkbox */}
        <div className="relative group">
          <button
            onClick={handleCheckboxClick}
            aria-label={`Toggle milestone status: ${milestoneState === 'not-started' ? 'Not Started' : milestoneState === 'in-progress' ? 'In Progress' : 'Completed'}`}
            className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
              milestoneState === 'completed'
                ? 'bg-green-500 border-green-500'
                : milestoneState === 'in-progress'
                ? 'bg-amber-500 border-amber-500'
                : 'bg-transparent border-red-500'
            }`}
          >
            {milestoneState === 'completed' && <Check className="w-4 h-4 text-white" />}
            {milestoneState === 'in-progress' && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
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
                isCompleted ? 'text-green-400 line-through' : 'text-white'
              }`}
            >
              {milestone.title} {goalTitle && <span className="text-sm text-gray-400 font-normal">({goalTitle})</span>}
            </h3>
          </div>
          {milestone.description && (
            <p className="text-sm text-gray-400 ml-10">{milestone.description}</p>
          )}
        </div>

        {/* Three-dot menu */}
        <div className="relative">
          <div className="relative group">
            <button
              onClick={() => setShowMenu(!showMenu)}
              aria-label="Milestone options menu"
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors flex items-center justify-center"
            >
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>
            <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Options
            </div>
          </div>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="w-48 absolute right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden">
                <button
                  onClick={() => { onEdit(milestone); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  Edit Milestone
                </button>
                <button
                  onClick={() => { onDelete(milestone.id); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-900/20 transition-colors flex items-center gap-2"
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
            <span className="text-gray-400">Progress</span>
            <span className={`font-semibold ${getProgressTextColor()}`}>
              {formatValue(milestone.current_value)} / {formatValue(milestone.target_value)}
            </span>
          </div>

          {/* Progress Bar with color-coded gradient */}
          <div className="relative w-full h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-full bg-gradient-to-r ${getProgressColor()} transition-all duration-700 ease-out rounded-full shadow-sm`}
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
          <span className="text-gray-400">Target Date</span>
          <span className="font-semibold text-white">
            {formatDate(milestone.target_date, 'MMM d, yyyy')}
          </span>
        </div>
      )}

      {/* Completion Info */}
      {isCompleted && milestone.completed_at && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex items-center gap-2 text-sm text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Completed on {formatTimestamp(milestone.completed_at, 'MMM d, yyyy')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
