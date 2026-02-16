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
        type: SchemaType.STRING,
        description: 'Comma-separated tags or labels for filtering (e.g. "grocery, urgent, school")',
      },
    },
    required: ['title'],
  },
};

/** Update an existing task */
const updateTask: FunctionDeclaration = {
  name: 'update_task',
  description:
    'Update an existing task. Use this when a user wants to change the title, description, status, priority, due date, assignee, or category of an existing task.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for updating a task',
    properties: {
      task_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the task to update',
      },
      title: {
        type: SchemaType.STRING,
        description: 'New title for the task',
      },
      description: {
        type: SchemaType.STRING,
        description: 'New description for the task',
      },
      status: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['pending', 'in-progress', 'completed', 'blocked', 'on-hold'],
        description: 'New status for the task',
      },
      priority: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['low', 'medium', 'high', 'urgent'],
        description: 'New priority level for the task',
      },
      due_date: {
        type: SchemaType.STRING,
        description: 'New due date in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)',
      },
      assigned_to: {
        type: SchemaType.STRING,
        description: 'User ID of the space member to reassign this task to',
      },
      category: {
        type: SchemaType.STRING,
        description: 'New category for the task',
      },
    },
    required: ['task_id'],
  },
};

/** Delete a task */
const deleteTask: FunctionDeclaration = {
  name: 'delete_task',
  description:
    'Delete an existing task permanently. Use this when a user wants to remove a task entirely rather than just completing it.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for deleting a task',
    properties: {
      task_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the task to delete',
      },
    },
    required: ['task_id'],
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
      category: {
        type: SchemaType.STRING,
        description: 'Category for the chore (e.g. "kitchen", "bathroom", "yard", "laundry")',
      },
    },
    required: ['title', 'frequency'],
  },
};

/** Update an existing chore */
const updateChore: FunctionDeclaration = {
  name: 'update_chore',
  description:
    'Update an existing household chore. Use this when a user wants to change the title, frequency, assignment, point value, or other details of a chore.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for updating a chore',
    properties: {
      chore_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the chore to update',
      },
      title: {
        type: SchemaType.STRING,
        description: 'New title for the chore',
      },
      description: {
        type: SchemaType.STRING,
        description: 'New description for the chore',
      },
      frequency: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['daily', 'weekly', 'biweekly', 'monthly', 'once'],
        description: 'New frequency for the chore',
      },
      assigned_to: {
        type: SchemaType.STRING,
        description: 'User ID of the space member to reassign this chore to',
      },
      due_date: {
        type: SchemaType.STRING,
        description: 'New due date in ISO 8601 format (YYYY-MM-DD)',
      },
      point_value: {
        type: SchemaType.INTEGER,
        description: 'New point value earned for completing this chore',
      },
      category: {
        type: SchemaType.STRING,
        description: 'New category for the chore',
      },
      status: {
        type: SchemaType.STRING,
        description: 'New status for the chore',
      },
    },
    required: ['chore_id'],
  },
};

/** Delete a chore */
const deleteChore: FunctionDeclaration = {
  name: 'delete_chore',
  description:
    'Delete an existing chore permanently. Use this when a user wants to remove a chore from the household rotation entirely.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for deleting a chore',
    properties: {
      chore_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the chore to delete',
      },
    },
    required: ['chore_id'],
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
      recurrence_pattern: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
        description: 'Recurrence pattern for the event. Defaults to none.',
      },
      category: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['work', 'personal', 'family', 'health', 'social'],
        description: 'Category of the event',
      },
      custom_color: {
        type: SchemaType.STRING,
        description: 'Custom hex color for the event (e.g. "#8b5cf6")',
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

/** Delete a calendar event */
const deleteEvent: FunctionDeclaration = {
  name: 'delete_event',
  description:
    'Delete a calendar event permanently. Use this when a user wants to cancel or remove a scheduled event from the calendar.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for deleting a calendar event',
    properties: {
      event_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the event to delete',
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
      reminder_time: {
        type: SchemaType.STRING,
        description: 'When the reminder should fire, in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)',
      },
      priority: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['low', 'medium', 'high', 'urgent'],
        description: 'Priority level of the reminder',
      },
      recurrence_pattern: {
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
      category: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['bills', 'health', 'work', 'personal', 'household'],
        description: 'Category of the reminder',
      },
    },
    required: ['title'],
  },
};

/** Update an existing reminder */
const updateReminder: FunctionDeclaration = {
  name: 'update_reminder',
  description:
    'Update an existing reminder. Use this when a user wants to change the time, title, priority, recurrence, or other details of a reminder.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for updating a reminder',
    properties: {
      reminder_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the reminder to update',
      },
      title: {
        type: SchemaType.STRING,
        description: 'New title for the reminder',
      },
      reminder_time: {
        type: SchemaType.STRING,
        description: 'New reminder time in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)',
      },
      priority: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['low', 'medium', 'high', 'urgent'],
        description: 'New priority level for the reminder',
      },
      recurrence_pattern: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'],
        description: 'New recurrence pattern for the reminder',
      },
      assigned_to: {
        type: SchemaType.STRING,
        description: 'User ID of the space member to reassign this reminder to',
      },
      description: {
        type: SchemaType.STRING,
        description: 'New description for the reminder',
      },
      category: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['bills', 'health', 'work', 'personal', 'household'],
        description: 'New category for the reminder',
      },
      status: {
        type: SchemaType.STRING,
        description: 'New status for the reminder',
      },
    },
    required: ['reminder_id'],
  },
};

/** Delete a reminder */
const deleteReminder: FunctionDeclaration = {
  name: 'delete_reminder',
  description:
    'Delete a reminder permanently. Use this when a user wants to remove a reminder entirely rather than just completing or dismissing it.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for deleting a reminder',
    properties: {
      reminder_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the reminder to delete',
      },
    },
    required: ['reminder_id'],
  },
};

/** Snooze a reminder for a specified number of minutes */
const snoozeReminder: FunctionDeclaration = {
  name: 'snooze_reminder',
  description:
    'Snooze a reminder to fire again after a specified delay. Use this when a user wants to be reminded again later — e.g. "snooze for 15 minutes" or "remind me again in an hour".',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for snoozing a reminder',
    properties: {
      reminder_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the reminder to snooze',
      },
      snooze_minutes: {
        type: SchemaType.INTEGER,
        description: 'Number of minutes to snooze the reminder for',
      },
    },
    required: ['reminder_id', 'snooze_minutes'],
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

/** Update an existing shopping item */
const updateShoppingItem: FunctionDeclaration = {
  name: 'update_shopping_item',
  description:
    'Update an existing shopping list item. Use this when a user wants to change the name, quantity, category, notes, or checked status of an item on a shopping list.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for updating a shopping item',
    properties: {
      item_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the shopping item to update',
      },
      name: {
        type: SchemaType.STRING,
        description: 'New name for the item',
      },
      quantity: {
        type: SchemaType.STRING,
        description: 'New quantity or amount (e.g. "2", "1 gallon")',
      },
      category: {
        type: SchemaType.STRING,
        description: 'New category for the item',
      },
      notes: {
        type: SchemaType.STRING,
        description: 'New notes for the item',
      },
      checked: {
        type: SchemaType.BOOLEAN,
        description: 'Whether the item is checked off',
      },
    },
    required: ['item_id'],
  },
};

/** Delete a shopping item */
const deleteShoppingItem: FunctionDeclaration = {
  name: 'delete_shopping_item',
  description:
    'Delete an item from a shopping list permanently. Use this when a user wants to remove an item from their list entirely.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for deleting a shopping item',
    properties: {
      item_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the shopping item to delete',
      },
    },
    required: ['item_id'],
  },
};

/** Toggle a shopping item as checked or unchecked */
const toggleShoppingItem: FunctionDeclaration = {
  name: 'toggle_shopping_item',
  description:
    'Mark a shopping item as checked (purchased) or unchecked. Use this when a user says they bought an item or wants to uncheck it.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for toggling a shopping item',
    properties: {
      item_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the shopping item to toggle',
      },
      checked: {
        type: SchemaType.BOOLEAN,
        description: 'Whether the item should be checked (true) or unchecked (false)',
      },
    },
    required: ['item_id', 'checked'],
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
      name: {
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

/** Create a new recipe in the library */
const createRecipe: FunctionDeclaration = {
  name: 'create_recipe',
  description:
    'Create a new recipe in the recipe library. Use this when a user wants to save a recipe — their own creation or one they found and want to keep.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for creating a recipe',
    properties: {
      name: {
        type: SchemaType.STRING,
        description: 'Name of the recipe',
      },
      description: {
        type: SchemaType.STRING,
        description: 'A short description of the recipe',
      },
      ingredients: {
        type: SchemaType.STRING,
        description: 'Comma-separated list of ingredients (e.g. "2 cups flour, 1 egg, 1 cup sugar")',
      },
      instructions: {
        type: SchemaType.STRING,
        description: 'Step-by-step cooking instructions',
      },
      prep_time: {
        type: SchemaType.INTEGER,
        description: 'Preparation time in minutes',
      },
      cook_time: {
        type: SchemaType.INTEGER,
        description: 'Cooking time in minutes',
      },
      servings: {
        type: SchemaType.INTEGER,
        description: 'Number of servings the recipe yields',
      },
      difficulty: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['easy', 'medium', 'hard'],
        description: 'Difficulty level of the recipe',
      },
      cuisine_type: {
        type: SchemaType.STRING,
        description: 'Type of cuisine (e.g. "Italian", "Mexican", "Japanese")',
      },
      tags: {
        type: SchemaType.STRING,
        description: 'Comma-separated tags for filtering (e.g. "vegetarian, quick, kid-friendly")',
      },
    },
    required: ['name'],
  },
};

/** Search external recipe APIs for inspiration */
const searchRecipes: FunctionDeclaration = {
  name: 'search_recipes',
  description:
    'Search external recipe APIs for meal inspiration and ideas. Use this when a user asks for recipe suggestions, wants to find something new to cook, or needs inspiration for a specific cuisine.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for searching recipes',
    properties: {
      query: {
        type: SchemaType.STRING,
        description: 'Search query describing what kind of recipe to find (e.g. "chicken pasta", "vegan dessert")',
      },
      cuisine: {
        type: SchemaType.STRING,
        description: 'Optional cuisine type to filter results (e.g. "Italian", "Thai")',
      },
    },
    required: ['query'],
  },
};

/** Update a planned meal */
const updateMeal: FunctionDeclaration = {
  name: 'update_meal',
  description:
    'Update an existing planned meal. Use this when a user wants to change what they are having, reschedule a meal, or adjust the servings.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for updating a planned meal',
    properties: {
      meal_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the planned meal to update',
      },
      meal_type: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['breakfast', 'lunch', 'dinner', 'snack', 'other'],
        description: 'New meal type',
      },
      scheduled_date: {
        type: SchemaType.STRING,
        description: 'New date for the meal in ISO 8601 format (YYYY-MM-DD)',
      },
      name: {
        type: SchemaType.STRING,
        description: 'New name or recipe for the meal',
      },
      notes: {
        type: SchemaType.STRING,
        description: 'New notes about the meal',
      },
      servings: {
        type: SchemaType.INTEGER,
        description: 'New number of servings',
      },
    },
    required: ['meal_id'],
  },
};

/** Delete a planned meal */
const deleteMeal: FunctionDeclaration = {
  name: 'delete_meal',
  description:
    'Delete a planned meal from the meal plan. Use this when a user wants to remove a meal they previously scheduled.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for deleting a planned meal',
    properties: {
      meal_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the planned meal to delete',
      },
    },
    required: ['meal_id'],
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
      category: {
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

/** Update an existing goal */
const updateGoal: FunctionDeclaration = {
  name: 'update_goal',
  description:
    'Update an existing goal. Use this when a user wants to change the title, description, category, target date, status, or progress of a goal.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for updating a goal',
    properties: {
      goal_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the goal to update',
      },
      title: {
        type: SchemaType.STRING,
        description: 'New title for the goal',
      },
      description: {
        type: SchemaType.STRING,
        description: 'New description for the goal',
      },
      category: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['personal', 'family', 'health', 'financial', 'career', 'education', 'other'],
        description: 'New category for the goal',
      },
      target_date: {
        type: SchemaType.STRING,
        description: 'New target completion date in ISO 8601 format (YYYY-MM-DD)',
      },
      status: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['active', 'completed', 'paused', 'cancelled'],
        description: 'New status for the goal',
      },
      progress: {
        type: SchemaType.INTEGER,
        description: 'New progress percentage (0-100)',
      },
    },
    required: ['goal_id'],
  },
};

/** Delete a goal */
const deleteGoal: FunctionDeclaration = {
  name: 'delete_goal',
  description:
    'Delete an existing goal permanently. Use this when a user wants to remove a goal they no longer want to track.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for deleting a goal',
    properties: {
      goal_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the goal to delete',
      },
    },
    required: ['goal_id'],
  },
};

/** Create a milestone within a goal */
const createMilestone: FunctionDeclaration = {
  name: 'create_milestone',
  description:
    'Create a milestone within an existing goal. Use this when a user wants to break a goal into smaller checkpoints or sub-objectives.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for creating a milestone',
    properties: {
      goal_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the goal this milestone belongs to',
      },
      title: {
        type: SchemaType.STRING,
        description: 'Title of the milestone',
      },
      target_date: {
        type: SchemaType.STRING,
        description: 'Target date for the milestone in ISO 8601 format (YYYY-MM-DD)',
      },
      description: {
        type: SchemaType.STRING,
        description: 'Description of what this milestone entails',
      },
    },
    required: ['goal_id', 'title'],
  },
};

/** Toggle a milestone as complete or incomplete */
const toggleMilestone: FunctionDeclaration = {
  name: 'toggle_milestone',
  description:
    'Mark a milestone as complete or incomplete. Use this when a user reaches a milestone or wants to undo a completed milestone.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for toggling a milestone',
    properties: {
      milestone_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the milestone to toggle',
      },
    },
    required: ['milestone_id'],
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

/** Update an existing expense */
const updateExpense: FunctionDeclaration = {
  name: 'update_expense',
  description:
    'Update an existing expense or bill. Use this when a user wants to change the amount, category, payment method, or other details of a recorded expense.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for updating an expense',
    properties: {
      expense_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the expense to update',
      },
      title: {
        type: SchemaType.STRING,
        description: 'New description for the expense',
      },
      amount: {
        type: SchemaType.NUMBER,
        description: 'New monetary amount for the expense',
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
        description: 'New spending category for the expense',
      },
      payment_method: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['cash', 'credit', 'debit', 'bank_transfer', 'check', 'other'],
        description: 'New payment method for the expense',
      },
      due_date: {
        type: SchemaType.STRING,
        description: 'New due date in ISO 8601 format (YYYY-MM-DD)',
      },
      notes: {
        type: SchemaType.STRING,
        description: 'New notes about the expense',
      },
      status: {
        type: SchemaType.STRING,
        description: 'New status for the expense',
      },
    },
    required: ['expense_id'],
  },
};

/** Delete an expense */
const deleteExpense: FunctionDeclaration = {
  name: 'delete_expense',
  description:
    'Delete an expense record permanently. Use this when a user wants to remove an expense they logged by mistake or no longer want to track.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for deleting an expense',
    properties: {
      expense_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the expense to delete',
      },
    },
    required: ['expense_id'],
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
        enum: ['planning', 'in-progress', 'on-hold', 'completed', 'cancelled'],
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
      target_date: {
        type: SchemaType.STRING,
        description: 'Target end date in ISO 8601 format (YYYY-MM-DD)',
      },
      budget_amount: {
        type: SchemaType.NUMBER,
        description: 'Budget amount for the project',
      },
    },
    required: ['name'],
  },
};

/** Update an existing project */
const updateProject: FunctionDeclaration = {
  name: 'update_project',
  description:
    'Update an existing project. Use this when a user wants to change the name, description, status, priority, dates, or budget of a project.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for updating a project',
    properties: {
      project_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the project to update',
      },
      name: {
        type: SchemaType.STRING,
        description: 'New name for the project',
      },
      description: {
        type: SchemaType.STRING,
        description: 'New description for the project',
      },
      status: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['planning', 'in-progress', 'on-hold', 'completed', 'cancelled'],
        description: 'New status for the project',
      },
      priority: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['low', 'medium', 'high', 'urgent'],
        description: 'New priority level for the project',
      },
      start_date: {
        type: SchemaType.STRING,
        description: 'New start date in ISO 8601 format (YYYY-MM-DD)',
      },
      target_date: {
        type: SchemaType.STRING,
        description: 'New target end date in ISO 8601 format (YYYY-MM-DD)',
      },
      budget_amount: {
        type: SchemaType.NUMBER,
        description: 'New budget amount for the project',
      },
    },
    required: ['project_id'],
  },
};

/** Delete a project */
const deleteProject: FunctionDeclaration = {
  name: 'delete_project',
  description:
    'Delete a project permanently. Use this when a user wants to remove a project entirely.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for deleting a project',
    properties: {
      project_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the project to delete',
      },
    },
    required: ['project_id'],
  },
};

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/** Send a message in a space conversation */
const sendMessage: FunctionDeclaration = {
  name: 'send_message',
  description:
    'Send a message in a space conversation. Use this when a user wants to post a message to a household conversation thread.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for sending a message',
    properties: {
      content: {
        type: SchemaType.STRING,
        description: 'The text content of the message to send',
      },
      conversation_id: {
        type: SchemaType.STRING,
        description: 'The ID of the conversation to send the message to. If omitted, sends to the default space conversation.',
      },
    },
    required: ['content'],
  },
};

/** List active conversations in the space */
const listConversations: FunctionDeclaration = {
  name: 'list_conversations',
  description:
    'List active conversations in the space. Use this when a user wants to see their conversations or find a specific thread to message.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for listing conversations',
    properties: {},
    required: [],
  },
};

// ---------------------------------------------------------------------------
// Rewards
// ---------------------------------------------------------------------------

/** Create a redeemable reward */
const createReward: FunctionDeclaration = {
  name: 'create_reward',
  description:
    'Create a new redeemable reward that family members can earn by accumulating chore points. Use this when a user wants to set up an incentive like "movie night", "extra screen time", or "pick dinner".',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for creating a reward',
    properties: {
      title: {
        type: SchemaType.STRING,
        description: 'Name of the reward (e.g. "Movie Night", "Extra Screen Time")',
      },
      point_cost: {
        type: SchemaType.INTEGER,
        description: 'Number of points required to redeem this reward',
      },
      description: {
        type: SchemaType.STRING,
        description: 'A description of what the reward entails',
      },
      emoji: {
        type: SchemaType.STRING,
        description: 'An emoji to represent the reward (e.g. "🎬", "🎮")',
      },
    },
    required: ['title', 'point_cost'],
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
  updateTask,
  deleteTask,
  completeTask,
  listTasks,
  // Chores
  createChore,
  updateChore,
  deleteChore,
  completeChore,
  // Calendar Events
  createEvent,
  updateEvent,
  deleteEvent,
  // Reminders
  createReminder,
  updateReminder,
  deleteReminder,
  snoozeReminder,
  completeReminder,
  // Shopping
  addShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
  toggleShoppingItem,
  createShoppingList,
  // Meals
  planMeal,
  createRecipe,
  searchRecipes,
  updateMeal,
  deleteMeal,
  // Goals
  createGoal,
  updateGoal,
  deleteGoal,
  createMilestone,
  toggleMilestone,
  updateGoalProgress,
  // Expenses
  createExpense,
  updateExpense,
  deleteExpense,
  // Projects
  createProject,
  updateProject,
  deleteProject,
  // Messages
  sendMessage,
  listConversations,
  // Rewards
  createReward,
];

/**
 * Mapping of friendly display names to tool function names.
 * Useful for logging, analytics, and UI display.
 */
export const TOOL_NAMES = {
  // Tasks
  CREATE_TASK: 'create_task',
  UPDATE_TASK: 'update_task',
  DELETE_TASK: 'delete_task',
  COMPLETE_TASK: 'complete_task',
  LIST_TASKS: 'list_tasks',
  // Chores
  CREATE_CHORE: 'create_chore',
  UPDATE_CHORE: 'update_chore',
  DELETE_CHORE: 'delete_chore',
  COMPLETE_CHORE: 'complete_chore',
  // Calendar Events
  CREATE_EVENT: 'create_event',
  UPDATE_EVENT: 'update_event',
  DELETE_EVENT: 'delete_event',
  // Reminders
  CREATE_REMINDER: 'create_reminder',
  UPDATE_REMINDER: 'update_reminder',
  DELETE_REMINDER: 'delete_reminder',
  SNOOZE_REMINDER: 'snooze_reminder',
  COMPLETE_REMINDER: 'complete_reminder',
  // Shopping
  ADD_SHOPPING_ITEM: 'add_shopping_item',
  UPDATE_SHOPPING_ITEM: 'update_shopping_item',
  DELETE_SHOPPING_ITEM: 'delete_shopping_item',
  TOGGLE_SHOPPING_ITEM: 'toggle_shopping_item',
  CREATE_SHOPPING_LIST: 'create_shopping_list',
  // Meals
  PLAN_MEAL: 'plan_meal',
  CREATE_RECIPE: 'create_recipe',
  SEARCH_RECIPES: 'search_recipes',
  UPDATE_MEAL: 'update_meal',
  DELETE_MEAL: 'delete_meal',
  // Goals
  CREATE_GOAL: 'create_goal',
  UPDATE_GOAL: 'update_goal',
  DELETE_GOAL: 'delete_goal',
  CREATE_MILESTONE: 'create_milestone',
  TOGGLE_MILESTONE: 'toggle_milestone',
  UPDATE_GOAL_PROGRESS: 'update_goal_progress',
  // Expenses
  CREATE_EXPENSE: 'create_expense',
  UPDATE_EXPENSE: 'update_expense',
  DELETE_EXPENSE: 'delete_expense',
  // Projects
  CREATE_PROJECT: 'create_project',
  UPDATE_PROJECT: 'update_project',
  DELETE_PROJECT: 'delete_project',
  // Messages
  SEND_MESSAGE: 'send_message',
  LIST_CONVERSATIONS: 'list_conversations',
  // Rewards
  CREATE_REWARD: 'create_reward',
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
