'use client';

import { Bell, Clock, MapPin, Flag, MoreVertical, Timer } from 'lucide-react';
import { Reminder } from '@/lib/services/reminders-service';
import { format } from 'date-fns';
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

export function ReminderCard({ reminder, onStatusChange, onEdit, onDelete, onSnooze }: ReminderCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);

  const isOverdue = reminder.reminder_time && new Date(reminder.reminder_time) < new Date() && reminder.status === 'active';
  const priorityColor = priorityColors[reminder.priority as keyof typeof priorityColors] || 'bg-gray-500';
  const statusColor = statusColors[reminder.status as keyof typeof statusColors] || 'bg-gray-500';

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-all duration-200 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          {/* Checkbox */}
          <button
            onClick={() => onStatusChange(reminder.id, reminder.status === 'completed' ? 'active' : 'completed')}
            className={`mt-1 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              reminder.status === 'completed'
                ? 'bg-green-500 border-green-500'
                : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
            }`}
          >
            {reminder.status === 'completed' && (
              <Bell className="w-3 h-3 text-white" />
            )}
          </button>

          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-gray-900 dark:text-white mb-1 ${
              reminder.status === 'completed' ? 'line-through opacity-60' : ''
            }`}>
              {reminder.title}
            </h3>
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
                    onEdit(reminder);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    onDelete(reminder.id);
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
        {/* Type & Time/Location */}
        {reminder.reminder_type === 'time' && reminder.reminder_time && (
          <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>
            <Clock className="w-3 h-3" />
            <span>{format(new Date(reminder.reminder_time), 'MMM d, h:mm a')}</span>
            {isOverdue && <span className="font-semibold">Overdue</span>}
          </div>
        )}

        {reminder.reminder_type === 'location' && reminder.location && (
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <MapPin className="w-3 h-3" />
            <span>{reminder.location}</span>
          </div>
        )}

        {/* Priority */}
        <div className="flex items-center gap-1">
          <Flag className={`w-3 h-3 ${priorityColor.replace('bg-', 'text-')}`} />
          <span className="text-gray-600 dark:text-gray-400 capitalize">{reminder.priority}</span>
        </div>

        {/* Status Badge */}
        <span className={`px-2 py-0.5 ${statusColor} text-white rounded-full capitalize ml-auto`}>
          {reminder.status}
        </span>

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
                <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
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
          Snoozed until {format(new Date(reminder.snooze_until), 'MMM d, h:mm a')}
        </div>
      )}
    </div>
  );
}
