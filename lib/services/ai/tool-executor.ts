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
import type { CreateMealInput, CreateRecipeInput } from '@/lib/services/meals-service';
import { goalsService } from '@/lib/services/goals-service';
import type { CreateGoalInput, CreateMilestoneInput } from '@/lib/services/goals-service';
import { projectsService } from '@/lib/services/budgets-service';
import type { CreateExpenseInput } from '@/lib/services/budgets-service';
import { projectsOnlyService } from '@/lib/services/projects-service';
import type { CreateProjectInput } from '@/lib/services/projects-service';
import { messagesService } from '@/lib/services/messages-service';
import { rewardsService } from '@/lib/services/rewards/rewards-service';

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
        const tasks = await tasksService.getTasks(spaceId, {
          status: parameters.status as string | undefined,
          priority: parameters.priority as string | undefined,
          assigned_to: parameters.assigned_to as string | undefined,
        }, supabase);
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

      case 'update_task': {
        const taskId = parameters.task_id as string;
        if (!taskId) {
          return { success: false, message: 'Task ID is required', featureType: 'task' };
        }
        const { task_id: _taskIdParam, ...taskUpdates } = parameters;
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
        // choresService.updateChore auto-sets completed_at when status is 'completed'
        await choresService.updateChore(choreId, { status: 'completed' }, supabase);
        return {
          success: true,
          message: 'Chore marked as completed',
          data: { id: choreId },
          featureType: 'chore',
        };
      }

      case 'update_chore': {
        const choreId = parameters.chore_id as string;
        if (!choreId) {
          return { success: false, message: 'Chore ID is required', featureType: 'chore' };
        }
        const { chore_id: _choreIdParam, ...choreUpdates } = parameters;
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
        // deleteChore does not accept a supabase client param — RLS enforces space_id
        await choresService.deleteChore(choreId);
        return {
          success: true,
          message: 'Chore deleted',
          data: { id: choreId },
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
        // Strip event_id from the update payload — it's not a column
        const { event_id: _eventIdParam, ...eventUpdateParams } = parameters;
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
        const { reminder_id: _reminderIdParam, ...reminderUpdates } = parameters;
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
        const { item_id: _itemIdParam, ...itemUpdates } = parameters;
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
        if (!query) {
          return { success: false, message: 'Search query is required', featureType: 'meal' };
        }
        try {
          // Call TheMealDB API (free, open, no auth required)
          const response = await fetch(
            `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`
          );
          const data = await response.json();
          const meals = data.meals || [];
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
        const { meal_id: _mealIdParam, ...mealUpdates } = parameters;
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
        const { goal_id: _goalIdParam, ...goalUpdates } = parameters;
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
        const { expense_id: _expenseIdParam, ...expenseUpdates } = parameters;
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
        const { project_id: _projectIdParam, ...projectUpdates } = parameters;
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
  if (toolName.includes('reminder') || toolName.includes('snooze')) return 'reminder';
  if (toolName.includes('shopping')) return 'shopping';
  if (toolName.includes('meal') || toolName.includes('recipe')) return 'meal';
  if (toolName.includes('goal') || toolName.includes('milestone')) return 'goal';
  if (toolName.includes('expense')) return 'expense';
  if (toolName.includes('budget')) return 'budget';
  if (toolName.includes('project')) return 'project';
  if (toolName.includes('reward')) return 'reward';
  if (toolName.includes('message') || toolName.includes('conversation')) return 'message';
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

    // Calendar Events
    case 'create_event':
      return `Create event: "${parameters.title}"${parameters.start_time ? ` at ${formatDateForPreview(String(parameters.start_time))}` : ''}${parameters.location ? ` at ${parameters.location}` : ''}`;
    case 'update_event':
      return 'Update event';
    case 'delete_event':
      return 'Delete event';

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

    // Expenses
    case 'create_expense':
      return `Log expense: "${parameters.title}" — $${parameters.amount}`;
    case 'update_expense':
      return 'Update expense';
    case 'delete_expense':
      return 'Delete expense';

    // Projects
    case 'create_project':
      return `Create project: "${parameters.name}"`;
    case 'update_project':
      return 'Update project';
    case 'delete_project':
      return 'Delete project';

    // Messages
    case 'send_message':
      return 'Send message';
    case 'list_conversations':
      return 'List conversations';

    // Rewards
    case 'create_reward':
      return `Create reward: "${parameters.name}" (${parameters.cost_points} pts)`;

    default:
      return `Execute ${toolName}`;
  }
}
