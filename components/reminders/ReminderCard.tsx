'use client';

import { Clock, Flag, MoreVertical, Timer, Check, Edit, Trash2 } from 'lucide-react';
import { Reminder } from '@/lib/services/reminders-service';
import { formatTimestamp } from '@/lib/utils/date-utils';
import { useState } from 'react';

interface ReminderCardProps {
  reminder: Reminder;
  onStatusChange: (reminderId: string, status: string) => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (reminderId: string) => void;
  onSnooze: (reminderId: string, minutes: number) => void;
}

const priorityColors = {
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

const statusColors = {
  active: 'bg-blue-500',
  completed: 'bg-green-500',
  snoozed: 'bg-purple-500',
};

const categoryConfig = {
  bills: { label: 'Bills', icon: '💰', color: 'bg-green-500', textColor: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  health: { label: 'Health', icon: '💊', color: 'bg-red-500', textColor: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  work: { label: 'Work', icon: '💼', color: 'bg-blue-500', textColor: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  personal: { label: 'Personal', icon: '👤', color: 'bg-purple-500', textColor: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  household: { label: 'Household', icon: '🏠', color: 'bg-amber-500', textColor: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
};

export function ReminderCard({ reminder, onStatusChange, onEdit, onDelete, onSnooze }: ReminderCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);

  const isOverdue = reminder.reminder_time && new Date(reminder.reminder_time) < new Date() && reminder.status === 'active';
  const priorityColor = priorityColors[reminder.priority as keyof typeof priorityColors] || 'bg-gray-500';
  const statusColor = statusColors[reminder.status as keyof typeof statusColors] || 'bg-gray-500';

  const handleCheckboxClick = () => {
    const states: Array<'active' | 'snoozed' | 'completed'> = ['active', 'snoozed', 'completed'];
    const currentIndex = states.indexOf(reminder.status);
    const nextIndex = (currentIndex + 1) % states.length;
    onStatusChange(reminder.id, states[nextIndex]);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border border-transparent rounded-lg p-4 hover:shadow-lg transition-all duration-200 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          {/* Three-state Checkbox */}
          <div className="relative group">
            <button
              onClick={handleCheckboxClick}
              aria-label={`Toggle reminder status: ${reminder.status === 'active' ? 'Active' : reminder.status === 'snoozed' ? 'Snoozed' : 'Completed'}`}
              className={`mt-1 w-6 h-6 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                reminder.status === 'completed'
                  ? 'bg-green-500 border-green-500'
                  : reminder.status === 'snoozed'
                  ? 'bg-purple-500 border-purple-500'
                  : 'bg-transparent border-blue-500'
              }`}
            >
              {reminder.status === 'completed' && <Check className="w-4 h-4 text-white" />}
              {reminder.status === 'snoozed' && <div className="w-2 h-2 bg-white rounded-full" />}
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {reminder.status === 'active' ? 'Active' : reminder.status === 'snoozed' ? 'Snoozed' : 'Completed'}
            </div>
          </div>

          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {/* Emoji */}
              <span className="text-lg">{reminder.emoji || '🔔'}</span>

              <h3 className={`font-semibold flex-1 ${
                reminder.status === 'completed'
                  ? 'line-through opacity-60 text-gray-900 dark:text-white'
                  : categoryConfig[reminder.category as keyof typeof categoryConfig]?.textColor || 'text-gray-900 dark:text-white'
              }`}>
                {reminder.title}
              </h3>

              {/* Category Badge */}
              {reminder.category && (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryConfig[reminder.category as keyof typeof categoryConfig]?.bgColor} ${categoryConfig[reminder.category as keyof typeof categoryConfig]?.textColor}`}>
                  {categoryConfig[reminder.category as keyof typeof categoryConfig]?.icon} {categoryConfig[reminder.category as keyof typeof categoryConfig]?.label}
                </span>
              )}
            </div>
            {reminder.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {reminder.description}
              </p>
            )}
          </div>
        </div>

        {/* More Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Reminder options menu"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20">
                <button
                  onClick={() => {
                    onEdit(reminder);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 rounded-t-lg"
                >
                  <Edit className="w-4 h-4" />
                  Edit Reminder
                </button>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this reminder?')) {
                      onDelete(reminder.id);
                    }
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 rounded-b-lg"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Reminder
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Meta Information */}
      <div className="flex items-center gap-3 flex-wrap text-xs">
        {/* Time */}
        {reminder.reminder_time && (
          <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>
            <Clock className="w-3 h-3" />
            <span>{formatTimestamp(reminder.reminder_time, 'MMM d, h:mm a')}</span>
            {isOverdue && <span className="font-semibold ml-1">Overdue</span>}
          </div>
        )}

        {/* Priority */}
        <div className="flex items-center gap-1">
          <Flag className={`w-3 h-3 ${priorityColor.replace('bg-', 'text-')}`} />
          <span className="text-gray-600 dark:text-gray-400 capitalize">{reminder.priority}</span>
        </div>

        {/* Snooze Button */}
        {reminder.status === 'active' && (
          <div className="relative">
            <button
              onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
              className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
            >
              <Timer className="w-3 h-3" />
              <span>Snooze</span>
            </button>

            {showSnoozeMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSnoozeMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-32 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                  {[15, 30, 60, 120].map((minutes) => (
                    <button
                      key={minutes}
                      onClick={() => {
                        onSnooze(reminder.id, minutes);
                        setShowSnoozeMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {minutes < 60 ? `${minutes} min` : `${minutes / 60} hr`}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Snoozed Until */}
      {reminder.status === 'snoozed' && reminder.snooze_until && (
        <div className="mt-2 text-xs text-purple-600 dark:text-purple-400">
          Snoozed until {formatTimestamp(reminder.snooze_until, 'MMM d, h:mm a')}
        </div>
      )}
    </div>
  );
}
