/**
 * Tool declarations for the calendar feature.
 *
 * Aggregated into TOOL_DECLARATIONS via ./index.ts. The orchestrator
 * sees one combined array; this split is purely for navigability.
 */
import { SchemaType, type FunctionDeclaration } from '@google/generative-ai';

export const CALENDAR_TOOLS: FunctionDeclaration[] = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
    name: 'list_recurring_patterns',
    description:
      'List detected recurring expense patterns (subscriptions, regular bills, etc.). Shows auto-detected patterns from expense history.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for listing recurring patterns',
      properties: {
        confirmed_only: {
          type: SchemaType.BOOLEAN,
          description: 'Whether to return only confirmed patterns. Defaults to false (returns all detected patterns).',
        },
      },
      required: [],
    },
  },
  {
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
  },
  {
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
  },
];
