/**
 * Tool declarations for the shopping feature.
 *
 * Aggregated into TOOL_DECLARATIONS via ./index.ts. The orchestrator
 * sees one combined array; this split is purely for navigability.
 */
import { SchemaType, type FunctionDeclaration } from '@google/generative-ai';

export const SHOPPING_TOOLS: FunctionDeclaration[] = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
    name: 'list_shopping_lists',
    description:
      'Retrieve all shopping lists with their items. Use this when a user asks about their shopping lists, what\'s on the list, or wants to find a specific list or item.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for listing shopping lists',
      properties: {
        include_checked: {
          type: SchemaType.BOOLEAN,
          description: 'Whether to include already-checked (purchased) items. Defaults to true.',
        },
      },
      required: [],
    },
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
];
