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
      category: {
        type: SchemaType.STRING,
        description: 'Filter tasks by category (e.g. "household", "school", "work")',
      },
      search: {
        type: SchemaType.STRING,
        description: 'Search tasks by title or description text',
      },
      overdue: {
        type: SchemaType.BOOLEAN,
        description: 'Set to true to only show overdue tasks (past due date, not completed)',
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
      status: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['pending', 'in-progress', 'blocked', 'on-hold', 'completed'],
        description: 'Initial status for the chore. Defaults to "pending".',
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
        format: 'enum',
        enum: ['pending', 'in-progress', 'blocked', 'on-hold', 'completed'],
        description: 'New status for the chore',
      },
      notes: {
        type: SchemaType.STRING,
        description: 'Special instructions or extra notes for the chore',
      },
      calendar_sync: {
        type: SchemaType.BOOLEAN,
        description: 'Whether to sync this chore to the calendar',
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

/** List household chores with optional filters */
const listChores: FunctionDeclaration = {
  name: 'list_chores',
  description:
    'Retrieve a list of household chores, optionally filtered by status, frequency, or assignee. Use this when a user asks about their chores, what needs to be done, or wants to find a specific chore to update or complete.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Optional filters for listing chores',
    properties: {
      status: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['pending', 'in-progress', 'blocked', 'on-hold', 'completed'],
        description: 'Filter chores by status',
      },
      frequency: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['daily', 'weekly', 'biweekly', 'monthly', 'once'],
        description: 'Filter chores by frequency',
      },
      assigned_to: {
        type: SchemaType.STRING,
        description: 'Filter chores by the user ID they are assigned to',
      },
      search: {
        type: SchemaType.STRING,
        description: 'Search chores by title or description text',
      },
      category: {
        type: SchemaType.STRING,
        description: 'Filter chores by category',
      },
    },
    required: [],
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
        enum: ['none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'],
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
        description: 'Custom hex color for the event in #RRGGBB format (e.g. "#8b5cf6")',
      },
      assigned_to: {
        type: SchemaType.STRING,
        description: 'User ID of the family member this event is assigned to',
      },
      show_countdown: {
        type: SchemaType.BOOLEAN,
        description: 'Whether to display a countdown widget for this event',
      },
      countdown_label: {
        type: SchemaType.STRING,
        description: 'Custom label for the countdown widget (e.g. "Days until vacation")',
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
      category: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['work', 'personal', 'family', 'health', 'social'],
        description: 'Event category',
      },
      event_type: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['appointment', 'meeting', 'deadline', 'birthday', 'holiday', 'social', 'other'],
        description: 'The type of event',
      },
      is_recurring: {
        type: SchemaType.BOOLEAN,
        description: 'Whether this event repeats on a schedule',
      },
      recurrence_pattern: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'],
        description: 'How often the event repeats. Set to "none" to clear recurrence.',
      },
      assigned_to: {
        type: SchemaType.STRING,
        description: 'User ID of the family member this event is assigned to',
      },
      custom_color: {
        type: SchemaType.STRING,
        description: 'Custom hex color for the event in #RRGGBB format (e.g. "#FF5733")',
      },
      show_countdown: {
        type: SchemaType.BOOLEAN,
        description: 'Whether to display a countdown widget for this event',
      },
      countdown_label: {
        type: SchemaType.STRING,
        description: 'Custom label for the countdown widget (e.g. "Days until vacation")',
      },
    },
    required: ['event_id'],
  },
};

/** List calendar events */
const listEvents: FunctionDeclaration = {
  name: 'list_events',
  description:
    'Retrieve upcoming calendar events. Use this when a user asks about their schedule, what\'s coming up, or wants to find a specific event to update or delete.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for listing calendar events',
    properties: {
      start_date: {
        type: SchemaType.STRING,
        description: 'Filter events starting on or after this date (ISO 8601 format YYYY-MM-DD). Use to narrow results to a date range.',
      },
      end_date: {
        type: SchemaType.STRING,
        description: 'Filter events ending on or before this date (ISO 8601 format YYYY-MM-DD). Use with start_date for a date range.',
      },
      category: {
        type: SchemaType.STRING,
        description: 'Filter events by category (e.g. "appointment", "birthday", "school")',
      },
    },
    required: [],
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
      reminder_type: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['time', 'location'],
        description: 'Whether this is a time-based or location-based reminder. Defaults to time.',
      },
      location: {
        type: SchemaType.STRING,
        description: 'Location for location-based reminders (e.g. "grocery store", "home")',
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
        format: 'enum',
        enum: ['active', 'completed', 'snoozed', 'dismissed'],
        description: 'New status for the reminder',
      },
      reminder_type: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['time', 'location'],
        description: 'Change between time-based and location-based reminder',
      },
      location: {
        type: SchemaType.STRING,
        description: 'New location for location-based reminders',
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

/** List reminders with optional status filter */
const listReminders: FunctionDeclaration = {
  name: 'list_reminders',
  description:
    'Retrieve a list of reminders, optionally filtered by status. Use this when a user asks about their reminders, what\'s pending, or wants to find a specific reminder.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Optional filters for listing reminders',
    properties: {
      status: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['active', 'completed', 'snoozed', 'dismissed'],
        description: 'Filter reminders by status',
      },
      category: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['bills', 'health', 'work', 'personal', 'household'],
        description: 'Filter reminders by category',
      },
      assigned_to: {
        type: SchemaType.STRING,
        description: 'Filter reminders assigned to a specific user ID',
      },
    },
    required: [],
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
        description: 'Number of minutes to snooze the reminder for (1 to 10080, i.e. up to 7 days)',
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

/** List shopping lists with their items */
const listShoppingLists: FunctionDeclaration = {
  name: 'list_shopping_lists',
  description:
    'Retrieve all shopping lists with their items. Use this when a user asks about their shopping lists, what\'s on the list, or wants to find a specific list or item.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for listing shopping lists',
    properties: {},
    required: [],
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
      recipe_id: {
        type: SchemaType.STRING,
        description: 'The ID of a saved recipe to link to this meal. Use list_recipes to find recipe IDs.',
      },
      notes: {
        type: SchemaType.STRING,
        description: 'Additional notes about the meal (e.g. "double the recipe", "use leftover chicken")',
      },
      servings: {
        type: SchemaType.INTEGER,
        description: 'Number of servings to prepare',
      },
      assigned_to: {
        type: SchemaType.STRING,
        description: 'User ID of the space member responsible for preparing this meal',
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

/** List planned meals */
const listMeals: FunctionDeclaration = {
  name: 'list_meals',
  description:
    'Retrieve planned meals. Use this when a user asks about the meal plan, what\'s for dinner, or wants to find a specific meal to update.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Optional filters for listing meals',
    properties: {
      start_date: {
        type: SchemaType.STRING,
        description: 'Start of date range in ISO 8601 format (YYYY-MM-DD)',
      },
      end_date: {
        type: SchemaType.STRING,
        description: 'End of date range in ISO 8601 format (YYYY-MM-DD)',
      },
    },
    required: [],
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
      visibility: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['private', 'shared'],
        description: 'Whether the goal is private to the assigned member or shared with the household. Defaults to shared.',
      },
    },
    required: ['title'],
  },
};

/** List goals with progress and milestones */
const listGoals: FunctionDeclaration = {
  name: 'list_goals',
  description:
    'Retrieve all goals with their progress and milestones. Use this when a user asks about their goals, wants to check progress, or needs to find a goal to update or mark complete.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for listing goals',
    properties: {},
    required: [],
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
        description: 'New progress percentage. Must be between 0 and 100 inclusive.',
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
        description: 'New progress percentage. Must be between 0 and 100 inclusive.',
      },
      assigned_to: {
        type: SchemaType.STRING,
        description: 'User ID of the space member to reassign this goal to',
      },
      visibility: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['private', 'shared'],
        description: 'Change goal visibility between private and shared',
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
      type: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['percentage', 'money', 'count', 'date'],
        description: 'The type of milestone tracking (e.g. percentage for progress, money for savings, count for repetitions)',
      },
      target_value: {
        type: SchemaType.NUMBER,
        description: 'Target value for the milestone (e.g. 1000 for $1000 savings, 30 for 30 days)',
      },
      current_value: {
        type: SchemaType.NUMBER,
        description: 'Current progress value toward the milestone target',
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
      completed: {
        type: SchemaType.BOOLEAN,
        description: 'Set to true to complete the milestone, false to reopen it. Defaults to true.',
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

/** List expenses */
const listExpenses: FunctionDeclaration = {
  name: 'list_expenses',
  description:
    'Retrieve expense records. Use this when a user asks about spending, recent expenses, or wants to find a specific expense.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for listing expenses',
    properties: {},
    required: [],
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
        format: 'enum',
        enum: ['pending', 'paid', 'overdue', 'cancelled'],
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

/** List projects with status */
const listProjects: FunctionDeclaration = {
  name: 'list_projects',
  description:
    'Retrieve all projects with their status. Use this when a user asks about projects, wants to check progress, or needs to find a project to update.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for listing projects',
    properties: {},
    required: [],
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
    'Send a message in a space conversation. Use list_conversations first to get the conversation ID, then send the message. Use this when a user wants to post a message to a household conversation thread.',
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
        description: 'The ID of the conversation to send the message to. Use list_conversations to find the right conversation first.',
      },
    },
    required: ['content', 'conversation_id'],
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
      name: {
        type: SchemaType.STRING,
        description: 'Name of the reward (e.g. "Movie Night", "Extra Screen Time")',
      },
      cost_points: {
        type: SchemaType.INTEGER,
        description: 'Number of points required to redeem this reward. Must be at least 1.',
      },
      description: {
        type: SchemaType.STRING,
        description: 'A description of what the reward entails',
      },
      emoji: {
        type: SchemaType.STRING,
        description: 'An emoji to represent the reward (e.g. "🎬", "🎮")',
      },
      category: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['privileges', 'treats', 'activities', 'screen_time', 'money', 'other'],
        description: 'Category of the reward. Defaults to other.',
      },
    },
    required: ['name', 'cost_points'],
  },
};

/** List available rewards */
const listRewards: FunctionDeclaration = {
  name: 'list_rewards',
  description:
    'Retrieve available rewards in the family reward system. Use this when a user asks about rewards, point costs, or available incentives.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for listing rewards',
    properties: {},
    required: [],
  },
};

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

/** Get the current monthly budget and spending stats */
const getBudget: FunctionDeclaration = {
  name: 'get_budget',
  description:
    'Get the current monthly budget configuration. Use this when a user asks about their budget, monthly limit, or budget settings.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'No parameters needed',
    properties: {},
    required: [],
  },
};

/** Get budget statistics (spent, remaining, pending) */
const getBudgetStats: FunctionDeclaration = {
  name: 'get_budget_stats',
  description:
    'Get budget statistics for the current month — how much has been spent, how much remains, and how many pending bills. Use this when a user asks "how much have I spent?", "what\'s left in my budget?", or wants a financial overview.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'No parameters needed',
    properties: {},
    required: [],
  },
};

/** Set or update the monthly budget */
const setBudget: FunctionDeclaration = {
  name: 'set_budget',
  description:
    'Set or update the monthly budget amount. Use this when a user says "set my budget to $3000" or "change the monthly budget".',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for setting the budget',
    properties: {
      monthly_budget: {
        type: SchemaType.NUMBER,
        description: 'The monthly budget amount in dollars. Must be a positive number.',
      },
    },
    required: ['monthly_budget'],
  },
};

// ---------------------------------------------------------------------------
// Recipes (Library Management)
// ---------------------------------------------------------------------------

/** List recipes from the family library */
const listRecipes: FunctionDeclaration = {
  name: 'list_recipes',
  description:
    'List saved recipes from the family recipe library. Use this when a user asks about their saved recipes, wants to browse the collection, or needs to find a recipe to update or delete.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Optional filters for listing recipes',
    properties: {
      cuisine_type: {
        type: SchemaType.STRING,
        description: 'Filter recipes by cuisine type (e.g. "Italian", "Mexican", "Japanese")',
      },
      difficulty: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['easy', 'medium', 'hard'],
        description: 'Filter recipes by difficulty level',
      },
      search: {
        type: SchemaType.STRING,
        description: 'Search recipes by name or description',
      },
    },
    required: [],
  },
};

/** Update a recipe in the library */
const updateRecipe: FunctionDeclaration = {
  name: 'update_recipe',
  description:
    'Update an existing recipe in the family library. Use this when a user wants to change ingredients, instructions, cook time, or other recipe details.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for updating a recipe',
    properties: {
      recipe_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the recipe to update',
      },
      name: {
        type: SchemaType.STRING,
        description: 'New name for the recipe',
      },
      description: {
        type: SchemaType.STRING,
        description: 'New description for the recipe',
      },
      ingredients: {
        type: SchemaType.STRING,
        description: 'New comma-separated list of ingredients',
      },
      instructions: {
        type: SchemaType.STRING,
        description: 'New step-by-step cooking instructions',
      },
      prep_time: {
        type: SchemaType.INTEGER,
        description: 'New preparation time in minutes',
      },
      cook_time: {
        type: SchemaType.INTEGER,
        description: 'New cooking time in minutes',
      },
      servings: {
        type: SchemaType.INTEGER,
        description: 'New number of servings',
      },
      cuisine_type: {
        type: SchemaType.STRING,
        description: 'New cuisine type (e.g. "Italian", "Mexican")',
      },
      difficulty: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['easy', 'medium', 'hard'],
        description: 'New difficulty level for the recipe',
      },
      tags: {
        type: SchemaType.STRING,
        description: 'Comma-separated tags for the recipe (e.g. "vegetarian, quick, kid-friendly")',
      },
    },
    required: ['recipe_id'],
  },
};

/** Delete a recipe from the library */
const deleteRecipe: FunctionDeclaration = {
  name: 'delete_recipe',
  description:
    'Delete a recipe from the family library permanently. Use this when a user wants to remove a saved recipe they no longer need.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for deleting a recipe',
    properties: {
      recipe_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the recipe to delete',
      },
    },
    required: ['recipe_id'],
  },
};

// ---------------------------------------------------------------------------
// Rewards (Extended)
// ---------------------------------------------------------------------------

/** Update an existing reward */
const updateReward: FunctionDeclaration = {
  name: 'update_reward',
  description:
    'Update an existing reward in the family reward system. Use this when a user wants to change the name, point cost, description, or category of a reward.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for updating a reward',
    properties: {
      reward_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the reward to update',
      },
      name: {
        type: SchemaType.STRING,
        description: 'New name for the reward',
      },
      cost_points: {
        type: SchemaType.INTEGER,
        description: 'New point cost for the reward. Must be at least 1.',
      },
      description: {
        type: SchemaType.STRING,
        description: 'New description for the reward',
      },
      emoji: {
        type: SchemaType.STRING,
        description: 'New emoji for the reward',
      },
      category: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['privileges', 'treats', 'activities', 'screen_time', 'money', 'other'],
        description: 'New category for the reward',
      },
    },
    required: ['reward_id'],
  },
};

/** Delete a reward */
const deleteReward: FunctionDeclaration = {
  name: 'delete_reward',
  description:
    'Delete a reward from the family reward system. Use this when a user wants to remove a reward option.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for deleting a reward',
    properties: {
      reward_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the reward to delete',
      },
    },
    required: ['reward_id'],
  },
};

/** Get points balance for a family member */
const getPointsBalance: FunctionDeclaration = {
  name: 'get_points_balance',
  description:
    'Get the reward points balance and stats for a family member. Use this when a user asks "how many points do I have?", "what\'s my streak?", or wants to check their rewards progress.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for getting points balance',
    properties: {
      user_id: {
        type: SchemaType.STRING,
        description: 'The user ID to check points for. Defaults to the current user if omitted.',
      },
    },
    required: [],
  },
};

/** Redeem a reward */
const redeemReward: FunctionDeclaration = {
  name: 'redeem_reward',
  description:
    'Redeem a reward using accumulated points. Use this when a user says "I want to redeem movie night" or "use my points for extra screen time". Deducts points and creates a pending redemption.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for redeeming a reward',
    properties: {
      reward_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the reward to redeem',
      },
      user_id: {
        type: SchemaType.STRING,
        description: 'The user ID redeeming the reward. Defaults to the current user if omitted.',
      },
    },
    required: ['reward_id'],
  },
};

/** Get the family leaderboard */
const getLeaderboard: FunctionDeclaration = {
  name: 'get_leaderboard',
  description:
    'Get the family leaderboard showing points, levels, and streaks for all members. Use this when a user asks "who has the most points?", "show me the leaderboard", or wants to compare family progress.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for the leaderboard',
    properties: {
      period: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['week', 'month', 'all'],
        description: 'Time period for the leaderboard. Defaults to week.',
      },
    },
    required: [],
  },
};

// ---------------------------------------------------------------------------
// Bills
// ---------------------------------------------------------------------------

/** List bills */
const listBills: FunctionDeclaration = {
  name: 'list_bills',
  description:
    'List household bills. Use this when a user asks about their bills, upcoming payments, or wants to find a bill to update, pay, or delete.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Optional filters for listing bills',
    properties: {
      status: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['scheduled', 'paid', 'overdue', 'cancelled'],
        description: 'Filter bills by status',
      },
    },
    required: [],
  },
};

/** Create a new bill */
const createBill: FunctionDeclaration = {
  name: 'create_bill',
  description:
    'Create a new recurring or one-time bill. Use this when a user wants to track a bill like rent, Netflix, electricity, or any recurring payment. Automatically creates a reminder and calendar event.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for creating a bill',
    properties: {
      name: {
        type: SchemaType.STRING,
        description: 'Name of the bill (e.g. "Netflix", "Electric Bill", "Rent")',
      },
      amount: {
        type: SchemaType.NUMBER,
        description: 'Bill amount in dollars',
      },
      due_date: {
        type: SchemaType.STRING,
        description: 'Due date in ISO 8601 format (YYYY-MM-DD)',
      },
      frequency: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['one-time', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'semi-annual', 'annual'],
        description: 'How often this bill recurs. Defaults to monthly.',
      },
      category: {
        type: SchemaType.STRING,
        description: 'Category for the bill (e.g. "utilities", "subscriptions", "rent", "insurance")',
      },
      payee: {
        type: SchemaType.STRING,
        description: 'Who the bill is paid to',
      },
      auto_pay: {
        type: SchemaType.BOOLEAN,
        description: 'Whether this bill is on auto-pay',
      },
      notes: {
        type: SchemaType.STRING,
        description: 'Additional notes about the bill',
      },
    },
    required: ['name', 'amount', 'due_date'],
  },
};

/** Update a bill */
const updateBill: FunctionDeclaration = {
  name: 'update_bill',
  description:
    'Update an existing bill. Use this when a user wants to change the amount, due date, frequency, or other details of a bill.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for updating a bill',
    properties: {
      bill_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the bill to update',
      },
      name: {
        type: SchemaType.STRING,
        description: 'New name for the bill',
      },
      amount: {
        type: SchemaType.NUMBER,
        description: 'New amount for the bill',
      },
      due_date: {
        type: SchemaType.STRING,
        description: 'New due date in ISO 8601 format (YYYY-MM-DD)',
      },
      frequency: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['one-time', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'semi-annual', 'annual'],
        description: 'New frequency for the bill',
      },
      category: {
        type: SchemaType.STRING,
        description: 'New category for the bill',
      },
      auto_pay: {
        type: SchemaType.BOOLEAN,
        description: 'Whether this bill is on auto-pay',
      },
      status: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['scheduled', 'paid', 'overdue', 'cancelled'],
        description: 'New status for the bill',
      },
    },
    required: ['bill_id'],
  },
};

/** Delete a bill */
const deleteBill: FunctionDeclaration = {
  name: 'delete_bill',
  description:
    'Delete a bill permanently. Use this when a user wants to stop tracking a bill.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for deleting a bill',
    properties: {
      bill_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the bill to delete',
      },
    },
    required: ['bill_id'],
  },
};

/** Mark a bill as paid */
const markBillPaid: FunctionDeclaration = {
  name: 'mark_bill_paid',
  description:
    'Mark a bill as paid. Creates an expense record, completes the linked reminder, and auto-generates the next bill for recurring bills. Use this when a user says they paid a bill.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for marking a bill as paid',
    properties: {
      bill_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the bill to mark as paid',
      },
    },
    required: ['bill_id'],
  },
};

// ---------------------------------------------------------------------------
// Shopping (Extended)
// ---------------------------------------------------------------------------

/** Delete a shopping list */
const deleteShoppingList: FunctionDeclaration = {
  name: 'delete_shopping_list',
  description:
    'Delete a shopping list and all its items permanently. Use this when a user wants to remove an old or completed shopping list.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for deleting a shopping list',
    properties: {
      list_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the shopping list to delete',
      },
    },
    required: ['list_id'],
  },
};

// ---------------------------------------------------------------------------
// Messages (Extended)
// ---------------------------------------------------------------------------

/** List messages in a conversation */
const listMessages: FunctionDeclaration = {
  name: 'list_messages',
  description:
    'Read recent messages from a conversation. Use this when a user asks "what did we say in family chat?", "read the last messages", or wants to see conversation history. Use list_conversations first to find the conversation ID.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for listing messages',
    properties: {
      conversation_id: {
        type: SchemaType.STRING,
        description: 'The ID of the conversation to read messages from',
      },
    },
    required: ['conversation_id'],
  },
};

/** Create a new conversation */
const createConversation: FunctionDeclaration = {
  name: 'create_conversation',
  description:
    'Create a new conversation thread. Use this when a user wants to start a new chat with specific family members or create a group chat.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for creating a conversation',
    properties: {
      title: {
        type: SchemaType.STRING,
        description: 'Name of the conversation (e.g. "Family Chat", "Parents Only", "Trip Planning")',
      },
      conversation_type: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['direct', 'group', 'general'],
        description: 'Type of conversation. Defaults to group.',
      },
      description: {
        type: SchemaType.STRING,
        description: 'Description of the conversation purpose',
      },
    },
    required: ['title'],
  },
};

// ---------------------------------------------------------------------------
// Rewards (Extended - Redemption Management)
// ---------------------------------------------------------------------------

/** List pending reward redemptions */
const listRedemptions: FunctionDeclaration = {
  name: 'list_redemptions',
  description:
    'List reward redemptions, optionally filtered by status. Use this when a parent asks "any rewards waiting for approval?", "show pending redemptions", or wants to review reward requests.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for listing redemptions',
    properties: {
      status: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['pending', 'approved', 'fulfilled', 'denied', 'cancelled'],
        description: 'Filter redemptions by status. Defaults to showing all.',
      },
    },
    required: [],
  },
};

/** Approve a reward redemption */
const approveRedemption: FunctionDeclaration = {
  name: 'approve_redemption',
  description:
    'Approve a pending reward redemption request. Use this when a parent says "approve that reward" or "yes, they can have movie night".',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for approving a redemption',
    properties: {
      redemption_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the redemption to approve',
      },
    },
    required: ['redemption_id'],
  },
};

/** Deny a reward redemption */
const denyRedemption: FunctionDeclaration = {
  name: 'deny_redemption',
  description:
    'Deny a pending reward redemption request and refund the points. Use this when a parent says "deny that reward" or "not right now".',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for denying a redemption',
    properties: {
      redemption_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the redemption to deny',
      },
      reason: {
        type: SchemaType.STRING,
        description: 'Reason for denying the redemption (optional)',
      },
    },
    required: ['redemption_id'],
  },
};

/** Award bonus points to a family member */
const awardPoints: FunctionDeclaration = {
  name: 'award_points',
  description:
    'Award bonus reward points to a family member. Use this when a parent says "give Jake 50 points for being helpful" or "award bonus points". Not for chore completions — those are awarded automatically.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for awarding points',
    properties: {
      user_id: {
        type: SchemaType.STRING,
        description: 'The user ID of the family member to award points to',
      },
      points: {
        type: SchemaType.INTEGER,
        description: 'Number of points to award. Must be at least 1.',
      },
      reason: {
        type: SchemaType.STRING,
        description: 'Why the points are being awarded (e.g. "being extra helpful today")',
      },
    },
    required: ['user_id', 'points', 'reason'],
  },
};

// ---------------------------------------------------------------------------
// Goals (Extended - Milestones & Check-ins)
// ---------------------------------------------------------------------------

/** Update a milestone */
const updateMilestone: FunctionDeclaration = {
  name: 'update_milestone',
  description:
    'Update an existing milestone within a goal. Use this when a user wants to change the title, description, target date, or target value of a milestone.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for updating a milestone',
    properties: {
      milestone_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the milestone to update',
      },
      title: {
        type: SchemaType.STRING,
        description: 'New title for the milestone',
      },
      description: {
        type: SchemaType.STRING,
        description: 'New description for the milestone',
      },
      target_date: {
        type: SchemaType.STRING,
        description: 'New target date in ISO 8601 format (YYYY-MM-DD)',
      },
      target_value: {
        type: SchemaType.NUMBER,
        description: 'New target value (for count/money/percentage milestones)',
      },
      type: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['percentage', 'money', 'count', 'date'],
        description: 'Change the type of milestone tracking',
      },
      current_value: {
        type: SchemaType.NUMBER,
        description: 'Update the current progress value toward the milestone target',
      },
    },
    required: ['milestone_id'],
  },
};

/** Delete a milestone */
const deleteMilestone: FunctionDeclaration = {
  name: 'delete_milestone',
  description:
    'Delete a milestone from a goal. Use this when a user wants to remove a milestone they no longer need.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for deleting a milestone',
    properties: {
      milestone_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the milestone to delete',
      },
    },
    required: ['milestone_id'],
  },
};

/** Create a goal check-in */
const createGoalCheckIn: FunctionDeclaration = {
  name: 'create_goal_checkin',
  description:
    'Log a check-in for a goal with progress update, mood, and notes. Use this when a user says "log that I ran 3 miles today", "check in on my fitness goal", or wants to record progress toward a goal.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for creating a goal check-in',
    properties: {
      goal_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the goal to check in on',
      },
      progress_percentage: {
        type: SchemaType.INTEGER,
        description: 'Current progress percentage. Must be between 0 and 100 inclusive.',
      },
      mood: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['great', 'okay', 'struggling'],
        description: 'How the user feels about their progress',
      },
      notes: {
        type: SchemaType.STRING,
        description: 'Notes about progress, what was accomplished, or challenges',
      },
      blockers: {
        type: SchemaType.STRING,
        description: 'Any blockers or obstacles preventing progress',
      },
      need_help_from_partner: {
        type: SchemaType.BOOLEAN,
        description: 'Whether the user needs help from their partner or family member to make progress',
      },
    },
    required: ['goal_id', 'progress_percentage', 'mood'],
  },
};

/** Get check-in history for a goal */
const getGoalCheckIns: FunctionDeclaration = {
  name: 'get_goal_checkins',
  description:
    'View check-in history for a goal. Use this when a user asks "show my check-in history", "how has my goal been going?", or wants to review their progress over time.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for getting goal check-ins',
    properties: {
      goal_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the goal to get check-ins for',
      },
    },
    required: ['goal_id'],
  },
};

// ---------------------------------------------------------------------------
// Subtasks
// ---------------------------------------------------------------------------

/** List subtasks for a task */
const listSubtasks: FunctionDeclaration = {
  name: 'list_subtasks',
  description:
    'List all subtasks under a parent task. Use this when a user asks about subtasks, checklist items, or sub-steps within a task.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for listing subtasks',
    properties: {
      task_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the parent task',
      },
    },
    required: ['task_id'],
  },
};

/** Create a subtask */
const createSubtask: FunctionDeclaration = {
  name: 'create_subtask',
  description:
    'Create a subtask under a parent task. Use this when a user wants to break a task into smaller steps, add checklist items, or create a sub-item under an existing task.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for creating a subtask',
    properties: {
      task_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the parent task',
      },
      title: {
        type: SchemaType.STRING,
        description: 'Title of the subtask',
      },
      description: {
        type: SchemaType.STRING,
        description: 'Description of the subtask',
      },
      priority: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['low', 'medium', 'high', 'urgent'],
        description: 'Priority level of the subtask',
      },
      assigned_to: {
        type: SchemaType.STRING,
        description: 'User ID of the space member to assign this subtask to',
      },
      due_date: {
        type: SchemaType.STRING,
        description: 'Due date in ISO 8601 format (YYYY-MM-DD)',
      },
    },
    required: ['task_id', 'title'],
  },
};

/** Update a subtask */
const updateSubtask: FunctionDeclaration = {
  name: 'update_subtask',
  description:
    'Update an existing subtask. Use this to change the title, status, priority, assignment, or due date of a subtask.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for updating a subtask',
    properties: {
      subtask_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the subtask to update',
      },
      title: {
        type: SchemaType.STRING,
        description: 'New title for the subtask',
      },
      status: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['pending', 'in-progress', 'completed'],
        description: 'New status for the subtask',
      },
      priority: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['low', 'medium', 'high', 'urgent'],
        description: 'New priority level',
      },
      assigned_to: {
        type: SchemaType.STRING,
        description: 'User ID to reassign the subtask to',
      },
      due_date: {
        type: SchemaType.STRING,
        description: 'New due date in ISO 8601 format (YYYY-MM-DD)',
      },
    },
    required: ['subtask_id'],
  },
};

/** Delete a subtask */
const deleteSubtask: FunctionDeclaration = {
  name: 'delete_subtask',
  description:
    'Delete a subtask from a parent task. Use this when a user wants to remove a subtask or checklist item.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for deleting a subtask',
    properties: {
      subtask_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the subtask to delete',
      },
    },
    required: ['subtask_id'],
  },
};

// ---------------------------------------------------------------------------
// Shopping (Extended)
// ---------------------------------------------------------------------------

/** Update a shopping list */
const updateShoppingList: FunctionDeclaration = {
  name: 'update_shopping_list',
  description:
    'Update a shopping list — change its name, store, budget, or mark it completed. Use this when a user wants to rename a list, set a budget, or complete a shopping trip.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for updating a shopping list',
    properties: {
      list_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the shopping list to update',
      },
      title: {
        type: SchemaType.STRING,
        description: 'New name for the shopping list',
      },
      status: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['active', 'completed', 'archived'],
        description: 'New status for the list',
      },
      store_name: {
        type: SchemaType.STRING,
        description: 'Store name (e.g. "Costco", "Trader Joe\'s")',
      },
      budget: {
        type: SchemaType.NUMBER,
        description: 'Budget limit for this shopping trip',
      },
    },
    required: ['list_id'],
  },
};

// ---------------------------------------------------------------------------
// Recipes (Extended)
// ---------------------------------------------------------------------------

/** Get full details of a single recipe */
const getRecipe: FunctionDeclaration = {
  name: 'get_recipe',
  description:
    'Get the full details of a single recipe including ingredients and instructions. Use this when a user asks "what\'s in the lasagna recipe?", "how do I make the banana bread?", or wants to see a complete recipe.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for getting a recipe',
    properties: {
      recipe_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the recipe to retrieve',
      },
    },
    required: ['recipe_id'],
  },
};

// ---------------------------------------------------------------------------
// Project Milestones
// ---------------------------------------------------------------------------

/** List project milestones/steps */
const listProjectMilestones: FunctionDeclaration = {
  name: 'list_project_milestones',
  description:
    'List all milestones or steps for a specific project. Use this when a user asks about project progress, steps remaining, or wants to see the project timeline.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for listing project milestones',
    properties: {
      project_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the project',
      },
    },
    required: ['project_id'],
  },
};

/** Create a project milestone/step */
const createProjectMilestone: FunctionDeclaration = {
  name: 'create_project_milestone',
  description:
    'Add a milestone or step to a project. Use this when a user wants to add a new step, checkpoint, or deliverable to a project.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for creating a project milestone',
    properties: {
      project_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the project',
      },
      title: {
        type: SchemaType.STRING,
        description: 'Title of the milestone or step',
      },
      description: {
        type: SchemaType.STRING,
        description: 'Description of what this milestone entails',
      },
      due_date: {
        type: SchemaType.STRING,
        description: 'Target date for this milestone in ISO 8601 format (YYYY-MM-DD)',
      },
    },
    required: ['project_id', 'title'],
  },
};

/** Toggle a project milestone as complete/incomplete */
const toggleProjectMilestone: FunctionDeclaration = {
  name: 'toggle_project_milestone',
  description:
    'Mark a project milestone as complete or incomplete. Use this when a user says a project step is done or wants to reopen it.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for toggling a project milestone',
    properties: {
      milestone_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the project milestone to toggle',
      },
    },
    required: ['milestone_id'],
  },
};

/** Delete a project milestone */
const deleteProjectMilestone: FunctionDeclaration = {
  name: 'delete_project_milestone',
  description:
    'Delete a milestone from a project. Use this when a user wants to remove a project step they no longer need.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for deleting a project milestone',
    properties: {
      milestone_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the project milestone to delete',
      },
    },
    required: ['milestone_id'],
  },
};

// ---------------------------------------------------------------------------
// Finance (Extended)
// ---------------------------------------------------------------------------

/** Get spending insights */
const getSpendingInsights: FunctionDeclaration = {
  name: 'get_spending_insights',
  description:
    'Get spending trends, category breakdowns, and budget variance analysis. Use this when a user asks "where is our money going?", "show spending trends", or wants financial insights.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for getting spending insights',
    properties: {
      time_range: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
        description: 'Time range for the analysis. Defaults to monthly.',
      },
    },
    required: [],
  },
};

/** Get spending by category */
const getCategorySpending: FunctionDeclaration = {
  name: 'get_category_spending',
  description:
    'Get a breakdown of spending by category for a date range. Use this when a user asks "how much did we spend on groceries?", "what are our top spending categories?", or wants category-level financial detail.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for getting category spending',
    properties: {
      start_date: {
        type: SchemaType.STRING,
        description: 'Start of the date range in ISO 8601 format (YYYY-MM-DD). Defaults to start of current month.',
      },
      end_date: {
        type: SchemaType.STRING,
        description: 'End of the date range in ISO 8601 format (YYYY-MM-DD). Defaults to end of current month.',
      },
    },
    required: [],
  },
};

// ---------------------------------------------------------------------------
// Messages (Extended)
// ---------------------------------------------------------------------------

/** Edit a message */
const editMessage: FunctionDeclaration = {
  name: 'edit_message',
  description:
    'Edit the content of a previously sent message. Use this when a user wants to fix a typo or update a sent message.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for editing a message',
    properties: {
      message_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the message to edit',
      },
      content: {
        type: SchemaType.STRING,
        description: 'The new content for the message',
      },
    },
    required: ['message_id', 'content'],
  },
};

/** Delete a message */
const deleteMessage: FunctionDeclaration = {
  name: 'delete_message',
  description:
    'Delete a sent message. Use this when a user wants to remove a message from a conversation.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for deleting a message',
    properties: {
      message_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the message to delete',
      },
    },
    required: ['message_id'],
  },
};

/** Pin a message */
const pinMessage: FunctionDeclaration = {
  name: 'pin_message',
  description:
    'Pin an important message to the top of a conversation. Use this when a user wants to highlight or save an important message for easy reference.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for pinning a message',
    properties: {
      message_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the message to pin',
      },
    },
    required: ['message_id'],
  },
};

// ---------------------------------------------------------------------------
// Rewards (Extended)
// ---------------------------------------------------------------------------

/** Fulfill a reward redemption */
const fulfillRedemption: FunctionDeclaration = {
  name: 'fulfill_redemption',
  description:
    'Mark an approved reward redemption as fulfilled (physically given to the child). Use this when a parent has actually provided the reward.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for fulfilling a redemption',
    properties: {
      redemption_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the redemption to fulfill',
      },
    },
    required: ['redemption_id'],
  },
};

/** Cancel a reward redemption */
const cancelRedemption: FunctionDeclaration = {
  name: 'cancel_redemption',
  description:
    'Cancel a pending reward redemption and refund the points. Use this when a user changed their mind about redeeming a reward.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for canceling a redemption',
    properties: {
      redemption_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the redemption to cancel',
      },
    },
    required: ['redemption_id'],
  },
};

/** Get points transaction history */
const getPointsHistory: FunctionDeclaration = {
  name: 'get_points_history',
  description:
    'Get the points transaction history for a user — shows all points earned, spent, and why. Use this when a user asks "where did my points go?", "show point history", or wants to see their rewards ledger.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for getting points history',
    properties: {
      user_id: {
        type: SchemaType.STRING,
        description: 'The user ID to get points history for. Defaults to the current user.',
      },
      limit: {
        type: SchemaType.INTEGER,
        description: 'Maximum number of transactions to return. Defaults to 20.',
      },
    },
    required: [],
  },
};

// ---------------------------------------------------------------------------
// Goals (Extended - Check-in Management)
// ---------------------------------------------------------------------------

/** Update a goal check-in */
const updateGoalCheckIn: FunctionDeclaration = {
  name: 'update_goal_checkin',
  description:
    'Update an existing goal check-in entry. Use this when a user wants to correct or update a previously logged check-in.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for updating a goal check-in',
    properties: {
      checkin_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the check-in to update',
      },
      progress_percentage: {
        type: SchemaType.INTEGER,
        description: 'Updated progress percentage. Must be between 0 and 100 inclusive.',
      },
      mood: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['great', 'okay', 'struggling'],
        description: 'Updated mood',
      },
      notes: {
        type: SchemaType.STRING,
        description: 'Updated notes',
      },
      blockers: {
        type: SchemaType.STRING,
        description: 'Updated blockers',
      },
    },
    required: ['checkin_id'],
  },
};

/** Delete a goal check-in */
const deleteGoalCheckIn: FunctionDeclaration = {
  name: 'delete_goal_checkin',
  description:
    'Delete a goal check-in entry. Use this when a user wants to remove an incorrect or duplicate check-in.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for deleting a goal check-in',
    properties: {
      checkin_id: {
        type: SchemaType.STRING,
        description: 'The unique ID of the check-in to delete',
      },
    },
    required: ['checkin_id'],
  },
};

/** Get goal statistics */
const getGoalStats: FunctionDeclaration = {
  name: 'get_goal_stats',
  description:
    'Get aggregated goal statistics — active goals, completed goals, milestones reached, and in-progress count. Use this when a user asks "how many goals have I completed?", "goal summary", or wants an overview of goal progress.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for getting goal stats',
    properties: {},
    required: [],
  },
};

// ---------------------------------------------------------------------------
// Household Summary
// ---------------------------------------------------------------------------

/** Get a comprehensive household overview */
const getHouseholdSummary: FunctionDeclaration = {
  name: 'get_household_summary',
  description:
    'Get a comprehensive overview of the household — pending tasks, active goals, budget status, upcoming events, chore stats, and shopping lists. Use this when a user asks "what\'s going on?", "give me an overview", "how are we doing?", or wants a general status update.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'No parameters needed',
    properties: {},
    required: [],
  },
};

// ---------------------------------------------------------------------------
// Task Comments
// ---------------------------------------------------------------------------

/** List comments on a task */
const listTaskComments: FunctionDeclaration = {
  name: 'list_task_comments',
  description:
    'List all comments on a specific task. Use this when a user wants to see discussion or notes on a task.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for listing task comments',
    properties: {
      task_id: {
        type: SchemaType.STRING,
        description: 'The ID of the task to list comments for',
      },
    },
    required: ['task_id'],
  },
};

/** Add a comment to a task */
const addTaskComment: FunctionDeclaration = {
  name: 'add_task_comment',
  description:
    'Add a comment or note to a task. Use this when a user wants to leave a message, update, or note on a task.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for adding a task comment',
    properties: {
      task_id: {
        type: SchemaType.STRING,
        description: 'The ID of the task to comment on',
      },
      content: {
        type: SchemaType.STRING,
        description: 'The comment text',
      },
      parent_comment_id: {
        type: SchemaType.STRING,
        description: 'ID of a parent comment to reply to (for threaded comments)',
      },
    },
    required: ['task_id', 'content'],
  },
};

/** Delete a comment from a task */
const deleteTaskComment: FunctionDeclaration = {
  name: 'delete_task_comment',
  description:
    'Delete a comment from a task.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for deleting a task comment',
    properties: {
      comment_id: {
        type: SchemaType.STRING,
        description: 'The ID of the comment to delete',
      },
    },
    required: ['comment_id'],
  },
};

// ---------------------------------------------------------------------------
// Chore Rotations
// ---------------------------------------------------------------------------

/** Create a rotation schedule for a chore */
const createChoreRotation: FunctionDeclaration = {
  name: 'create_chore_rotation',
  description:
    'Create an automatic rotation schedule for a chore so it alternates between family members. Use this when a user wants to take turns or rotate who does a chore.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for creating a chore rotation',
    properties: {
      chore_id: {
        type: SchemaType.STRING,
        description: 'The ID of the chore to set up rotation for',
      },
      user_ids: {
        type: SchemaType.ARRAY,
        description: 'Array of user IDs to rotate between',
        items: { type: SchemaType.STRING },
      },
      frequency: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['daily', 'weekly', 'biweekly', 'monthly'],
        description: 'How often the rotation advances',
      },
      rotation_type: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['round-robin', 'random'],
        description: 'Type of rotation — round-robin cycles in order, random picks randomly',
      },
    },
    required: ['chore_id', 'user_ids', 'frequency', 'rotation_type'],
  },
};

/** Get the current rotation for a chore */
const getChoreRotation: FunctionDeclaration = {
  name: 'get_chore_rotation',
  description:
    'Get the current rotation schedule for a chore, including who is next.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for getting a chore rotation',
    properties: {
      chore_id: {
        type: SchemaType.STRING,
        description: 'The ID of the chore to get the rotation for',
      },
    },
    required: ['chore_id'],
  },
};

/** Update a chore rotation schedule */
const updateChoreRotation: FunctionDeclaration = {
  name: 'update_chore_rotation',
  description:
    'Update an existing chore rotation schedule — change frequency, members, or rotation type.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for updating a chore rotation',
    properties: {
      rotation_id: {
        type: SchemaType.STRING,
        description: 'The ID of the rotation to update',
      },
      user_ids: {
        type: SchemaType.ARRAY,
        description: 'Updated array of user IDs to rotate between',
        items: { type: SchemaType.STRING },
      },
      frequency: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['daily', 'weekly', 'biweekly', 'monthly'],
        description: 'New rotation frequency',
      },
      rotation_type: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['round-robin', 'random'],
        description: 'New rotation type',
      },
    },
    required: ['rotation_id'],
  },
};

/** Delete a chore rotation */
const deleteChoreRotation: FunctionDeclaration = {
  name: 'delete_chore_rotation',
  description:
    'Delete a rotation schedule for a chore, stopping automatic member rotation.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for deleting a chore rotation',
    properties: {
      rotation_id: {
        type: SchemaType.STRING,
        description: 'The ID of the rotation to delete',
      },
    },
    required: ['rotation_id'],
  },
};

/** Get chore statistics for the household */
const getChoreStats: FunctionDeclaration = {
  name: 'get_chore_stats',
  description:
    'Get chore statistics — total chores, completed this week, my chores vs partner chores. Use when a user asks "how are chores going?" or wants a chore summary.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'No parameters needed',
    properties: {},
    required: [],
  },
};

// ---------------------------------------------------------------------------
// Goal Collaborators
// ---------------------------------------------------------------------------

/** Add a collaborator to a goal */
const addGoalCollaborator: FunctionDeclaration = {
  name: 'add_goal_collaborator',
  description:
    'Add a family member as a collaborator on a goal. They can be a contributor (can edit) or viewer (read-only).',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for adding a goal collaborator',
    properties: {
      goal_id: {
        type: SchemaType.STRING,
        description: 'The ID of the goal',
      },
      user_id: {
        type: SchemaType.STRING,
        description: 'The ID of the user to add as collaborator',
      },
      role: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['contributor', 'viewer'],
        description: 'The collaborator role — contributor can edit, viewer can only see',
      },
    },
    required: ['goal_id', 'user_id', 'role'],
  },
};

/** Remove a collaborator from a goal */
const removeGoalCollaborator: FunctionDeclaration = {
  name: 'remove_goal_collaborator',
  description:
    'Remove a collaborator from a goal.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for removing a goal collaborator',
    properties: {
      collaborator_id: {
        type: SchemaType.STRING,
        description: 'The ID of the collaborator record to remove',
      },
    },
    required: ['collaborator_id'],
  },
};

/** List collaborators on a goal */
const listGoalCollaborators: FunctionDeclaration = {
  name: 'list_goal_collaborators',
  description:
    'List all collaborators on a goal, including their roles.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for listing goal collaborators',
    properties: {
      goal_id: {
        type: SchemaType.STRING,
        description: 'The ID of the goal',
      },
    },
    required: ['goal_id'],
  },
};

// ---------------------------------------------------------------------------
// Goal Templates
// ---------------------------------------------------------------------------

/** List available goal templates */
const listGoalTemplates: FunctionDeclaration = {
  name: 'list_goal_templates',
  description:
    'List available goal templates that users can start from. Optionally filter by category (e.g. "fitness", "finance", "health").',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for listing goal templates',
    properties: {
      category: {
        type: SchemaType.STRING,
        description: 'Filter templates by category',
      },
    },
    required: [],
  },
};

/** Create a goal from a template */
const createGoalFromTemplate: FunctionDeclaration = {
  name: 'create_goal_from_template',
  description:
    'Create a new goal based on a template with optional customizations. Includes pre-configured milestones.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for creating a goal from template',
    properties: {
      template_id: {
        type: SchemaType.STRING,
        description: 'The ID of the template to use',
      },
      title: {
        type: SchemaType.STRING,
        description: 'Custom title (overrides template title)',
      },
      description: {
        type: SchemaType.STRING,
        description: 'Custom description (overrides template description)',
      },
      target_date: {
        type: SchemaType.STRING,
        description: 'Custom target date in ISO format (YYYY-MM-DD)',
      },
      visibility: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['private', 'shared'],
        description: 'Visibility of the goal',
      },
    },
    required: ['template_id'],
  },
};

// ---------------------------------------------------------------------------
// Check-in Settings
// ---------------------------------------------------------------------------

/** Get check-in settings for a goal */
const getCheckinSettings: FunctionDeclaration = {
  name: 'get_checkin_settings',
  description:
    'Get the check-in reminder settings for a goal — frequency, reminder time, enabled features.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for getting check-in settings',
    properties: {
      goal_id: {
        type: SchemaType.STRING,
        description: 'The ID of the goal',
      },
    },
    required: ['goal_id'],
  },
};

/** Update check-in settings for a goal */
const updateCheckinSettings: FunctionDeclaration = {
  name: 'update_checkin_settings',
  description:
    'Update check-in reminder settings for a goal — change frequency, reminder time, enable/disable features.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for updating check-in settings',
    properties: {
      goal_id: {
        type: SchemaType.STRING,
        description: 'The ID of the goal',
      },
      frequency: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['daily', 'weekly', 'biweekly', 'monthly'],
        description: 'How often to check in',
      },
      day_of_week: {
        type: SchemaType.INTEGER,
        description: 'Day of week for weekly check-ins. 0=Sunday through 6=Saturday.',
      },
      day_of_month: {
        type: SchemaType.INTEGER,
        description: 'Day of month for monthly check-ins. Must be between 1 and 28.',
      },
      reminder_time: {
        type: SchemaType.STRING,
        description: 'Time for reminders in HH:MM format (24h)',
      },
      enable_reminders: {
        type: SchemaType.BOOLEAN,
        description: 'Whether to send check-in reminders',
      },
    },
    required: ['goal_id'],
  },
};

// ---------------------------------------------------------------------------
// Project Line Items
// ---------------------------------------------------------------------------

/** List line items for a project */
const listProjectLineItems: FunctionDeclaration = {
  name: 'list_project_line_items',
  description:
    'List all budget line items for a project — individual costs, materials, labor, etc.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for listing project line items',
    properties: {
      project_id: {
        type: SchemaType.STRING,
        description: 'The ID of the project',
      },
    },
    required: ['project_id'],
  },
};

/** Create a line item for a project */
const createProjectLineItem: FunctionDeclaration = {
  name: 'create_project_line_item',
  description:
    'Add a budget line item to a project — track individual costs like materials, labor, permits, etc.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for creating a project line item',
    properties: {
      project_id: {
        type: SchemaType.STRING,
        description: 'The ID of the project',
      },
      description: {
        type: SchemaType.STRING,
        description: 'Description of the line item (e.g. "Lumber for fence", "Electrician labor")',
      },
      category: {
        type: SchemaType.STRING,
        description: 'Category (e.g. "materials", "labor", "permits", "equipment")',
      },
      estimated_cost: {
        type: SchemaType.NUMBER,
        description: 'Estimated cost in dollars',
      },
      actual_cost: {
        type: SchemaType.NUMBER,
        description: 'Actual cost if already known',
      },
      vendor_id: {
        type: SchemaType.STRING,
        description: 'ID of the vendor for this line item',
      },
      quantity: {
        type: SchemaType.NUMBER,
        description: 'Quantity of items',
      },
      unit_price: {
        type: SchemaType.NUMBER,
        description: 'Price per unit',
      },
    },
    required: ['project_id', 'description'],
  },
};

/** Update a project line item */
const updateProjectLineItem: FunctionDeclaration = {
  name: 'update_project_line_item',
  description:
    'Update a project line item — change cost, description, category, or mark as paid.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for updating a project line item',
    properties: {
      line_item_id: {
        type: SchemaType.STRING,
        description: 'The ID of the line item to update',
      },
      description: {
        type: SchemaType.STRING,
        description: 'New description',
      },
      category: {
        type: SchemaType.STRING,
        description: 'New category',
      },
      estimated_cost: {
        type: SchemaType.NUMBER,
        description: 'New estimated cost',
      },
      actual_cost: {
        type: SchemaType.NUMBER,
        description: 'New actual cost',
      },
      quantity: {
        type: SchemaType.NUMBER,
        description: 'New quantity',
      },
      unit_price: {
        type: SchemaType.NUMBER,
        description: 'New unit price',
      },
    },
    required: ['line_item_id'],
  },
};

/** Delete a project line item */
const deleteProjectLineItem: FunctionDeclaration = {
  name: 'delete_project_line_item',
  description:
    'Delete a line item from a project budget.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for deleting a project line item',
    properties: {
      line_item_id: {
        type: SchemaType.STRING,
        description: 'The ID of the line item to delete',
      },
    },
    required: ['line_item_id'],
  },
};

/** Mark a project line item as paid */
const markLineItemPaid: FunctionDeclaration = {
  name: 'mark_line_item_paid',
  description:
    'Mark a project line item as paid. Optionally specify the payment date.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for marking a line item as paid',
    properties: {
      line_item_id: {
        type: SchemaType.STRING,
        description: 'The ID of the line item to mark as paid',
      },
      paid_date: {
        type: SchemaType.STRING,
        description: 'Date of payment in ISO format (YYYY-MM-DD). Defaults to today.',
      },
    },
    required: ['line_item_id'],
  },
};

/** Get project statistics */
const getProjectStats: FunctionDeclaration = {
  name: 'get_project_stats',
  description:
    'Get overall project statistics — total projects, active vs completed, budget totals, over/under budget counts.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'No parameters needed',
    properties: {},
    required: [],
  },
};

// ---------------------------------------------------------------------------
// Vendors
// ---------------------------------------------------------------------------

/** List vendors for the household */
const listVendors: FunctionDeclaration = {
  name: 'list_vendors',
  description:
    'List all vendors/contractors/service providers saved for the household. Use when a user asks about their contractors, vendors, or service providers.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'No parameters needed',
    properties: {},
    required: [],
  },
};

/** Create a new vendor */
const createVendor: FunctionDeclaration = {
  name: 'create_vendor',
  description:
    'Add a new vendor/contractor/service provider to the household. Track their contact info, trade, and rating.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for creating a vendor',
    properties: {
      name: {
        type: SchemaType.STRING,
        description: 'Vendor or business name',
      },
      trade: {
        type: SchemaType.STRING,
        description: 'Trade or specialty (e.g. "plumber", "electrician", "landscaper")',
      },
      phone: {
        type: SchemaType.STRING,
        description: 'Phone number',
      },
      email: {
        type: SchemaType.STRING,
        description: 'Email address',
      },
      notes: {
        type: SchemaType.STRING,
        description: 'Notes about this vendor (e.g. "Great work, fair prices")',
      },
      rating: {
        type: SchemaType.INTEGER,
        description: 'Rating from 1 to 5. Must be between 1 and 5 inclusive.',
      },
      is_preferred: {
        type: SchemaType.BOOLEAN,
        description: 'Whether this is a preferred/favorite vendor',
      },
    },
    required: ['name'],
  },
};

/** Update a vendor */
const updateVendor: FunctionDeclaration = {
  name: 'update_vendor',
  description:
    'Update vendor information — contact details, rating, notes, or preferred status.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for updating a vendor',
    properties: {
      vendor_id: {
        type: SchemaType.STRING,
        description: 'The ID of the vendor to update',
      },
      name: {
        type: SchemaType.STRING,
        description: 'New name',
      },
      trade: {
        type: SchemaType.STRING,
        description: 'New trade/specialty',
      },
      phone: {
        type: SchemaType.STRING,
        description: 'New phone number',
      },
      email: {
        type: SchemaType.STRING,
        description: 'New email',
      },
      notes: {
        type: SchemaType.STRING,
        description: 'New notes',
      },
      rating: {
        type: SchemaType.INTEGER,
        description: 'New rating. Must be between 1 and 5 inclusive.',
      },
      is_preferred: {
        type: SchemaType.BOOLEAN,
        description: 'Whether this is a preferred vendor',
      },
    },
    required: ['vendor_id'],
  },
};

/** Delete a vendor */
const deleteVendor: FunctionDeclaration = {
  name: 'delete_vendor',
  description:
    'Delete a vendor from the household records.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for deleting a vendor',
    properties: {
      vendor_id: {
        type: SchemaType.STRING,
        description: 'The ID of the vendor to delete',
      },
    },
    required: ['vendor_id'],
  },
};

// ---------------------------------------------------------------------------
// Recurring Expenses
// ---------------------------------------------------------------------------

/** List recurring expense patterns */
const listRecurringPatterns: FunctionDeclaration = {
  name: 'list_recurring_patterns',
  description:
    'List detected recurring expense patterns (subscriptions, regular bills, etc.). Shows auto-detected patterns from expense history.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'No parameters needed',
    properties: {},
    required: [],
  },
};

/** Confirm a recurring expense pattern */
const confirmRecurringPattern: FunctionDeclaration = {
  name: 'confirm_recurring_pattern',
  description:
    'Confirm a detected recurring expense pattern is correct. This helps improve future tracking accuracy.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for confirming a pattern',
    properties: {
      pattern_id: {
        type: SchemaType.STRING,
        description: 'The ID of the recurring pattern to confirm',
      },
    },
    required: ['pattern_id'],
  },
};

/** Ignore/dismiss a recurring expense pattern */
const ignoreRecurringPattern: FunctionDeclaration = {
  name: 'ignore_recurring_pattern',
  description:
    'Dismiss a detected recurring expense pattern — mark it as not relevant or not a real subscription.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for ignoring a pattern',
    properties: {
      pattern_id: {
        type: SchemaType.STRING,
        description: 'The ID of the recurring pattern to ignore',
      },
    },
    required: ['pattern_id'],
  },
};

// ---------------------------------------------------------------------------
// Expense Splitting
// ---------------------------------------------------------------------------

/** Get partnership balance between household members */
const getPartnerBalance: FunctionDeclaration = {
  name: 'get_partner_balance',
  description:
    'Get the expense balance between household partners — who owes whom and how much. Use when a user asks "who owes what?" or "what\'s our balance?".',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'No parameters needed',
    properties: {},
    required: [],
  },
};

/** Create a settlement between partners */
const createSettlement: FunctionDeclaration = {
  name: 'create_settlement',
  description:
    'Record a settlement payment between household partners to balance out shared expenses.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for creating a settlement',
    properties: {
      paid_by: {
        type: SchemaType.STRING,
        description: 'User ID of who is paying',
      },
      paid_to: {
        type: SchemaType.STRING,
        description: 'User ID of who is being paid',
      },
      amount: {
        type: SchemaType.NUMBER,
        description: 'Settlement amount in dollars',
      },
      method: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['cash', 'venmo', 'zelle', 'bank_transfer', 'check', 'paypal', 'other'],
        description: 'Payment method for the settlement',
      },
      notes: {
        type: SchemaType.STRING,
        description: 'Notes about the settlement',
      },
    },
    required: ['paid_by', 'paid_to', 'amount'],
  },
};

// ---------------------------------------------------------------------------
// Budget Variance
// ---------------------------------------------------------------------------

/** Get budget variance by category */
const getBudgetVariance: FunctionDeclaration = {
  name: 'get_budget_variance',
  description:
    'Get budget variance analysis by category — see which categories are over or under budget and by how much.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for budget variance analysis',
    properties: {
      start_date: {
        type: SchemaType.STRING,
        description: 'Start date in ISO format (YYYY-MM-DD). Defaults to start of current month.',
      },
      end_date: {
        type: SchemaType.STRING,
        description: 'End date in ISO format (YYYY-MM-DD). Defaults to end of current month.',
      },
    },
    required: [],
  },
};

// ---------------------------------------------------------------------------
// Messages (Extended)
// ---------------------------------------------------------------------------

/** React to a message with an emoji */
const reactToMessage: FunctionDeclaration = {
  name: 'react_to_message',
  description:
    'Add or remove an emoji reaction on a message. Toggles — if the reaction already exists, it removes it.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for reacting to a message',
    properties: {
      message_id: {
        type: SchemaType.STRING,
        description: 'The ID of the message to react to',
      },
      emoji: {
        type: SchemaType.STRING,
        description: 'The emoji to react with (e.g. "👍", "❤️", "😂")',
      },
    },
    required: ['message_id', 'emoji'],
  },
};

/** Mark a conversation as read */
const markConversationRead: FunctionDeclaration = {
  name: 'mark_conversation_read',
  description:
    'Mark all messages in a conversation as read.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for marking a conversation as read',
    properties: {
      conversation_id: {
        type: SchemaType.STRING,
        description: 'The ID of the conversation to mark as read',
      },
    },
    required: ['conversation_id'],
  },
};

/** Unpin a message */
const unpinMessage: FunctionDeclaration = {
  name: 'unpin_message',
  description:
    'Unpin a previously pinned message in a conversation.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for unpinning a message',
    properties: {
      message_id: {
        type: SchemaType.STRING,
        description: 'The ID of the message to unpin',
      },
    },
    required: ['message_id'],
  },
};

/** Archive a conversation */
const archiveConversation: FunctionDeclaration = {
  name: 'archive_conversation',
  description:
    'Archive a conversation to hide it from the main list. Can be unarchived later.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for archiving a conversation',
    properties: {
      conversation_id: {
        type: SchemaType.STRING,
        description: 'The ID of the conversation to archive',
      },
    },
    required: ['conversation_id'],
  },
};

/** Delete a conversation */
const deleteConversation: FunctionDeclaration = {
  name: 'delete_conversation',
  description:
    'Permanently delete a conversation and all its messages.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for deleting a conversation',
    properties: {
      conversation_id: {
        type: SchemaType.STRING,
        description: 'The ID of the conversation to delete',
      },
    },
    required: ['conversation_id'],
  },
};

// ---------------------------------------------------------------------------
// Reward Penalties
// ---------------------------------------------------------------------------

/** Get late penalties for a user */
const getUserPenalties: FunctionDeclaration = {
  name: 'get_user_penalties',
  description:
    'Get late penalty history for a user — points deducted for late chore completions.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for getting user penalties',
    properties: {
      user_id: {
        type: SchemaType.STRING,
        description: 'The ID of the user. Defaults to current user if not specified.',
      },
      limit: {
        type: SchemaType.INTEGER,
        description: 'Maximum number of penalties to return. Defaults to 20.',
      },
      include_forgiven: {
        type: SchemaType.BOOLEAN,
        description: 'Whether to include forgiven penalties. Defaults to false.',
      },
    },
    required: [],
  },
};

/** Forgive a late penalty */
const forgivePenalty: FunctionDeclaration = {
  name: 'forgive_penalty',
  description:
    'Forgive a late penalty — refund the deducted points. Use when a parent/admin decides a penalty was unfair.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for forgiving a penalty',
    properties: {
      penalty_id: {
        type: SchemaType.STRING,
        description: 'The ID of the penalty to forgive',
      },
      reason: {
        type: SchemaType.STRING,
        description: 'Reason for forgiving the penalty',
      },
    },
    required: ['penalty_id'],
  },
};

/** Get penalty settings for the household */
const getPenaltySettings: FunctionDeclaration = {
  name: 'get_penalty_settings',
  description:
    'Get the household late penalty settings — default penalty points, grace period, progressive penalties, etc.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'No parameters needed',
    properties: {},
    required: [],
  },
};

/** Update penalty settings */
const updatePenaltySettings: FunctionDeclaration = {
  name: 'update_penalty_settings',
  description:
    'Update household late penalty settings — change penalty points, grace period, enable/disable progressive penalties.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for updating penalty settings',
    properties: {
      enabled: {
        type: SchemaType.BOOLEAN,
        description: 'Whether late penalties are enabled',
      },
      default_penalty_points: {
        type: SchemaType.INTEGER,
        description: 'Default points deducted per late chore',
      },
      default_grace_period_hours: {
        type: SchemaType.INTEGER,
        description: 'Hours after due date before penalty kicks in',
      },
      max_penalty_per_chore: {
        type: SchemaType.INTEGER,
        description: 'Maximum penalty points per chore',
      },
      progressive_penalty: {
        type: SchemaType.BOOLEAN,
        description: 'Whether penalties increase the later the chore is',
      },
      exclude_weekends: {
        type: SchemaType.BOOLEAN,
        description: 'Whether to exclude weekends from penalty calculation',
      },
    },
    required: [],
  },
};

// ---------------------------------------------------------------------------
// Batch / Bulk Completion
// ---------------------------------------------------------------------------

/** Complete multiple tasks at once */
const batchCompleteTasks: FunctionDeclaration = {
  name: 'batch_complete_tasks',
  description:
    'Complete multiple tasks at once. Use this when the user wants to mark all or many tasks as done. First call list_tasks to get the IDs, then pass them all here.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for batch completing tasks',
    properties: {
      task_ids: {
        type: SchemaType.ARRAY,
        description: 'Array of task IDs to mark as completed',
        items: { type: SchemaType.STRING },
      },
    },
    required: ['task_ids'],
  },
};

/** Complete multiple chores at once */
const batchCompleteChores: FunctionDeclaration = {
  name: 'batch_complete_chores',
  description:
    'Complete multiple chores at once with reward points. Use this when the user wants to mark all or many chores as done. First call list_chores to get the IDs, then pass them all here.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for batch completing chores',
    properties: {
      chore_ids: {
        type: SchemaType.ARRAY,
        description: 'Array of chore IDs to mark as completed',
        items: { type: SchemaType.STRING },
      },
      user_id: {
        type: SchemaType.STRING,
        description: 'The user completing the chores (for reward points)',
      },
    },
    required: ['chore_ids', 'user_id'],
  },
};

/** Complete multiple reminders at once */
const batchCompleteReminders: FunctionDeclaration = {
  name: 'batch_complete_reminders',
  description:
    'Complete multiple reminders at once. Use this when the user wants to mark all or many reminders as done. First call list_reminders to get the IDs, then pass them all here.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for batch completing reminders',
    properties: {
      reminder_ids: {
        type: SchemaType.ARRAY,
        description: 'Array of reminder IDs to mark as completed',
        items: { type: SchemaType.STRING },
      },
    },
    required: ['reminder_ids'],
  },
};

/** Check off multiple shopping items at once */
const batchCheckShoppingItems: FunctionDeclaration = {
  name: 'batch_check_shopping_items',
  description:
    'Check off multiple shopping items at once. Use this when the user wants to mark all or many items as purchased. First call list_shopping_items to get the IDs, then pass them all here.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for batch checking shopping items',
    properties: {
      item_ids: {
        type: SchemaType.ARRAY,
        description: 'Array of shopping item IDs to check off',
        items: { type: SchemaType.STRING },
      },
    },
    required: ['item_ids'],
  },
};

/** Complete multiple goals at once */
const batchCompleteGoals: FunctionDeclaration = {
  name: 'batch_complete_goals',
  description:
    'Complete multiple goals at once. Use this when the user wants to mark all or many goals as done. First call list_goals to get the IDs, then pass them all here.',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for batch completing goals',
    properties: {
      goal_ids: {
        type: SchemaType.ARRAY,
        description: 'Array of goal IDs to mark as completed',
        items: { type: SchemaType.STRING },
      },
    },
    required: ['goal_ids'],
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
  listChores,
  // Calendar Events
  createEvent,
  updateEvent,
  deleteEvent,
  listEvents,
  // Reminders
  createReminder,
  updateReminder,
  deleteReminder,
  snoozeReminder,
  completeReminder,
  listReminders,
  // Shopping
  addShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
  toggleShoppingItem,
  createShoppingList,
  listShoppingLists,
  // Meals
  planMeal,
  createRecipe,
  searchRecipes,
  updateMeal,
  deleteMeal,
  listMeals,
  // Goals
  createGoal,
  updateGoal,
  deleteGoal,
  createMilestone,
  toggleMilestone,
  updateGoalProgress,
  listGoals,
  // Expenses
  createExpense,
  updateExpense,
  deleteExpense,
  listExpenses,
  // Projects
  createProject,
  updateProject,
  deleteProject,
  listProjects,
  // Messages
  sendMessage,
  listConversations,
  // Rewards
  createReward,
  listRewards,
  updateReward,
  deleteReward,
  getPointsBalance,
  redeemReward,
  getLeaderboard,
  listRedemptions,
  approveRedemption,
  denyRedemption,
  awardPoints,
  // Budget
  getBudget,
  getBudgetStats,
  setBudget,
  // Recipes
  listRecipes,
  updateRecipe,
  deleteRecipe,
  // Bills
  listBills,
  createBill,
  updateBill,
  deleteBill,
  markBillPaid,
  // Shopping (Extended)
  deleteShoppingList,
  updateShoppingList,
  // Messages (Extended)
  listMessages,
  createConversation,
  editMessage,
  deleteMessage,
  pinMessage,
  // Goals (Extended)
  updateMilestone,
  deleteMilestone,
  createGoalCheckIn,
  getGoalCheckIns,
  updateGoalCheckIn,
  deleteGoalCheckIn,
  getGoalStats,
  // Subtasks
  listSubtasks,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  // Project Milestones
  listProjectMilestones,
  createProjectMilestone,
  toggleProjectMilestone,
  deleteProjectMilestone,
  // Finance (Extended)
  getSpendingInsights,
  getCategorySpending,
  // Recipes (Extended)
  getRecipe,
  // Rewards (Extended)
  fulfillRedemption,
  cancelRedemption,
  getPointsHistory,
  // Task Comments
  listTaskComments,
  addTaskComment,
  deleteTaskComment,
  // Chore Rotations & Stats
  createChoreRotation,
  getChoreRotation,
  updateChoreRotation,
  deleteChoreRotation,
  getChoreStats,
  // Goal Collaborators
  addGoalCollaborator,
  removeGoalCollaborator,
  listGoalCollaborators,
  // Goal Templates
  listGoalTemplates,
  createGoalFromTemplate,
  // Check-in Settings
  getCheckinSettings,
  updateCheckinSettings,
  // Project Line Items
  listProjectLineItems,
  createProjectLineItem,
  updateProjectLineItem,
  deleteProjectLineItem,
  markLineItemPaid,
  getProjectStats,
  // Vendors
  listVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  // Recurring Expenses
  listRecurringPatterns,
  confirmRecurringPattern,
  ignoreRecurringPattern,
  // Expense Splitting
  getPartnerBalance,
  createSettlement,
  // Budget Variance
  getBudgetVariance,
  // Messages (Extended 2)
  reactToMessage,
  markConversationRead,
  unpinMessage,
  archiveConversation,
  deleteConversation,
  // Reward Penalties
  getUserPenalties,
  forgivePenalty,
  getPenaltySettings,
  updatePenaltySettings,
  // Household Summary
  getHouseholdSummary,
  // Batch / Bulk Completion
  batchCompleteTasks,
  batchCompleteChores,
  batchCompleteReminders,
  batchCheckShoppingItems,
  batchCompleteGoals,
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
  LIST_CHORES: 'list_chores',
  // Calendar Events
  CREATE_EVENT: 'create_event',
  UPDATE_EVENT: 'update_event',
  DELETE_EVENT: 'delete_event',
  LIST_EVENTS: 'list_events',
  // Reminders
  CREATE_REMINDER: 'create_reminder',
  UPDATE_REMINDER: 'update_reminder',
  DELETE_REMINDER: 'delete_reminder',
  SNOOZE_REMINDER: 'snooze_reminder',
  COMPLETE_REMINDER: 'complete_reminder',
  LIST_REMINDERS: 'list_reminders',
  // Shopping
  ADD_SHOPPING_ITEM: 'add_shopping_item',
  UPDATE_SHOPPING_ITEM: 'update_shopping_item',
  DELETE_SHOPPING_ITEM: 'delete_shopping_item',
  TOGGLE_SHOPPING_ITEM: 'toggle_shopping_item',
  CREATE_SHOPPING_LIST: 'create_shopping_list',
  LIST_SHOPPING_LISTS: 'list_shopping_lists',
  // Meals
  PLAN_MEAL: 'plan_meal',
  CREATE_RECIPE: 'create_recipe',
  SEARCH_RECIPES: 'search_recipes',
  UPDATE_MEAL: 'update_meal',
  DELETE_MEAL: 'delete_meal',
  LIST_MEALS: 'list_meals',
  // Goals
  CREATE_GOAL: 'create_goal',
  UPDATE_GOAL: 'update_goal',
  DELETE_GOAL: 'delete_goal',
  CREATE_MILESTONE: 'create_milestone',
  TOGGLE_MILESTONE: 'toggle_milestone',
  UPDATE_GOAL_PROGRESS: 'update_goal_progress',
  LIST_GOALS: 'list_goals',
  // Expenses
  CREATE_EXPENSE: 'create_expense',
  UPDATE_EXPENSE: 'update_expense',
  DELETE_EXPENSE: 'delete_expense',
  LIST_EXPENSES: 'list_expenses',
  // Projects
  CREATE_PROJECT: 'create_project',
  UPDATE_PROJECT: 'update_project',
  DELETE_PROJECT: 'delete_project',
  LIST_PROJECTS: 'list_projects',
  // Messages
  SEND_MESSAGE: 'send_message',
  LIST_CONVERSATIONS: 'list_conversations',
  // Rewards
  CREATE_REWARD: 'create_reward',
  LIST_REWARDS: 'list_rewards',
  UPDATE_REWARD: 'update_reward',
  DELETE_REWARD: 'delete_reward',
  GET_POINTS_BALANCE: 'get_points_balance',
  REDEEM_REWARD: 'redeem_reward',
  GET_LEADERBOARD: 'get_leaderboard',
  LIST_REDEMPTIONS: 'list_redemptions',
  APPROVE_REDEMPTION: 'approve_redemption',
  DENY_REDEMPTION: 'deny_redemption',
  AWARD_POINTS: 'award_points',
  // Budget
  GET_BUDGET: 'get_budget',
  GET_BUDGET_STATS: 'get_budget_stats',
  SET_BUDGET: 'set_budget',
  // Recipes
  LIST_RECIPES: 'list_recipes',
  UPDATE_RECIPE: 'update_recipe',
  DELETE_RECIPE: 'delete_recipe',
  // Bills
  LIST_BILLS: 'list_bills',
  CREATE_BILL: 'create_bill',
  UPDATE_BILL: 'update_bill',
  DELETE_BILL: 'delete_bill',
  MARK_BILL_PAID: 'mark_bill_paid',
  // Shopping (Extended)
  DELETE_SHOPPING_LIST: 'delete_shopping_list',
  UPDATE_SHOPPING_LIST: 'update_shopping_list',
  // Messages (Extended)
  LIST_MESSAGES: 'list_messages',
  CREATE_CONVERSATION: 'create_conversation',
  EDIT_MESSAGE: 'edit_message',
  DELETE_MESSAGE: 'delete_message',
  PIN_MESSAGE: 'pin_message',
  // Goals (Extended)
  UPDATE_MILESTONE: 'update_milestone',
  DELETE_MILESTONE: 'delete_milestone',
  CREATE_GOAL_CHECKIN: 'create_goal_checkin',
  GET_GOAL_CHECKINS: 'get_goal_checkins',
  UPDATE_GOAL_CHECKIN: 'update_goal_checkin',
  DELETE_GOAL_CHECKIN: 'delete_goal_checkin',
  GET_GOAL_STATS: 'get_goal_stats',
  // Subtasks
  LIST_SUBTASKS: 'list_subtasks',
  CREATE_SUBTASK: 'create_subtask',
  UPDATE_SUBTASK: 'update_subtask',
  DELETE_SUBTASK: 'delete_subtask',
  // Project Milestones
  LIST_PROJECT_MILESTONES: 'list_project_milestones',
  CREATE_PROJECT_MILESTONE: 'create_project_milestone',
  TOGGLE_PROJECT_MILESTONE: 'toggle_project_milestone',
  DELETE_PROJECT_MILESTONE: 'delete_project_milestone',
  // Finance (Extended)
  GET_SPENDING_INSIGHTS: 'get_spending_insights',
  GET_CATEGORY_SPENDING: 'get_category_spending',
  // Recipes (Extended)
  GET_RECIPE: 'get_recipe',
  // Rewards (Extended)
  FULFILL_REDEMPTION: 'fulfill_redemption',
  CANCEL_REDEMPTION: 'cancel_redemption',
  GET_POINTS_HISTORY: 'get_points_history',
  // Task Comments
  LIST_TASK_COMMENTS: 'list_task_comments',
  ADD_TASK_COMMENT: 'add_task_comment',
  DELETE_TASK_COMMENT: 'delete_task_comment',
  // Chore Rotations & Stats
  CREATE_CHORE_ROTATION: 'create_chore_rotation',
  GET_CHORE_ROTATION: 'get_chore_rotation',
  UPDATE_CHORE_ROTATION: 'update_chore_rotation',
  DELETE_CHORE_ROTATION: 'delete_chore_rotation',
  GET_CHORE_STATS: 'get_chore_stats',
  // Goal Collaborators
  ADD_GOAL_COLLABORATOR: 'add_goal_collaborator',
  REMOVE_GOAL_COLLABORATOR: 'remove_goal_collaborator',
  LIST_GOAL_COLLABORATORS: 'list_goal_collaborators',
  // Goal Templates
  LIST_GOAL_TEMPLATES: 'list_goal_templates',
  CREATE_GOAL_FROM_TEMPLATE: 'create_goal_from_template',
  // Check-in Settings
  GET_CHECKIN_SETTINGS: 'get_checkin_settings',
  UPDATE_CHECKIN_SETTINGS: 'update_checkin_settings',
  // Project Line Items
  LIST_PROJECT_LINE_ITEMS: 'list_project_line_items',
  CREATE_PROJECT_LINE_ITEM: 'create_project_line_item',
  UPDATE_PROJECT_LINE_ITEM: 'update_project_line_item',
  DELETE_PROJECT_LINE_ITEM: 'delete_project_line_item',
  MARK_LINE_ITEM_PAID: 'mark_line_item_paid',
  GET_PROJECT_STATS: 'get_project_stats',
  // Vendors
  LIST_VENDORS: 'list_vendors',
  CREATE_VENDOR: 'create_vendor',
  UPDATE_VENDOR: 'update_vendor',
  DELETE_VENDOR: 'delete_vendor',
  // Recurring Expenses
  LIST_RECURRING_PATTERNS: 'list_recurring_patterns',
  CONFIRM_RECURRING_PATTERN: 'confirm_recurring_pattern',
  IGNORE_RECURRING_PATTERN: 'ignore_recurring_pattern',
  // Expense Splitting
  GET_PARTNER_BALANCE: 'get_partner_balance',
  CREATE_SETTLEMENT: 'create_settlement',
  // Budget Variance
  GET_BUDGET_VARIANCE: 'get_budget_variance',
  // Messages (Extended 2)
  REACT_TO_MESSAGE: 'react_to_message',
  MARK_CONVERSATION_READ: 'mark_conversation_read',
  UNPIN_MESSAGE: 'unpin_message',
  ARCHIVE_CONVERSATION: 'archive_conversation',
  DELETE_CONVERSATION: 'delete_conversation',
  // Reward Penalties
  GET_USER_PENALTIES: 'get_user_penalties',
  FORGIVE_PENALTY: 'forgive_penalty',
  GET_PENALTY_SETTINGS: 'get_penalty_settings',
  UPDATE_PENALTY_SETTINGS: 'update_penalty_settings',
  // Household Summary
  GET_HOUSEHOLD_SUMMARY: 'get_household_summary',
  // Batch / Bulk Completion
  BATCH_COMPLETE_TASKS: 'batch_complete_tasks',
  BATCH_COMPLETE_CHORES: 'batch_complete_chores',
  BATCH_COMPLETE_REMINDERS: 'batch_complete_reminders',
  BATCH_CHECK_SHOPPING_ITEMS: 'batch_check_shopping_items',
  BATCH_COMPLETE_GOALS: 'batch_complete_goals',
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
