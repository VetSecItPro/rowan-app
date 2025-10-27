'use client';

import { Clock, Flag, MoreVertical, Timer, Check, Edit, Trash2, ChevronDown, ChevronUp, MessageCircle, Activity, Paperclip } from 'lucide-react';
import { Reminder } from '@/lib/services/reminders-service';
import { formatTimestamp } from '@/lib/utils/date-utils';
import { useState } from 'react';
import { ActivityTimeline } from './ActivityTimeline';
import { CommentsSection } from './CommentsSection';
import { AttachmentList } from './AttachmentList';

interface ReminderCardProps {
  reminder: Reminder;
  onStatusChange: (reminderId: string, status: string) => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (reminderId: string) => void;
  onSnooze: (reminderId: string, minutes: number) => void;
  selectionMode?: boolean;
  selected?: boolean;
  onSelectionChange?: (reminderId: string, selected: boolean) => void;
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

export function ReminderCard({ reminder, onStatusChange, onEdit, onDelete, onSnooze, selectionMode, selected, onSelectionChange }: ReminderCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const isOverdue = reminder.reminder_time && new Date(reminder.reminder_time) < new Date() && reminder.status === 'active';
  const priorityColor = priorityColors[reminder.priority as keyof typeof priorityColors] || 'bg-gray-500';
  const statusColor = statusColors[reminder.status as keyof typeof statusColors] || 'bg-gray-500';

  const handleCheckboxClick = () => {
    const states: Array<'active' | 'snoozed' | 'completed'> = ['active', 'snoozed', 'completed'];
    const currentIndex = states.indexOf(reminder.status);
    const nextIndex = (currentIndex + 1) % states.length;
    const nextStatus = states[nextIndex];

    // Always set the status first
    onStatusChange(reminder.id, nextStatus);

    // If status is becoming "completed", auto-delete after a delay to prevent race conditions
    if (nextStatus === 'completed') {
      // 500ms delay allows the status change to complete in the database first
      setTimeout(() => {
        onDelete(reminder.id);
      }, 500);
    }
  };

  return (
    <div className={`bg-gray-50 dark:bg-gray-800 border-2 rounded-lg p-4 hover:shadow-lg transition-all duration-200 group ${
      selected ? 'border-blue-500 dark:border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-transparent'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          {/* Multi-select Checkbox (when selection mode enabled) */}
          {selectionMode && (
            <button
              onClick={() => onSelectionChange?.(reminder.id, !selected)}
              aria-label={`Select reminder: ${reminder.title}`}
              className={`btn-touch mt-1 w-6 h-6 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 active:scale-95 hover:scale-110 hover-lift  ${
                selected
                  ? 'bg-blue-500 border-blue-500'
                  : 'bg-transparent border-gray-400 dark:border-gray-500 hover:border-blue-500'
              }`}
            >
              {selected && <Check className="w-4 h-4 sm:w-3 sm:h-3 text-white" />}
            </button>
          )}

          {/* Status Checkbox */}
          <div className="relative group">
            <button
              onClick={handleCheckboxClick}
              aria-label={`Current status: ${reminder.status}. Click to cycle status.`}
              className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 hover:scale-105 ${
                reminder.status === 'completed'
                  ? 'bg-green-500 border-green-500'
                  : reminder.status === 'snoozed'
                  ? 'bg-purple-500 border-purple-500'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-pink-400 dark:hover:border-pink-500'
              }`}
            >
              {reminder.status === 'completed' && <Check className="w-3 h-3 text-white" />}
              {reminder.status === 'snoozed' && <div className="w-2 h-2 bg-white rounded-full" />}
            </button>
            {/* Improved tooltip positioning */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[99999] shadow-xl border border-gray-700 dark:border-gray-600">
              {reminder.status === 'active' ? 'Active - Click to snooze' : reminder.status === 'snoozed' ? 'Snoozed - Click to complete & auto-delete' : 'Completed - Click to reactivate'}
              {/* Tooltip arrow pointing up */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900 dark:border-b-gray-700"></div>
            </div>
          </div>

          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              {/* Left side: Emoji + Title + Badge grouped together */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Emoji */}
                <span className="text-lg flex-shrink-0">{reminder.emoji || '🔔'}</span>

                {/* Title and Badge container */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <h3 className={`font-semibold truncate ${
                    reminder.status === 'completed'
                      ? 'line-through opacity-60 text-gray-900 dark:text-white'
                      : categoryConfig[reminder.category as keyof typeof categoryConfig]?.textColor || 'text-gray-900 dark:text-white'
                  }`}>
                    {reminder.title}
                  </h3>

                  {/* Category Badge - now positioned immediately after title */}
                  {reminder.category && (
                    <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${categoryConfig[reminder.category as keyof typeof categoryConfig]?.bgColor} ${categoryConfig[reminder.category as keyof typeof categoryConfig]?.textColor}`}>
                      {categoryConfig[reminder.category as keyof typeof categoryConfig]?.icon} {categoryConfig[reminder.category as keyof typeof categoryConfig]?.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Right side: Assignee Avatar Badge */}
              {reminder.assignee && (
                <div className="relative group/avatar flex-shrink-0">
                  {reminder.assignee.avatar_url ? (
                    <img
                      src={reminder.assignee.avatar_url}
                      alt={reminder.assignee.name}
                      className="w-6 h-6 rounded-full object-cover border-2 border-white dark:border-gray-800"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold border-2 border-white dark:border-gray-800">
                      {reminder.assignee.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                  )}
                  {/* Tooltip */}
                  <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none z-10">
                    Assigned to {reminder.assignee.name}
                  </div>
                </div>
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
            className="p-2 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20">
                <button
                  onClick={() => {
                    onEdit(reminder);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 rounded-t-lg transition-colors"
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
                  className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 rounded-b-lg transition-colors"
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

      </div>

      {/* Snoozed Until */}
      {reminder.status === 'snoozed' && reminder.snooze_until && (
        <div className="mt-2 text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
          <span>
            Snoozed until {formatTimestamp(reminder.snooze_until, 'MMM d, h:mm a')}
          </span>
          {reminder.snoozer && (
            <span className="text-gray-600 dark:text-gray-400">
              by {reminder.snoozer.name}
            </span>
          )}
        </div>
      )}

      {/* Collapsible Sections */}
      <div className="mt-4 space-y-2">
        {/* Attachments Toggle */}
        <button
          onClick={() => setShowAttachments(!showAttachments)}
          className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Paperclip className="w-4 h-4" />
            <span>Attachments</span>
          </div>
          {showAttachments ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAttachments && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <AttachmentList reminderId={reminder.id} />
          </div>
        )}

        {/* Activity Timeline Toggle */}
        <button
          onClick={() => setShowActivity(!showActivity)}
          className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Activity className="w-4 h-4" />
            <span>Activity Timeline</span>
          </div>
          {showActivity ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showActivity && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <ActivityTimeline reminderId={reminder.id} />
          </div>
        )}

        {/* Comments Section Toggle */}
        <button
          onClick={() => setShowComments(!showComments)}
          className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <MessageCircle className="w-4 h-4" />
            <span>Comments</span>
          </div>
          {showComments ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showComments && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <CommentsSection reminderId={reminder.id} spaceId={reminder.space_id} />
          </div>
        )}
      </div>
    </div>
  );
}
