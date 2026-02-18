/**
 * Tool Executor for Rowan AI Chat Assistant
 * Maps AI tool calls to service layer methods with security enforcement.
 *
 * SECURITY: This is the boundary between untrusted AI output and trusted service layer.
 * - space_id is ALWAYS injected from authenticated session (never from AI)
 * - created_by/user_id is ALWAYS injected from authenticated session
 * - All parameters validated via Zod before service execution
 */

import { logger } from '@/lib/logger';

// Import validation schemas
import { createTaskSchema } from '@/lib/validations/task-schemas';
import { createChoreSchema } from '@/lib/validations/chore-schemas';
import { createCalendarEventSchema } from '@/lib/validations/calendar-event-schemas';
import { createReminderSchema } from '@/lib/validations/reminder-schemas';
import { createShoppingItemSchema, createShoppingListSchema } from '@/lib/validations/shopping-schemas';
import { createMealSchema } from '@/lib/validations/meal-schemas';
import { createGoalSchema } from '@/lib/validations/goal-schemas';
import { createExpenseSchema } from '@/lib/validations/expense-schemas';
import { createProjectSchema } from '@/lib/validations/project-schemas';

/**
 * Strip null values from a Zod-parsed object and cast to the target service type.
 * Zod `.nullable()` produces `null`, but service types expect `undefined`.
 *
 * This is safe because:
 * 1. Zod validates the structure at runtime
 * 2. Null values are deleted (become undefined)
 * 3. The AI sends values from our tool definitions which match the schemas
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripNulls<TTarget>(obj: Record<string, any>): TTarget {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (result[key] === null) {
      delete result[key];
    }
  }
  return result as TTarget;
}

/**
 * SECURITY HELPERS — Runtime validation for AI-supplied parameters
 */

/** Require a non-null string parameter. Returns null with error message if missing. */
function requireString(
  params: Record<string, unknown>,
  key: string,
  featureType: FeatureType,
): { value: string } | { error: ToolExecutionResult } {
  const val = params[key];
  if (typeof val !== 'string' || val.trim().length === 0) {
    return {
      error: {
        success: false,
        message: `Missing required parameter: ${key}`,
        featureType,
      },
    };
  }
  return { value: val.trim() };
}

/** Require a positive number parameter. Returns null with error message if missing or invalid. */
function requirePositiveNumber(
  params: Record<string, unknown>,
  key: string,
  featureType: FeatureType,
): { value: number } | { error: ToolExecutionResult } {
  const val = params[key];
  if (typeof val !== 'number' || val <= 0 || !Number.isFinite(val)) {
    return {
      error: {
        success: false,
        message: `${key} must be a positive number`,
        featureType,
      },
    };
  }
  return { value: val };
}

/** Clamp an integer to a range. Returns clamped value. */
function clampInt(val: unknown, min: number, max: number, fallback: number): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(min, Math.min(max, Math.round(val)));
}

/**
 * Pick only allowed keys from an object. Prevents AI from injecting
 * protected fields (space_id, created_by, user_id) into update payloads.
 */
function pickAllowedKeys(
  obj: Record<string, unknown>,
  allowedKeys: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    if (key in obj && obj[key] !== undefined && obj[key] !== null) {
      result[key] = obj[key];
    }
  }
  return result;
}

/** Truncate a text field to a maximum safe length */
function safeText(val: unknown, maxLength = 5000): string {
  if (typeof val !== 'string') return '';
  return val.slice(0, maxLength).trim();
}

// Import services and their input types
import { tasksService } from '@/lib/services/tasks-service';
import { choresService } from '@/lib/services/chores-service';
import type { CreateChoreInput } from '@/lib/services/chores-service';
import { calendarService } from '@/lib/services/calendar-service';
import { remindersService } from '@/lib/services/reminders-service';
import type { CreateReminderInput } from '@/lib/services/reminders-service';
import { shoppingService } from '@/lib/services/shopping-service';
import type { CreateItemInput } from '@/lib/services/shopping-service';
import { mealsService } from '@/lib/services/meals-service';
import type { CreateMealInput, CreateRecipeInput } from '@/lib/services/meals-service';
import { goalsService } from '@/lib/services/goals-service';
import type { CreateGoalInput, CreateMilestoneInput } from '@/lib/services/goals-service';
import { projectsService } from '@/lib/services/budgets-service';
import type { CreateExpenseInput } from '@/lib/services/budgets-service';
import { projectsOnlyService } from '@/lib/services/projects-service';
import type { CreateProjectInput } from '@/lib/services/projects-service';
import { messagesService } from '@/lib/services/messages-service';
import { rewardsService } from '@/lib/services/rewards/rewards-service';
import { pointsService } from '@/lib/services/rewards/points-service';
import { billsService } from '@/lib/services/bills-service';
import { taskSubtasksService } from '@/lib/services/task-subtasks-service';
import type { CreateSubtaskInput } from '@/lib/services/task-subtasks-service';
import { projectMilestonesService } from '@/lib/services/project-milestones-service';
import { getCategorySpending, getSpendingInsights, getBudgetVariances } from '@/lib/services/spending-insights-service';
import { taskCommentsService } from '@/lib/services/task-comments-service';
import { choreRotationService } from '@/lib/services/chore-rotation-service';
import { goalService } from '@/lib/services/goals/goal-service';
import { checkinService } from '@/lib/services/goals/checkin-service';
import {
  getProjectLineItems, createLineItem, updateLineItem, deleteLineItem, markLineItemPaid,
  getVendors, createVendor as createVendorFn, updateVendor as updateVendorFn, deleteVendor as deleteVendorFn,
  getProjectStats as getProjectStatsFn,
} from '@/lib/services/project-tracking-service';
import { getRecurringPatterns, confirmPattern, ignorePattern } from '@/lib/services/recurring-expenses-service';
import { getPartnershipBalance, createSettlement as createSettlementFn } from '@/lib/services/expense-splitting-service';
import { getUserPenalties, forgivePenalty, getSpacePenaltySettings, updateSpacePenaltySettings } from '@/lib/services/rewards/late-penalty-service';

import type { FeatureType } from '@/lib/types/chat';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ToolExecutionContext {
  spaceId: string;
  userId: string;
  /** Server-side Supabase client with the user's auth session (for RLS) */
  supabase: SupabaseClient;
}

export interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  featureType: FeatureType;
}

/**
 * Execute a tool call from the AI with security enforcement.
 *
 * SECURITY:
 * - `context.spaceId` and `context.userId` come from the authenticated session,
 *   NOT from the AI's parameters. This prevents the AI from accessing or mutating
 *   data in spaces it should not touch.
 * - All inputs are validated through Zod schemas before reaching the service layer.
 * - Raw error details (stack traces, DB messages) are never returned to the AI.
 */
export async function executeTool(
  toolName: string,
  parameters: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<ToolExecutionResult> {
  const { spaceId, userId, supabase } = context;

  try {
    switch (toolName) {
      // ═══════════════════════════════════════
      // TASKS
      // ═══════════════════════════════════════
      case 'create_task': {
        const input = createTaskSchema.parse({
          ...parameters,
          space_id: spaceId,
          created_by: userId,
          status: parameters.status || 'pending',
          priority: parameters.priority || 'medium',
        });
        const task = await tasksService.createTask(input, supabase);
        return {
          success: true,
          message: `Created task "${task.title}"${task.assigned_to ? ' assigned to a member' : ''}`,
          data: { id: task.id, title: task.title },
          featureType: 'task',
        };
      }

      case 'complete_task': {
        const taskId = parameters.task_id as string;
        if (!taskId) {
          return { success: false, message: 'Task ID is required', featureType: 'task' };
        }
        // tasksService.updateTask auto-sets completed_at when status is 'completed'
        await tasksService.updateTask(taskId, { status: 'completed' }, supabase);
        return {
          success: true,
          message: 'Task marked as completed',
          data: { id: taskId },
          featureType: 'task',
        };
      }

      case 'list_tasks': {
        let tasks = await tasksService.getTasks(spaceId, {
          status: parameters.status as string | undefined,
          priority: parameters.priority as string | undefined,
          assigned_to: parameters.assigned_to as string | undefined,
          category: parameters.category as string | undefined,
          search: parameters.search as string | undefined,
        }, supabase);
        // Client-side overdue filter (tasks with due_date in the past and not completed)
        if (parameters.overdue === true) {
          const now = new Date().toISOString();
          tasks = tasks.filter(t => t.due_date && t.due_date < now && t.status !== 'completed');
        }
        return {
          success: true,
          message: `Found ${tasks.length} task${tasks.length === 1 ? '' : 's'}`,
          data: {
            count: tasks.length,
            tasks: tasks.slice(0, 15).map(t => ({
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority,
              due_date: t.due_date,
              assigned_to: t.assigned_to,
              category: t.category,
            })),
          },
          featureType: 'task',
        };
      }

      case 'update_task': {
        const taskId = parameters.task_id as string;
        if (!taskId) {
          return { success: false, message: 'Task ID is required', featureType: 'task' };
        }
        const taskUpdates = pickAllowedKeys(parameters, [
          'title', 'description', 'status', 'priority', 'due_date', 'assigned_to', 'category', 'notes',
        ]);
        await tasksService.updateTask(taskId, taskUpdates, supabase);
        return {
          success: true,
          message: 'Task updated',
          data: { id: taskId },
          featureType: 'task',
        };
      }

      case 'delete_task': {
        const taskId = parameters.task_id as string;
        if (!taskId) {
          return { success: false, message: 'Task ID is required', featureType: 'task' };
        }
        await tasksService.deleteTask(taskId, supabase);
        return {
          success: true,
          message: 'Task deleted',
          data: { id: taskId },
          featureType: 'task',
        };
      }

      // ═══════════════════════════════════════
      // CHORES
      // ═══════════════════════════════════════
      case 'create_chore': {
        const input = stripNulls<CreateChoreInput>(createChoreSchema.parse({
          ...parameters,
          space_id: spaceId,
          created_by: userId,
          status: parameters.status || 'pending',
        }));
        const chore = await choresService.createChore(input, supabase);
        return {
          success: true,
          message: `Created chore "${chore.title}" (${chore.frequency})${chore.assigned_to ? ' assigned to a member' : ''}`,
          data: { id: chore.id, title: chore.title },
          featureType: 'chore',
        };
      }

      case 'complete_chore': {
        const choreId = parameters.chore_id as string;
        if (!choreId) {
          return { success: false, message: 'Chore ID is required', featureType: 'chore' };
        }
        // Use completeChoreWithRewards to properly award points + track streaks
        const result = await choresService.completeChoreWithRewards(choreId, userId, supabase);
        const pointsMsg = result.pointsAwarded > 0
          ? ` (+${result.pointsAwarded} points${result.streakBonus > 0 ? `, ${result.streakBonus} streak bonus` : ''})`
          : '';
        return {
          success: true,
          message: `Chore marked as completed${pointsMsg}`,
          data: {
            id: choreId,
            points_awarded: result.pointsAwarded,
            streak_bonus: result.streakBonus,
            new_streak: result.newStreak,
          },
          featureType: 'chore',
        };
      }

      case 'update_chore': {
        const choreId = parameters.chore_id as string;
        if (!choreId) {
          return { success: false, message: 'Chore ID is required', featureType: 'chore' };
        }
        const choreUpdates = pickAllowedKeys(parameters, [
          'title', 'description', 'status', 'frequency', 'assigned_to', 'due_date', 'point_value', 'notes',
        ]);
        await choresService.updateChore(choreId, choreUpdates, supabase);
        return {
          success: true,
          message: 'Chore updated',
          data: { id: choreId },
          featureType: 'chore',
        };
      }

      case 'delete_chore': {
        const choreId = parameters.chore_id as string;
        if (!choreId) {
          return { success: false, message: 'Chore ID is required', featureType: 'chore' };
        }
        await choresService.deleteChore(choreId, supabase);
        return {
          success: true,
          message: 'Chore deleted',
          data: { id: choreId },
          featureType: 'chore',
        };
      }

      case 'list_chores': {
        const chores = await choresService.getChores(spaceId, {
          status: parameters.status as string | undefined,
          frequency: parameters.frequency as string | undefined,
          assigned_to: parameters.assigned_to as string | undefined,
          search: parameters.search as string | undefined,
        }, supabase);
        return {
          success: true,
          message: `Found ${chores.length} chore${chores.length === 1 ? '' : 's'}`,
          data: {
            count: chores.length,
            chores: chores.slice(0, 15).map(c => ({
              id: c.id, title: c.title, status: c.status, frequency: c.frequency,
              assigned_to: c.assigned_to, due_date: c.due_date, point_value: c.point_value,
            })),
          },
          featureType: 'chore',
        };
      }

      // ═══════════════════════════════════════
      // CALENDAR EVENTS
      // ═══════════════════════════════════════
      case 'create_event': {
        // Map recurrence_pattern to is_recurring boolean for the DB
        const recurrencePattern = parameters.recurrence_pattern as string | undefined;
        const input = createCalendarEventSchema.parse({
          ...parameters,
          space_id: spaceId,
          is_recurring: recurrencePattern ? recurrencePattern !== 'none' : false,
        });
        const event = await calendarService.createEvent(input, supabase);
        return {
          success: true,
          message: `Created event "${event.title}"${event.start_time ? ` on ${formatDateForPreview(event.start_time)}` : ''}`,
          data: { id: event.id, title: event.title },
          featureType: 'event',
        };
      }

      case 'update_event': {
        const eventId = parameters.event_id as string;
        if (!eventId) {
          return { success: false, message: 'Event ID is required', featureType: 'event' };
        }
        const eventUpdateParams = pickAllowedKeys(parameters, [
          'title', 'description', 'start_time', 'end_time', 'location', 'category',
          'event_type', 'assigned_to', 'recurrence_pattern', 'custom_color', 'is_all_day', 'notes',
        ]);
        await calendarService.updateEvent(eventId, eventUpdateParams, supabase);
        return {
          success: true,
          message: 'Event updated',
          data: { id: eventId },
          featureType: 'event',
        };
      }

      case 'delete_event': {
        const eventId = parameters.event_id as string;
        if (!eventId) {
          return { success: false, message: 'Event ID is required', featureType: 'event' };
        }
        // Soft delete (30-day retention) by default
        await calendarService.deleteEvent(eventId, false, supabase);
        return {
          success: true,
          message: 'Event deleted',
          data: { id: eventId },
          featureType: 'event',
        };
      }

      case 'list_events': {
        const allEvents = await calendarService.getEvents(spaceId, false, supabase);
        const startDate = parameters.start_date as string | undefined;
        const endDate = parameters.end_date as string | undefined;
        const categoryFilter = parameters.category as string | undefined;
        // Filter to date range if specified, otherwise default to today+future
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const rangeStart = startDate ? new Date(startDate) : today;
        let events = allEvents.filter(e => {
          if (!e.start_time) return true;
          const eventDate = new Date(e.start_time);
          if (eventDate < rangeStart) return false;
          if (endDate && eventDate > new Date(endDate + 'T23:59:59')) return false;
          return true;
        });
        if (categoryFilter) {
          events = events.filter(e => e.category?.toLowerCase() === categoryFilter.toLowerCase());
        }
        return {
          success: true,
          message: `Found ${events.length} event${events.length === 1 ? '' : 's'}`,
          data: {
            count: events.length,
            events: events.slice(0, 15).map(e => ({
              id: e.id, title: e.title, start_time: e.start_time, end_time: e.end_time,
              location: e.location, category: e.category, assigned_to: e.assigned_to,
            })),
          },
          featureType: 'event',
        };
      }

      // ═══════════════════════════════════════
      // REMINDERS
      // ═══════════════════════════════════════
      case 'create_reminder': {
        // Map recurrence_pattern to is_recurring boolean for the DB
        const reminderRecurrence = parameters.recurrence_pattern as string | undefined;
        const input = stripNulls<CreateReminderInput>(createReminderSchema.parse({
          ...parameters,
          space_id: spaceId,
          created_by: userId,
          is_recurring: reminderRecurrence ? reminderRecurrence !== 'none' : false,
        }));
        const reminder = await remindersService.createReminder(input, supabase);
        return {
          success: true,
          message: `Created reminder "${reminder.title}"`,
          data: { id: reminder.id, title: reminder.title },
          featureType: 'reminder',
        };
      }

      case 'complete_reminder': {
        const reminderId = parameters.reminder_id as string;
        if (!reminderId) {
          return { success: false, message: 'Reminder ID is required', featureType: 'reminder' };
        }
        await remindersService.updateReminder(reminderId, { status: 'completed' }, supabase);
        return {
          success: true,
          message: 'Reminder completed',
          data: { id: reminderId },
          featureType: 'reminder',
        };
      }

      case 'update_reminder': {
        const reminderId = parameters.reminder_id as string;
        if (!reminderId) {
          return { success: false, message: 'Reminder ID is required', featureType: 'reminder' };
        }
        const reminderUpdates = pickAllowedKeys(parameters, [
          'title', 'description', 'status', 'reminder_time', 'priority', 'category',
          'assigned_to', 'recurrence_pattern', 'location', 'notes', 'is_recurring',
        ]);
        await remindersService.updateReminder(reminderId, reminderUpdates, supabase);
        return {
          success: true,
          message: 'Reminder updated',
          data: { id: reminderId },
          featureType: 'reminder',
        };
      }

      case 'delete_reminder': {
        const reminderId = parameters.reminder_id as string;
        if (!reminderId) {
          return { success: false, message: 'Reminder ID is required', featureType: 'reminder' };
        }
        await remindersService.deleteReminder(reminderId, supabase);
        return {
          success: true,
          message: 'Reminder deleted',
          data: { id: reminderId },
          featureType: 'reminder',
        };
      }

      case 'snooze_reminder': {
        const reminderId = parameters.reminder_id as string;
        const snoozeMinutes = (parameters.snooze_minutes as number) || 15;
        if (!reminderId) {
          return { success: false, message: 'Reminder ID is required', featureType: 'reminder' };
        }
        // snoozeReminder(id, minutes, userId) — sets status to 'snoozed' and snooze_until
        await remindersService.snoozeReminder(reminderId, snoozeMinutes, userId);
        return {
          success: true,
          message: `Reminder snoozed for ${snoozeMinutes} minute${snoozeMinutes === 1 ? '' : 's'}`,
          data: { id: reminderId, snooze_minutes: snoozeMinutes },
          featureType: 'reminder',
        };
      }

      case 'list_reminders': {
        const reminders = await remindersService.getReminders(spaceId, supabase);
        let filtered = parameters.status
          ? reminders.filter(r => r.status === parameters.status)
          : reminders;
        if (parameters.category) {
          filtered = filtered.filter(r => r.category === parameters.category);
        }
        if (parameters.assigned_to) {
          filtered = filtered.filter(r => r.assigned_to === parameters.assigned_to);
        }
        return {
          success: true,
          message: `Found ${filtered.length} reminder${filtered.length === 1 ? '' : 's'}`,
          data: {
            count: filtered.length,
            reminders: filtered.slice(0, 15).map(r => ({
              id: r.id, title: r.title, status: r.status, reminder_time: r.reminder_time,
              priority: r.priority, category: r.category, assigned_to: r.assigned_to,
            })),
          },
          featureType: 'reminder',
        };
      }

      // ═══════════════════════════════════════
      // SHOPPING
      // ═══════════════════════════════════════
      case 'create_shopping_list': {
        const input = createShoppingListSchema.parse({
          ...parameters,
          space_id: spaceId,
        });
        const list = await shoppingService.createList(input, supabase);
        return {
          success: true,
          message: `Created shopping list "${list.title}"`,
          data: { id: list.id, title: list.title },
          featureType: 'shopping',
        };
      }

      case 'add_shopping_item': {
        const input = stripNulls<CreateItemInput>(createShoppingItemSchema.parse({
          ...parameters,
        }));
        const item = await shoppingService.createItem(input, supabase);
        return {
          success: true,
          message: `Added "${item.name}" to shopping list`,
          data: { id: item.id, name: item.name },
          featureType: 'shopping',
        };
      }

      case 'update_shopping_item': {
        const itemId = parameters.item_id as string;
        if (!itemId) {
          return { success: false, message: 'Item ID is required', featureType: 'shopping' };
        }
        const itemUpdates = pickAllowedKeys(parameters, [
          'name', 'quantity', 'category', 'checked', 'notes', 'unit', 'price',
        ]);
        // updateItem does not accept a supabase client param — RLS enforces access
        await shoppingService.updateItem(itemId, itemUpdates);
        return {
          success: true,
          message: 'Shopping item updated',
          data: { id: itemId },
          featureType: 'shopping',
        };
      }

      case 'delete_shopping_item': {
        const itemId = parameters.item_id as string;
        if (!itemId) {
          return { success: false, message: 'Item ID is required', featureType: 'shopping' };
        }
        // deleteItem does not accept a supabase client param — RLS enforces access
        await shoppingService.deleteItem(itemId);
        return {
          success: true,
          message: 'Shopping item deleted',
          data: { id: itemId },
          featureType: 'shopping',
        };
      }

      case 'toggle_shopping_item': {
        const itemId = parameters.item_id as string;
        const checked = parameters.checked as boolean;
        if (!itemId) {
          return { success: false, message: 'Item ID is required', featureType: 'shopping' };
        }
        if (checked === undefined) {
          return { success: false, message: 'Checked state is required', featureType: 'shopping' };
        }
        // toggleItem does not accept a supabase client param — RLS enforces access
        await shoppingService.toggleItem(itemId, checked);
        return {
          success: true,
          message: checked ? 'Item checked off' : 'Item unchecked',
          data: { id: itemId, checked },
          featureType: 'shopping',
        };
      }

      case 'list_shopping_lists': {
        const lists = await shoppingService.getLists(spaceId, supabase);
        return {
          success: true,
          message: `Found ${lists.length} shopping list${lists.length === 1 ? '' : 's'}`,
          data: {
            count: lists.length,
            lists: lists.slice(0, 10).map(l => ({
              id: l.id, title: l.title,
              items: (l.items || []).slice(0, 20).map((i) => ({
                id: i.id, name: i.name, checked: i.checked, quantity: i.quantity, category: i.category,
              })),
            })),
          },
          featureType: 'shopping',
        };
      }

      // ═══════════════════════════════════════
      // MEALS
      // ═══════════════════════════════════════
      case 'plan_meal': {
        const parsed = createMealSchema.parse({
          ...parameters,
          space_id: spaceId,
        });
        const input = stripNulls<CreateMealInput>(parsed);
        const meal = await mealsService.createMeal(input, supabase);
        return {
          success: true,
          message: `Planned ${meal.meal_type}${meal.name ? `: ${meal.name}` : ''} for ${formatDateForPreview(meal.scheduled_date)}`,
          data: { id: meal.id, meal_type: meal.meal_type },
          featureType: 'meal',
        };
      }

      case 'create_recipe': {
        const name = parameters.name as string;
        if (!name) {
          return { success: false, message: 'Recipe name is required', featureType: 'meal' };
        }
        // Parse ingredients — accept comma-separated string or array
        let ingredients: string[] = [];
        if (typeof parameters.ingredients === 'string') {
          ingredients = (parameters.ingredients as string).split(',').map(i => i.trim()).filter(Boolean);
        } else if (Array.isArray(parameters.ingredients)) {
          ingredients = parameters.ingredients as string[];
        }
        // Parse tags — accept comma-separated string or array
        let tags: string[] | undefined;
        if (typeof parameters.tags === 'string') {
          tags = (parameters.tags as string).split(',').map(t => t.trim()).filter(Boolean);
        } else if (Array.isArray(parameters.tags)) {
          tags = parameters.tags as string[];
        }
        const recipeInput: CreateRecipeInput = {
          space_id: spaceId,
          name,
          description: parameters.description as string | undefined,
          ingredients,
          instructions: parameters.instructions as string | undefined,
          prep_time: parameters.prep_time as number | undefined,
          cook_time: parameters.cook_time as number | undefined,
          servings: parameters.servings as number | undefined,
          cuisine_type: parameters.cuisine_type as string | undefined,
          tags,
        };
        // createRecipe does not accept a supabase client param — uses browser client
        const recipe = await mealsService.createRecipe(recipeInput);
        return {
          success: true,
          message: `Created recipe "${recipe.name}"`,
          data: { id: recipe.id, name: recipe.name },
          featureType: 'meal',
        };
      }

      case 'search_recipes': {
        const query = parameters.query as string;
        const cuisineFilter = parameters.cuisine as string | undefined;
        if (!query) {
          return { success: false, message: 'Search query is required', featureType: 'meal' };
        }
        try {
          // Call TheMealDB API (free, open, no auth required)
          const response = await fetch(
            `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`
          );
          const data = await response.json();
          let meals = data.meals || [];
          // Apply cuisine filter if provided
          if (cuisineFilter) {
            const cuisineLower = cuisineFilter.toLowerCase();
            meals = meals.filter((m: Record<string, unknown>) =>
              typeof m.strArea === 'string' && m.strArea.toLowerCase().includes(cuisineLower)
            );
          }
          const results = meals.slice(0, 5).map((m: Record<string, unknown>) => ({
            name: m.strMeal,
            category: m.strCategory,
            cuisine: m.strArea,
            instructions: typeof m.strInstructions === 'string'
              ? m.strInstructions.substring(0, 200) + '...'
              : '',
            image_url: m.strMealThumb,
          }));
          return {
            success: true,
            message: `Found ${results.length} recipe${results.length === 1 ? '' : 's'} for "${query}"`,
            data: { count: results.length, recipes: results },
            featureType: 'meal',
          };
        } catch {
          return {
            success: false,
            message: 'Could not search external recipes. Try using the Recipes page to search.',
            featureType: 'meal',
          };
        }
      }

      case 'update_meal': {
        const mealId = parameters.meal_id as string;
        if (!mealId) {
          return { success: false, message: 'Meal ID is required', featureType: 'meal' };
        }
        const mealUpdates = pickAllowedKeys(parameters, [
          'name', 'meal_type', 'scheduled_date', 'recipe_id', 'notes',
        ]);
        await mealsService.updateMeal(mealId, mealUpdates, supabase);
        return {
          success: true,
          message: 'Meal updated',
          data: { id: mealId },
          featureType: 'meal',
        };
      }

      case 'delete_meal': {
        const mealId = parameters.meal_id as string;
        if (!mealId) {
          return { success: false, message: 'Meal ID is required', featureType: 'meal' };
        }
        await mealsService.deleteMeal(mealId, supabase);
        return {
          success: true,
          message: 'Meal deleted',
          data: { id: mealId },
          featureType: 'meal',
        };
      }

      case 'list_meals': {
        const allMeals = await mealsService.getMeals(spaceId, supabase);
        // Apply date range filtering if provided
        const startDate = parameters.start_date as string | undefined;
        const endDate = parameters.end_date as string | undefined;
        const meals = allMeals.filter(m => {
          if (!m.scheduled_date) return true;
          if (startDate && m.scheduled_date < startDate) return false;
          if (endDate && m.scheduled_date > endDate) return false;
          return true;
        });
        return {
          success: true,
          message: `Found ${meals.length} planned meal${meals.length === 1 ? '' : 's'}`,
          data: {
            count: meals.length,
            meals: meals.slice(0, 15).map(m => ({
              id: m.id, name: m.name, meal_type: m.meal_type, scheduled_date: m.scheduled_date,
            })),
          },
          featureType: 'meal',
        };
      }

      // ═══════════════════════════════════════
      // GOALS
      // ═══════════════════════════════════════
      case 'create_goal': {
        const input = stripNulls<CreateGoalInput>(createGoalSchema.parse({
          ...parameters,
          space_id: spaceId,
          created_by: userId,
        }));
        const goal = await goalsService.createGoal(input, supabase);
        return {
          success: true,
          message: `Created goal "${goal.title}"`,
          data: { id: goal.id, title: goal.title },
          featureType: 'goal',
        };
      }

      case 'update_goal_progress': {
        const goalId = parameters.goal_id as string;
        const progress = parameters.progress as number;
        if (!goalId) {
          return { success: false, message: 'Goal ID is required', featureType: 'goal' };
        }
        if (progress === undefined) {
          return { success: false, message: 'Progress value is required', featureType: 'goal' };
        }
        await goalsService.updateGoal(goalId, { progress }, supabase);
        return {
          success: true,
          message: `Updated goal progress to ${progress}%`,
          data: { id: goalId, progress },
          featureType: 'goal',
        };
      }

      case 'update_goal': {
        const goalId = parameters.goal_id as string;
        if (!goalId) {
          return { success: false, message: 'Goal ID is required', featureType: 'goal' };
        }
        const goalUpdates = pickAllowedKeys(parameters, [
          'title', 'description', 'status', 'progress', 'category', 'target_date', 'assigned_to', 'visibility',
        ]);
        await goalsService.updateGoal(goalId, goalUpdates, supabase);
        return {
          success: true,
          message: 'Goal updated',
          data: { id: goalId },
          featureType: 'goal',
        };
      }

      case 'delete_goal': {
        const goalId = parameters.goal_id as string;
        if (!goalId) {
          return { success: false, message: 'Goal ID is required', featureType: 'goal' };
        }
        await goalsService.deleteGoal(goalId, supabase);
        return {
          success: true,
          message: 'Goal deleted',
          data: { id: goalId },
          featureType: 'goal',
        };
      }

      case 'create_milestone': {
        const goalId = parameters.goal_id as string;
        const title = parameters.title as string;
        if (!goalId) {
          return { success: false, message: 'Goal ID is required', featureType: 'goal' };
        }
        if (!title) {
          return { success: false, message: 'Milestone title is required', featureType: 'goal' };
        }
        const milestoneInput: CreateMilestoneInput = {
          goal_id: goalId,
          title,
          description: parameters.description as string | undefined,
          type: (parameters.type as CreateMilestoneInput['type']) || 'percentage',
          target_value: parameters.target_value as number | undefined,
          current_value: parameters.current_value as number | undefined,
          target_date: parameters.target_date as string | undefined,
        };
        // createMilestone does not accept a supabase client param — uses browser client
        const milestone = await goalsService.createMilestone(milestoneInput);
        return {
          success: true,
          message: `Created milestone "${milestone.title}"`,
          data: { id: milestone.id, title: milestone.title, goal_id: goalId },
          featureType: 'goal',
        };
      }

      case 'toggle_milestone': {
        const milestoneId = parameters.milestone_id as string;
        const completed = parameters.completed as boolean ?? true;
        if (!milestoneId) {
          return { success: false, message: 'Milestone ID is required', featureType: 'goal' };
        }
        // toggleMilestone does not accept a supabase client param — uses browser client
        await goalsService.toggleMilestone(milestoneId, completed);
        return {
          success: true,
          message: completed ? 'Milestone completed' : 'Milestone reopened',
          data: { id: milestoneId, completed },
          featureType: 'goal',
        };
      }

      case 'list_goals': {
        const goals = await goalsService.getGoals(spaceId, supabase);
        return {
          success: true,
          message: `Found ${goals.length} goal${goals.length === 1 ? '' : 's'}`,
          data: {
            count: goals.length,
            goals: goals.slice(0, 15).map(g => ({
              id: g.id, title: g.title, status: g.status, progress: g.progress,
              category: g.category, target_date: g.target_date,
              assigned_to: g.assigned_to, visibility: g.visibility,
            })),
          },
          featureType: 'goal',
        };
      }

      // ═══════════════════════════════════════
      // EXPENSES
      // ═══════════════════════════════════════
      case 'create_expense': {
        const input = stripNulls<CreateExpenseInput>(createExpenseSchema.parse({
          ...parameters,
          space_id: spaceId,
        }));
        const expense = await projectsService.createExpense(input, supabase);
        return {
          success: true,
          message: `Created expense "${expense.title}" — $${expense.amount}`,
          data: { id: expense.id, title: expense.title, amount: expense.amount },
          featureType: 'expense',
        };
      }

      case 'update_expense': {
        const expenseId = parameters.expense_id as string;
        if (!expenseId) {
          return { success: false, message: 'Expense ID is required', featureType: 'expense' };
        }
        const expenseUpdates = pickAllowedKeys(parameters, [
          'title', 'amount', 'category', 'due_date', 'status', 'description', 'payment_method', 'notes',
        ]);
        await projectsService.updateExpense(expenseId, expenseUpdates, supabase);
        return {
          success: true,
          message: 'Expense updated',
          data: { id: expenseId },
          featureType: 'expense',
        };
      }

      case 'delete_expense': {
        const expenseId = parameters.expense_id as string;
        if (!expenseId) {
          return { success: false, message: 'Expense ID is required', featureType: 'expense' };
        }
        await projectsService.deleteExpense(expenseId, supabase);
        return {
          success: true,
          message: 'Expense deleted',
          data: { id: expenseId },
          featureType: 'expense',
        };
      }

      case 'list_expenses': {
        const expenses = await projectsService.getExpenses(spaceId, supabase);
        return {
          success: true,
          message: `Found ${expenses.length} expense${expenses.length === 1 ? '' : 's'}`,
          data: {
            count: expenses.length,
            expenses: expenses.slice(0, 15).map(e => ({
              id: e.id, title: e.title, amount: e.amount, category: e.category,
              due_date: e.due_date, status: e.status,
            })),
          },
          featureType: 'expense',
        };
      }

      // ═══════════════════════════════════════
      // PROJECTS
      // ═══════════════════════════════════════
      case 'create_project': {
        const input = stripNulls<CreateProjectInput>(createProjectSchema.parse({
          ...parameters,
          space_id: spaceId,
          created_by: userId,
        }));
        const project = await projectsOnlyService.createProject(input, supabase);
        return {
          success: true,
          message: `Created project "${project.name}"`,
          data: { id: project.id, name: project.name },
          featureType: 'project',
        };
      }

      case 'update_project': {
        const projectId = parameters.project_id as string;
        if (!projectId) {
          return { success: false, message: 'Project ID is required', featureType: 'project' };
        }
        const projectUpdates = pickAllowedKeys(parameters, [
          'name', 'description', 'status', 'priority', 'start_date', 'target_date', 'budget', 'notes',
        ]);
        await projectsOnlyService.updateProject(projectId, projectUpdates, supabase);
        return {
          success: true,
          message: 'Project updated',
          data: { id: projectId },
          featureType: 'project',
        };
      }

      case 'delete_project': {
        const projectId = parameters.project_id as string;
        if (!projectId) {
          return { success: false, message: 'Project ID is required', featureType: 'project' };
        }
        await projectsOnlyService.deleteProject(projectId, supabase);
        return {
          success: true,
          message: 'Project deleted',
          data: { id: projectId },
          featureType: 'project',
        };
      }

      case 'list_projects': {
        const projects = await projectsOnlyService.getProjects(spaceId, supabase);
        return {
          success: true,
          message: `Found ${projects.length} project${projects.length === 1 ? '' : 's'}`,
          data: {
            count: projects.length,
            projects: projects.slice(0, 15).map(p => ({
              id: p.id, name: p.name, status: p.status, priority: p.priority,
              start_date: p.start_date,
            })),
          },
          featureType: 'project',
        };
      }

      // ═══════════════════════════════════════
      // MESSAGES
      // ═══════════════════════════════════════
      case 'send_message': {
        const conversationId = parameters.conversation_id as string;
        const content = parameters.content as string;
        if (!conversationId) {
          return { success: false, message: 'Conversation ID is required', featureType: 'message' };
        }
        if (!content) {
          return { success: false, message: 'Message content is required', featureType: 'message' };
        }
        const message = await messagesService.createMessage({
          space_id: spaceId,
          conversation_id: conversationId,
          sender_id: userId,
          content,
        }, supabase);
        return {
          success: true,
          message: 'Message sent',
          data: { id: message.id, conversation_id: conversationId },
          featureType: 'message',
        };
      }

      case 'list_conversations': {
        // getConversations does not accept a supabase client param — uses browser client
        const conversations = await messagesService.getConversations(spaceId);
        return {
          success: true,
          message: `Found ${conversations.length} conversation${conversations.length === 1 ? '' : 's'}`,
          data: {
            count: conversations.length,
            conversations: conversations.slice(0, 10).map(c => ({
              id: c.id,
              title: c.title,
              conversation_type: c.conversation_type,
              last_message_preview: c.last_message_preview,
              is_archived: c.is_archived,
            })),
          },
          featureType: 'message',
        };
      }

      // ═══════════════════════════════════════
      // REWARDS
      // ═══════════════════════════════════════
      case 'create_reward': {
        const name = parameters.name as string;
        const costPoints = parameters.cost_points as number;
        if (!name) {
          return { success: false, message: 'Reward name is required', featureType: 'reward' };
        }
        if (!costPoints) {
          return { success: false, message: 'Cost in points is required', featureType: 'reward' };
        }
        // createReward does not accept a supabase client param — uses browser client
        const reward = await rewardsService.createReward({
          space_id: spaceId,
          name,
          description: parameters.description as string | undefined,
          cost_points: costPoints,
          category: (parameters.category as 'privileges' | 'treats' | 'activities' | 'screen_time' | 'money' | 'other') || 'other',
          emoji: parameters.emoji as string | undefined,
          created_by: userId,
        });
        return {
          success: true,
          message: `Created reward "${reward.name}" (${reward.cost_points} pts)`,
          data: { id: reward.id, name: reward.name, cost_points: reward.cost_points },
          featureType: 'reward',
        };
      }

      case 'list_rewards': {
        const rewards = await rewardsService.getRewards(spaceId);
        return {
          success: true,
          message: `Found ${rewards.length} reward${rewards.length === 1 ? '' : 's'}`,
          data: {
            count: rewards.length,
            rewards: rewards.slice(0, 15).map(r => ({
              id: r.id, name: r.name, cost_points: r.cost_points, category: r.category,
              emoji: r.emoji,
            })),
          },
          featureType: 'reward',
        };
      }

      case 'update_reward': {
        const rewardId = parameters.reward_id as string;
        if (!rewardId) {
          return { success: false, message: 'Reward ID is required', featureType: 'reward' };
        }
        const rewardUpdates = pickAllowedKeys(parameters, [
          'name', 'description', 'cost_points', 'category', 'emoji', 'is_active',
        ]);
        const updatedReward = await rewardsService.updateReward(rewardId, rewardUpdates as Parameters<typeof rewardsService.updateReward>[1]);
        return {
          success: true,
          message: `Updated reward "${updatedReward.name}"`,
          data: { id: updatedReward.id, name: updatedReward.name },
          featureType: 'reward',
        };
      }

      case 'delete_reward': {
        const rewardId = parameters.reward_id as string;
        if (!rewardId) {
          return { success: false, message: 'Reward ID is required', featureType: 'reward' };
        }
        await rewardsService.deleteReward(rewardId);
        return {
          success: true,
          message: 'Reward deleted',
          data: { id: rewardId },
          featureType: 'reward',
        };
      }

      case 'get_points_balance': {
        const targetUserId = (parameters.user_id as string) || userId;
        const stats = await pointsService.getUserStats(targetUserId, spaceId);
        return {
          success: true,
          message: `Points balance: ${stats.total_points}`,
          data: {
            total_points: stats.total_points,
            level: stats.level,
            current_streak: stats.current_streak,
            longest_streak: stats.longest_streak,
            points_this_week: stats.points_this_week,
            points_this_month: stats.points_this_month,
            chores_completed_this_week: stats.chores_completed_this_week,
            pending_redemptions: stats.pending_redemptions,
            next_level_points: stats.next_level_points,
            progress_to_next_level: stats.progress_to_next_level,
          },
          featureType: 'reward',
        };
      }

      case 'redeem_reward': {
        const rewardId = parameters.reward_id as string;
        const redeemingUserId = (parameters.user_id as string) || userId;
        if (!rewardId) {
          return { success: false, message: 'Reward ID is required', featureType: 'reward' };
        }
        const redemption = await rewardsService.redeemReward(redeemingUserId, spaceId, rewardId);
        return {
          success: true,
          message: `Reward redeemed! ${redemption.points_spent} points deducted.`,
          data: {
            id: redemption.id,
            points_spent: redemption.points_spent,
            status: redemption.status,
          },
          featureType: 'reward',
        };
      }

      case 'get_leaderboard': {
        const period = (parameters.period as 'week' | 'month' | 'all') || 'week';
        const leaderboard = await pointsService.getLeaderboard(spaceId, period);
        return {
          success: true,
          message: `${period === 'week' ? 'Weekly' : period === 'month' ? 'Monthly' : 'All-time'} leaderboard (${leaderboard.length} members)`,
          data: {
            period,
            entries: leaderboard.slice(0, 10).map(e => ({
              rank: e.rank,
              name: e.name,
              points: e.points,
              level: e.level,
              current_streak: e.current_streak,
              chores_completed_this_week: e.chores_completed_this_week,
            })),
          },
          featureType: 'reward',
        };
      }

      // ═══════════════════════════════════════
      // BUDGET
      // ═══════════════════════════════════════
      case 'get_budget': {
        const budget = await projectsService.getBudget(spaceId, supabase);
        if (!budget) {
          return {
            success: true,
            message: 'No budget has been set yet. Would you like me to set one?',
            data: { budget: null },
            featureType: 'budget',
          };
        }
        return {
          success: true,
          message: `Monthly budget: $${budget.monthly_budget}`,
          data: {
            id: budget.id,
            monthly_budget: budget.monthly_budget,
          },
          featureType: 'budget',
        };
      }

      case 'get_budget_stats': {
        const stats = await projectsService.getBudgetStats(spaceId, supabase);
        return {
          success: true,
          message: `Budget: $${stats.spentThisMonth.toFixed(2)} spent of $${stats.monthlyBudget.toFixed(2)} ($${stats.remaining.toFixed(2)} remaining)`,
          data: {
            monthly_budget: stats.monthlyBudget,
            spent_this_month: stats.spentThisMonth,
            remaining: stats.remaining,
            pending_bills: stats.pendingBills,
          },
          featureType: 'budget',
        };
      }

      case 'set_budget': {
        const monthlyBudget = parameters.monthly_budget as number;
        if (!monthlyBudget || monthlyBudget <= 0) {
          return { success: false, message: 'Monthly budget must be a positive number', featureType: 'budget' };
        }
        const budget = await projectsService.setBudget(
          { space_id: spaceId, monthly_budget: monthlyBudget },
          userId,
          supabase
        );
        return {
          success: true,
          message: `Monthly budget set to $${budget.monthly_budget}`,
          data: { id: budget.id, monthly_budget: budget.monthly_budget },
          featureType: 'budget',
        };
      }

      // ═══════════════════════════════════════
      // RECIPES (Library)
      // ═══════════════════════════════════════
      case 'list_recipes': {
        let recipes = await mealsService.getRecipes(spaceId);
        // Client-side filtering
        if (parameters.cuisine_type) {
          const cuisine = (parameters.cuisine_type as string).toLowerCase();
          recipes = recipes.filter(r => r.cuisine_type?.toLowerCase().includes(cuisine));
        }
        if (parameters.difficulty) {
          recipes = recipes.filter(r => r.difficulty === parameters.difficulty);
        }
        if (parameters.search) {
          const search = (parameters.search as string).toLowerCase();
          recipes = recipes.filter(r =>
            r.name?.toLowerCase().includes(search) ||
            r.description?.toLowerCase().includes(search)
          );
        }
        return {
          success: true,
          message: `Found ${recipes.length} saved recipe${recipes.length === 1 ? '' : 's'}`,
          data: {
            count: recipes.length,
            recipes: recipes.slice(0, 15).map(r => ({
              id: r.id, name: r.name, cuisine_type: r.cuisine_type,
              prep_time: r.prep_time, cook_time: r.cook_time, servings: r.servings,
              difficulty: r.difficulty,
            })),
          },
          featureType: 'meal',
        };
      }

      case 'update_recipe': {
        const recipeId = parameters.recipe_id as string;
        if (!recipeId) {
          return { success: false, message: 'Recipe ID is required', featureType: 'meal' };
        }
        const recipeUpdates = pickAllowedKeys(parameters, [
          'name', 'description', 'ingredients', 'instructions', 'prep_time', 'cook_time',
          'servings', 'cuisine_type', 'tags', 'difficulty',
        ]) as Record<string, unknown>;
        // Parse ingredients if provided as comma-separated string
        if (typeof recipeUpdates.ingredients === 'string') {
          recipeUpdates.ingredients = (recipeUpdates.ingredients as string).split(',').map((i: string) => i.trim()).filter(Boolean);
        }
        // Parse tags if provided as comma-separated string
        if (typeof recipeUpdates.tags === 'string') {
          recipeUpdates.tags = (recipeUpdates.tags as string).split(',').map((t: string) => t.trim()).filter(Boolean);
        }
        const updatedRecipe = await mealsService.updateRecipe(recipeId, recipeUpdates as Parameters<typeof mealsService.updateRecipe>[1]);
        return {
          success: true,
          message: `Updated recipe "${updatedRecipe.name}"`,
          data: { id: updatedRecipe.id, name: updatedRecipe.name },
          featureType: 'meal',
        };
      }

      case 'delete_recipe': {
        const recipeId = parameters.recipe_id as string;
        if (!recipeId) {
          return { success: false, message: 'Recipe ID is required', featureType: 'meal' };
        }
        await mealsService.deleteRecipe(recipeId);
        return {
          success: true,
          message: 'Recipe deleted',
          data: { id: recipeId },
          featureType: 'meal',
        };
      }

      // ═══════════════════════════════════════
      // BILLS
      // ═══════════════════════════════════════
      case 'list_bills': {
        const bills = await billsService.getBills(spaceId);
        const filtered = parameters.status
          ? bills.filter(b => b.status === parameters.status)
          : bills;
        return {
          success: true,
          message: `Found ${filtered.length} bill${filtered.length === 1 ? '' : 's'}`,
          data: {
            count: filtered.length,
            bills: filtered.slice(0, 15).map(b => ({
              id: b.id, name: b.name, amount: b.amount, due_date: b.due_date,
              frequency: b.frequency, status: b.status, category: b.category,
              auto_pay: b.auto_pay,
            })),
          },
          featureType: 'expense',
        };
      }

      case 'create_bill': {
        const name = parameters.name as string;
        const amount = parameters.amount as number;
        const dueDate = parameters.due_date as string;
        if (!name) {
          return { success: false, message: 'Bill name is required', featureType: 'expense' };
        }
        if (!amount || amount <= 0) {
          return { success: false, message: 'Bill amount must be a positive number', featureType: 'expense' };
        }
        if (!dueDate) {
          return { success: false, message: 'Due date is required', featureType: 'expense' };
        }
        const bill = await billsService.createBill({
          space_id: spaceId,
          name,
          amount,
          due_date: dueDate,
          frequency: ((parameters.frequency as string) || 'monthly') as 'one-time' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'semi-annual' | 'annual',
          category: parameters.category as string | undefined,
          payee: parameters.payee as string | undefined,
          auto_pay: parameters.auto_pay as boolean | undefined,
          notes: parameters.notes as string | undefined,
        }, userId);
        return {
          success: true,
          message: `Created bill "${bill.name}" — $${bill.amount} due ${formatDateForPreview(bill.due_date)}`,
          data: { id: bill.id, name: bill.name, amount: bill.amount },
          featureType: 'expense',
        };
      }

      case 'update_bill': {
        const billId = parameters.bill_id as string;
        if (!billId) {
          return { success: false, message: 'Bill ID is required', featureType: 'expense' };
        }
        const billUpdates = pickAllowedKeys(parameters, [
          'name', 'amount', 'due_date', 'frequency', 'category', 'payee', 'auto_pay', 'notes', 'status',
        ]);
        await billsService.updateBill(billId, billUpdates);
        return {
          success: true,
          message: 'Bill updated',
          data: { id: billId },
          featureType: 'expense',
        };
      }

      case 'delete_bill': {
        const billId = parameters.bill_id as string;
        if (!billId) {
          return { success: false, message: 'Bill ID is required', featureType: 'expense' };
        }
        await billsService.deleteBill(billId);
        return {
          success: true,
          message: 'Bill deleted',
          data: { id: billId },
          featureType: 'expense',
        };
      }

      case 'mark_bill_paid': {
        const billId = parameters.bill_id as string;
        if (!billId) {
          return { success: false, message: 'Bill ID is required', featureType: 'expense' };
        }
        const result = await billsService.markBillAsPaid(billId, true);
        return {
          success: true,
          message: `Bill marked as paid${result.expense ? ' and expense recorded' : ''}`,
          data: { id: billId, bill: { name: result.bill.name, amount: result.bill.amount } },
          featureType: 'expense',
        };
      }

      // ═══════════════════════════════════════
      // SHOPPING (Extended)
      // ═══════════════════════════════════════
      case 'delete_shopping_list': {
        const listId = parameters.list_id as string;
        if (!listId) {
          return { success: false, message: 'List ID is required', featureType: 'shopping' };
        }
        await shoppingService.deleteList(listId, supabase);
        return {
          success: true,
          message: 'Shopping list deleted',
          data: { id: listId },
          featureType: 'shopping',
        };
      }

      // ═══════════════════════════════════════
      // MESSAGES (Extended)
      // ═══════════════════════════════════════
      case 'list_messages': {
        const conversationId = parameters.conversation_id as string;
        if (!conversationId) {
          return { success: false, message: 'Conversation ID is required. Use list_conversations first to find the right conversation.', featureType: 'message' };
        }
        const messages = await messagesService.getMessages(conversationId, supabase);
        return {
          success: true,
          message: `Found ${messages.length} message${messages.length === 1 ? '' : 's'}`,
          data: {
            count: messages.length,
            messages: messages.slice(0, 20).map(m => ({
              id: m.id,
              content: m.content,
              sender_id: m.sender_id,
              created_at: m.created_at,
            })),
          },
          featureType: 'message',
        };
      }

      case 'create_conversation': {
        const title = parameters.title as string;
        if (!title) {
          return { success: false, message: 'Conversation title is required', featureType: 'message' };
        }
        const conversation = await messagesService.createConversation({
          space_id: spaceId,
          title,
          conversation_type: ((parameters.conversation_type as string) || 'group') as 'direct' | 'group' | 'general',
          description: parameters.description as string | undefined,
        });
        return {
          success: true,
          message: `Created conversation "${conversation.title}"`,
          data: { id: conversation.id, title: conversation.title },
          featureType: 'message',
        };
      }

      // ═══════════════════════════════════════
      // REWARDS (Extended - Redemption Management)
      // ═══════════════════════════════════════
      case 'list_redemptions': {
        const redemptions = await rewardsService.getRedemptions(spaceId, {
          status: parameters.status as 'pending' | 'approved' | 'fulfilled' | 'denied' | 'cancelled' | undefined,
        });
        return {
          success: true,
          message: `Found ${redemptions.length} redemption${redemptions.length === 1 ? '' : 's'}`,
          data: {
            count: redemptions.length,
            redemptions: redemptions.slice(0, 15).map(r => ({
              id: r.id,
              reward_name: r.reward?.name || 'Unknown reward',
              user_id: r.user_id,
              user_name: r.user?.name,
              points_spent: r.points_spent,
              status: r.status,
              created_at: r.created_at,
            })),
          },
          featureType: 'reward',
        };
      }

      case 'approve_redemption': {
        const redemptionId = parameters.redemption_id as string;
        if (!redemptionId) {
          return { success: false, message: 'Redemption ID is required', featureType: 'reward' };
        }
        const approved = await rewardsService.approveRedemption(redemptionId, userId);
        return {
          success: true,
          message: `Redemption approved for "${approved.reward?.name || 'reward'}"`,
          data: { id: approved.id, status: approved.status },
          featureType: 'reward',
        };
      }

      case 'deny_redemption': {
        const redemptionId = parameters.redemption_id as string;
        if (!redemptionId) {
          return { success: false, message: 'Redemption ID is required', featureType: 'reward' };
        }
        const denied = await rewardsService.denyRedemption(
          redemptionId,
          userId,
          parameters.reason as string | undefined
        );
        return {
          success: true,
          message: `Redemption denied${parameters.reason ? `: ${parameters.reason}` : ''}`,
          data: { id: denied.id, status: denied.status },
          featureType: 'reward',
        };
      }

      case 'award_points': {
        const targetUserId = parameters.user_id as string;
        const points = parameters.points as number;
        const reason = parameters.reason as string;
        if (!targetUserId) {
          return { success: false, message: 'User ID is required', featureType: 'reward' };
        }
        if (!points || points <= 0) {
          return { success: false, message: 'Points must be a positive number', featureType: 'reward' };
        }
        if (!reason) {
          return { success: false, message: 'Reason is required for bonus points', featureType: 'reward' };
        }
        await pointsService.awardPoints({
          user_id: targetUserId,
          space_id: spaceId,
          source_type: 'bonus',
          points,
          reason,
        });
        return {
          success: true,
          message: `Awarded ${points} bonus points: ${reason}`,
          data: { user_id: targetUserId, points, reason },
          featureType: 'reward',
        };
      }

      // ═══════════════════════════════════════
      // GOALS (Extended - Milestones & Check-ins)
      // ═══════════════════════════════════════
      case 'update_milestone': {
        const milestoneId = parameters.milestone_id as string;
        if (!milestoneId) {
          return { success: false, message: 'Milestone ID is required', featureType: 'goal' };
        }
        const milestoneUpdates = pickAllowedKeys(parameters, [
          'title', 'description', 'type', 'target_value', 'current_value', 'target_date',
        ]);
        const updatedMilestone = await goalsService.updateMilestone(milestoneId, milestoneUpdates);
        return {
          success: true,
          message: `Updated milestone "${updatedMilestone.title}"`,
          data: { id: updatedMilestone.id, title: updatedMilestone.title },
          featureType: 'goal',
        };
      }

      case 'delete_milestone': {
        const milestoneId = parameters.milestone_id as string;
        if (!milestoneId) {
          return { success: false, message: 'Milestone ID is required', featureType: 'goal' };
        }
        await goalsService.deleteMilestone(milestoneId);
        return {
          success: true,
          message: 'Milestone deleted',
          data: { id: milestoneId },
          featureType: 'goal',
        };
      }

      case 'create_goal_checkin': {
        const goalId = parameters.goal_id as string;
        const progressPercentage = parameters.progress_percentage as number;
        const mood = parameters.mood as string;
        if (!goalId) {
          return { success: false, message: 'Goal ID is required', featureType: 'goal' };
        }
        if (progressPercentage === undefined) {
          return { success: false, message: 'Progress percentage is required', featureType: 'goal' };
        }
        if (!mood) {
          return { success: false, message: 'Mood is required', featureType: 'goal' };
        }
        const checkIn = await goalsService.createCheckIn({
          goal_id: goalId,
          progress_percentage: progressPercentage,
          mood: mood as 'great' | 'okay' | 'struggling',
          notes: parameters.notes as string | undefined,
          blockers: parameters.blockers as string | undefined,
          need_help_from_partner: parameters.need_help_from_partner as boolean | undefined,
        });
        // Also update the goal's progress to match
        await goalsService.updateGoal(goalId, { progress: progressPercentage }, supabase);
        return {
          success: true,
          message: `Check-in logged (${progressPercentage}% — feeling ${mood})`,
          data: { id: checkIn.id, goal_id: goalId, progress_percentage: progressPercentage },
          featureType: 'goal',
        };
      }

      case 'get_goal_checkins': {
        const goalId = parameters.goal_id as string;
        if (!goalId) {
          return { success: false, message: 'Goal ID is required', featureType: 'goal' };
        }
        const checkIns = await goalsService.getGoalCheckIns(goalId);
        return {
          success: true,
          message: `Found ${checkIns.length} check-in${checkIns.length === 1 ? '' : 's'}`,
          data: {
            count: checkIns.length,
            check_ins: checkIns.slice(0, 15).map(c => ({
              id: c.id,
              progress_percentage: c.progress_percentage,
              mood: c.mood,
              notes: c.notes,
              blockers: c.blockers,
              created_at: c.created_at,
            })),
          },
          featureType: 'goal',
        };
      }

      // ═══════════════════════════════════════
      // HOUSEHOLD SUMMARY
      // ═══════════════════════════════════════
      case 'get_household_summary': {
        // Fetch multiple data sources in parallel for a comprehensive overview
        const [tasks, chores, goals, events, budgetStats, expenses] = await Promise.all([
          tasksService.getTasks(spaceId, { status: ['pending', 'in-progress', 'in_progress', 'blocked', 'on-hold'] }, supabase).catch(() => []),
          choresService.getChores(spaceId, { status: 'pending' }, supabase).catch(() => []),
          goalsService.getGoals(spaceId, supabase).catch(() => []),
          calendarService.getEvents(spaceId, false, supabase).catch(() => []),
          projectsService.getBudgetStats(spaceId, supabase).catch(() => ({ monthlyBudget: 0, spentThisMonth: 0, remaining: 0, pendingBills: 0 })),
          projectsService.getExpenses(spaceId, supabase).catch(() => []),
        ]);

        const activeGoals = goals.filter(g => g.status === 'active');
        const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date());
        const upcomingEvents = events.filter(e => {
          if (!e.start_time) return false;
          const start = new Date(e.start_time);
          const now = new Date();
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          return start >= now && start <= weekFromNow;
        });

        return {
          success: true,
          message: 'Household overview',
          data: {
            tasks: {
              total_open: tasks.length,
              pending: tasks.filter(t => t.status === 'pending').length,
              in_progress: tasks.filter(t => t.status === 'in-progress' || (t.status as string) === 'in_progress').length,
              blocked: tasks.filter(t => t.status === 'blocked' || t.status === 'on-hold').length,
              overdue: overdueTasks.length,
            },
            chores: { pending: chores.length },
            goals: { active: activeGoals.length, total: goals.length },
            events: { upcoming_7_days: upcomingEvents.length },
            budget: {
              monthly: budgetStats.monthlyBudget,
              spent: budgetStats.spentThisMonth,
              remaining: budgetStats.remaining,
              pending_bills: budgetStats.pendingBills,
            },
            expenses: { total_this_month: expenses.length },
          },
          featureType: 'general',
        };
      }

      // ═══════════════════════════════════════
      // SUBTASKS
      // ═══════════════════════════════════════
      case 'list_subtasks': {
        const taskId = parameters.task_id as string;
        if (!taskId) {
          return { success: false, message: 'Task ID is required', featureType: 'task' };
        }
        const subtasks = await taskSubtasksService.getSubtasks(taskId);
        return {
          success: true,
          message: `Found ${subtasks.length} subtask${subtasks.length === 1 ? '' : 's'}`,
          data: {
            count: subtasks.length,
            subtasks: subtasks.map(s => ({
              id: s.id, title: s.title, status: s.status, priority: s.priority,
              assigned_to: s.assigned_to, due_date: s.due_date,
            })),
          },
          featureType: 'task',
        };
      }

      case 'create_subtask': {
        const taskId = parameters.task_id as string;
        const title = parameters.title as string;
        if (!taskId) {
          return { success: false, message: 'Task ID is required', featureType: 'task' };
        }
        if (!title) {
          return { success: false, message: 'Subtask title is required', featureType: 'task' };
        }
        const subtaskInput: CreateSubtaskInput = {
          parent_task_id: taskId,
          title,
          description: parameters.description as string | undefined,
          priority: parameters.priority as string | undefined,
          assigned_to: parameters.assigned_to as string | undefined,
          due_date: parameters.due_date as string | undefined,
          created_by: userId,
        };
        const subtask = await taskSubtasksService.createSubtask(subtaskInput);
        return {
          success: true,
          message: `Created subtask "${subtask.title}"`,
          data: { id: subtask.id, title: subtask.title, parent_task_id: taskId },
          featureType: 'task',
        };
      }

      case 'update_subtask': {
        const subtaskId = parameters.subtask_id as string;
        if (!subtaskId) {
          return { success: false, message: 'Subtask ID is required', featureType: 'task' };
        }
        const subtaskUpdates = pickAllowedKeys(parameters, [
          'title', 'description', 'status', 'priority', 'assigned_to', 'due_date',
        ]);
        await taskSubtasksService.updateSubtask(subtaskId, subtaskUpdates as Partial<CreateSubtaskInput>);
        return {
          success: true,
          message: 'Subtask updated',
          data: { id: subtaskId },
          featureType: 'task',
        };
      }

      case 'delete_subtask': {
        const subtaskId = parameters.subtask_id as string;
        if (!subtaskId) {
          return { success: false, message: 'Subtask ID is required', featureType: 'task' };
        }
        await taskSubtasksService.deleteSubtask(subtaskId);
        return {
          success: true,
          message: 'Subtask deleted',
          data: { id: subtaskId },
          featureType: 'task',
        };
      }

      // ═══════════════════════════════════════
      // SHOPPING (Extended)
      // ═══════════════════════════════════════
      case 'update_shopping_list': {
        const listId = parameters.list_id as string;
        if (!listId) {
          return { success: false, message: 'List ID is required', featureType: 'shopping' };
        }
        const listUpdates = pickAllowedKeys(parameters, [
          'title', 'status', 'store_name', 'budget', 'notes',
        ]);
        const updatedList = await shoppingService.updateList(listId, listUpdates, supabase);
        return {
          success: true,
          message: `Updated shopping list "${updatedList.title}"`,
          data: { id: updatedList.id, title: updatedList.title, status: updatedList.status },
          featureType: 'shopping',
        };
      }

      // ═══════════════════════════════════════
      // RECIPES (Extended)
      // ═══════════════════════════════════════
      case 'get_recipe': {
        const recipeId = parameters.recipe_id as string;
        if (!recipeId) {
          return { success: false, message: 'Recipe ID is required', featureType: 'meal' };
        }
        const recipe = await mealsService.getRecipeById(recipeId);
        if (!recipe) {
          return { success: false, message: 'Recipe not found', featureType: 'meal' };
        }
        return {
          success: true,
          message: `Recipe: ${recipe.name}`,
          data: {
            id: recipe.id,
            name: recipe.name,
            description: recipe.description,
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
            prep_time: recipe.prep_time,
            cook_time: recipe.cook_time,
            servings: recipe.servings,
          },
          featureType: 'meal',
        };
      }

      // ═══════════════════════════════════════
      // PROJECT MILESTONES
      // ═══════════════════════════════════════
      case 'list_project_milestones': {
        const projectId = parameters.project_id as string;
        if (!projectId) {
          return { success: false, message: 'Project ID is required', featureType: 'project' };
        }
        const milestones = await projectMilestonesService.getMilestones(projectId);
        return {
          success: true,
          message: `Found ${milestones.length} milestone${milestones.length === 1 ? '' : 's'}`,
          data: {
            count: milestones.length,
            milestones: milestones.map(m => ({
              id: m.id, title: m.title, is_completed: m.is_completed,
              due_date: m.due_date, description: m.description,
            })),
          },
          featureType: 'project',
        };
      }

      case 'create_project_milestone': {
        const projectId = parameters.project_id as string;
        const title = parameters.title as string;
        if (!projectId) {
          return { success: false, message: 'Project ID is required', featureType: 'project' };
        }
        if (!title) {
          return { success: false, message: 'Milestone title is required', featureType: 'project' };
        }
        const milestone = await projectMilestonesService.createMilestone({
          project_id: projectId,
          space_id: spaceId,
          title,
          description: parameters.description as string | undefined,
          due_date: parameters.due_date as string | undefined,
        });
        return {
          success: true,
          message: `Created milestone "${milestone.title}"`,
          data: { id: milestone.id, title: milestone.title, project_id: projectId },
          featureType: 'project',
        };
      }

      case 'toggle_project_milestone': {
        const milestoneId = parameters.milestone_id as string;
        if (!milestoneId) {
          return { success: false, message: 'Milestone ID is required', featureType: 'project' };
        }
        const toggled = await projectMilestonesService.toggleMilestone(milestoneId);
        return {
          success: true,
          message: toggled.is_completed ? 'Milestone completed' : 'Milestone reopened',
          data: { id: toggled.id, is_completed: toggled.is_completed },
          featureType: 'project',
        };
      }

      case 'delete_project_milestone': {
        const milestoneId = parameters.milestone_id as string;
        if (!milestoneId) {
          return { success: false, message: 'Milestone ID is required', featureType: 'project' };
        }
        await projectMilestonesService.deleteMilestone(milestoneId);
        return {
          success: true,
          message: 'Project milestone deleted',
          data: { id: milestoneId },
          featureType: 'project',
        };
      }

      // ═══════════════════════════════════════
      // FINANCE (Extended)
      // ═══════════════════════════════════════
      case 'get_spending_insights': {
        const timeRange = (parameters.time_range as string) || 'monthly';
        // TimeRange only supports 'monthly' | 'quarterly' | 'yearly' — default unsupported to 'monthly'
        const validRange = (['monthly', 'quarterly', 'yearly'].includes(timeRange) ? timeRange : 'monthly') as 'monthly' | 'quarterly' | 'yearly';
        const insights = await getSpendingInsights(spaceId, validRange);
        return {
          success: true,
          message: 'Spending insights',
          data: {
            total_spent: insights.current_period.total_spent,
            total_budget: insights.current_period.total_budget,
            variance: insights.current_period.variance,
            variance_percentage: insights.current_period.variance_percentage,
            top_categories: insights.top_categories?.slice(0, 5).map(c => ({
              category: c.category,
              total: c.total,
            })),
          },
          featureType: 'expense',
        };
      }

      case 'get_category_spending': {
        const startDate = parameters.start_date ? new Date(parameters.start_date as string) : undefined;
        const endDate = parameters.end_date ? new Date(parameters.end_date as string) : undefined;
        const categoryData = await getCategorySpending(spaceId, startDate, endDate);
        return {
          success: true,
          message: `Spending across ${categoryData.length} categories`,
          data: {
            categories: categoryData.map(c => ({
              category: c.category,
              total: c.total,
              transactions: c.transaction_count,
            })),
          },
          featureType: 'expense',
        };
      }

      // ═══════════════════════════════════════
      // MESSAGES (Extended)
      // ═══════════════════════════════════════
      case 'edit_message': {
        const messageId = parameters.message_id as string;
        const content = parameters.content as string;
        if (!messageId) {
          return { success: false, message: 'Message ID is required', featureType: 'message' };
        }
        if (!content) {
          return { success: false, message: 'New content is required', featureType: 'message' };
        }
        await messagesService.updateMessage(messageId, { content }, { supabaseClient: supabase });
        return {
          success: true,
          message: 'Message updated',
          data: { id: messageId },
          featureType: 'message',
        };
      }

      case 'delete_message': {
        const messageId = parameters.message_id as string;
        if (!messageId) {
          return { success: false, message: 'Message ID is required', featureType: 'message' };
        }
        await messagesService.deleteMessage(messageId, 'for_everyone', { supabaseClient: supabase, userId });
        return {
          success: true,
          message: 'Message deleted',
          data: { id: messageId },
          featureType: 'message',
        };
      }

      case 'pin_message': {
        const messageId = parameters.message_id as string;
        if (!messageId) {
          return { success: false, message: 'Message ID is required', featureType: 'message' };
        }
        await messagesService.pinMessage(messageId, userId);
        return {
          success: true,
          message: 'Message pinned',
          data: { id: messageId },
          featureType: 'message',
        };
      }

      // ═══════════════════════════════════════
      // REWARDS (Extended)
      // ═══════════════════════════════════════
      case 'fulfill_redemption': {
        const redemptionId = parameters.redemption_id as string;
        if (!redemptionId) {
          return { success: false, message: 'Redemption ID is required', featureType: 'reward' };
        }
        await rewardsService.fulfillRedemption(redemptionId);
        return {
          success: true,
          message: 'Redemption fulfilled',
          data: { id: redemptionId },
          featureType: 'reward',
        };
      }

      case 'cancel_redemption': {
        const redemptionId = parameters.redemption_id as string;
        if (!redemptionId) {
          return { success: false, message: 'Redemption ID is required', featureType: 'reward' };
        }
        await rewardsService.cancelRedemption(redemptionId, userId);
        return {
          success: true,
          message: 'Redemption cancelled and points refunded',
          data: { id: redemptionId },
          featureType: 'reward',
        };
      }

      case 'get_points_history': {
        const targetUserId = (parameters.user_id as string) || userId;
        const limit = (parameters.limit as number) || 20;
        const history = await pointsService.getPointsHistory(targetUserId, spaceId, limit);
        return {
          success: true,
          message: `Found ${history.length} transaction${history.length === 1 ? '' : 's'}`,
          data: {
            count: history.length,
            transactions: history.slice(0, 15).map(t => ({
              id: t.id,
              points: t.points,
              reason: t.reason,
              source_type: t.source_type,
              created_at: t.created_at,
            })),
          },
          featureType: 'reward',
        };
      }

      // ═══════════════════════════════════════
      // GOALS (Extended - Check-in Management)
      // ═══════════════════════════════════════
      case 'update_goal_checkin': {
        const checkinId = parameters.checkin_id as string;
        if (!checkinId) {
          return { success: false, message: 'Check-in ID is required', featureType: 'goal' };
        }
        const checkinUpdates = pickAllowedKeys(parameters, [
          'progress_percentage', 'mood', 'notes', 'blockers', 'need_help_from_partner',
        ]);
        await goalsService.updateCheckIn(checkinId, checkinUpdates);
        return {
          success: true,
          message: 'Check-in updated',
          data: { id: checkinId },
          featureType: 'goal',
        };
      }

      case 'delete_goal_checkin': {
        const checkinId = parameters.checkin_id as string;
        if (!checkinId) {
          return { success: false, message: 'Check-in ID is required', featureType: 'goal' };
        }
        await goalsService.deleteCheckIn(checkinId);
        return {
          success: true,
          message: 'Check-in deleted',
          data: { id: checkinId },
          featureType: 'goal',
        };
      }

      case 'get_goal_stats': {
        const stats = await goalsService.getGoalStats(spaceId);
        return {
          success: true,
          message: 'Goal statistics',
          data: {
            active: stats.active,
            completed: stats.completed,
            in_progress: stats.inProgress,
            milestones_reached: stats.milestonesReached,
          },
          featureType: 'goal',
        };
      }

      // ---------------------------------------------------------------
      // Task Comments
      // ---------------------------------------------------------------

      case 'list_task_comments': {
        const tid = requireString(parameters, 'task_id', 'task');
        if ('error' in tid) return tid.error;
        const comments = await taskCommentsService.getComments(tid.value);
        return {
          success: true,
          message: comments.length
            ? `Found ${comments.length} comment(s) on this task.`
            : 'No comments on this task yet.',
          data: {
            comments: comments.map(c => ({
              id: c.id,
              content: c.content,
              user_id: c.user_id,
              parent_comment_id: c.parent_comment_id,
              created_at: c.created_at,
            })),
          },
          featureType: 'task',
        };
      }

      case 'add_task_comment': {
        const tid = requireString(parameters, 'task_id', 'task');
        if ('error' in tid) return tid.error;
        const content = safeText(parameters.content, 2000);
        if (!content) return { success: false, message: 'Comment content is required.', featureType: 'task' };
        const comment = await taskCommentsService.addComment({
          task_id: tid.value,
          user_id: userId,
          content,
          parent_comment_id: parameters.parent_comment_id as string | undefined,
        });
        return {
          success: true,
          message: 'Comment added to the task.',
          data: { id: comment.id },
          featureType: 'task',
        };
      }

      case 'delete_task_comment': {
        const cid = requireString(parameters, 'comment_id', 'task');
        if ('error' in cid) return cid.error;
        await taskCommentsService.deleteComment(cid.value);
        return {
          success: true,
          message: 'Comment deleted.',
          featureType: 'task',
        };
      }

      // ---------------------------------------------------------------
      // Chore Rotations & Stats
      // ---------------------------------------------------------------

      case 'create_chore_rotation': {
        const cid = requireString(parameters, 'chore_id', 'chore');
        if ('error' in cid) return cid.error;
        const freq = requireString(parameters, 'frequency', 'chore');
        if ('error' in freq) return freq.error;
        const rtype = requireString(parameters, 'rotation_type', 'chore');
        if ('error' in rtype) return rtype.error;
        const userIds = parameters.user_ids;
        if (!Array.isArray(userIds) || userIds.length < 2) {
          return { success: false, message: 'At least 2 user IDs are required for a rotation.', featureType: 'chore' };
        }
        const rotation = await choreRotationService.createRotation(
          cid.value, userIds as string[], freq.value, rtype.value, userId,
        );
        return {
          success: true,
          message: `Rotation schedule created — ${userIds.length} members will rotate ${freq.value}.`,
          data: { id: rotation.id },
          featureType: 'chore',
        };
      }

      case 'get_chore_rotation': {
        const cid = requireString(parameters, 'chore_id', 'chore');
        if ('error' in cid) return cid.error;
        const rotation = await choreRotationService.getRotation(cid.value);
        if (!rotation) {
          return { success: true, message: 'No rotation schedule found for this chore.', featureType: 'chore' };
        }
        return {
          success: true,
          message: `This chore has a ${rotation.rotation_type} rotation (${rotation.rotation_frequency}).`,
          data: {
            id: rotation.id, rotation_type: rotation.rotation_type,
            frequency: rotation.rotation_frequency, user_order: rotation.user_order,
            next_rotation_date: rotation.next_rotation_date,
          },
          featureType: 'chore',
        };
      }

      case 'update_chore_rotation': {
        const rid = requireString(parameters, 'rotation_id', 'chore');
        if ('error' in rid) return rid.error;
        const updates = pickAllowedKeys(parameters, ['user_order', 'rotation_frequency', 'rotation_type']);
        if (parameters.user_ids) updates.user_order = parameters.user_ids;
        if (parameters.frequency) updates.rotation_frequency = parameters.frequency;
        if (parameters.rotation_type) updates.rotation_type = parameters.rotation_type;
        await choreRotationService.updateRotation(rid.value, updates);
        return { success: true, message: 'Rotation schedule updated.', featureType: 'chore' };
      }

      case 'delete_chore_rotation': {
        const rid = requireString(parameters, 'rotation_id', 'chore');
        if ('error' in rid) return rid.error;
        await choreRotationService.deleteRotation(rid.value);
        return { success: true, message: 'Rotation schedule deleted.', featureType: 'chore' };
      }

      case 'get_chore_stats': {
        const stats = await choresService.getChoreStats(spaceId, userId);
        return {
          success: true,
          message: `Chore stats: ${stats.total} total, ${stats.completedThisWeek} completed this week, ${stats.myChores} yours, ${stats.partnerChores} partner's.`,
          data: {
            total: stats.total,
            completed_this_week: stats.completedThisWeek,
            my_chores: stats.myChores,
            partner_chores: stats.partnerChores,
          },
          featureType: 'chore',
        };
      }

      // ---------------------------------------------------------------
      // Goal Collaborators
      // ---------------------------------------------------------------

      case 'add_goal_collaborator': {
        const gid = requireString(parameters, 'goal_id', 'goal');
        if ('error' in gid) return gid.error;
        const uid = requireString(parameters, 'user_id', 'goal');
        if ('error' in uid) return uid.error;
        const role = parameters.role as 'contributor' | 'viewer';
        if (!['contributor', 'viewer'].includes(role)) {
          return { success: false, message: 'Role must be "contributor" or "viewer".', featureType: 'goal' };
        }
        const collaborator = await goalService.addCollaborator({
          goal_id: gid.value, user_id: uid.value, role,
        });
        return {
          success: true,
          message: `Added collaborator as ${role}.`,
          data: { id: collaborator.id },
          featureType: 'goal',
        };
      }

      case 'remove_goal_collaborator': {
        const cid = requireString(parameters, 'collaborator_id', 'goal');
        if ('error' in cid) return cid.error;
        await goalService.removeCollaborator(cid.value);
        return { success: true, message: 'Collaborator removed from the goal.', featureType: 'goal' };
      }

      case 'list_goal_collaborators': {
        const gid = requireString(parameters, 'goal_id', 'goal');
        if ('error' in gid) return gid.error;
        const collaborators = await goalService.getGoalCollaborators(gid.value);
        return {
          success: true,
          message: collaborators.length
            ? `This goal has ${collaborators.length} collaborator(s).`
            : 'No collaborators on this goal.',
          data: {
            collaborators: collaborators.map(c => ({
              id: c.id,
              user_id: c.user_id,
              role: c.role,
              invited_at: c.invited_at,
            })),
          },
          featureType: 'goal',
        };
      }

      // ---------------------------------------------------------------
      // Goal Templates
      // ---------------------------------------------------------------

      case 'list_goal_templates': {
        const templates = await goalService.getGoalTemplates(parameters.category as string | undefined);
        return {
          success: true,
          message: templates.length
            ? `Found ${templates.length} goal template(s).`
            : 'No goal templates available.',
          data: {
            templates: templates.map(t => ({
              id: t.id,
              title: t.title,
              description: t.description,
              category: t.category,
              target_days: t.target_days,
              usage_count: t.usage_count,
            })),
          },
          featureType: 'goal',
        };
      }

      case 'create_goal_from_template': {
        const tid = requireString(parameters, 'template_id', 'goal');
        if ('error' in tid) return tid.error;
        const goal = await goalService.createGoalFromTemplate(
          spaceId,
          tid.value,
          {
            title: parameters.title as string | undefined,
            description: parameters.description as string | undefined,
            target_date: parameters.target_date as string | undefined,
            visibility: parameters.visibility as 'private' | 'shared' | undefined,
          },
        );
        return {
          success: true,
          message: `Goal created from template: "${goal.title}".`,
          data: { id: goal.id, title: goal.title },
          featureType: 'goal',
        };
      }

      // ---------------------------------------------------------------
      // Check-in Settings
      // ---------------------------------------------------------------

      case 'get_checkin_settings': {
        const gid = requireString(parameters, 'goal_id', 'goal');
        if ('error' in gid) return gid.error;
        const settings = await checkinService.getCheckInSettings(gid.value);
        if (!settings) {
          return {
            success: true,
            message: 'No check-in settings configured for this goal yet.',
            featureType: 'goal',
          };
        }
        return {
          success: true,
          message: `Check-in frequency: ${settings.frequency}, reminders ${settings.enable_reminders ? 'enabled' : 'disabled'}.`,
          data: {
            frequency: settings.frequency,
            reminder_time: settings.reminder_time,
            enable_reminders: settings.enable_reminders,
            day_of_week: settings.day_of_week,
            day_of_month: settings.day_of_month,
          },
          featureType: 'goal',
        };
      }

      case 'update_checkin_settings': {
        const gid = requireString(parameters, 'goal_id', 'goal');
        if ('error' in gid) return gid.error;
        await checkinService.updateCheckInSettings({
          goal_id: gid.value,
          ...(parameters.frequency ? { frequency: parameters.frequency as 'daily' | 'weekly' | 'biweekly' | 'monthly' } : {}),
          ...(parameters.day_of_week !== undefined ? { day_of_week: parameters.day_of_week as number } : {}),
          ...(parameters.day_of_month !== undefined ? { day_of_month: parameters.day_of_month as number } : {}),
          ...(parameters.reminder_time ? { reminder_time: parameters.reminder_time as string } : {}),
          ...(parameters.enable_reminders !== undefined ? { enable_reminders: parameters.enable_reminders as boolean } : {}),
        });
        return {
          success: true,
          message: 'Check-in settings updated.',
          featureType: 'goal',
        };
      }

      // ---------------------------------------------------------------
      // Project Line Items
      // ---------------------------------------------------------------

      case 'list_project_line_items': {
        const pid = requireString(parameters, 'project_id', 'project');
        if ('error' in pid) return pid.error;
        const items = await getProjectLineItems(pid.value);
        return {
          success: true,
          message: items.length
            ? `Found ${items.length} line item(s) for this project.`
            : 'No line items for this project yet.',
          data: {
            line_items: items.map(item => ({
              id: item.id,
              description: item.description,
              category: item.category,
              estimated_cost: item.estimated_cost,
              actual_cost: item.actual_cost,
              is_paid: item.is_paid,
              paid_date: item.paid_date,
            })),
          },
          featureType: 'project',
        };
      }

      case 'create_project_line_item': {
        const pid = requireString(parameters, 'project_id', 'project');
        if ('error' in pid) return pid.error;
        const desc = requireString(parameters, 'description', 'project');
        if ('error' in desc) return desc.error;
        const item = await createLineItem({
          project_id: pid.value,
          description: safeText(desc.value, 500),
          category: parameters.category as string | undefined,
          estimated_cost: parameters.estimated_cost as number | undefined,
          actual_cost: parameters.actual_cost as number | undefined,
          vendor_id: parameters.vendor_id as string | undefined,
          quantity: parameters.quantity as number | undefined,
          unit_price: parameters.unit_price as number | undefined,
        } as Parameters<typeof createLineItem>[0]);
        return {
          success: true,
          message: `Line item added: "${parameters.description}".`,
          data: { id: item.id },
          featureType: 'project',
        };
      }

      case 'update_project_line_item': {
        const lid = requireString(parameters, 'line_item_id', 'project');
        if ('error' in lid) return lid.error;
        const updates = pickAllowedKeys(parameters, [
          'description', 'category', 'estimated_cost', 'actual_cost', 'quantity', 'unit_price', 'vendor_id',
        ]);
        if (updates.description) updates.description = safeText(updates.description as string, 500);
        await updateLineItem(lid.value, updates);
        return {
          success: true,
          message: 'Line item updated.',
          featureType: 'project',
        };
      }

      case 'delete_project_line_item': {
        const lid = requireString(parameters, 'line_item_id', 'project');
        if ('error' in lid) return lid.error;
        await deleteLineItem(lid.value);
        return {
          success: true,
          message: 'Line item deleted.',
          featureType: 'project',
        };
      }

      case 'mark_line_item_paid': {
        const lid = requireString(parameters, 'line_item_id', 'project');
        if ('error' in lid) return lid.error;
        await markLineItemPaid(
          lid.value,
          parameters.paid_date as string | undefined,
        );
        return {
          success: true,
          message: 'Line item marked as paid.',
          featureType: 'project',
        };
      }

      case 'get_project_stats': {
        const stats = await getProjectStatsFn(spaceId);
        return {
          success: true,
          message: `Projects: ${stats.active_projects} active, ${stats.completed_projects} completed. Budget: $${stats.total_estimated_budget.toFixed(0)} estimated, $${stats.total_actual_cost.toFixed(0)} actual.`,
          data: stats,
          featureType: 'project',
        };
      }

      // ---------------------------------------------------------------
      // Vendors
      // ---------------------------------------------------------------

      case 'list_vendors': {
        const vendors = await getVendors(spaceId);
        return {
          success: true,
          message: vendors.length
            ? `Found ${vendors.length} vendor(s).`
            : 'No vendors saved yet.',
          data: {
            vendors: vendors.map(v => ({
              id: v.id,
              name: v.name,
              trade: v.trade,
              phone: v.phone,
              email: v.email,
              rating: v.rating,
              is_preferred: v.is_preferred,
            })),
          },
          featureType: 'project',
        };
      }

      case 'create_vendor': {
        const vname = requireString(parameters, 'name', 'project');
        if ('error' in vname) return vname.error;
        const vendor = await createVendorFn({
          space_id: spaceId,
          name: safeText(vname.value, 200),
          trade: parameters.trade ? safeText(parameters.trade as string, 200) : undefined,
          phone: parameters.phone ? safeText(parameters.phone as string, 50) : undefined,
          email: parameters.email ? safeText(parameters.email as string, 200) : undefined,
          notes: parameters.notes ? safeText(parameters.notes as string, 1000) : undefined,
          rating: typeof parameters.rating === 'number' ? clampInt(parameters.rating, 1, 5, 3) : undefined,
          is_preferred: parameters.is_preferred as boolean | undefined,
        } as Parameters<typeof createVendorFn>[0]);
        return {
          success: true,
          message: `Vendor added: "${vname.value}".`,
          data: { id: vendor.id },
          featureType: 'project',
        };
      }

      case 'update_vendor': {
        const vid = requireString(parameters, 'vendor_id', 'project');
        if ('error' in vid) return vid.error;
        const updates = pickAllowedKeys(parameters, [
          'name', 'trade', 'phone', 'email', 'notes', 'rating', 'is_preferred',
        ]);
        if (updates.name) updates.name = safeText(updates.name as string, 200);
        if (updates.notes) updates.notes = safeText(updates.notes as string, 1000);
        if (typeof updates.rating === 'number') updates.rating = clampInt(updates.rating, 1, 5, 3);
        await updateVendorFn(vid.value, updates);
        return {
          success: true,
          message: 'Vendor updated.',
          featureType: 'project',
        };
      }

      case 'delete_vendor': {
        const vid = requireString(parameters, 'vendor_id', 'project');
        if ('error' in vid) return vid.error;
        await deleteVendorFn(vid.value);
        return {
          success: true,
          message: 'Vendor deleted.',
          featureType: 'project',
        };
      }

      // ---------------------------------------------------------------
      // Recurring Expenses
      // ---------------------------------------------------------------

      case 'list_recurring_patterns': {
        const patterns = await getRecurringPatterns(spaceId);
        return {
          success: true,
          message: patterns.length
            ? `Found ${patterns.length} recurring expense pattern(s).`
            : 'No recurring expense patterns detected yet.',
          data: {
            patterns: patterns.map(p => ({
              id: p.id,
              name: p.pattern_name,
              merchant: p.merchant_name,
              category: p.category,
              frequency: p.frequency,
              average_amount: p.average_amount,
              next_expected_date: p.next_expected_date,
              confirmed: p.user_confirmed,
              occurrence_count: p.occurrence_count,
            })),
          },
          featureType: 'expense',
        };
      }

      case 'confirm_recurring_pattern': {
        const pid = requireString(parameters, 'pattern_id', 'expense');
        if ('error' in pid) return pid.error;
        await confirmPattern(pid.value);
        return { success: true, message: 'Recurring pattern confirmed.', featureType: 'expense' };
      }

      case 'ignore_recurring_pattern': {
        const pid = requireString(parameters, 'pattern_id', 'expense');
        if ('error' in pid) return pid.error;
        await ignorePattern(pid.value);
        return { success: true, message: 'Recurring pattern dismissed.', featureType: 'expense' };
      }

      // ---------------------------------------------------------------
      // Expense Splitting
      // ---------------------------------------------------------------

      case 'get_partner_balance': {
        const balance = await getPartnershipBalance(spaceId);
        if (!balance) {
          return { success: true, message: 'No partnership balance set up yet. Set up expense splitting first.', featureType: 'expense' };
        }
        return {
          success: true,
          message: 'Here is the current partnership balance.',
          data: balance as unknown as Record<string, unknown>,
          featureType: 'expense',
        };
      }

      case 'create_settlement': {
        const paidBy = requireString(parameters, 'paid_by', 'expense');
        if ('error' in paidBy) return paidBy.error;
        const paidTo = requireString(parameters, 'paid_to', 'expense');
        if ('error' in paidTo) return paidTo.error;
        const amt = requirePositiveNumber(parameters, 'amount', 'expense');
        if ('error' in amt) return amt.error;
        const settlement = await createSettlementFn({
          space_id: spaceId,
          from_user_id: paidBy.value,
          to_user_id: paidTo.value,
          amount: amt.value,
          payment_method: parameters.method as string | undefined,
          notes: safeText(parameters.notes, 500) || undefined,
          created_by: userId,
        });
        return {
          success: true,
          message: `Settlement of $${amt.value.toFixed(2)} recorded.`,
          data: { id: settlement.id },
          featureType: 'expense',
        };
      }

      // ---------------------------------------------------------------
      // Budget Variance
      // ---------------------------------------------------------------

      case 'get_budget_variance': {
        const startDate = parameters.start_date ? new Date(parameters.start_date as string) : undefined;
        const endDate = parameters.end_date ? new Date(parameters.end_date as string) : undefined;
        const variances = await getBudgetVariances(spaceId, startDate, endDate);
        const overBudget = variances.filter(v => v.status === 'over');
        return {
          success: true,
          message: variances.length
            ? `Budget analysis: ${variances.length} categories tracked, ${overBudget.length} over budget.`
            : 'No budget variance data available.',
          data: {
            variances: variances.map(v => ({
              category: v.category_name,
              allocated: v.allocated_amount,
              spent: v.spent_amount,
              variance: v.variance,
              variance_percentage: v.variance_percentage,
              status: v.status,
            })),
          },
          featureType: 'budget',
        };
      }

      // ---------------------------------------------------------------
      // Messages (Extended 2)
      // ---------------------------------------------------------------

      case 'react_to_message': {
        const mid = requireString(parameters, 'message_id', 'message');
        if ('error' in mid) return mid.error;
        const emoji = requireString(parameters, 'emoji', 'message');
        if ('error' in emoji) return emoji.error;
        const action = await messagesService.toggleReaction(mid.value, userId, emoji.value);
        return {
          success: true,
          message: action === 'added' ? `Reaction ${emoji.value} added.` : `Reaction ${emoji.value} removed.`,
          featureType: 'message',
        };
      }

      case 'mark_conversation_read': {
        const cid = requireString(parameters, 'conversation_id', 'message');
        if ('error' in cid) return cid.error;
        const count = await messagesService.markConversationAsRead(cid.value);
        return {
          success: true,
          message: count > 0 ? `Marked ${count} message(s) as read.` : 'All messages already read.',
          featureType: 'message',
        };
      }

      case 'unpin_message': {
        const mid = requireString(parameters, 'message_id', 'message');
        if ('error' in mid) return mid.error;
        await messagesService.unpinMessage(mid.value);
        return { success: true, message: 'Message unpinned.', featureType: 'message' };
      }

      case 'archive_conversation': {
        const cid = requireString(parameters, 'conversation_id', 'message');
        if ('error' in cid) return cid.error;
        await messagesService.archiveConversation(cid.value);
        return { success: true, message: 'Conversation archived.', featureType: 'message' };
      }

      case 'delete_conversation': {
        const cid = requireString(parameters, 'conversation_id', 'message');
        if ('error' in cid) return cid.error;
        await messagesService.deleteConversation(cid.value);
        return { success: true, message: 'Conversation deleted.', featureType: 'message' };
      }

      // ---------------------------------------------------------------
      // Reward Penalties
      // ---------------------------------------------------------------

      case 'get_user_penalties': {
        const targetUserId = (parameters.user_id as string) || userId;
        const penalties = await getUserPenalties(targetUserId, spaceId, {
          limit: (parameters.limit as number) || 20,
          includeForgiven: (parameters.include_forgiven as boolean) || false,
        });
        return {
          success: true,
          message: penalties.length
            ? `Found ${penalties.length} penalty record(s).`
            : 'No penalties found.',
          data: {
            penalties: penalties.map(p => ({
              id: p.id,
              chore_id: p.chore_id,
              points_deducted: p.points_deducted,
              days_late: p.days_late,
              due_date: p.due_date,
              is_forgiven: p.is_forgiven,
              created_at: p.created_at,
            })),
          },
          featureType: 'reward',
        };
      }

      case 'forgive_penalty': {
        const pid = requireString(parameters, 'penalty_id', 'reward');
        if ('error' in pid) return pid.error;
        const result = await forgivePenalty({
          penaltyId: pid.value,
          forgivenBy: userId,
          reason: safeText(parameters.reason, 500) || undefined,
        });
        if (!result.success) {
          return {
            success: false,
            message: result.error || 'Failed to forgive penalty.',
            featureType: 'reward',
          };
        }
        return {
          success: true,
          message: `Penalty forgiven — ${result.pointsRefunded} points refunded.`,
          data: { points_refunded: result.pointsRefunded },
          featureType: 'reward',
        };
      }

      case 'get_penalty_settings': {
        const settings = await getSpacePenaltySettings(spaceId);
        return {
          success: true,
          message: settings.enabled
            ? `Penalties enabled: ${settings.default_penalty_points} points per late chore, ${settings.default_grace_period_hours}h grace period.`
            : 'Late penalties are currently disabled.',
          data: settings as unknown as Record<string, unknown>,
          featureType: 'reward',
        };
      }

      case 'update_penalty_settings': {
        const updates: Record<string, unknown> = {};
        if (parameters.enabled !== undefined) updates.enabled = parameters.enabled;
        if (parameters.default_penalty_points !== undefined) updates.default_penalty_points = parameters.default_penalty_points;
        if (parameters.default_grace_period_hours !== undefined) updates.default_grace_period_hours = parameters.default_grace_period_hours;
        if (parameters.max_penalty_per_chore !== undefined) updates.max_penalty_per_chore = parameters.max_penalty_per_chore;
        if (parameters.progressive_penalty !== undefined) updates.progressive_penalty = parameters.progressive_penalty;
        if (parameters.exclude_weekends !== undefined) updates.exclude_weekends = parameters.exclude_weekends;
        const result = await updateSpacePenaltySettings(spaceId, updates);
        if (!result.success) {
          return {
            success: false,
            message: result.error || 'Failed to update penalty settings.',
            featureType: 'reward',
          };
        }
        return {
          success: true,
          message: 'Penalty settings updated.',
          featureType: 'reward',
        };
      }

      // ═══════════════════════════════════════
      // BATCH / BULK COMPLETION
      // ═══════════════════════════════════════

      case 'batch_complete_tasks': {
        const taskIds = parameters.task_ids;
        if (!Array.isArray(taskIds) || taskIds.length === 0) {
          return { success: false, message: 'No task IDs provided', featureType: 'task' };
        }
        const results = await tasksService.updateTasksBatch(
          taskIds.map(id => String(id)),
          { status: 'completed' },
        );
        return {
          success: true,
          message: `Completed ${results.length} tasks`,
          data: { completed_count: results.length },
          featureType: 'task',
        };
      }

      case 'batch_complete_chores': {
        const choreIds = parameters.chore_ids;
        const choreUserId = (parameters.user_id as string) || userId;
        if (!Array.isArray(choreIds) || choreIds.length === 0) {
          return { success: false, message: 'No chore IDs provided', featureType: 'chore' };
        }
        let completed = 0;
        let totalPoints = 0;
        for (const id of choreIds) {
          try {
            const result = await choresService.completeChoreWithRewards(String(id), String(choreUserId), supabase);
            if (result) {
              completed++;
              totalPoints += result.pointsAwarded || 0;
            }
          } catch {
            // Skip individual failures, continue with rest
          }
        }
        return {
          success: true,
          message: `Completed ${completed} chores${totalPoints > 0 ? `, earned ${totalPoints} points` : ''}`,
          data: { completed_count: completed, points_earned: totalPoints },
          featureType: 'chore',
        };
      }

      case 'batch_complete_reminders': {
        const reminderIds = parameters.reminder_ids;
        if (!Array.isArray(reminderIds) || reminderIds.length === 0) {
          return { success: false, message: 'No reminder IDs provided', featureType: 'reminder' };
        }
        let remindersCompleted = 0;
        for (const id of reminderIds) {
          try {
            await remindersService.updateReminder(String(id), { status: 'completed' }, supabase);
            remindersCompleted++;
          } catch {
            // Skip individual failures
          }
        }
        return {
          success: true,
          message: `Completed ${remindersCompleted} reminders`,
          data: { completed_count: remindersCompleted },
          featureType: 'reminder',
        };
      }

      case 'batch_check_shopping_items': {
        const itemIds = parameters.item_ids;
        if (!Array.isArray(itemIds) || itemIds.length === 0) {
          return { success: false, message: 'No item IDs provided', featureType: 'shopping' };
        }
        let checked = 0;
        for (const id of itemIds) {
          try {
            await shoppingService.toggleItem(String(id), true);
            checked++;
          } catch {
            // Skip individual failures
          }
        }
        return {
          success: true,
          message: `Checked off ${checked} items`,
          data: { checked_count: checked },
          featureType: 'shopping',
        };
      }

      case 'batch_complete_goals': {
        const goalIds = parameters.goal_ids;
        if (!Array.isArray(goalIds) || goalIds.length === 0) {
          return { success: false, message: 'No goal IDs provided', featureType: 'goal' };
        }
        let goalsCompleted = 0;
        for (const id of goalIds) {
          try {
            await goalsService.updateGoal(String(id), { status: 'completed', progress: 100 }, supabase);
            goalsCompleted++;
          } catch {
            // Skip individual failures
          }
        }
        return {
          success: true,
          message: `Completed ${goalsCompleted} goals`,
          data: { completed_count: goalsCompleted },
          featureType: 'goal',
        };
      }

      default:
        return {
          success: false,
          message: `Unknown tool: ${toolName}`,
          featureType: 'general',
        };
    }
  } catch (error) {
    logger.error(`[ToolExecutor] Error executing ${toolName}:`, error, {
      component: 'ai-tool-executor',
      action: 'tool_execution',
      spaceId,
    });

    // Surface Zod validation errors as user-friendly messages
    if (error instanceof Error && error.name === 'ZodError') {
      // Extract field-level issues from Zod for better AI self-correction
      let details = error.message;
      try {
        const zodError = error as Error & { issues?: Array<{ path: (string | number)[]; message: string }> };
        if (zodError.issues?.length) {
          details = zodError.issues
            .map(i => `${i.path.join('.')}: ${i.message}`)
            .join('; ');
        }
      } catch {
        // Fall back to raw message
      }
      return {
        success: false,
        message: `Invalid parameters — ${details}. Check the required fields and try again.`,
        featureType: getFeatureTypeFromTool(toolName),
      };
    }

    // Detect "not found" errors from the service layer
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
    if (errorMessage.includes('not found') || errorMessage.includes('no rows') || errorMessage.includes('does not exist')) {
      return {
        success: false,
        message: `Item not found. It may have been deleted or the ID is incorrect. Try using a list tool to find the correct item.`,
        featureType: getFeatureTypeFromTool(toolName),
      };
    }

    // Detect permission errors
    if (errorMessage.includes('permission') || errorMessage.includes('rls') || errorMessage.includes('policy')) {
      return {
        success: false,
        message: `You don't have permission to perform this action.`,
        featureType: getFeatureTypeFromTool(toolName),
      };
    }

    // Never expose raw error details (stack traces, DB messages) to the AI
    return {
      success: false,
      message: 'Something went wrong executing that action. Please try again.',
      featureType: getFeatureTypeFromTool(toolName),
    };
  }
}

/**
 * Map tool name to feature type for UI color-coding.
 */
function getFeatureTypeFromTool(toolName: string): FeatureType {
  if (toolName.includes('task') || toolName.includes('comment')) return 'task';
  if (toolName.includes('chore') || toolName.includes('rotation')) return 'chore';
  if (toolName.includes('event')) return 'event';
  if (toolName.includes('reminder') || toolName.includes('snooze')) return 'reminder';
  if (toolName.includes('shopping')) return 'shopping';
  if (toolName.includes('meal') || toolName.includes('recipe')) return 'meal';
  if (toolName.includes('goal') || toolName.includes('milestone') || toolName.includes('collaborator') || toolName.includes('template') || toolName.includes('checkin')) return 'goal';
  if (toolName.includes('expense') || toolName.includes('bill') || toolName.includes('recurring') || toolName.includes('settlement') || toolName.includes('partner_balance')) return 'expense';
  if (toolName.includes('budget') || toolName.includes('variance')) return 'budget';
  if (toolName.includes('project') || toolName.includes('vendor') || toolName.includes('line_item')) return 'project';
  if (toolName.includes('reward') || toolName.includes('penalty') || toolName.includes('points')) return 'reward';
  if (toolName.includes('message') || toolName.includes('conversation') || toolName.includes('reaction')) return 'message';
  return 'general';
}

/**
 * Format a date/datetime string into a human-readable form.
 * e.g. "2026-02-13T10:00:00" → "Feb 13, 2026 at 10:00 AM"
 *      "2026-02-13" → "Feb 13, 2026"
 */
function formatDateForPreview(dateStr: string): string {
  try {
    // Date-only (YYYY-MM-DD) — parse parts to avoid timezone shift
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      + ' at '
      + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return dateStr;
  }
}

/**
 * Get a human-readable preview of what a tool call would do.
 * Used in the confirmation UI before executing destructive or create actions.
 */
export function getToolCallPreview(toolName: string, parameters: Record<string, unknown>): string {
  switch (toolName) {
    // Tasks
    case 'create_task':
      return `Create task: "${parameters.title}"${parameters.priority ? ` (${parameters.priority} priority)` : ''}${parameters.assigned_to ? ' assigned to a member' : ''}${parameters.due_date ? ` due ${formatDateForPreview(String(parameters.due_date))}` : ''}`;
    case 'complete_task':
      return 'Mark task as completed';
    case 'list_tasks':
      return `List tasks${parameters.status ? ` (${parameters.status})` : ''}`;
    case 'update_task':
      return 'Update task';
    case 'delete_task':
      return 'Delete task';

    // Chores
    case 'create_chore':
      return `Create ${parameters.frequency || ''} chore: "${parameters.title}"${parameters.assigned_to ? ' assigned to a member' : ''}`;
    case 'complete_chore':
      return 'Mark chore as completed';
    case 'update_chore':
      return 'Update chore';
    case 'delete_chore':
      return 'Delete chore';
    case 'list_chores':
      return `List chores${parameters.status ? ` (${parameters.status})` : ''}${parameters.frequency ? ` (${parameters.frequency})` : ''}`;

    // Calendar Events
    case 'create_event':
      return `Create event: "${parameters.title}"${parameters.start_time ? ` at ${formatDateForPreview(String(parameters.start_time))}` : ''}${parameters.location ? ` at ${parameters.location}` : ''}`;
    case 'update_event':
      return 'Update event';
    case 'delete_event':
      return 'Delete event';
    case 'list_events':
      return 'List calendar events';

    // Reminders
    case 'create_reminder':
      return `Create reminder: "${parameters.title}"${parameters.reminder_time ? ` for ${formatDateForPreview(String(parameters.reminder_time))}` : ''}`;
    case 'complete_reminder':
      return 'Mark reminder as completed';
    case 'update_reminder':
      return 'Update reminder';
    case 'delete_reminder':
      return 'Delete reminder';
    case 'snooze_reminder':
      return `Snooze reminder for ${parameters.snooze_minutes || 15} minutes`;
    case 'list_reminders':
      return `List reminders${parameters.status ? ` (${parameters.status})` : ''}`;

    // Shopping
    case 'create_shopping_list':
      return `Create shopping list: "${parameters.title}"`;
    case 'add_shopping_item':
      return `Add "${parameters.name}"${parameters.quantity ? ` (${parameters.quantity})` : ''} to shopping list`;
    case 'update_shopping_item':
      return 'Update shopping item';
    case 'delete_shopping_item':
      return 'Delete shopping item';
    case 'toggle_shopping_item':
      return parameters.checked ? 'Check off shopping item' : 'Uncheck shopping item';
    case 'list_shopping_lists':
      return 'List shopping lists';

    // Meals & Recipes
    case 'plan_meal':
      return `Plan ${parameters.meal_type}: ${parameters.name || 'meal'} for ${formatDateForPreview(String(parameters.scheduled_date))}`;
    case 'create_recipe':
      return `Create recipe: "${parameters.name}"`;
    case 'search_recipes':
      return `Search recipes for "${parameters.query}"`;
    case 'update_meal':
      return 'Update meal';
    case 'delete_meal':
      return 'Delete meal';
    case 'list_meals':
      return `List meals${parameters.start_date ? ` from ${formatDateForPreview(String(parameters.start_date))}` : ''}${parameters.end_date ? ` to ${formatDateForPreview(String(parameters.end_date))}` : ''}`;

    // Goals & Milestones
    case 'create_goal':
      return `Create goal: "${parameters.title}"${parameters.target_date ? ` by ${formatDateForPreview(String(parameters.target_date))}` : ''}`;
    case 'update_goal_progress':
      return `Update goal progress to ${parameters.progress}%`;
    case 'update_goal':
      return 'Update goal';
    case 'delete_goal':
      return 'Delete goal';
    case 'create_milestone':
      return `Create milestone: "${parameters.title}"`;
    case 'toggle_milestone':
      return parameters.completed === false ? 'Reopen milestone' : 'Complete milestone';
    case 'list_goals':
      return 'List goals';

    // Expenses
    case 'create_expense':
      return `Log expense: "${parameters.title}" — $${parameters.amount}`;
    case 'update_expense':
      return 'Update expense';
    case 'delete_expense':
      return 'Delete expense';
    case 'list_expenses':
      return 'List expenses';

    // Projects
    case 'create_project':
      return `Create project: "${parameters.name}"`;
    case 'update_project':
      return 'Update project';
    case 'delete_project':
      return 'Delete project';
    case 'list_projects':
      return 'List projects';

    // Messages
    case 'send_message':
      return 'Send message';
    case 'list_conversations':
      return 'List conversations';

    // Rewards
    case 'create_reward':
      return `Create reward: "${parameters.name}" (${parameters.cost_points} pts)`;
    case 'list_rewards':
      return 'List rewards';
    case 'update_reward':
      return 'Update reward';
    case 'delete_reward':
      return 'Delete reward';
    case 'get_points_balance':
      return 'Check points balance';
    case 'redeem_reward':
      return 'Redeem reward';
    case 'get_leaderboard':
      return `Show ${parameters.period || 'weekly'} leaderboard`;

    // Budget
    case 'get_budget':
      return 'Get budget';
    case 'get_budget_stats':
      return 'Get budget statistics';
    case 'set_budget':
      return `Set monthly budget to $${parameters.monthly_budget}`;

    // Recipes
    case 'list_recipes':
      return 'List saved recipes';
    case 'update_recipe':
      return 'Update recipe';
    case 'delete_recipe':
      return 'Delete recipe';

    // Bills
    case 'list_bills':
      return `List bills${parameters.status ? ` (${parameters.status})` : ''}`;
    case 'create_bill':
      return `Create bill: "${parameters.name}" — $${parameters.amount}`;
    case 'update_bill':
      return 'Update bill';
    case 'delete_bill':
      return 'Delete bill';
    case 'mark_bill_paid':
      return 'Mark bill as paid';

    // Shopping (Extended)
    case 'delete_shopping_list':
      return 'Delete shopping list';

    // Messages (Extended)
    case 'list_messages':
      return 'Read messages';
    case 'create_conversation':
      return `Create conversation: "${parameters.title}"`;

    // Rewards (Extended)
    case 'list_redemptions':
      return `List redemptions${parameters.status ? ` (${parameters.status})` : ''}`;
    case 'approve_redemption':
      return 'Approve reward redemption';
    case 'deny_redemption':
      return 'Deny reward redemption';
    case 'award_points':
      return `Award ${parameters.points} bonus points`;

    // Goals (Extended)
    case 'update_milestone':
      return 'Update milestone';
    case 'delete_milestone':
      return 'Delete milestone';
    case 'create_goal_checkin':
      return `Log goal check-in (${parameters.progress_percentage}%)`;
    case 'get_goal_checkins':
      return 'View goal check-in history';
    case 'update_goal_checkin':
      return 'Update goal check-in';
    case 'delete_goal_checkin':
      return 'Delete goal check-in';
    case 'get_goal_stats':
      return 'Get goal statistics';

    // Subtasks
    case 'list_subtasks':
      return 'List subtasks';
    case 'create_subtask':
      return `Create subtask: "${parameters.title}"`;
    case 'update_subtask':
      return 'Update subtask';
    case 'delete_subtask':
      return 'Delete subtask';

    // Shopping (Extended)
    case 'update_shopping_list':
      return 'Update shopping list';

    // Recipes (Extended)
    case 'get_recipe':
      return 'Get recipe details';

    // Project Milestones
    case 'list_project_milestones':
      return 'List project milestones';
    case 'create_project_milestone':
      return `Create project milestone: "${parameters.title}"`;
    case 'toggle_project_milestone':
      return 'Toggle project milestone';
    case 'delete_project_milestone':
      return 'Delete project milestone';

    // Finance (Extended)
    case 'get_spending_insights':
      return 'Get spending insights';
    case 'get_category_spending':
      return 'Get spending by category';

    // Messages (Extended)
    case 'edit_message':
      return 'Edit message';
    case 'delete_message':
      return 'Delete message';
    case 'pin_message':
      return 'Pin message';

    // Rewards (Extended)
    case 'fulfill_redemption':
      return 'Fulfill reward redemption';
    case 'cancel_redemption':
      return 'Cancel redemption';
    case 'get_points_history':
      return 'Get points history';

    // Task Comments
    case 'list_task_comments':
      return 'List task comments';
    case 'add_task_comment':
      return 'Add comment to task';
    case 'delete_task_comment':
      return 'Delete task comment';

    // Chore Rotations & Stats
    case 'create_chore_rotation':
      return `Create ${parameters.rotation_type} rotation (${parameters.frequency})`;
    case 'get_chore_rotation':
      return 'Get chore rotation schedule';
    case 'update_chore_rotation':
      return 'Update chore rotation';
    case 'delete_chore_rotation':
      return 'Delete chore rotation';
    case 'get_chore_stats':
      return 'Get chore statistics';

    // Goal Collaborators
    case 'add_goal_collaborator':
      return `Add ${parameters.role} to goal`;
    case 'remove_goal_collaborator':
      return 'Remove goal collaborator';
    case 'list_goal_collaborators':
      return 'List goal collaborators';

    // Goal Templates
    case 'list_goal_templates':
      return `List goal templates${parameters.category ? ` (${parameters.category})` : ''}`;
    case 'create_goal_from_template':
      return 'Create goal from template';

    // Check-in Settings
    case 'get_checkin_settings':
      return 'Get check-in settings';
    case 'update_checkin_settings':
      return 'Update check-in settings';

    // Project Line Items
    case 'list_project_line_items':
      return 'List project line items';
    case 'create_project_line_item':
      return `Add line item: "${parameters.description}"`;
    case 'update_project_line_item':
      return 'Update line item';
    case 'delete_project_line_item':
      return 'Delete line item';
    case 'mark_line_item_paid':
      return 'Mark line item as paid';
    case 'get_project_stats':
      return 'Get project statistics';

    // Vendors
    case 'list_vendors':
      return 'List vendors';
    case 'create_vendor':
      return `Add vendor: "${parameters.name}"`;
    case 'update_vendor':
      return 'Update vendor';
    case 'delete_vendor':
      return 'Delete vendor';

    // Recurring Expenses
    case 'list_recurring_patterns':
      return 'List recurring expenses';
    case 'confirm_recurring_pattern':
      return 'Confirm recurring pattern';
    case 'ignore_recurring_pattern':
      return 'Dismiss recurring pattern';

    // Expense Splitting
    case 'get_partner_balance':
      return 'Get partnership balance';
    case 'create_settlement':
      return `Record settlement: $${parameters.amount}`;

    // Budget Variance
    case 'get_budget_variance':
      return 'Get budget variance analysis';

    // Messages (Extended 2)
    case 'react_to_message':
      return `React with ${parameters.emoji}`;
    case 'mark_conversation_read':
      return 'Mark conversation as read';
    case 'unpin_message':
      return 'Unpin message';
    case 'archive_conversation':
      return 'Archive conversation';
    case 'delete_conversation':
      return 'Delete conversation';

    // Reward Penalties
    case 'get_user_penalties':
      return 'Get penalty history';
    case 'forgive_penalty':
      return 'Forgive penalty';
    case 'get_penalty_settings':
      return 'Get penalty settings';
    case 'update_penalty_settings':
      return 'Update penalty settings';

    // Household Summary
    case 'get_household_summary':
      return 'Get household overview';

    default:
      return `Execute ${toolName}`;
  }
}
