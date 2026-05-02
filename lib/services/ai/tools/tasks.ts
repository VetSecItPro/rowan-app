/**
 * Tool declarations for the tasks feature.
 *
 * Aggregated into TOOL_DECLARATIONS via ./index.ts. The orchestrator
 * sees one combined array; this split is purely for navigability.
 */
import { SchemaType, type FunctionDeclaration } from '@google/generative-ai';

export const TASKS_TOOLS: FunctionDeclaration[] = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
];
