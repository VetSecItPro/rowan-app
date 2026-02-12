'use client';

import { CheckSquare, Clock, Calendar as CalendarIcon, MoreVertical, ShoppingCart, FileText } from 'lucide-react';
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

type TaskStatus = 'pending' | 'in-progress' | 'blocked' | 'on-hold' | 'completed';

interface TaskCardProps {
  task: Task & { type?: 'task' | 'chore' };
  onStatusChange: (taskId: string, status: TaskStatus, type?: 'task' | 'chore') => void;
  onEdit: (task: Task & { type?: 'task' | 'chore' }) => void;
  onDelete: (taskId: string, type?: 'task' | 'chore') => void;
  onViewDetails?: (task: Task & { type?: 'task' | 'chore' }) => void;
  onSaveAsTemplate?: (task: Task & { type?: 'task' | 'chore' }) => void;
  linkedShoppingList?: LinkedShoppingList;
}

const priorityColors = {
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

const TaskCard = memo(function TaskCard({ task, onStatusChange, onEdit, onDelete, onViewDetails, onSaveAsTemplate, linkedShoppingList }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
  const priorityColor = priorityColors[task.priority as keyof typeof priorityColors] || 'bg-gray-500';

  // Handle status rotation: pending → in_progress → completed → pending
  const handleStatusClick = () => {
    let newStatus: TaskStatus = 'pending';
    if (task.status === 'pending') {
      newStatus = 'in-progress';
    } else if (task.status === 'in-progress') {
      newStatus = 'completed';
    } else if (task.status === 'completed') {
      newStatus = 'pending';
    }
    onStatusChange(task.id, newStatus, task.type);
  };

  // Get checkbox styling based on status
  const getCheckboxStyle = () => {
    if (task.status === 'completed') {
      return 'bg-green-500 border-green-500 hover:bg-green-600';
    } else if (task.status === 'in-progress') {
      return 'bg-amber-500 border-amber-500 hover:bg-amber-600';
    }
    return 'border-gray-600 bg-transparent hover:border-amber-400';
  };

  const getStatusTooltip = () => {
    if (task.status === 'pending') return 'Click to start';
    if (task.status === 'in-progress') return 'Click to complete';
    return 'Click to reset';
  };

  return (
    <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-2.5 sm:p-3 hover:shadow-md transition-all duration-200">
      {/* Main row */}
      <div className="flex items-center gap-2">
        {/* Checkbox */}
        <button
          onClick={handleStatusClick}
          title={getStatusTooltip()}
          className={`flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-md border-2 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900 ${getCheckboxStyle()}`}
        >
          {task.status === 'completed' && <CheckSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />}
          {task.status === 'in-progress' && <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />}
        </button>

        {/* Title */}
        <h3 className={`flex-1 min-w-0 text-sm font-medium text-white truncate ${
          task.status === 'completed' ? 'line-through opacity-60' : ''
        }`}>
          {task.title}
        </h3>

        {/* Type Badge */}
        <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
          task.type === 'chore'
            ? 'text-amber-400 bg-amber-900/30'
            : 'text-blue-400 bg-blue-900/30'
        }`}>
          {task.type === 'chore' ? 'Chore' : 'Task'}
        </span>

        {/* Priority dot */}
        <div className={`flex-shrink-0 w-2 h-2 rounded-full ${priorityColor}`} title={`${task.priority} priority`} />

        {/* Status badge */}
        <span className={`flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded ${
          task.status === 'completed'
            ? 'bg-green-900/30 text-green-400'
            : task.status === 'in-progress'
            ? 'bg-amber-900/30 text-amber-400'
            : 'bg-gray-700 text-gray-400'
        }`}>
          {task.status === 'in-progress' ? 'Active' : task.status === 'completed' ? 'Done' : 'Pending'}
        </span>

        {/* Menu button */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-400 hover:text-gray-300 rounded"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden">
                {onViewDetails && task.type === 'task' && (
                  <button
                    onClick={() => { onViewDetails(task); setShowMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700"
                  >
                    View Details
                  </button>
                )}
                <button
                  onClick={() => { onEdit(task); setShowMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700"
                >
                  Edit
                </button>
                {onSaveAsTemplate && task.type === 'task' && (
                  <button
                    onClick={() => { onSaveAsTemplate(task); setShowMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2 text-purple-400"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Save as Template
                  </button>
                )}
                <button
                  onClick={() => { onDelete(task.id, task.type); setShowMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-700"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Description + Meta row */}
      {(task.description || task.due_date || task.category) && (
        <div className="mt-1 ml-7 sm:ml-8 flex items-center gap-2 text-[11px] text-gray-400">
          {task.description && (
            <span className="line-clamp-2 flex-1">{task.description}</span>
          )}
          {task.due_date && (
            <span className={`flex items-center gap-0.5 flex-shrink-0 ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
              <CalendarIcon className="w-3 h-3" />
              {formatTimestamp(task.due_date, 'MMM d')}
            </span>
          )}
          {task.category && TASK_CATEGORIES[task.category as keyof typeof TASK_CATEGORIES] && (
            <span className="flex-shrink-0">
              {TASK_CATEGORIES[task.category as keyof typeof TASK_CATEGORIES].emoji}
            </span>
          )}
        </div>
      )}

      {/* Shopping list link */}
      {linkedShoppingList && (
        <Link
          href="/shopping"
          className="mt-1.5 ml-7 sm:ml-8 inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
        >
          <ShoppingCart className="w-3 h-3" />
          {linkedShoppingList.title}
        </Link>
      )}
    </div>
  );
});

export { TaskCard };
