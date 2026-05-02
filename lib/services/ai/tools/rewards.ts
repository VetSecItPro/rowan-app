/**
 * Tool declarations for the rewards feature.
 *
 * Aggregated into TOOL_DECLARATIONS via ./index.ts. The orchestrator
 * sees one combined array; this split is purely for navigability.
 */
import { SchemaType, type FunctionDeclaration } from '@google/generative-ai';

export const REWARDS_TOOLS: FunctionDeclaration[] = [
  {
    name: 'create_reward',
    description:
      'Create a new redeemable reward that family members can earn by accumulating chore points. Use this when a user wants to set up an incentive like "movie night", "extra screen time", or "pick dinner".',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for creating a reward',
      properties: {
        name: {
          type: SchemaType.STRING,
          description: 'Name of the reward (e.g. "Movie Night", "Extra Screen Time")',
        },
        cost_points: {
          type: SchemaType.INTEGER,
          description: 'Number of points required to redeem this reward. Must be at least 1.',
        },
        description: {
          type: SchemaType.STRING,
          description: 'A description of what the reward entails',
        },
        emoji: {
          type: SchemaType.STRING,
          description: 'An emoji to represent the reward (e.g. "🎬", "🎮")',
        },
        category: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: ['privileges', 'treats', 'activities', 'screen_time', 'money', 'other'],
          description: 'Category of the reward. Defaults to other.',
        },
      },
      required: ['name', 'cost_points'],
    },
  },
  {
    name: 'list_rewards',
    description:
      'Retrieve available rewards in the family reward system. Use this when a user asks about rewards, point costs, or available incentives.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for listing rewards',
      properties: {
        category: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: ['privileges', 'treats', 'activities', 'screen_time', 'money', 'other', 'all'],
          description: 'Filter rewards by category. Defaults to all.',
        },
      },
      required: [],
    },
  },
  {
    name: 'update_reward',
    description:
      'Update an existing reward in the family reward system. Use this when a user wants to change the name, point cost, description, or category of a reward.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for updating a reward',
      properties: {
        reward_id: {
          type: SchemaType.STRING,
          description: 'The unique ID of the reward to update',
        },
        name: {
          type: SchemaType.STRING,
          description: 'New name for the reward',
        },
        cost_points: {
          type: SchemaType.INTEGER,
          description: 'New point cost for the reward. Must be at least 1.',
        },
        description: {
          type: SchemaType.STRING,
          description: 'New description for the reward',
        },
        emoji: {
          type: SchemaType.STRING,
          description: 'New emoji for the reward',
        },
        category: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: ['privileges', 'treats', 'activities', 'screen_time', 'money', 'other'],
          description: 'New category for the reward',
        },
      },
      required: ['reward_id'],
    },
  },
  {
    name: 'delete_reward',
    description:
      'Delete a reward from the family reward system. Use this when a user wants to remove a reward option.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for deleting a reward',
      properties: {
        reward_id: {
          type: SchemaType.STRING,
          description: 'The unique ID of the reward to delete',
        },
      },
      required: ['reward_id'],
    },
  },
  {
    name: 'get_points_balance',
    description:
      'Get the reward points balance and stats for a family member. Use this when a user asks "how many points do I have?", "what\'s my streak?", or wants to check their rewards progress.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for getting points balance',
      properties: {
        user_id: {
          type: SchemaType.STRING,
          description: 'The user ID to check points for. Defaults to the current user if omitted.',
        },
      },
      required: [],
    },
  },
  {
    name: 'redeem_reward',
    description:
      'Redeem a reward using accumulated points. Use this when a user says "I want to redeem movie night" or "use my points for extra screen time". Deducts points and creates a pending redemption.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for redeeming a reward',
      properties: {
        reward_id: {
          type: SchemaType.STRING,
          description: 'The unique ID of the reward to redeem',
        },
        user_id: {
          type: SchemaType.STRING,
          description: 'The user ID redeeming the reward. Defaults to the current user if omitted.',
        },
      },
      required: ['reward_id'],
    },
  },
  {
    name: 'get_leaderboard',
    description:
      'Get the family leaderboard showing points, levels, and streaks for all members. Use this when a user asks "who has the most points?", "show me the leaderboard", or wants to compare family progress.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for the leaderboard',
      properties: {
        period: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: ['week', 'month', 'all'],
          description: 'Time period for the leaderboard. Defaults to week.',
        },
      },
      required: [],
    },
  },
  {
    name: 'list_redemptions',
    description:
      'List reward redemptions, optionally filtered by status. Use this when a parent asks "any rewards waiting for approval?", "show pending redemptions", or wants to review reward requests.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for listing redemptions',
      properties: {
        status: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: ['pending', 'approved', 'fulfilled', 'denied', 'cancelled'],
          description: 'Filter redemptions by status. Defaults to showing all.',
        },
      },
      required: [],
    },
  },
  {
    name: 'approve_redemption',
    description:
      'Approve a pending reward redemption request. Use this when a parent says "approve that reward" or "yes, they can have movie night".',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for approving a redemption',
      properties: {
        redemption_id: {
          type: SchemaType.STRING,
          description: 'The unique ID of the redemption to approve',
        },
      },
      required: ['redemption_id'],
    },
  },
  {
    name: 'deny_redemption',
    description:
      'Deny a pending reward redemption request and refund the points. Use this when a parent says "deny that reward" or "not right now".',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for denying a redemption',
      properties: {
        redemption_id: {
          type: SchemaType.STRING,
          description: 'The unique ID of the redemption to deny',
        },
        reason: {
          type: SchemaType.STRING,
          description: 'Reason for denying the redemption (optional)',
        },
      },
      required: ['redemption_id'],
    },
  },
  {
    name: 'award_points',
    description:
      'Award bonus reward points to a family member. Use this when a parent says "give Jake 50 points for being helpful" or "award bonus points". Not for chore completions — those are awarded automatically.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for awarding points',
      properties: {
        user_id: {
          type: SchemaType.STRING,
          description: 'The user ID of the family member to award points to',
        },
        points: {
          type: SchemaType.INTEGER,
          description: 'Number of points to award. Must be at least 1.',
        },
        reason: {
          type: SchemaType.STRING,
          description: 'Why the points are being awarded (e.g. "being extra helpful today")',
        },
      },
      required: ['user_id', 'points', 'reason'],
    },
  },
  {
    name: 'fulfill_redemption',
    description:
      'Mark an approved reward redemption as fulfilled (physically given to the child). Use this when a parent has actually provided the reward.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for fulfilling a redemption',
      properties: {
        redemption_id: {
          type: SchemaType.STRING,
          description: 'The unique ID of the redemption to fulfill',
        },
      },
      required: ['redemption_id'],
    },
  },
  {
    name: 'cancel_redemption',
    description:
      'Cancel a pending reward redemption and refund the points. Use this when a user changed their mind about redeeming a reward.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for canceling a redemption',
      properties: {
        redemption_id: {
          type: SchemaType.STRING,
          description: 'The unique ID of the redemption to cancel',
        },
      },
      required: ['redemption_id'],
    },
  },
  {
    name: 'get_points_history',
    description:
      'Get the points transaction history for a user — shows all points earned, spent, and why. Use this when a user asks "where did my points go?", "show point history", or wants to see their rewards ledger.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for getting points history',
      properties: {
        user_id: {
          type: SchemaType.STRING,
          description: 'The user ID to get points history for. Defaults to the current user.',
        },
        limit: {
          type: SchemaType.INTEGER,
          description: 'Maximum number of transactions to return. Defaults to 20.',
        },
      },
      required: [],
    },
  },
];
