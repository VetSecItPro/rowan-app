// Unified Calendar Mapper Service
// Phase 9: Maps tasks, meals, reminders, goals to unified calendar items

import type { Task } from '@/lib/types';
import type { Meal } from '@/lib/services/meals-service';
import type { Reminder } from '@/lib/services/reminders-service';
import type { Goal } from '@/lib/services/goals-service';
import type { CalendarEvent } from '@/lib/services/calendar-service';
import type {
  UnifiedCalendarItem,
  UnifiedItemType,
} from '@/lib/types/unified-calendar-item';
import { MEAL_TYPE_TIMES } from '@/lib/types/unified-calendar-item';

/**
 * Unified Calendar Mapper Service
 * Converts various item types to a standardized UnifiedCalendarItem format
 */
export const unifiedCalendarMapper = {
  /**
   * Map a calendar event to a unified calendar item
   */
  mapEvent(event: CalendarEvent): UnifiedCalendarItem {
    return {
      id: `event-${event.id}`,
      originalId: event.id,
      itemType: 'event',
      title: event.title,
      description: event.description,
      startTime: event.start_time,
      endTime: event.end_time,
      isAllDay: !event.end_time || this.isAllDayEvent(event.start_time, event.end_time),
      location: event.location,
      category: event.category,
      status: event.status,
      assignedTo: event.assigned_to,
      createdBy: event.created_by,
      isRecurring: event.is_recurring,
      customColor: event.custom_color,
      metadata: {
        event_type: event.event_type,
        recurrence_pattern: event.recurrence_pattern,
        timezone: event.timezone,
      },
      originalItem: event,
    };
  },

  /**
   * Map a task to a unified calendar item
   * Only maps tasks with a due_date set
   */
  mapTask(task: Task): UnifiedCalendarItem | null {
    // Skip tasks without due dates
    if (!task.due_date) {
      return null;
    }

    // Parse the due date and set to end of day if no time specified
    const dueDate = new Date(task.due_date);
    const hasTime = task.due_date.includes('T') && !task.due_date.endsWith('T00:00:00');

    return {
      id: `task-${task.id}`,
      originalId: task.id,
      itemType: 'task',
      title: task.title,
      description: task.description,
      startTime: task.due_date,
      endTime: undefined, // Tasks are point-in-time
      isAllDay: !hasTime,
      category: task.category,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assigned_to,
      createdBy: task.created_by,
      isRecurring: task.is_recurring,
      metadata: {
        estimated_hours: task.estimated_hours,
        tags: task.tags,
        quick_note: task.quick_note,
        completed_at: task.completed_at,
      },
      originalItem: task,
    };
  },

  /**
   * Map a meal to a unified calendar item
   */
  mapMeal(meal: Meal): UnifiedCalendarItem {
    // Get meal time based on meal type
    const mealTime = MEAL_TYPE_TIMES[meal.meal_type] || MEAL_TYPE_TIMES.lunch;

    // Parse scheduled_date and add meal time
    const scheduledDate = new Date(meal.scheduled_date);
    scheduledDate.setHours(mealTime.hour, mealTime.minute, 0, 0);

    // End time is 1 hour after start (typical meal duration)
    const endDate = new Date(scheduledDate);
    endDate.setHours(endDate.getHours() + 1);

    // Build title with meal name or recipe name
    const mealName = meal.name || meal.recipe?.name || `${this.capitalizeFirst(meal.meal_type)} meal`;

    return {
      id: `meal-${meal.id}`,
      originalId: meal.id,
      itemType: 'meal',
      title: mealName,
      description: meal.notes,
      startTime: scheduledDate.toISOString(),
      endTime: endDate.toISOString(),
      isAllDay: false,
      category: meal.meal_type,
      assignedTo: meal.assigned_to,
      createdBy: meal.created_by,
      metadata: {
        meal_type: meal.meal_type,
        recipe_id: meal.recipe_id,
        recipe: meal.recipe,
        assignee: meal.assignee,
      },
      originalItem: meal,
    };
  },

  /**
   * Map a reminder to a unified calendar item
   */
  mapReminder(reminder: Reminder): UnifiedCalendarItem | null {
    // Skip reminders without a reminder_time
    if (!reminder.reminder_time) {
      return null;
    }

    return {
      id: `reminder-${reminder.id}`,
      originalId: reminder.id,
      itemType: 'reminder',
      title: reminder.title,
      description: reminder.description,
      startTime: reminder.reminder_time,
      endTime: undefined, // Reminders are point-in-time
      isAllDay: false,
      location: reminder.location,
      category: reminder.category,
      status: reminder.status,
      priority: reminder.priority,
      assignedTo: reminder.assigned_to,
      createdBy: reminder.created_by,
      isRecurring: !!reminder.repeat_pattern,
      metadata: {
        emoji: reminder.emoji,
        reminder_type: reminder.reminder_type,
        repeat_pattern: reminder.repeat_pattern,
        repeat_days: reminder.repeat_days,
        snooze_until: reminder.snooze_until,
        completed_at: reminder.completed_at,
        assignee: reminder.assignee,
      },
      originalItem: reminder,
    };
  },

  /**
   * Map a goal to a unified calendar item
   * Only maps goals with a target_date set
   */
  mapGoal(goal: Goal): UnifiedCalendarItem | null {
    // Skip goals without target dates
    if (!goal.target_date) {
      return null;
    }

    // Goals appear as all-day items on their target date
    const targetDate = new Date(goal.target_date);
    targetDate.setHours(0, 0, 0, 0);

    // Map priority from goal format to unified format
    let priority: 'low' | 'medium' | 'high' | 'urgent' | undefined;
    if (goal.priority === 'p1') priority = 'urgent';
    else if (goal.priority === 'p2') priority = 'high';
    else if (goal.priority === 'p3') priority = 'medium';
    else if (goal.priority === 'p4') priority = 'low';

    return {
      id: `goal-${goal.id}`,
      originalId: goal.id,
      itemType: 'goal',
      title: goal.title,
      description: goal.description,
      startTime: targetDate.toISOString(),
      endTime: undefined, // Goals are target dates (point-in-time)
      isAllDay: true, // Goals appear as all-day items
      category: goal.category,
      status: goal.status,
      priority,
      assignedTo: goal.assigned_to,
      createdBy: goal.created_by,
      metadata: {
        progress: goal.progress,
        visibility: goal.visibility,
        is_pinned: goal.is_pinned,
        milestones: goal.milestones,
        completed_at: goal.completed_at,
        assignee: goal.assignee,
      },
      originalItem: goal,
    };
  },

  /**
   * Batch map multiple events to unified items
   */
  mapEvents(events: CalendarEvent[]): UnifiedCalendarItem[] {
    return events.map((event) => this.mapEvent(event));
  },

  /**
   * Batch map multiple tasks to unified items
   * Filters out tasks without due dates
   */
  mapTasks(tasks: Task[]): UnifiedCalendarItem[] {
    return tasks
      .map((task) => this.mapTask(task))
      .filter((item): item is UnifiedCalendarItem => item !== null);
  },

  /**
   * Batch map multiple meals to unified items
   */
  mapMeals(meals: Meal[]): UnifiedCalendarItem[] {
    return meals.map((meal) => this.mapMeal(meal));
  },

  /**
   * Batch map multiple reminders to unified items
   * Filters out reminders without reminder_time
   */
  mapReminders(reminders: Reminder[]): UnifiedCalendarItem[] {
    return reminders
      .map((reminder) => this.mapReminder(reminder))
      .filter((item): item is UnifiedCalendarItem => item !== null);
  },

  /**
   * Batch map multiple goals to unified items
   * Filters out goals without target_date
   */
  mapGoals(goals: Goal[]): UnifiedCalendarItem[] {
    return goals
      .map((goal) => this.mapGoal(goal))
      .filter((item): item is UnifiedCalendarItem => item !== null);
  },

  /**
   * Get the original item from a unified calendar item
   * Returns typed result based on itemType
   */
  getOriginalItem<T extends UnifiedItemType>(
    item: UnifiedCalendarItem,
    expectedType: T
  ): T extends 'event'
    ? CalendarEvent
    : T extends 'task'
    ? Task
    : T extends 'meal'
    ? Meal
    : T extends 'reminder'
    ? Reminder
    : T extends 'goal'
    ? Goal
    : never {
    if (item.itemType !== expectedType) {
      throw new Error(`Expected item type ${expectedType} but got ${item.itemType}`);
    }
    return item.originalItem as T extends 'event'
      ? CalendarEvent
      : T extends 'task'
      ? Task
      : T extends 'meal'
      ? Meal
      : T extends 'reminder'
      ? Reminder
      : T extends 'goal'
      ? Goal
      : never;
  },

  /**
   * Parse the original ID from a unified item ID
   */
  parseItemId(unifiedId: string): { type: UnifiedItemType; id: string } {
    const [type, ...idParts] = unifiedId.split('-');
    return {
      type: type as UnifiedItemType,
      id: idParts.join('-'),
    };
  },

  /**
   * Sort unified items by start time
   */
  sortByStartTime(items: UnifiedCalendarItem[], ascending = true): UnifiedCalendarItem[] {
    return [...items].sort((a, b) => {
      const timeA = new Date(a.startTime).getTime();
      const timeB = new Date(b.startTime).getTime();
      return ascending ? timeA - timeB : timeB - timeA;
    });
  },

  /**
   * Filter items by date range
   */
  filterByDateRange(
    items: UnifiedCalendarItem[],
    startDate: Date,
    endDate: Date
  ): UnifiedCalendarItem[] {
    const start = startDate.getTime();
    const end = endDate.getTime();

    return items.filter((item) => {
      const itemStart = new Date(item.startTime).getTime();
      const itemEnd = item.endTime ? new Date(item.endTime).getTime() : itemStart;

      // Item overlaps with date range if:
      // - Item starts before range ends AND
      // - Item ends after range starts
      return itemStart <= end && itemEnd >= start;
    });
  },

  /**
   * Group items by date (YYYY-MM-DD format)
   */
  groupByDate(items: UnifiedCalendarItem[]): Map<string, UnifiedCalendarItem[]> {
    const groups = new Map<string, UnifiedCalendarItem[]>();

    for (const item of items) {
      const date = new Date(item.startTime);
      const dateKey = date.toISOString().split('T')[0];

      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(item);
    }

    // Sort items within each group by time
    for (const [, groupItems] of groups) {
      groupItems.sort((a, b) => {
        // All-day items first
        if (a.isAllDay && !b.isAllDay) return -1;
        if (!a.isAllDay && b.isAllDay) return 1;
        // Then by start time
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });
    }

    return groups;
  },

  /**
   * Count items by type
   */
  countByType(items: UnifiedCalendarItem[]): Record<UnifiedItemType, number> {
    const counts: Record<UnifiedItemType, number> = {
      event: 0,
      task: 0,
      meal: 0,
      reminder: 0,
      goal: 0,
    };

    for (const item of items) {
      counts[item.itemType]++;
    }

    return counts;
  },

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  /**
   * Check if an event spans the entire day
   */
  isAllDayEvent(startTime: string, endTime?: string): boolean {
    if (!endTime) return true;

    const start = new Date(startTime);
    const end = new Date(endTime);

    // Check if start is at midnight and duration is 24 hours or more
    const isStartMidnight = start.getHours() === 0 && start.getMinutes() === 0;
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    return isStartMidnight && durationHours >= 24;
  },

  /**
   * Capitalize first letter of a string
   */
  capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },
};
