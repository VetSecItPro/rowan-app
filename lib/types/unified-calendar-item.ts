// Unified Calendar Item Types
// Phase 9: Types for displaying tasks, meals, reminders, and goals on the calendar

import type { Task } from '@/lib/types';
import type { Meal } from '@/lib/services/meals-service';
import type { Reminder } from '@/lib/services/reminders-service';
import type { CalendarEvent } from '@/lib/services/calendar-service';
import type { Goal } from '@/lib/services/goals-service';

// =============================================================================
// UNIFIED CALENDAR ITEM TYPE
// =============================================================================

/**
 * The type of item displayed on the calendar
 * - 'event': Regular calendar events
 * - 'task': Tasks with due dates
 * - 'meal': Scheduled meals
 * - 'reminder': Reminders with scheduled times
 * - 'goal': Goals with target dates (future phase)
 */
export type UnifiedItemType = 'event' | 'task' | 'meal' | 'reminder' | 'goal';

/**
 * Color scheme for different item types
 * Based on competitive analysis of family calendar apps
 */
export const UNIFIED_ITEM_COLORS: Record<UnifiedItemType, { bg: string; border: string; text: string; dot: string }> = {
  event: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    border: 'border-purple-300 dark:border-purple-700',
    text: 'text-purple-800 dark:text-purple-200',
    dot: 'bg-purple-500',
  },
  task: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-800 dark:text-blue-200',
    dot: 'bg-blue-500',
  },
  meal: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    border: 'border-orange-300 dark:border-orange-700',
    text: 'text-orange-800 dark:text-orange-200',
    dot: 'bg-orange-500',
  },
  reminder: {
    bg: 'bg-pink-100 dark:bg-pink-900/30',
    border: 'border-pink-300 dark:border-pink-700',
    text: 'text-pink-800 dark:text-pink-200',
    dot: 'bg-pink-500',
  },
  goal: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    border: 'border-indigo-300 dark:border-indigo-700',
    text: 'text-indigo-800 dark:text-indigo-200',
    dot: 'bg-indigo-500',
  },
};

/**
 * Icons for different item types
 */
export const UNIFIED_ITEM_ICONS: Record<UnifiedItemType, string> = {
  event: '📅',
  task: '✅',
  meal: '🍽️',
  reminder: '⏰',
  goal: '🎯',
};

/**
 * Labels for different item types
 */
export const UNIFIED_ITEM_LABELS: Record<UnifiedItemType, string> = {
  event: 'Event',
  task: 'Task',
  meal: 'Meal',
  reminder: 'Reminder',
  goal: 'Goal',
};

/**
 * Unified calendar item representing any type of calendar-displayable item
 * This is the standardized format used by the calendar view
 */
export interface UnifiedCalendarItem {
  /** Unique identifier (prefixed with item type, e.g., "task-uuid" or "meal-uuid") */
  id: string;

  /** The original item's ID without the type prefix */
  originalId: string;

  /** The type of item */
  itemType: UnifiedItemType;

  /** Display title */
  title: string;

  /** Optional description or notes */
  description?: string;

  /** Start time for the item (ISO string) */
  startTime: string;

  /** End time for the item (ISO string) - optional for all-day items */
  endTime?: string;

  /** Whether this is an all-day item (no specific time) */
  isAllDay: boolean;

  /** Location if applicable */
  location?: string;

  /** Category/type specific to the item */
  category?: string;

  /** Status of the item (completed, pending, etc.) */
  status?: string;

  /** Priority level if applicable */
  priority?: 'low' | 'medium' | 'high' | 'urgent';

  /** Assigned user ID if applicable */
  assignedTo?: string;

  /** Creator user ID */
  createdBy?: string;

  /** Whether item is recurring */
  isRecurring?: boolean;

  /** Custom color override (hex) */
  customColor?: string;

  /** Additional metadata specific to the item type */
  metadata?: Record<string, unknown>;

  /** Reference to the original item for actions */
  originalItem: Task | Meal | Reminder | CalendarEvent | Goal | Record<string, unknown>;
}

// =============================================================================
// FILTER STATE
// =============================================================================

/**
 * Filter state for the unified calendar view
 */
export interface UnifiedCalendarFilters {
  /** Show calendar events */
  showEvents: boolean;

  /** Show tasks with due dates */
  showTasks: boolean;

  /** Show scheduled meals */
  showMeals: boolean;

  /** Show reminders */
  showReminders: boolean;

  /** Show goals (future) */
  showGoals: boolean;
}

/**
 * Default filter state - all visible
 */
export const DEFAULT_UNIFIED_FILTERS: UnifiedCalendarFilters = {
  showEvents: true,
  showTasks: true,
  showMeals: true,
  showReminders: true,
  showGoals: true,
};

// =============================================================================
// MEAL TIME CONSTANTS
// =============================================================================

/**
 * Default times for meal types (24-hour format)
 */
export const MEAL_TYPE_TIMES: Record<string, { hour: number; minute: number }> = {
  breakfast: { hour: 8, minute: 0 },
  lunch: { hour: 12, minute: 0 },
  dinner: { hour: 18, minute: 0 },
  snack: { hour: 15, minute: 0 },
};

// =============================================================================
// FETCH OPTIONS
// =============================================================================

/**
 * Options for fetching unified calendar items
 */
export interface UnifiedCalendarFetchOptions {
  /** Start date for the date range */
  startDate: Date;

  /** End date for the date range */
  endDate: Date;

  /** Filter settings */
  filters?: UnifiedCalendarFilters;

  /** Include completed items */
  includeCompleted?: boolean;

  /** Space ID to fetch items for */
  spaceId: string;
}

/**
 * Result from fetching unified calendar items
 */
export interface UnifiedCalendarFetchResult {
  /** All unified items */
  items: UnifiedCalendarItem[];

  /** Count by type */
  counts: Record<UnifiedItemType, number>;

  /** Any errors that occurred during fetching */
  errors?: string[];
}
