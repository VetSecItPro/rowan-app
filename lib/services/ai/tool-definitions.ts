/**
 * Tool declarations for the Rowan AI assistant.
 *
 * Definitions are now split by domain in ./tools/. This file is a
 * thin re-export so existing imports (`from './tool-definitions'`)
 * keep working without churn at consumer sites.
 *
 * To add a new tool: add it to the appropriate domain file in
 * lib/services/ai/tools/{domain}.ts. To add a new domain: create
 * a new file there and append its export to ./tools/index.ts.
 */
import type { FunctionDeclaration } from '@google/generative-ai';

export { TOOL_DECLARATIONS } from './tools';
import { TOOL_DECLARATIONS } from './tools';

/**
 * Mapping of friendly display names to tool function names.
 * Useful for logging, analytics, and UI display.
 */
export const TOOL_NAMES = {
  // Tasks
  CREATE_TASK: 'create_task',
  UPDATE_TASK: 'update_task',
  DELETE_TASK: 'delete_task',
  COMPLETE_TASK: 'complete_task',
  LIST_TASKS: 'list_tasks',
  // Chores
  CREATE_CHORE: 'create_chore',
  UPDATE_CHORE: 'update_chore',
  DELETE_CHORE: 'delete_chore',
  COMPLETE_CHORE: 'complete_chore',
  LIST_CHORES: 'list_chores',
  // Calendar Events
  CREATE_EVENT: 'create_event',
  UPDATE_EVENT: 'update_event',
  DELETE_EVENT: 'delete_event',
  LIST_EVENTS: 'list_events',
  // Reminders
  CREATE_REMINDER: 'create_reminder',
  UPDATE_REMINDER: 'update_reminder',
  DELETE_REMINDER: 'delete_reminder',
  SNOOZE_REMINDER: 'snooze_reminder',
  COMPLETE_REMINDER: 'complete_reminder',
  LIST_REMINDERS: 'list_reminders',
  // Shopping
  ADD_SHOPPING_ITEM: 'add_shopping_item',
  UPDATE_SHOPPING_ITEM: 'update_shopping_item',
  DELETE_SHOPPING_ITEM: 'delete_shopping_item',
  TOGGLE_SHOPPING_ITEM: 'toggle_shopping_item',
  CREATE_SHOPPING_LIST: 'create_shopping_list',
  LIST_SHOPPING_LISTS: 'list_shopping_lists',
  // Meals
  PLAN_MEAL: 'plan_meal',
  CREATE_RECIPE: 'create_recipe',
  SEARCH_RECIPES: 'search_recipes',
  UPDATE_MEAL: 'update_meal',
  DELETE_MEAL: 'delete_meal',
  LIST_MEALS: 'list_meals',
  // Goals
  CREATE_GOAL: 'create_goal',
  UPDATE_GOAL: 'update_goal',
  DELETE_GOAL: 'delete_goal',
  CREATE_MILESTONE: 'create_milestone',
  TOGGLE_MILESTONE: 'toggle_milestone',
  UPDATE_GOAL_PROGRESS: 'update_goal_progress',
  LIST_GOALS: 'list_goals',
  // Expenses
  CREATE_EXPENSE: 'create_expense',
  UPDATE_EXPENSE: 'update_expense',
  DELETE_EXPENSE: 'delete_expense',
  LIST_EXPENSES: 'list_expenses',
  // Projects
  CREATE_PROJECT: 'create_project',
  UPDATE_PROJECT: 'update_project',
  DELETE_PROJECT: 'delete_project',
  LIST_PROJECTS: 'list_projects',
  // Messages
  SEND_MESSAGE: 'send_message',
  LIST_CONVERSATIONS: 'list_conversations',
  // Rewards
  CREATE_REWARD: 'create_reward',
  LIST_REWARDS: 'list_rewards',
  UPDATE_REWARD: 'update_reward',
  DELETE_REWARD: 'delete_reward',
  GET_POINTS_BALANCE: 'get_points_balance',
  REDEEM_REWARD: 'redeem_reward',
  GET_LEADERBOARD: 'get_leaderboard',
  LIST_REDEMPTIONS: 'list_redemptions',
  APPROVE_REDEMPTION: 'approve_redemption',
  DENY_REDEMPTION: 'deny_redemption',
  AWARD_POINTS: 'award_points',
  // Budget
  GET_BUDGET: 'get_budget',
  GET_BUDGET_STATS: 'get_budget_stats',
  SET_BUDGET: 'set_budget',
  // Recipes
  LIST_RECIPES: 'list_recipes',
  UPDATE_RECIPE: 'update_recipe',
  DELETE_RECIPE: 'delete_recipe',
  // Bills
  LIST_BILLS: 'list_bills',
  CREATE_BILL: 'create_bill',
  UPDATE_BILL: 'update_bill',
  DELETE_BILL: 'delete_bill',
  MARK_BILL_PAID: 'mark_bill_paid',
  // Shopping (Extended)
  DELETE_SHOPPING_LIST: 'delete_shopping_list',
  UPDATE_SHOPPING_LIST: 'update_shopping_list',
  // Messages (Extended)
  LIST_MESSAGES: 'list_messages',
  CREATE_CONVERSATION: 'create_conversation',
  EDIT_MESSAGE: 'edit_message',
  DELETE_MESSAGE: 'delete_message',
  PIN_MESSAGE: 'pin_message',
  // Goals (Extended)
  UPDATE_MILESTONE: 'update_milestone',
  DELETE_MILESTONE: 'delete_milestone',
  CREATE_GOAL_CHECKIN: 'create_goal_checkin',
  GET_GOAL_CHECKINS: 'get_goal_checkins',
  UPDATE_GOAL_CHECKIN: 'update_goal_checkin',
  DELETE_GOAL_CHECKIN: 'delete_goal_checkin',
  GET_GOAL_STATS: 'get_goal_stats',
  // Subtasks
  LIST_SUBTASKS: 'list_subtasks',
  CREATE_SUBTASK: 'create_subtask',
  UPDATE_SUBTASK: 'update_subtask',
  DELETE_SUBTASK: 'delete_subtask',
  // Project Milestones
  LIST_PROJECT_MILESTONES: 'list_project_milestones',
  CREATE_PROJECT_MILESTONE: 'create_project_milestone',
  TOGGLE_PROJECT_MILESTONE: 'toggle_project_milestone',
  DELETE_PROJECT_MILESTONE: 'delete_project_milestone',
  // Finance (Extended)
  GET_SPENDING_INSIGHTS: 'get_spending_insights',
  GET_CATEGORY_SPENDING: 'get_category_spending',
  // Recipes (Extended)
  GET_RECIPE: 'get_recipe',
  // Rewards (Extended)
  FULFILL_REDEMPTION: 'fulfill_redemption',
  CANCEL_REDEMPTION: 'cancel_redemption',
  GET_POINTS_HISTORY: 'get_points_history',
  // Task Comments
  LIST_TASK_COMMENTS: 'list_task_comments',
  ADD_TASK_COMMENT: 'add_task_comment',
  DELETE_TASK_COMMENT: 'delete_task_comment',
  // Chore Rotations & Stats
  CREATE_CHORE_ROTATION: 'create_chore_rotation',
  GET_CHORE_ROTATION: 'get_chore_rotation',
  UPDATE_CHORE_ROTATION: 'update_chore_rotation',
  DELETE_CHORE_ROTATION: 'delete_chore_rotation',
  GET_CHORE_STATS: 'get_chore_stats',
  // Goal Collaborators
  ADD_GOAL_COLLABORATOR: 'add_goal_collaborator',
  REMOVE_GOAL_COLLABORATOR: 'remove_goal_collaborator',
  LIST_GOAL_COLLABORATORS: 'list_goal_collaborators',
  // Goal Templates
  LIST_GOAL_TEMPLATES: 'list_goal_templates',
  CREATE_GOAL_FROM_TEMPLATE: 'create_goal_from_template',
  // Check-in Settings
  GET_CHECKIN_SETTINGS: 'get_checkin_settings',
  UPDATE_CHECKIN_SETTINGS: 'update_checkin_settings',
  // Project Line Items
  LIST_PROJECT_LINE_ITEMS: 'list_project_line_items',
  CREATE_PROJECT_LINE_ITEM: 'create_project_line_item',
  UPDATE_PROJECT_LINE_ITEM: 'update_project_line_item',
  DELETE_PROJECT_LINE_ITEM: 'delete_project_line_item',
  MARK_LINE_ITEM_PAID: 'mark_line_item_paid',
  GET_PROJECT_STATS: 'get_project_stats',
  // Vendors
  LIST_VENDORS: 'list_vendors',
  CREATE_VENDOR: 'create_vendor',
  UPDATE_VENDOR: 'update_vendor',
  DELETE_VENDOR: 'delete_vendor',
  // Recurring Expenses
  LIST_RECURRING_PATTERNS: 'list_recurring_patterns',
  CONFIRM_RECURRING_PATTERN: 'confirm_recurring_pattern',
  IGNORE_RECURRING_PATTERN: 'ignore_recurring_pattern',
  // Expense Splitting
  GET_PARTNER_BALANCE: 'get_partner_balance',
  CREATE_SETTLEMENT: 'create_settlement',
  // Budget Variance
  GET_BUDGET_VARIANCE: 'get_budget_variance',
  // Messages (Extended 2)
  REACT_TO_MESSAGE: 'react_to_message',
  MARK_CONVERSATION_READ: 'mark_conversation_read',
  UNPIN_MESSAGE: 'unpin_message',
  ARCHIVE_CONVERSATION: 'archive_conversation',
  DELETE_CONVERSATION: 'delete_conversation',
  // Household Summary
  GET_HOUSEHOLD_SUMMARY: 'get_household_summary',
  // Batch / Bulk Completion
  BATCH_COMPLETE_TASKS: 'batch_complete_tasks',
  BATCH_COMPLETE_CHORES: 'batch_complete_chores',
  BATCH_COMPLETE_REMINDERS: 'batch_complete_reminders',
  BATCH_CHECK_SHOPPING_ITEMS: 'batch_check_shopping_items',
  BATCH_COMPLETE_GOALS: 'batch_complete_goals',
} as const;

/**
 * Look up a single tool declaration by function name.
 * Returns `undefined` if no declaration matches the given name.
 *
 * @param name - The function name to search for (e.g. 'create_task')
 * @returns The matching FunctionDeclaration or undefined
 */
export function getToolDeclaration(name: string): FunctionDeclaration | undefined {
  return TOOL_DECLARATIONS.find((decl) => decl.name === name);
}
