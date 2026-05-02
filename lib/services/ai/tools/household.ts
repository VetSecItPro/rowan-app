/**
 * Tool declarations for the household feature.
 *
 * Aggregated into TOOL_DECLARATIONS via ./index.ts. The orchestrator
 * sees one combined array; this split is purely for navigability.
 */
import { SchemaType, type FunctionDeclaration } from '@google/generative-ai';

export const HOUSEHOLD_TOOLS: FunctionDeclaration[] = [
  {
    name: 'get_household_summary',
    description:
      'Get a comprehensive overview of the household — pending tasks, active goals, budget status, upcoming events, chore stats, and shopping lists. Use this when a user asks "what\'s going on?", "give me an overview", "how are we doing?", or wants a general status update.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for getting household summary',
      properties: {
        include_completed: {
          type: SchemaType.BOOLEAN,
          description: 'Whether to include completed items in the summary. Defaults to false.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_partner_balance',
    description:
      'Get the expense balance between household partners — who owes whom and how much. Use when a user asks "who owes what?" or "what\'s our balance?".',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for getting partner balance',
      properties: {
        include_settled: {
          type: SchemaType.BOOLEAN,
          description: 'Whether to include already-settled balances in the history. Defaults to false.',
        },
      },
      required: [],
    },
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
    name: 'get_penalty_settings',
    description:
      'Get the household late penalty settings — default penalty points, grace period, progressive penalties, etc.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for getting penalty settings',
      properties: {
        include_defaults: {
          type: SchemaType.BOOLEAN,
          description: 'Whether to include default/system penalty settings alongside custom ones. Defaults to true.',
        },
      },
      required: [],
    },
  },
  {
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
  },
];
