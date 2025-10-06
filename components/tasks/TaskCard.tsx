'use client';

import { CheckSquare, Clock, Flag, User, Calendar as CalendarIcon, MoreVertical } from 'lucide-react';
import { Task } from '@/lib/types';
import { format } from 'date-fns';
import { useState } from 'react';

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, status: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
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

export function TaskCard({ task, onStatusChange, onEdit, onDelete }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
  const priorityColor = priorityColors[task.priority as keyof typeof priorityColors] || 'bg-gray-500';
  const statusColor = statusColors[task.status as keyof typeof statusColors] || 'bg-gray-500';

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-all duration-200 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          {/* Checkbox */}
          <button
            onClick={() => onStatusChange(task.id, task.status === 'completed' ? 'pending' : 'completed')}
            className={`mt-1 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              task.status === 'completed'
                ? 'bg-green-500 border-green-500'
                : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
            }`}
          >
            {task.status === 'completed' && (
              <CheckSquare className="w-3 h-3 text-white" />
            )}
          </button>

          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-gray-900 dark:text-white mb-1 ${
              task.status === 'completed' ? 'line-through opacity-60' : ''
            }`}>
              {task.title}
            </h3>
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
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                <button
                  onClick={() => {
                    onEdit(task);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    onDelete(task.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg"
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
            <span>{format(new Date(task.due_date), 'MMM d, yyyy')}</span>
            {isOverdue && <span className="font-semibold">Overdue</span>}
          </div>
        )}

        {/* Category */}
        {task.category && (
          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
            {task.category}
          </span>
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
    </div>
  );
}
