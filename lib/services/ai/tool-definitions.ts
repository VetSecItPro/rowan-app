/**
 * Gemini Function-Calling Tool Declarations for Rowan AI Chat
 *
 * Defines all available tool declarations that the Gemini model can invoke
 * during a chat session. Each declaration describes a Rowan feature action
 * (create task, plan meal, etc.) with its required and optional parameters.
 *
 * These declarations are passed to `GenerativeModel.startChat({ tools })`
 * so the model knows what functions it can call and what arguments each requires.
 */

import {
  SchemaType,
  type FunctionDeclaration,
} from '@google/generative-ai';

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

/** Create a new task with optional priority, assignment, due date, and tags */
const createTask: FunctionDeclaration = {
  name: 'create_task',
  description:
    'Create a new task in the household task list. Use this when a user wants to add a to-do item, assign work, or track something that needs to be done.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for creating a task',
    properties: {
      title: {
        type: SchemaType.STRING,
        description: 'The title or name of the task',
      },
      description: {
        type: SchemaType.STRING,
        description: 'A longer description of what the task involves',
      },
      priority: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['low', 'medium', 'high', 'urgent'],
        description: 'Priority level of the task. Defaults to medium if not specified.',
      },
      status: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['pending', 'in-progress', 'completed', 'blocked', 'on-hold'],
        description: 'Initial status of the task. Defaults to pending if not specified.',
      },
      due_date: {
        type: SchemaType.STRING,
        description: 'Due date in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)',
      },
      assigned_to: {
        type: SchemaType.STRING,
        description: 'User ID of the space member to assign this task to',
      },
      category: {
        type: SchemaType.STRING,
        description: 'Category or label for the task (e.g. "household", "school", "work")',
      },
      estimated_hours: {
        type: SchemaType.NUMBER,
        description: 'Estimated number of hours to complete the task',
      },
      calendar_sync: {
        type: SchemaType.BOOLEAN,
        description: 'Whether to sync this task to the calendar as an event',
      },
      tags: {
        type: SchemaType.ARRAY,
        description: 'Tags or labels to attach to the task for filtering',
        items: {
          type: SchemaType.STRING,
          description: 'A single tag value',
        },
      },
    },
    required: ['title'],
  },
};

/** Mark a task as completed */
const completeTask: FunctionDeclaration = {
  name: 'complete_task',
  description:
    'Mark an existing task as completed. Use this when a user says they finished a task or wants to check it off.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for completing a task',
    properties: {
      task_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the task to mark as completed',
      },
    },
    required: ['task_id'],
  },
};

/** List tasks with optional filters */
const listTasks: FunctionDeclaration = {
  name: 'list_tasks',
  description:
    'Retrieve a list of tasks, optionally filtered by status, priority, or assignee. Use this when a user asks to see their tasks, what is due, or what someone is working on.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Optional filters for listing tasks',
    properties: {
      status: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['pending', 'in-progress', 'completed', 'blocked', 'on-hold'],
        description: 'Filter tasks by status',
      },
      priority: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['low', 'medium', 'high', 'urgent'],
        description: 'Filter tasks by priority level',
      },
      assigned_to: {
        type: SchemaType.STRING,
        description: 'Filter tasks by the user ID they are assigned to',
      },
    },
    required: [],
  },
};

// ---------------------------------------------------------------------------
// Chores
// ---------------------------------------------------------------------------

/** Create a new household chore with frequency and optional point value */
const createChore: FunctionDeclaration = {
  name: 'create_chore',
  description:
    'Create a new household chore with a recurring frequency. Use this when a user wants to set up a repeating responsibility like taking out the trash or cleaning the kitchen.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for creating a chore',
    properties: {
      title: {
        type: SchemaType.STRING,
        description: 'The name of the chore',
      },
      description: {
        type: SchemaType.STRING,
        description: 'Additional details about how the chore should be done',
      },
      frequency: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['daily', 'weekly', 'biweekly', 'monthly', 'once'],
        description: 'How often this chore repeats',
      },
      assigned_to: {
        type: SchemaType.STRING,
        description: 'User ID of the space member assigned to this chore',
      },
      due_date: {
        type: SchemaType.STRING,
        description: 'Next due date in ISO 8601 format (YYYY-MM-DD)',
      },
      point_value: {
        type: SchemaType.INTEGER,
        description: 'Number of reward points earned for completing this chore',
      },
      notes: {
        type: SchemaType.STRING,
        description: 'Extra notes or instructions for the chore',
      },
    },
    required: ['title', 'frequency'],
  },
};

/** Mark a chore as completed */
const completeChore: FunctionDeclaration = {
  name: 'complete_chore',
  description:
    'Mark a chore as completed for the current period. Use this when someone says they finished a chore.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for completing a chore',
    properties: {
      chore_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the chore to mark as completed',
      },
    },
    required: ['chore_id'],
  },
};

// ---------------------------------------------------------------------------
// Calendar Events
// ---------------------------------------------------------------------------

/** Create a new calendar event */
const createEvent: FunctionDeclaration = {
  name: 'create_event',
  description:
    'Create a new calendar event. Use this when a user wants to schedule something — an appointment, meeting, activity, or any time-bound occurrence.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for creating a calendar event',
    properties: {
      title: {
        type: SchemaType.STRING,
        description: 'The title of the event',
      },
      start_time: {
        type: SchemaType.STRING,
        description: 'Start date and time in ISO 8601 format (YYYY-MM-DDTHH:mm:ss)',
      },
      end_time: {
        type: SchemaType.STRING,
        description: 'End date and time in ISO 8601 format. If omitted, defaults to 1 hour after start_time.',
      },
      description: {
        type: SchemaType.STRING,
        description: 'Additional details or notes about the event',
      },
      location: {
        type: SchemaType.STRING,
        description: 'Where the event takes place (address, room name, or virtual link)',
      },
      all_day: {
        type: SchemaType.BOOLEAN,
        description: 'Whether this is an all-day event (no specific start/end times)',
      },
      recurrence: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
        description: 'Recurrence pattern for the event. Defaults to none.',
      },
      reminder_minutes: {
        type: SchemaType.INTEGER,
        description: 'Number of minutes before the event to send a reminder notification',
      },
    },
    required: ['title', 'start_time'],
  },
};

/** Update an existing calendar event */
const updateEvent: FunctionDeclaration = {
  name: 'update_event',
  description:
    'Update an existing calendar event. Use this when a user wants to reschedule, change the location, or modify details of an event.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for updating a calendar event',
    properties: {
      event_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the event to update',
      },
      title: {
        type: SchemaType.STRING,
        description: 'New title for the event',
      },
      start_time: {
        type: SchemaType.STRING,
        description: 'New start date and time in ISO 8601 format',
      },
      end_time: {
        type: SchemaType.STRING,
        description: 'New end date and time in ISO 8601 format',
      },
      location: {
        type: SchemaType.STRING,
        description: 'New location for the event',
      },
      description: {
        type: SchemaType.STRING,
        description: 'New description for the event',
      },
    },
    required: ['event_id'],
  },
};

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

/** Create a new reminder */
const createReminder: FunctionDeclaration = {
  name: 'create_reminder',
  description:
    'Create a new reminder. Use this when a user wants to be reminded about something at a specific time or on a recurring basis.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for creating a reminder',
    properties: {
      title: {
        type: SchemaType.STRING,
        description: 'What the reminder is about',
      },
      due_date: {
        type: SchemaType.STRING,
        description: 'When the reminder is due in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)',
      },
      priority: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['low', 'medium', 'high', 'urgent'],
        description: 'Priority level of the reminder',
      },
      recurrence: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'],
        description: 'How often this reminder repeats. Defaults to none.',
      },
      assigned_to: {
        type: SchemaType.STRING,
        description: 'User ID of the space member this reminder is for',
      },
      description: {
        type: SchemaType.STRING,
        description: 'Additional details about the reminder',
      },
      notification_time: {
        type: SchemaType.STRING,
        description: 'Specific time to send the notification in ISO 8601 format',
      },
    },
    required: ['title'],
  },
};

/** Mark a reminder as completed */
const completeReminder: FunctionDeclaration = {
  name: 'complete_reminder',
  description:
    'Mark a reminder as completed or dismissed. Use this when a user acknowledges or finishes what the reminder was about.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for completing a reminder',
    properties: {
      reminder_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the reminder to mark as completed',
      },
    },
    required: ['reminder_id'],
  },
};

// ---------------------------------------------------------------------------
// Shopping
// ---------------------------------------------------------------------------

/** Add an item to a shopping list */
const addShoppingItem: FunctionDeclaration = {
  name: 'add_shopping_item',
  description:
    'Add an item to a shopping list. Use this when a user wants to put something on the grocery list or any other shopping list.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for adding a shopping list item',
    properties: {
      name: {
        type: SchemaType.STRING,
        description: 'Name of the item to add (e.g. "milk", "paper towels")',
      },
      list_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the shopping list to add the item to',
      },
      quantity: {
        type: SchemaType.STRING,
        description: 'Quantity or amount needed (e.g. "2", "1 gallon", "3 lbs")',
      },
      category: {
        type: SchemaType.STRING,
        description: 'Category for the item (e.g. "produce", "dairy", "household")',
      },
      notes: {
        type: SchemaType.STRING,
        description: 'Additional notes (e.g. "organic only", "store brand is fine")',
      },
    },
    required: ['name', 'list_id'],
  },
};

/** Create a new shopping list */
const createShoppingList: FunctionDeclaration = {
  name: 'create_shopping_list',
  description:
    'Create a new shopping list. Use this when a user wants to start a new list (e.g. "grocery list", "costco run", "party supplies").',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for creating a shopping list',
    properties: {
      title: {
        type: SchemaType.STRING,
        description: 'Name of the shopping list',
      },
    },
    required: ['title'],
  },
};

// ---------------------------------------------------------------------------
// Meals
// ---------------------------------------------------------------------------

/** Plan a meal for a specific date */
const planMeal: FunctionDeclaration = {
  name: 'plan_meal',
  description:
    'Plan a meal for a specific date and meal type. Use this when a user wants to schedule what they are eating for breakfast, lunch, dinner, or a snack.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for planning a meal',
    properties: {
      meal_type: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['breakfast', 'lunch', 'dinner', 'snack', 'other'],
        description: 'Which meal of the day this is for',
      },
      scheduled_date: {
        type: SchemaType.STRING,
        description: 'The date for this meal in ISO 8601 format (YYYY-MM-DD)',
      },
      recipe_name: {
        type: SchemaType.STRING,
        description: 'Name of the recipe or dish being planned',
      },
      notes: {
        type: SchemaType.STRING,
        description: 'Additional notes about the meal (e.g. "double the recipe", "use leftover chicken")',
      },
      servings: {
        type: SchemaType.INTEGER,
        description: 'Number of servings to prepare',
      },
    },
    required: ['meal_type', 'scheduled_date'],
  },
};

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

/** Create a new goal */
const createGoal: FunctionDeclaration = {
  name: 'create_goal',
  description:
    'Create a new personal or family goal. Use this when a user wants to set a target they are working toward — health, financial, educational, or anything else.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for creating a goal',
    properties: {
      title: {
        type: SchemaType.STRING,
        description: 'The title of the goal',
      },
      description: {
        type: SchemaType.STRING,
        description: 'A detailed description of what the goal entails',
      },
      goal_type: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['personal', 'family', 'health', 'financial', 'career', 'education', 'other'],
        description: 'The category of the goal',
      },
      target_date: {
        type: SchemaType.STRING,
        description: 'Target completion date in ISO 8601 format (YYYY-MM-DD)',
      },
      assigned_to: {
        type: SchemaType.STRING,
        description: 'User ID of the space member this goal is assigned to',
      },
      reminder_frequency: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['daily', 'weekly', 'monthly', 'none'],
        description: 'How often to send progress reminders. Defaults to none.',
      },
    },
    required: ['title'],
  },
};

/** Update progress on an existing goal */
const updateGoalProgress: FunctionDeclaration = {
  name: 'update_goal_progress',
  description:
    'Update the progress percentage on an existing goal. Use this when a user reports progress or wants to log a milestone.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for updating goal progress',
    properties: {
      goal_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the goal to update',
      },
      progress: {
        type: SchemaType.INTEGER,
        description: 'New progress percentage (0-100)',
      },
    },
    required: ['goal_id', 'progress'],
  },
};

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

/** Create a new expense entry */
const createExpense: FunctionDeclaration = {
  name: 'create_expense',
  description:
    'Record a new expense or bill. Use this when a user wants to log money spent or track an upcoming payment.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for creating an expense',
    properties: {
      title: {
        type: SchemaType.STRING,
        description: 'Description of the expense (e.g. "Weekly groceries", "Electric bill")',
      },
      amount: {
        type: SchemaType.NUMBER,
        description: 'The monetary amount of the expense',
      },
      category: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: [
          'groceries',
          'utilities',
          'rent',
          'mortgage',
          'transportation',
          'entertainment',
          'dining',
          'healthcare',
          'insurance',
          'subscriptions',
          'education',
          'childcare',
          'pets',
          'clothing',
          'personal',
          'gifts',
          'travel',
          'home',
          'other',
        ],
        description: 'Spending category for the expense',
      },
      payment_method: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['cash', 'credit', 'debit', 'bank_transfer', 'check', 'other'],
        description: 'How the expense was paid',
      },
      due_date: {
        type: SchemaType.STRING,
        description: 'Due date for the expense in ISO 8601 format (YYYY-MM-DD)',
      },
      notes: {
        type: SchemaType.STRING,
        description: 'Additional notes about the expense',
      },
    },
    required: ['title', 'amount'],
  },
};

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

/** Create a new project */
const createProject: FunctionDeclaration = {
  name: 'create_project',
  description:
    'Create a new project to organize related tasks and milestones. Use this when a user wants to plan something larger that has multiple steps — a home renovation, a trip, a family event, etc.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for creating a project',
    properties: {
      name: {
        type: SchemaType.STRING,
        description: 'The name of the project',
      },
      description: {
        type: SchemaType.STRING,
        description: 'A summary of what the project is about',
      },
      status: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['planning', 'active', 'on-hold', 'completed', 'archived'],
        description: 'Current status of the project. Defaults to planning.',
      },
      priority: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['low', 'medium', 'high', 'urgent'],
        description: 'Priority level of the project',
      },
      start_date: {
        type: SchemaType.STRING,
        description: 'Project start date in ISO 8601 format (YYYY-MM-DD)',
      },
      end_date: {
        type: SchemaType.STRING,
        description: 'Target end date in ISO 8601 format (YYYY-MM-DD)',
      },
    },
    required: ['name'],
  },
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * All Gemini function-calling tool declarations for Rowan.
 * Pass this array to `GenerativeModel.startChat({ tools: [{ functionDeclarations: TOOL_DECLARATIONS }] })`.
 */
export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  // Tasks
  createTask,
  completeTask,
  listTasks,
  // Chores
  createChore,
  completeChore,
  // Calendar Events
  createEvent,
  updateEvent,
  // Reminders
  createReminder,
  completeReminder,
  // Shopping
  addShoppingItem,
  createShoppingList,
  // Meals
  planMeal,
  // Goals
  createGoal,
  updateGoalProgress,
  // Expenses
  createExpense,
  // Projects
  createProject,
];

/**
 * Mapping of friendly display names to tool function names.
 * Useful for logging, analytics, and UI display.
 */
export const TOOL_NAMES = {
  // Tasks
  CREATE_TASK: 'create_task',
  COMPLETE_TASK: 'complete_task',
  LIST_TASKS: 'list_tasks',
  // Chores
  CREATE_CHORE: 'create_chore',
  COMPLETE_CHORE: 'complete_chore',
  // Calendar Events
  CREATE_EVENT: 'create_event',
  UPDATE_EVENT: 'update_event',
  // Reminders
  CREATE_REMINDER: 'create_reminder',
  COMPLETE_REMINDER: 'complete_reminder',
  // Shopping
  ADD_SHOPPING_ITEM: 'add_shopping_item',
  CREATE_SHOPPING_LIST: 'create_shopping_list',
  // Meals
  PLAN_MEAL: 'plan_meal',
  // Goals
  CREATE_GOAL: 'create_goal',
  UPDATE_GOAL_PROGRESS: 'update_goal_progress',
  // Expenses
  CREATE_EXPENSE: 'create_expense',
  // Projects
  CREATE_PROJECT: 'create_project',
} as const;

/**
 * Look up a single tool declaration by function name.
 * Returns `undefined` if no declaration matches the given name.
 *
 * @param name - The function name to search for (e.g. 'create_task')
 * @returns The matching FunctionDeclaration or undefined
 */
export function getToolDeclaration(name: string): FunctionDeclaration | undefined {
  return TOOL_DECLARATIONS.find((decl) => decl.name === name);
}
