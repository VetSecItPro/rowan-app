'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Clock, MapPin, Calendar, CheckCircle2, Circle, AlertCircle, UtensilsCrossed, Bell, Target, Loader2 } from 'lucide-react';
import type { UnifiedCalendarItem } from '@/lib/types/unified-calendar-item';
import { UNIFIED_ITEM_COLORS, UNIFIED_ITEM_LABELS } from '@/lib/types/unified-calendar-item';
import type { Task } from '@/lib/types';
import type { Meal } from '@/lib/services/meals-service';
import type { Reminder } from '@/lib/services/reminders-service';
import type { Goal } from '@/lib/services/goals-service';
import { Modal } from '@/components/ui/Modal';

interface UnifiedItemPreviewModalProps {
  item: UnifiedCalendarItem;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Get the route for editing an item based on its type
 */
function getEditRoute(item: UnifiedCalendarItem): string {
  switch (item.itemType) {
    case 'task':
      return '/tasks';
    case 'meal':
      return '/meals';
    case 'reminder':
      return '/reminders';
    case 'goal':
      return '/goals';
    default:
      return '/calendar';
  }
}

const ITEM_TYPE_ICONS = {
  task: CheckCircle2,
  meal: UtensilsCrossed,
  reminder: Bell,
  goal: Target,
  calendar: Calendar,
};

/**
 * Format time for display
 */
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Get status badge styling
 */
function getStatusBadge(status?: string): { bg: string; text: string; label: string } {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'done':
      return { bg: 'bg-green-900/30', text: 'text-green-300', label: 'Completed' };
    case 'in-progress':
    case 'in_progress':
      return { bg: 'bg-blue-900/30', text: 'text-blue-300', label: 'In Progress' };
    case 'pending':
      return { bg: 'bg-yellow-900/30', text: 'text-yellow-300', label: 'Pending' };
    case 'overdue':
      return { bg: 'bg-red-900/30', text: 'text-red-300', label: 'Overdue' };
    default:
      return { bg: 'bg-gray-800', text: 'text-gray-300', label: status || 'Unknown' };
  }
}

/**
 * Render task-specific details
 */
function TaskDetails({ item }: { item: UnifiedCalendarItem }) {
  const task = item.originalItem as Task & { estimated_hours?: number };
  return (
    <div className="space-y-3">
      {task.priority && (
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-400">Priority:</span>
          <span className={`text-sm font-medium capitalize ${
            task.priority === 'urgent' ? 'text-red-600' :
            task.priority === 'high' ? 'text-orange-600' :
            task.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {task.priority}
          </span>
        </div>
      )}
      {task.estimated_hours && (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-400">Estimated:</span>
          <span className="text-sm font-medium text-white">
            {task.estimated_hours} hours
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Render meal-specific details
 */
function MealDetails({ item }: { item: UnifiedCalendarItem }) {
  const meal = item.originalItem as Meal;
  return (
    <div className="space-y-3">
      {meal.meal_type && (
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-400">Meal Type:</span>
          <span className="text-sm font-medium text-white capitalize">
            {meal.meal_type}
          </span>
        </div>
      )}
      {meal.recipe && (
        <div className="mt-3 p-3 bg-orange-900/20 rounded-lg">
          <p className="text-sm font-medium text-orange-200">Recipe</p>
          <p className="text-sm text-orange-300">{meal.recipe.name}</p>
          {meal.recipe.prep_time && (
            <p className="text-xs text-orange-400 mt-1">
              Prep: {meal.recipe.prep_time} min | Cook: {meal.recipe.cook_time || 0} min
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Render reminder-specific details
 */
function ReminderDetails({ item }: { item: UnifiedCalendarItem }) {
  const reminder = item.originalItem as Reminder & { recurrence_pattern?: string };
  return (
    <div className="space-y-3">
      {reminder.category && (
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-400">Category:</span>
          <span className="text-sm font-medium text-white capitalize">
            {reminder.category}
          </span>
        </div>
      )}
      {reminder.recurrence_pattern && (
        <div className="flex items-center gap-2">
          <Circle className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-pink-400 font-medium">
            Recurring: {reminder.recurrence_pattern}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Render goal-specific details
 */
function GoalDetails({ item }: { item: UnifiedCalendarItem }) {
  const goal = item.originalItem as Goal;
  return (
    <div className="space-y-3">
      {goal.progress !== undefined && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Progress</span>
            <span className="font-medium text-white">{goal.progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${goal.progress}%` }}
            />
          </div>
        </div>
      )}
      {goal.category && (
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-400">Category:</span>
          <span className="text-sm font-medium text-white capitalize">
            {goal.category}
          </span>
        </div>
      )}
    </div>
  );
}

export function UnifiedItemPreviewModal({ item, isOpen, onClose }: UnifiedItemPreviewModalProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const colors = UNIFIED_ITEM_COLORS[item.itemType];
  const label = UNIFIED_ITEM_LABELS[item.itemType];
  const Icon = ITEM_TYPE_ICONS[item.itemType] ?? Calendar;
  const statusBadge = getStatusBadge(item.status);

  const handleEditClick = () => {
    setIsNavigating(true);
    const route = getEditRoute(item);
    router.push(route);
    // Don't call onClose() - let navigation complete first
  };

  const footerContent = (
    <div className="flex items-center gap-3">
      <button
        onClick={onClose}
        disabled={isNavigating}
        className="px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 rounded-full transition-colors disabled:opacity-50"
      >
        Close
      </button>
      <button
        onClick={handleEditClick}
        disabled={isNavigating}
        className={`px-4 py-2 text-sm font-medium text-white rounded-full transition-colors flex items-center gap-2 disabled:opacity-70 ${
          item.itemType === 'task' ? 'bg-blue-600 hover:bg-blue-700' :
          item.itemType === 'meal' ? 'bg-orange-600 hover:bg-orange-700' :
          item.itemType === 'reminder' ? 'bg-pink-600 hover:bg-pink-700' :
          item.itemType === 'goal' ? 'bg-indigo-600 hover:bg-indigo-700' :
          'bg-purple-600 hover:bg-purple-700'
        }`}
      >
        {isNavigating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <ExternalLink className="w-4 h-4" />
            Edit in {label}s
          </>
        )}
      </button>
    </div>
  );

  const headerGradient = item.itemType === 'task' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
    item.itemType === 'meal' ? 'bg-gradient-meals' :
    item.itemType === 'reminder' ? 'bg-gradient-to-r from-pink-500 to-pink-600' :
    item.itemType === 'goal' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600' :
    'bg-gradient-to-r from-purple-500 to-purple-600';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item.title}
      maxWidth="md"
      headerGradient={headerGradient}
      footer={footerContent}
    >
      <div className="space-y-4">
        {/* Type & Status Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${colors.bg}`}>
            <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
            <span className={`text-xs font-semibold ${colors.text}`}>
              {label}
            </span>
          </div>
            {/* Status Badge */}
            {item.status && (
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                  {statusBadge.label}
                </span>
              </div>
            )}

        </div>

        {/* Date & Time */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-white">
              {formatDate(item.startTime)}
            </span>
          </div>
          {!item.isAllDay && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-white">
                {formatTime(item.startTime)}
                {item.endTime && ` - ${formatTime(item.endTime)}`}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <div className="p-3 bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-300">
              {item.description}
            </p>
          </div>
        )}

        {/* Location */}
        {item.location && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-300">
              {item.location}
            </span>
          </div>
        )}

        {/* Type-specific details */}
        {item.itemType === 'task' && <TaskDetails item={item} />}
        {item.itemType === 'meal' && <MealDetails item={item} />}
        {item.itemType === 'reminder' && <ReminderDetails item={item} />}
        {item.itemType === 'goal' && <GoalDetails item={item} />}
      </div>
    </Modal>
  );
}
