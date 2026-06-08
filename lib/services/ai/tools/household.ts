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
];
