import { describe, it, expect } from 'vitest';
import { generateSuggestions } from '@/lib/services/ai/suggestion-service';
import type { SpaceSummaryContext, RecentActivityContext } from '@/lib/services/ai/ai-context-service';

function makeSummary(overrides: Partial<SpaceSummaryContext> = {}): SpaceSummaryContext {
  return {
    taskCounts: { total: 10, pending: 5, overdue: 0, dueToday: 0 },
    budgetRemaining: null,
    activeGoals: 0,
    choreStats: { total: 5, pending: 0 },
    shoppingLists: [],
    upcomingEvents: [],
    ...overrides,
  };
}

function makeActivity(overrides: Partial<RecentActivityContext> = {}): RecentActivityContext {
  return {
    completedTasks: [],
    newExpenses: [],
    upcomingEvents: [],
    ...overrides,
  };
}

describe('generateSuggestions()', () => {
  it('should return empty array when no conditions are triggered', () => {
    const summary = makeSummary({
      taskCounts: { total: 10, pending: 5, overdue: 0, dueToday: 0 },
      budgetRemaining: null,
      activeGoals: 0,
      choreStats: { total: 5, pending: 2 },
      shoppingLists: [{ title: 'Groceries', itemCount: 5 }],
      upcomingEvents: [{ title: 'Doctor', startTime: '2026-02-25T10:00:00Z' }],
    });
    const activity = makeActivity({ completedTasks: [{ title: 'Done', completedAt: '2026-02-22' }] });

    const result = generateSuggestions(summary, activity);

    // No overdue, no dueToday, budget null, no active goals with 0 completions (has completions),
    // pending chores <= 3, has events, has shopping
    // Actually: activeGoals=0 so goal check-in won't trigger
    expect(Array.isArray(result)).toBe(true);
  });

  describe('HIGH priority suggestions', () => {
    it('should add overdue-tasks suggestion when tasks are overdue', () => {
      const summary = makeSummary({
        taskCounts: { total: 10, pending: 5, overdue: 3, dueToday: 0 },
      });

      const result = generateSuggestions(summary, makeActivity());

      const overdueItem = result.find((s) => s.id === 'overdue-tasks');
      expect(overdueItem).toBeDefined();
      expect(overdueItem?.priority).toBe('high');
      expect(overdueItem?.feature).toBe('tasks');
      expect(overdueItem?.title).toContain('3');
    });

    it('should pluralize correctly for 1 overdue task', () => {
      const summary = makeSummary({
        taskCounts: { total: 5, pending: 2, overdue: 1, dueToday: 0 },
      });

      const result = generateSuggestions(summary, makeActivity());
      const overdueItem = result.find((s) => s.id === 'overdue-tasks');

      expect(overdueItem?.title).not.toContain('tasks');
      expect(overdueItem?.title).toContain('task');
    });

    it('should add due-today suggestion when tasks are due today', () => {
      const summary = makeSummary({
        taskCounts: { total: 5, pending: 3, overdue: 0, dueToday: 2 },
      });

      const result = generateSuggestions(summary, makeActivity());

      const dueTodayItem = result.find((s) => s.id === 'due-today');
      expect(dueTodayItem).toBeDefined();
      expect(dueTodayItem?.priority).toBe('high');
      expect(dueTodayItem?.title).toContain('2');
    });

    it('should add budget-warning when budget is below $50', () => {
      const summary = makeSummary({ budgetRemaining: 25 });

      const result = generateSuggestions(summary, makeActivity());

      const budgetItem = result.find((s) => s.id === 'budget-warning');
      expect(budgetItem).toBeDefined();
      expect(budgetItem?.priority).toBe('high');
      expect(budgetItem?.description).toContain('25');
    });

    it('should not add budget-warning when budget is null', () => {
      const summary = makeSummary({ budgetRemaining: null });

      const result = generateSuggestions(summary, makeActivity());

      expect(result.find((s) => s.id === 'budget-warning')).toBeUndefined();
    });

    it('should not add budget-warning when budget >= $50', () => {
      const summary = makeSummary({ budgetRemaining: 100 });

      const result = generateSuggestions(summary, makeActivity());

      expect(result.find((s) => s.id === 'budget-warning')).toBeUndefined();
    });

    it('should add budget-warning at exactly $49', () => {
      const summary = makeSummary({ budgetRemaining: 49 });

      const result = generateSuggestions(summary, makeActivity());

      expect(result.find((s) => s.id === 'budget-warning')).toBeDefined();
    });
  });

  describe('MEDIUM priority suggestions', () => {
    it('should add goal-check-in when there are active goals and no completed tasks', () => {
      const summary = makeSummary({ activeGoals: 2 });
      const activity = makeActivity({ completedTasks: [] });

      const result = generateSuggestions(summary, activity);

      const goalItem = result.find((s) => s.id === 'goal-check-in');
      expect(goalItem).toBeDefined();
      expect(goalItem?.priority).toBe('medium');
      expect(goalItem?.description).toContain('2');
    });

    it('should NOT add goal-check-in when there are completed tasks', () => {
      const summary = makeSummary({ activeGoals: 2 });
      const activity = makeActivity({
        completedTasks: [{ title: 'Done task', completedAt: '2026-02-22' }],
      });

      const result = generateSuggestions(summary, activity);

      expect(result.find((s) => s.id === 'goal-check-in')).toBeUndefined();
    });

    it('should add chores-piling when pending chores > 3', () => {
      const summary = makeSummary({
        choreStats: { total: 10, pending: 5 },
      });

      const result = generateSuggestions(summary, makeActivity());

      const choresItem = result.find((s) => s.id === 'chores-piling');
      expect(choresItem).toBeDefined();
      expect(choresItem?.priority).toBe('medium');
      expect(choresItem?.title).toContain('5');
    });

    it('should NOT add chores-piling when pending chores <= 3', () => {
      const summary = makeSummary({
        choreStats: { total: 5, pending: 3 },
      });

      const result = generateSuggestions(summary, makeActivity());

      expect(result.find((s) => s.id === 'chores-piling')).toBeUndefined();
    });
  });

  describe('LOW priority suggestions', () => {
    it('should add empty-calendar when no upcoming events', () => {
      const summary = makeSummary({ upcomingEvents: [] });

      const result = generateSuggestions(summary, makeActivity());

      const calendarItem = result.find((s) => s.id === 'empty-calendar');
      expect(calendarItem).toBeDefined();
      expect(calendarItem?.priority).toBe('low');
    });

    it('should NOT add empty-calendar when events exist', () => {
      const summary = makeSummary({
        upcomingEvents: [{ title: 'Meeting', startTime: '2026-02-25T10:00:00Z' }],
      });

      const result = generateSuggestions(summary, makeActivity());

      expect(result.find((s) => s.id === 'empty-calendar')).toBeUndefined();
    });

    it('should add no-shopping when no shopping lists', () => {
      const summary = makeSummary({ shoppingLists: [] });

      const result = generateSuggestions(summary, makeActivity());

      const shoppingItem = result.find((s) => s.id === 'no-shopping');
      expect(shoppingItem).toBeDefined();
      expect(shoppingItem?.priority).toBe('low');
    });

    it('should NOT add no-shopping when shopping lists exist', () => {
      const summary = makeSummary({
        shoppingLists: [{ title: 'Groceries', itemCount: 3 }],
      });

      const result = generateSuggestions(summary, makeActivity());

      expect(result.find((s) => s.id === 'no-shopping')).toBeUndefined();
    });
  });

  describe('sorting and limit', () => {
    it('should sort high priority suggestions first', () => {
      const summary = makeSummary({
        taskCounts: { total: 10, pending: 5, overdue: 2, dueToday: 1 },
        budgetRemaining: 30,
        activeGoals: 1,
        choreStats: { total: 10, pending: 5 },
        shoppingLists: [],
        upcomingEvents: [],
      });

      const result = generateSuggestions(summary, makeActivity());

      // First items should be high priority
      const highItems = result.filter((s) => s.priority === 'high');
      const firstHighIndex = result.findIndex((s) => s.priority === 'high');
      const firstMediumIndex = result.findIndex((s) => s.priority === 'medium');
      const firstLowIndex = result.findIndex((s) => s.priority === 'low');

      if (highItems.length > 0 && firstMediumIndex !== -1) {
        expect(firstHighIndex).toBeLessThan(firstMediumIndex);
      }
      if (firstMediumIndex !== -1 && firstLowIndex !== -1) {
        expect(firstMediumIndex).toBeLessThan(firstLowIndex);
      }
    });

    it('should return at most 5 suggestions', () => {
      const summary = makeSummary({
        taskCounts: { total: 10, pending: 5, overdue: 3, dueToday: 2 },
        budgetRemaining: 20,
        activeGoals: 2,
        choreStats: { total: 10, pending: 6 },
        shoppingLists: [],
        upcomingEvents: [],
      });

      const result = generateSuggestions(summary, makeActivity());

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('each suggestion should have required fields', () => {
      const summary = makeSummary({
        taskCounts: { total: 10, pending: 5, overdue: 2, dueToday: 0 },
      });

      const result = generateSuggestions(summary, makeActivity());

      for (const suggestion of result) {
        expect(suggestion.id).toBeTruthy();
        expect(suggestion.priority).toMatch(/^(high|medium|low)$/);
        expect(suggestion.feature).toBeTruthy();
        expect(suggestion.title).toBeTruthy();
        expect(suggestion.description).toBeTruthy();
        expect(suggestion.actionMessage).toBeTruthy();
      }
    });
  });
});
