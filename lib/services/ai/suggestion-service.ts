/**
 * AI Suggestion Service — Rule-based proactive suggestions
 *
 * Generates context-aware suggestions without calling the LLM.
 * Analyzes the user's space summary and recent activity to surface
 * actionable nudges sorted by priority.
 *
 * Priority levels:
 *   HIGH   — overdue tasks, budget warnings, deadlines within 24h
 *   MEDIUM — goal check-in due, chore fairness imbalance
 *   LOW    — no meals planned, empty calendar day
 */

import type { SpaceSummaryContext, RecentActivityContext } from './ai-context-service';

export type SuggestionPriority = 'high' | 'medium' | 'low';

export type SuggestionFeature =
  | 'tasks'
  | 'budget'
  | 'goals'
  | 'chores'
  | 'meals'
  | 'calendar'
  | 'shopping';

export interface AISuggestion {
  id: string;
  priority: SuggestionPriority;
  feature: SuggestionFeature;
  title: string;
  description: string;
  /** Chat message to send when tapped */
  actionMessage: string;
}

const MAX_SUGGESTIONS = 5;

/**
 * Generate suggestions based on space summary and recent activity.
 * Pure function — no DB calls, no LLM calls.
 */
export function generateSuggestions(
  summary: SpaceSummaryContext,
  activity: RecentActivityContext
): AISuggestion[] {
  const suggestions: AISuggestion[] = [];

  // HIGH: Overdue tasks
  if (summary.taskCounts.overdue > 0) {
    suggestions.push({
      id: 'overdue-tasks',
      priority: 'high',
      feature: 'tasks',
      title: `${summary.taskCounts.overdue} overdue task${summary.taskCounts.overdue > 1 ? 's' : ''}`,
      description: 'These need attention right away',
      actionMessage: 'Show me my overdue tasks',
    });
  }

  // HIGH: Tasks due today
  if (summary.taskCounts.dueToday > 0) {
    suggestions.push({
      id: 'due-today',
      priority: 'high',
      feature: 'tasks',
      title: `${summary.taskCounts.dueToday} task${summary.taskCounts.dueToday > 1 ? 's' : ''} due today`,
      description: 'Deadline is today',
      actionMessage: 'What tasks are due today?',
    });
  }

  // HIGH: Budget warning (if available)
  if (summary.budgetRemaining !== null && summary.budgetRemaining < 50) {
    suggestions.push({
      id: 'budget-warning',
      priority: 'high',
      feature: 'budget',
      title: 'Budget running low',
      description: `Only $${summary.budgetRemaining.toFixed(0)} remaining`,
      actionMessage: 'How is the budget looking this month?',
    });
  }

  // MEDIUM: Goals with no recent progress
  if (summary.activeGoals > 0 && activity.completedTasks.length === 0) {
    suggestions.push({
      id: 'goal-check-in',
      priority: 'medium',
      feature: 'goals',
      title: 'Check in on goals',
      description: `${summary.activeGoals} active goal${summary.activeGoals > 1 ? 's' : ''} — any progress to log?`,
      actionMessage: 'Show me my active goals and their progress',
    });
  }

  // MEDIUM: Pending chores piling up
  if (summary.choreStats.pending > 3) {
    suggestions.push({
      id: 'chores-piling',
      priority: 'medium',
      feature: 'chores',
      title: `${summary.choreStats.pending} chores pending`,
      description: 'Time to catch up on household tasks',
      actionMessage: 'What chores need to be done?',
    });
  }

  // LOW: No upcoming events
  if (summary.upcomingEvents.length === 0) {
    suggestions.push({
      id: 'empty-calendar',
      priority: 'low',
      feature: 'calendar',
      title: 'Calendar is clear',
      description: 'Plan something for the week?',
      actionMessage: 'Help me plan something for this week',
    });
  }

  // LOW: No shopping lists active
  if (summary.shoppingLists.length === 0) {
    suggestions.push({
      id: 'no-shopping',
      priority: 'low',
      feature: 'shopping',
      title: 'No shopping lists',
      description: 'Need to stock up on anything?',
      actionMessage: 'Help me create a grocery list',
    });
  }

  // Sort by priority (high first) and limit
  const priorityOrder: Record<SuggestionPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return suggestions
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, MAX_SUGGESTIONS);
}
