/**
 * Tool declarations for the chores feature.
 *
 * Aggregated into TOOL_DECLARATIONS via ./index.ts. The orchestrator
 * sees one combined array; this split is purely for navigability.
 */
import { SchemaType, type FunctionDeclaration } from '@google/generative-ai';

export const CHORES_TOOLS: FunctionDeclaration[] = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
    name: 'get_chore_stats',
    description:
      'Get chore statistics — total chores, completed this week, my chores vs partner chores. Use when a user asks "how are chores going?" or wants a chore summary.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for getting chore stats',
      properties: {
        period: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: ['week', 'month', 'all'],
          description: 'Time period for chore statistics. Defaults to week.',
        },
      },
      required: [],
    },
  },
  {
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
  },
];
