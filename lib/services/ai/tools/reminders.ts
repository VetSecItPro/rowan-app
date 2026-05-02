/**
 * Tool declarations for the reminders feature.
 *
 * Aggregated into TOOL_DECLARATIONS via ./index.ts. The orchestrator
 * sees one combined array; this split is purely for navigability.
 */
import { SchemaType, type FunctionDeclaration } from '@google/generative-ai';

export const REMINDERS_TOOLS: FunctionDeclaration[] = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
];
