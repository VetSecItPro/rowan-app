/**
 * Aggregate all domain tool declarations into a single TOOL_DECLARATIONS
 * array. Consumers (chat-orchestrator-service.ts) get one flat list;
 * file split is for maintainability only.
 */
import type { FunctionDeclaration } from '@google/generative-ai';

import { TASKS_TOOLS } from './tasks';
import { CHORES_TOOLS } from './chores';
import { CALENDAR_TOOLS } from './calendar';
import { REMINDERS_TOOLS } from './reminders';
import { SHOPPING_TOOLS } from './shopping';
import { MEALS_TOOLS } from './meals';
import { GOALS_TOOLS } from './goals';
import { BUDGET_TOOLS } from './budget';
import { PROJECTS_TOOLS } from './projects';
import { MESSAGES_TOOLS } from './messages';
import { REWARDS_TOOLS } from './rewards';
import { HOUSEHOLD_TOOLS } from './household';

export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  ...TASKS_TOOLS,
  ...CHORES_TOOLS,
  ...CALENDAR_TOOLS,
  ...REMINDERS_TOOLS,
  ...SHOPPING_TOOLS,
  ...MEALS_TOOLS,
  ...GOALS_TOOLS,
  ...BUDGET_TOOLS,
  ...PROJECTS_TOOLS,
  ...MESSAGES_TOOLS,
  ...REWARDS_TOOLS,
  ...HOUSEHOLD_TOOLS,
];
