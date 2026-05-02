/**
 * Tool declarations for the goals feature.
 *
 * Aggregated into TOOL_DECLARATIONS via ./index.ts. The orchestrator
 * sees one combined array; this split is purely for navigability.
 */
import { SchemaType, type FunctionDeclaration } from '@google/generative-ai';

export const GOALS_TOOLS: FunctionDeclaration[] = [
  {
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
  },
  {
    name: 'list_goals',
    description:
      'Retrieve all goals with their progress and milestones. Use this when a user asks about their goals, wants to check progress, or needs to find a goal to update or mark complete.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for listing goals',
      properties: {
        status: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: ['active', 'completed', 'all'],
          description: 'Filter goals by status. Defaults to all.',
        },
      },
      required: [],
    },
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
    name: 'get_goal_stats',
    description:
      'Get aggregated goal statistics — active goals, completed goals, milestones reached, and in-progress count. Use this when a user asks "how many goals have I completed?", "goal summary", or wants an overview of goal progress.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for getting goal stats',
      properties: {
        include_milestones: {
          type: SchemaType.BOOLEAN,
          description: 'Whether to include milestone breakdown in the stats. Defaults to true.',
        },
      },
      required: [],
    },
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
];
