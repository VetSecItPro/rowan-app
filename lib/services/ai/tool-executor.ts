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
import type { CreateMealInput } from '@/lib/services/meals-service';
import { goalsService } from '@/lib/services/goals-service';
import type { CreateGoalInput } from '@/lib/services/goals-service';
import { projectsService } from '@/lib/services/budgets-service';
import type { CreateExpenseInput } from '@/lib/services/budgets-service';
import { projectsOnlyService } from '@/lib/services/projects-service';
import type { CreateProjectInput } from '@/lib/services/projects-service';

import type { FeatureType } from '@/lib/types/chat';

export interface ToolExecutionContext {
  spaceId: string;
  userId: string;
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
  const { spaceId, userId } = context;

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
        const task = await tasksService.createTask(input);
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
        await tasksService.updateTask(taskId, { status: 'completed' });
        return {
          success: true,
          message: 'Task marked as completed',
          data: { id: taskId },
          featureType: 'task',
        };
      }

      case 'list_tasks': {
        const tasks = await tasksService.getTasks(spaceId, {
          status: parameters.status as string | undefined,
          priority: parameters.priority as string | undefined,
          assigned_to: parameters.assigned_to as string | undefined,
        });
        return {
          success: true,
          message: `Found ${tasks.length} task${tasks.length === 1 ? '' : 's'}`,
          data: {
            count: tasks.length,
            tasks: tasks.slice(0, 10).map(t => ({
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority,
              due_date: t.due_date,
              assigned_to: t.assigned_to,
            })),
          },
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
        const chore = await choresService.createChore(input);
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
        // choresService.updateChore auto-sets completed_at when status is 'completed'
        await choresService.updateChore(choreId, { status: 'completed' });
        return {
          success: true,
          message: 'Chore marked as completed',
          data: { id: choreId },
          featureType: 'chore',
        };
      }

      // ═══════════════════════════════════════
      // CALENDAR EVENTS
      // ═══════════════════════════════════════
      case 'create_event': {
        const input = createCalendarEventSchema.parse({
          ...parameters,
          space_id: spaceId,
        });
        const event = await calendarService.createEvent(input);
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
        // Strip event_id from the update payload — it's not a column
        const { event_id: _, ...updateParams } = parameters;
        await calendarService.updateEvent(eventId, updateParams);
        return {
          success: true,
          message: 'Event updated',
          data: { id: eventId },
          featureType: 'event',
        };
      }

      // ═══════════════════════════════════════
      // REMINDERS
      // ═══════════════════════════════════════
      case 'create_reminder': {
        const input = stripNulls<CreateReminderInput>(createReminderSchema.parse({
          ...parameters,
          space_id: spaceId,
          created_by: userId,
        }));
        const reminder = await remindersService.createReminder(input);
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
        await remindersService.updateReminder(reminderId, { status: 'completed' });
        return {
          success: true,
          message: 'Reminder completed',
          data: { id: reminderId },
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
        const list = await shoppingService.createList(input);
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
        const item = await shoppingService.createItem(input);
        return {
          success: true,
          message: `Added "${item.name}" to shopping list`,
          data: { id: item.id, name: item.name },
          featureType: 'shopping',
        };
      }

      // ═══════════════════════════════════════
      // MEALS
      // ═══════════════════════════════════════
      case 'plan_meal': {
        const input = stripNulls<CreateMealInput>(createMealSchema.parse({
          ...parameters,
          space_id: spaceId,
        }));
        const meal = await mealsService.createMeal(input);
        return {
          success: true,
          message: `Planned ${meal.meal_type}${meal.name ? `: ${meal.name}` : ''} for ${formatDateForPreview(meal.scheduled_date)}`,
          data: { id: meal.id, meal_type: meal.meal_type },
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
        const goal = await goalsService.createGoal(input);
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
        await goalsService.updateGoal(goalId, { progress });
        return {
          success: true,
          message: `Updated goal progress to ${progress}%`,
          data: { id: goalId, progress },
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
        const expense = await projectsService.createExpense(input);
        return {
          success: true,
          message: `Created expense "${expense.title}" — $${expense.amount}`,
          data: { id: expense.id, title: expense.title, amount: expense.amount },
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
        const project = await projectsOnlyService.createProject(input);
        return {
          success: true,
          message: `Created project "${project.name}"`,
          data: { id: project.id, name: project.name },
          featureType: 'project',
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
      return {
        success: false,
        message: `Invalid parameters: ${error.message}`,
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
  if (toolName.includes('task')) return 'task';
  if (toolName.includes('chore')) return 'chore';
  if (toolName.includes('event')) return 'event';
  if (toolName.includes('reminder')) return 'reminder';
  if (toolName.includes('shopping')) return 'shopping';
  if (toolName.includes('meal')) return 'meal';
  if (toolName.includes('goal')) return 'goal';
  if (toolName.includes('expense')) return 'expense';
  if (toolName.includes('budget')) return 'budget';
  if (toolName.includes('project')) return 'project';
  if (toolName.includes('reward')) return 'reward';
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
    case 'create_task':
      return `Create task: "${parameters.title}"${parameters.priority ? ` (${parameters.priority} priority)` : ''}${parameters.assigned_to ? ' assigned to a member' : ''}${parameters.due_date ? ` due ${formatDateForPreview(String(parameters.due_date))}` : ''}`;
    case 'complete_task':
      return 'Mark task as completed';
    case 'list_tasks':
      return `List tasks${parameters.status ? ` (${parameters.status})` : ''}`;
    case 'create_chore':
      return `Create ${parameters.frequency || ''} chore: "${parameters.title}"${parameters.assigned_to ? ' assigned to a member' : ''}`;
    case 'complete_chore':
      return 'Mark chore as completed';
    case 'create_event':
      return `Create event: "${parameters.title}"${parameters.start_time ? ` at ${formatDateForPreview(String(parameters.start_time))}` : ''}${parameters.location ? ` at ${parameters.location}` : ''}`;
    case 'update_event':
      return 'Update event';
    case 'create_reminder':
      return `Create reminder: "${parameters.title}"${parameters.due_date ? ` for ${formatDateForPreview(String(parameters.due_date))}` : ''}`;
    case 'complete_reminder':
      return 'Mark reminder as completed';
    case 'create_shopping_list':
      return `Create shopping list: "${parameters.title}"`;
    case 'add_shopping_item':
      return `Add "${parameters.name}"${parameters.quantity ? ` (${parameters.quantity})` : ''} to shopping list`;
    case 'plan_meal':
      return `Plan ${parameters.meal_type}: ${parameters.recipe_name || 'meal'} for ${formatDateForPreview(String(parameters.scheduled_date))}`;
    case 'create_goal':
      return `Create goal: "${parameters.title}"${parameters.target_date ? ` by ${formatDateForPreview(String(parameters.target_date))}` : ''}`;
    case 'update_goal_progress':
      return `Update goal progress to ${parameters.progress}%`;
    case 'create_expense':
      return `Log expense: "${parameters.title}" — $${parameters.amount}`;
    case 'create_project':
      return `Create project: "${parameters.name}"`;
    default:
      return `Execute ${toolName}`;
  }
}
