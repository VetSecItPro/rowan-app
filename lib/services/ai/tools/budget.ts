/**
 * Tool declarations for the budget feature.
 *
 * Aggregated into TOOL_DECLARATIONS via ./index.ts. The orchestrator
 * sees one combined array; this split is purely for navigability.
 */
import { SchemaType, type FunctionDeclaration } from '@google/generative-ai';

export const BUDGET_TOOLS: FunctionDeclaration[] = [
  {
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
  },
  {
    name: 'list_expenses',
    description:
      'Retrieve expense records. Use this when a user asks about spending, recent expenses, or wants to find a specific expense.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for listing expenses',
      properties: {
        category: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: [
            'groceries', 'utilities', 'rent', 'mortgage', 'transportation',
            'entertainment', 'dining', 'healthcare', 'insurance', 'subscriptions',
            'education', 'childcare', 'pets', 'clothing', 'personal',
            'gifts', 'travel', 'home', 'other',
          ],
          description: 'Filter expenses by category',
        },
      },
      required: [],
    },
  },
  {
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
  },
  {
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
  },
  {
    name: 'get_budget',
    description:
      'Get the current monthly budget configuration. Use this when a user asks about their budget, monthly limit, or budget settings.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for getting budget',
      properties: {
        month: {
          type: SchemaType.STRING,
          description: 'Month to get budget for in YYYY-MM format. Defaults to the current month.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_budget_stats',
    description:
      'Get budget statistics for the current month — how much has been spent, how much remains, and how many pending bills. Use this when a user asks "how much have I spent?", "what\'s left in my budget?", or wants a financial overview.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for getting budget stats',
      properties: {
        month: {
          type: SchemaType.STRING,
          description: 'Month to get stats for in YYYY-MM format. Defaults to the current month.',
        },
      },
      required: [],
    },
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
];
