'use client';

import { CheckSquare, Clock, Flag, User, Calendar as CalendarIcon, MoreVertical, ShoppingCart } from 'lucide-react';
import { Task } from '@/lib/types';
import { formatTimestamp } from '@/lib/utils/date-utils';
import { useState, memo } from 'react';
import { TASK_CATEGORIES } from '@/lib/constants/item-categories';
import Link from 'next/link';

interface LinkedShoppingList {
  id: string;
  title: string;
  items_count?: number;
}

interface TaskCardProps {
  task: Task & { type?: 'task' | 'chore' };
  onStatusChange: (taskId: string, status: string, type?: 'task' | 'chore') => void;
  onEdit: (task: Task & { type?: 'task' | 'chore' }) => void;
  onDelete: (taskId: string, type?: 'task' | 'chore') => void;
  onViewDetails?: (task: Task & { type?: 'task' | 'chore' }) => void;
  linkedShoppingList?: LinkedShoppingList;
}

const priorityColors = {
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

const statusColors = {
  pending: 'bg-gray-500',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
};

const TaskCard = memo(function TaskCard({ task, onStatusChange, onEdit, onDelete, onViewDetails, linkedShoppingList }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
  const priorityColor = priorityColors[task.priority as keyof typeof priorityColors] || 'bg-gray-500';
  const statusColor = statusColors[task.status as keyof typeof statusColors] || 'bg-gray-500';

  // Handle status rotation
  // Both Tasks & Chores: pending → in_progress → completed → pending
  const handleStatusClick = () => {
    let newStatus = 'pending';

    // Same cycling for both tasks and chores
    if (task.status === 'pending') {
      newStatus = 'in-progress';
    } else if (task.status === 'in-progress') {
      newStatus = 'completed';
    } else if (task.status === 'completed') {
      newStatus = 'pending';
    }

    onStatusChange(task.id, newStatus, task.type);
  };

  // Get checkbox styling based on status with better colors
  const getCheckboxStyle = () => {
    if (task.status === 'completed') {
      return 'bg-green-500 border-2 border-green-500 hover:bg-green-600';
    } else if (task.status === 'in-progress') {
      return 'bg-amber-500 border-2 border-amber-500 hover:bg-amber-600';
    } else {
      return 'border-2 border-gray-300 dark:border-gray-600 bg-transparent hover:border-amber-400 dark:hover:border-amber-400';
    }
  };

  // Get status label
  const getStatusLabel = () => {
    if (task.status === 'completed') {
      return { text: 'Completed', color: 'text-green-600 dark:text-green-400' };
    } else if (task.status === 'in-progress') {
      return { text: 'In Progress', color: 'text-amber-600 dark:text-amber-400' };
    } else {
      return { text: 'Pending', color: 'text-gray-600 dark:text-gray-400' };
    }
  };

  // Get tooltip text for next status
  const getStatusTooltip = () => {
    if (task.status === 'pending') {
      return 'Click to start (In Progress)';
    } else if (task.status === 'in-progress') {
      return 'Click to complete';
    } else if (task.status === 'completed') {
      return 'Click to reset to pending';
    }
    return 'Click to update status';
  };

  const statusLabel = getStatusLabel();

  return (
    <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-lg p-3 sm:p-4 md:p-5 hover:shadow-lg transition-all duration-200 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2 sm:gap-3">
        <div className="flex items-start gap-2 sm:gap-3 flex-1">
          {/* Checkbox */}
          <button
            onClick={handleStatusClick}
            title={getStatusTooltip()}
            aria-label={`Toggle task status: ${statusLabel.text}`}
            className={`mt-0.5 flex-shrink-0 btn-icon-small rounded flex items-center justify-center transition-colors ${getCheckboxStyle()}`}
          >
            {task.status === 'completed' && (
              <CheckSquare className="w-4 h-4 sm:w-3 sm:h-3 text-white" />
            )}
            {task.status === 'in-progress' && (
              <Clock className="w-3 h-3 text-white" />
            )}
          </button>

          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
              <h3 className={`text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate ${
                task.status === 'completed' ? 'line-through opacity-60' : ''
              }`}>
                {task.title}
              </h3>
              {/* Task/Chore Type Badge */}
              <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium border-2 ${
                (task.type === 'chore')
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 dark:border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                  : 'border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              }`}>
                {(task.type === 'chore') ? '🏠 Chore' : '📋 Task'}
              </span>
              {/* Category Badge */}
              {task.category && TASK_CATEGORIES[task.category as keyof typeof TASK_CATEGORIES] && (
                <span className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium ${
                  TASK_CATEGORIES[task.category as keyof typeof TASK_CATEGORIES].lightBg
                } ${
                  TASK_CATEGORIES[task.category as keyof typeof TASK_CATEGORIES].textColor
                }`}>
                  <span>{TASK_CATEGORIES[task.category as keyof typeof TASK_CATEGORIES].emoji}</span>
                  <span className="hidden sm:inline">{TASK_CATEGORIES[task.category as keyof typeof TASK_CATEGORIES].label}</span>
                </span>
              )}
            </div>
            {task.description && (
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* More Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            title="Edit or Delete"
            aria-label="Task options menu"
            className="btn-icon-mobile flex items-center justify-center"
          >
            <MoreVertical className="w-5 h-5 md:w-4 md:h-4 text-gray-600 dark:text-gray-400" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-1 w-48 dropdown-mobile bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-lg z-20">
                {onViewDetails && task.type === 'task' && (
                  <button
                    onClick={() => {
                      onViewDetails(task);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-3 sm:py-2 text-left text-base sm:text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg transition-colors"
                  >
                    View Details
                  </button>
                )}
                <button
                  onClick={() => {
                    onEdit(task);
                    setShowMenu(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${!onViewDetails || task.type !== 'task' ? 'rounded-t-lg' : ''}`}
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    onDelete(task.id, task.type);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Meta Information */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs">
        {/* Priority */}
        <div className="flex items-center gap-1">
          <Flag className={`w-3 h-3 ${priorityColor.replace('bg-', 'text-')}`} />
          <span className="text-gray-600 dark:text-gray-400 capitalize">{task.priority}</span>
        </div>

        {/* Due Date */}
        {task.due_date && (
          <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>
            <CalendarIcon className="w-3 h-3" />
            <span className="hidden sm:inline">{formatTimestamp(task.due_date, 'MMM d, yyyy')}</span>
            <span className="sm:hidden">{formatTimestamp(task.due_date, 'MMM d')}</span>
            {isOverdue && <span className="font-semibold">Overdue</span>}
          </div>
        )}

        {/* Status Badge */}
        <span className={`px-1.5 sm:px-2 py-0.5 ${statusColor} text-white rounded-full capitalize ml-auto text-xs`}>
          {task.status.replace('_', ' ')}
        </span>
      </div>

      {/* Assigned User */}
      {task.assigned_to && (
        <div className="mt-2 sm:mt-3 flex items-center gap-1.5 sm:gap-2 text-xs text-gray-600 dark:text-gray-400">
          <User className="w-3 h-3" />
          <span>Assigned</span>
        </div>
      )}

      {/* Linked Shopping List */}
      {linkedShoppingList && (
        <Link
          href="/shopping"
          className="mt-2 sm:mt-3 inline-flex items-center gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-2.5 sm:px-3 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors text-xs sm:text-sm hover:underline"
        >
          <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
          <span className="font-medium truncate">
            {linkedShoppingList.title}
            {linkedShoppingList.items_count !== undefined && ` (${linkedShoppingList.items_count} items)`}
          </span>
        </Link>
      )}
    </div>
  );
});

export { TaskCard };
