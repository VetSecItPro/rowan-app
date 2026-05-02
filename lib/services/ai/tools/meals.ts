/**
 * Tool declarations for the meals feature.
 *
 * Aggregated into TOOL_DECLARATIONS via ./index.ts. The orchestrator
 * sees one combined array; this split is purely for navigability.
 */
import { SchemaType, type FunctionDeclaration } from '@google/generative-ai';

export const MEALS_TOOLS: FunctionDeclaration[] = [
  {
    name: 'plan_meal',
    description:
      'Plan a meal for a specific date and meal type. Use this when a user wants to schedule what they are eating for breakfast, lunch, dinner, or a snack.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for planning a meal',
      properties: {
        meal_type: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: ['breakfast', 'lunch', 'dinner', 'snack', 'other'],
          description: 'Which meal of the day this is for',
        },
        scheduled_date: {
          type: SchemaType.STRING,
          description: 'The date for this meal in ISO 8601 format (YYYY-MM-DD)',
        },
        name: {
          type: SchemaType.STRING,
          description: 'Name of the recipe or dish being planned',
        },
        recipe_id: {
          type: SchemaType.STRING,
          description: 'The ID of a saved recipe to link to this meal. Use list_recipes to find recipe IDs.',
        },
        notes: {
          type: SchemaType.STRING,
          description: 'Additional notes about the meal (e.g. "double the recipe", "use leftover chicken")',
        },
        servings: {
          type: SchemaType.INTEGER,
          description: 'Number of servings to prepare',
        },
        assigned_to: {
          type: SchemaType.STRING,
          description: 'User ID of the space member responsible for preparing this meal',
        },
      },
      required: ['meal_type', 'scheduled_date'],
    },
  },
  {
    name: 'create_recipe',
    description:
      'Create a new recipe in the recipe library. Use this when a user wants to save a recipe — their own creation or one they found and want to keep.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for creating a recipe',
      properties: {
        name: {
          type: SchemaType.STRING,
          description: 'Name of the recipe',
        },
        description: {
          type: SchemaType.STRING,
          description: 'A short description of the recipe',
        },
        ingredients: {
          type: SchemaType.STRING,
          description: 'Comma-separated list of ingredients (e.g. "2 cups flour, 1 egg, 1 cup sugar")',
        },
        instructions: {
          type: SchemaType.STRING,
          description: 'Step-by-step cooking instructions',
        },
        prep_time: {
          type: SchemaType.INTEGER,
          description: 'Preparation time in minutes',
        },
        cook_time: {
          type: SchemaType.INTEGER,
          description: 'Cooking time in minutes',
        },
        servings: {
          type: SchemaType.INTEGER,
          description: 'Number of servings the recipe yields',
        },
        difficulty: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: ['easy', 'medium', 'hard'],
          description: 'Difficulty level of the recipe',
        },
        cuisine_type: {
          type: SchemaType.STRING,
          description: 'Type of cuisine (e.g. "Italian", "Mexican", "Japanese")',
        },
        tags: {
          type: SchemaType.STRING,
          description: 'Comma-separated tags for filtering (e.g. "vegetarian, quick, kid-friendly")',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'search_recipes',
    description:
      'Search external recipe APIs for meal inspiration and ideas. Use this when a user asks for recipe suggestions, wants to find something new to cook, or needs inspiration for a specific cuisine.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for searching recipes',
      properties: {
        query: {
          type: SchemaType.STRING,
          description: 'Search query describing what kind of recipe to find (e.g. "chicken pasta", "vegan dessert")',
        },
        cuisine: {
          type: SchemaType.STRING,
          description: 'Optional cuisine type to filter results (e.g. "Italian", "Thai")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_meals',
    description:
      'Retrieve planned meals. Use this when a user asks about the meal plan, what\'s for dinner, or wants to find a specific meal to update.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Optional filters for listing meals',
      properties: {
        start_date: {
          type: SchemaType.STRING,
          description: 'Start of date range in ISO 8601 format (YYYY-MM-DD)',
        },
        end_date: {
          type: SchemaType.STRING,
          description: 'End of date range in ISO 8601 format (YYYY-MM-DD)',
        },
      },
      required: [],
    },
  },
  {
    name: 'update_meal',
    description:
      'Update an existing planned meal. Use this when a user wants to change what they are having, reschedule a meal, or adjust the servings.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for updating a planned meal',
      properties: {
        meal_id: {
          type: SchemaType.STRING,
          description: 'The unique ID of the planned meal to update',
        },
        meal_type: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: ['breakfast', 'lunch', 'dinner', 'snack', 'other'],
          description: 'New meal type',
        },
        scheduled_date: {
          type: SchemaType.STRING,
          description: 'New date for the meal in ISO 8601 format (YYYY-MM-DD)',
        },
        name: {
          type: SchemaType.STRING,
          description: 'New name or recipe for the meal',
        },
        notes: {
          type: SchemaType.STRING,
          description: 'New notes about the meal',
        },
        servings: {
          type: SchemaType.INTEGER,
          description: 'New number of servings',
        },
      },
      required: ['meal_id'],
    },
  },
  {
    name: 'delete_meal',
    description:
      'Delete a planned meal from the meal plan. Use this when a user wants to remove a meal they previously scheduled.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for deleting a planned meal',
      properties: {
        meal_id: {
          type: SchemaType.STRING,
          description: 'The unique ID of the planned meal to delete',
        },
      },
      required: ['meal_id'],
    },
  },
  {
    name: 'list_recipes',
    description:
      'List saved recipes from the family recipe library. Use this when a user asks about their saved recipes, wants to browse the collection, or needs to find a recipe to update or delete.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Optional filters for listing recipes',
      properties: {
        cuisine_type: {
          type: SchemaType.STRING,
          description: 'Filter recipes by cuisine type (e.g. "Italian", "Mexican", "Japanese")',
        },
        difficulty: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: ['easy', 'medium', 'hard'],
          description: 'Filter recipes by difficulty level',
        },
        search: {
          type: SchemaType.STRING,
          description: 'Search recipes by name or description',
        },
      },
      required: [],
    },
  },
  {
    name: 'update_recipe',
    description:
      'Update an existing recipe in the family library. Use this when a user wants to change ingredients, instructions, cook time, or other recipe details.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for updating a recipe',
      properties: {
        recipe_id: {
          type: SchemaType.STRING,
          description: 'The unique ID of the recipe to update',
        },
        name: {
          type: SchemaType.STRING,
          description: 'New name for the recipe',
        },
        description: {
          type: SchemaType.STRING,
          description: 'New description for the recipe',
        },
        ingredients: {
          type: SchemaType.STRING,
          description: 'New comma-separated list of ingredients',
        },
        instructions: {
          type: SchemaType.STRING,
          description: 'New step-by-step cooking instructions',
        },
        prep_time: {
          type: SchemaType.INTEGER,
          description: 'New preparation time in minutes',
        },
        cook_time: {
          type: SchemaType.INTEGER,
          description: 'New cooking time in minutes',
        },
        servings: {
          type: SchemaType.INTEGER,
          description: 'New number of servings',
        },
        cuisine_type: {
          type: SchemaType.STRING,
          description: 'New cuisine type (e.g. "Italian", "Mexican")',
        },
        difficulty: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: ['easy', 'medium', 'hard'],
          description: 'New difficulty level for the recipe',
        },
        tags: {
          type: SchemaType.STRING,
          description: 'Comma-separated tags for the recipe (e.g. "vegetarian, quick, kid-friendly")',
        },
      },
      required: ['recipe_id'],
    },
  },
  {
    name: 'delete_recipe',
    description:
      'Delete a recipe from the family library permanently. Use this when a user wants to remove a saved recipe they no longer need.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for deleting a recipe',
      properties: {
        recipe_id: {
          type: SchemaType.STRING,
          description: 'The unique ID of the recipe to delete',
        },
      },
      required: ['recipe_id'],
    },
  },
  {
    name: 'get_recipe',
    description:
      'Get the full details of a single recipe including ingredients and instructions. Use this when a user asks "what\'s in the lasagna recipe?", "how do I make the banana bread?", or wants to see a complete recipe.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for getting a recipe',
      properties: {
        recipe_id: {
          type: SchemaType.STRING,
          description: 'The unique ID of the recipe to retrieve',
        },
      },
      required: ['recipe_id'],
    },
  },
];
