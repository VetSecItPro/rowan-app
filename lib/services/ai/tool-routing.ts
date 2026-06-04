/**
 * Intent-based tool subsetting (Phase 10.2).
 *
 * The AI assistant has ~145 tool declarations (~30K tokens) spread across 12
 * domains. Sending all of them on every model call is the dominant AI cost
 * line. This module classifies the user's message into 1-3 relevant domains by
 * keyword and returns only those domains' tool declarations, cutting the tool
 * payload ~70-85% on a typical single-domain ask.
 *
 * Correctness over thrift: the selected domain set is computed ONCE per user
 * message and reused across every tool-call round (so a list->act flow never
 * loses its tools mid-message), keywords are deliberately inclusive, and an
 * unmatched message falls back to the daily-core set rather than to nothing.
 * Over-matching just costs a little more; under-matching would break an action,
 * so the bias is toward including a domain when in doubt.
 */
import type { FunctionDeclaration } from '@google/generative-ai';

import { TASKS_TOOLS } from './tools/tasks';
import { CHORES_TOOLS } from './tools/chores';
import { CALENDAR_TOOLS } from './tools/calendar';
import { REMINDERS_TOOLS } from './tools/reminders';
import { SHOPPING_TOOLS } from './tools/shopping';
import { MEALS_TOOLS } from './tools/meals';
import { GOALS_TOOLS } from './tools/goals';
import { BUDGET_TOOLS } from './tools/budget';
import { PROJECTS_TOOLS } from './tools/projects';
import { MESSAGES_TOOLS } from './tools/messages';
import { REWARDS_TOOLS } from './tools/rewards';
import { HOUSEHOLD_TOOLS } from './tools/household';

export type ToolDomain =
  | 'tasks'
  | 'chores'
  | 'calendar'
  | 'reminders'
  | 'shopping'
  | 'meals'
  | 'goals'
  | 'budget'
  | 'projects'
  | 'messages'
  | 'rewards'
  | 'household';

export const TOOLS_BY_DOMAIN: Record<ToolDomain, FunctionDeclaration[]> = {
  tasks: TASKS_TOOLS,
  chores: CHORES_TOOLS,
  calendar: CALENDAR_TOOLS,
  reminders: REMINDERS_TOOLS,
  shopping: SHOPPING_TOOLS,
  meals: MEALS_TOOLS,
  goals: GOALS_TOOLS,
  budget: BUDGET_TOOLS,
  projects: PROJECTS_TOOLS,
  messages: MESSAGES_TOOLS,
  rewards: REWARDS_TOOLS,
  household: HOUSEHOLD_TOOLS,
};

/**
 * Daily-core domains, used when the message matches no domain keyword (vague or
 * conversational openers). Covers the overwhelming majority of real asks while
 * still sending ~5/12 domains instead of all 12.
 */
const CORE_DOMAINS: readonly ToolDomain[] = ['tasks', 'calendar', 'shopping', 'reminders', 'meals'];

/**
 * Keyword -> domain map. Lowercased, substring-matched against the message.
 * Kept inclusive on purpose (see module note). Generic words that collide
 * across domains (e.g. a bare "list") are intentionally omitted.
 */
const DOMAIN_KEYWORDS: Record<ToolDomain, readonly string[]> = {
  tasks: ['task', 'todo', 'to-do', 'to do', 'assign', 'due ', 'deadline'],
  chores: ['chore', 'rotation', 'dishes', 'laundry', 'trash', 'garbage', 'vacuum', 'tidy', 'clean up', 'clean the'],
  calendar: ['calendar', 'event', 'schedule', 'appointment', 'meeting', 'tonight', 'tomorrow', 'next week', 'agenda', 'rsvp'],
  reminders: ['remind', 'reminder', 'alert me', 'notify me', 'snooze', 'nudge', "don't forget", 'dont forget'],
  shopping: ['shopping', 'grocery', 'groceries', 'buy ', 'pick up', 'store', 'milk', 'eggs', 'bread', 'add to the list', 'add to list', 'cart'],
  meals: ['meal', 'recipe', 'dinner', 'lunch', 'breakfast', 'cook', 'food', 'ingredient', 'menu', 'what to eat'],
  goals: ['goal', 'milestone', 'target', 'savings goal', 'save up', 'objective'],
  budget: ['budget', 'expense', 'spend', 'spent', ' bill', 'money', 'cost', ' paid', ' pay ', 'dollar', '$', 'afford'],
  projects: ['project', 'renovation', 'remodel', 'vendor', 'contractor', 'home improvement', 'punch list'],
  messages: ['message', 'tell ', 'send a note', 'announce', 'let everyone know', 'notify the family', 'notify everyone'],
  rewards: ['reward', 'points', 'badge', 'redeem', 'prize', 'star', 'leaderboard'],
  household: ['household', 'member', 'family member', 'space', 'balance', 'fairness', 'who did', 'whose turn', 'roommate'],
};

/**
 * Classify a user message into the relevant tool domains. Returns at least one
 * domain (the daily-core set when nothing matches).
 */
export function selectToolDomains(message: string): ToolDomain[] {
  const lower = ` ${message.toLowerCase()} `;
  const matched: ToolDomain[] = [];
  for (const domain of Object.keys(DOMAIN_KEYWORDS) as ToolDomain[]) {
    if (DOMAIN_KEYWORDS[domain].some((kw) => lower.includes(kw))) {
      matched.push(domain);
    }
  }
  return matched.length > 0 ? matched : [...CORE_DOMAINS];
}

/**
 * Return the tool declarations for a single user message, computed from the
 * selected domains. Call ONCE per message and reuse across tool-call rounds.
 */
export function getToolDeclarationsForMessage(message: string): FunctionDeclaration[] {
  const domains = selectToolDomains(message);
  return domains.flatMap((d) => TOOLS_BY_DOMAIN[d]);
}
