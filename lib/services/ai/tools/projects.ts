/**
 * Tool declarations for the projects feature.
 *
 * Aggregated into TOOL_DECLARATIONS via ./index.ts. The orchestrator
 * sees one combined array; this split is purely for navigability.
 */
import { SchemaType, type FunctionDeclaration } from '@google/generative-ai';

export const PROJECTS_TOOLS: FunctionDeclaration[] = [
  {
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
  },
  {
    name: 'list_projects',
    description:
      'Retrieve all projects with their status. Use this when a user asks about projects, wants to check progress, or needs to find a project to update.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for listing projects',
      properties: {
        status: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: ['planning', 'in-progress', 'on-hold', 'completed', 'cancelled', 'all'],
          description: 'Filter projects by status. Defaults to all.',
        },
      },
      required: [],
    },
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
    name: 'get_project_stats',
    description:
      'Get overall project statistics — total projects, active vs completed, budget totals, over/under budget counts.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for getting project stats',
      properties: {
        include_budget_breakdown: {
          type: SchemaType.BOOLEAN,
          description: 'Whether to include detailed budget breakdown per project. Defaults to false.',
        },
      },
      required: [],
    },
  },
  {
    name: 'list_vendors',
    description:
      'List all vendors/contractors/service providers saved for the household. Use when a user asks about their contractors, vendors, or service providers.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for listing vendors',
      properties: {
        trade: {
          type: SchemaType.STRING,
          description: 'Filter vendors by trade or specialty (e.g. "plumber", "electrician")',
        },
      },
      required: [],
    },
  },
  {
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
  },
  {
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
  },
  {
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
  },
];
