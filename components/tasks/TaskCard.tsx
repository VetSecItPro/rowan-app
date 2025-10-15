'use client';

import { CheckSquare, Clock, Flag, User, Calendar as CalendarIcon, MoreVertical, ShoppingCart } from 'lucide-react';
import { Task } from '@/lib/types';
import { formatTimestamp } from '@/lib/utils/date-utils';
import { useState } from 'react';
import { TASK_CATEGORIES } from './NewTaskModal';
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

export function TaskCard({ task, onStatusChange, onEdit, onDelete, onViewDetails, linkedShoppingList }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
  const priorityColor = priorityColors[task.priority as keyof typeof priorityColors] || 'bg-gray-500';
  const statusColor = statusColors[task.status as keyof typeof statusColors] || 'bg-gray-500';

  // Handle status rotation
  // Tasks: pending → in_progress → completed → pending
  // Chores: pending → completed → pending
  const handleStatusClick = () => {
    let newStatus = 'pending';

    if (task.type === 'chore') {
      // Chores only have: pending, completed, skipped
      if (task.status === 'pending') {
        newStatus = 'completed';
      } else if (task.status === 'completed') {
        newStatus = 'pending';
      }
    } else {
      // Tasks have: pending, in_progress, completed, cancelled
      if (task.status === 'pending') {
        newStatus = 'in_progress';
      } else if (task.status === 'in_progress') {
        newStatus = 'completed';
      } else if (task.status === 'completed') {
        newStatus = 'pending';
      }
    }

    onStatusChange(task.id, newStatus, task.type);
  };

  // Get checkbox styling based on status
  const getCheckboxStyle = () => {
    if (task.status === 'completed') {
      return 'bg-green-500 border-green-500';
    } else if (task.status === 'in_progress') {
      return 'bg-amber-500 border-amber-500';
    } else {
      return 'border-2 border-red-500 bg-transparent';
    }
  };

  // Get status label
  const getStatusLabel = () => {
    if (task.status === 'completed') {
      return { text: 'Completed', color: 'text-green-600 dark:text-green-400' };
    } else if (task.status === 'in_progress') {
      return { text: 'Pending', color: 'text-amber-600 dark:text-amber-400' };
    } else {
      return { text: 'Not Started', color: 'text-red-600 dark:text-red-400' };
    }
  };

  // Get tooltip text for next status
  const getStatusTooltip = () => {
    if (task.status === 'pending') {
      return 'Click for Pending';
    } else if (task.status === 'in_progress') {
      return 'Click for Completed';
    } else if (task.status === 'completed') {
      return 'Click to reset';
    }
    return 'Click to update status';
  };

  const statusLabel = getStatusLabel();

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-4 hover:shadow-lg transition-all duration-200 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex items-start gap-3 flex-1">
          {/* Checkbox */}
          <button
            onClick={handleStatusClick}
            title={getStatusTooltip()}
            aria-label={`Toggle task status: ${statusLabel.text}`}
            className={`mt-0.5 flex-shrink-0 w-6 h-6 sm:w-5 sm:h-5 rounded flex items-center justify-center transition-all active:scale-95 ${getCheckboxStyle()}`}
          >
            {task.status === 'completed' && (
              <CheckSquare className="w-4 h-4 sm:w-3 sm:h-3 text-white" />
            )}
          </button>

          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className={`font-semibold text-gray-900 dark:text-white ${
                task.status === 'completed' ? 'line-through opacity-60' : ''
              }`}>
                {task.title}
              </h3>
              {/* Task/Chore Type Badge */}
              {task.type && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border-2 border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20">
                  {task.type === 'task' ? 'Task' : 'Chore'}
                </span>
              )}
              {/* Category Badge */}
              {task.category && TASK_CATEGORIES[task.category as keyof typeof TASK_CATEGORIES] && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  TASK_CATEGORIES[task.category as keyof typeof TASK_CATEGORIES].lightBg
                } ${
                  TASK_CATEGORIES[task.category as keyof typeof TASK_CATEGORIES].textColor
                }`}>
                  <span>{TASK_CATEGORIES[task.category as keyof typeof TASK_CATEGORIES].emoji}</span>
                  <span>{TASK_CATEGORIES[task.category as keyof typeof TASK_CATEGORIES].label}</span>
                </span>
              )}
            </div>
            {task.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
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
            className="p-2 sm:p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-95 flex items-center justify-center"
          >
            <MoreVertical className="w-5 h-5 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-400" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-1 w-44 sm:w-40 dropdown-mobile bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                {onViewDetails && task.type === 'task' && (
                  <button
                    onClick={() => {
                      onViewDetails(task);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-3 sm:py-2 text-left text-base sm:text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg transition-colors active:scale-[0.98]"
                  >
                    View Details
                  </button>
                )}
                <button
                  onClick={() => {
                    onEdit(task);
                    setShowMenu(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-[0.98] ${!onViewDetails || task.type !== 'task' ? 'rounded-t-lg' : ''}`}
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    onDelete(task.id, task.type);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg active:scale-[0.98]"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Meta Information */}
      <div className="flex items-center gap-3 flex-wrap text-xs">
        {/* Priority */}
        <div className="flex items-center gap-1">
          <Flag className={`w-3 h-3 ${priorityColor.replace('bg-', 'text-')}`} />
          <span className="text-gray-600 dark:text-gray-400 capitalize">{task.priority}</span>
        </div>

        {/* Due Date */}
        {task.due_date && (
          <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>
            <CalendarIcon className="w-3 h-3" />
            <span>{formatTimestamp(task.due_date, 'MMM d, yyyy')}</span>
            {isOverdue && <span className="font-semibold">Overdue</span>}
          </div>
        )}

        {/* Status Badge */}
        <span className={`px-2 py-0.5 ${statusColor} text-white rounded-full capitalize ml-auto`}>
          {task.status.replace('_', ' ')}
        </span>
      </div>

      {/* Assigned User */}
      {task.assigned_to && (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <User className="w-3 h-3" />
          <span>Assigned</span>
        </div>
      )}

      {/* Linked Shopping List */}
      {linkedShoppingList && (
        <Link
          href="/shopping"
          className="mt-3 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors text-sm active:opacity-80"
        >
          <ShoppingCart className="w-4 h-4" />
          <span className="font-medium">
            {linkedShoppingList.title}
            {linkedShoppingList.items_count !== undefined && ` (${linkedShoppingList.items_count} items)`}
          </span>
        </Link>
      )}
    </div>
  );
}
