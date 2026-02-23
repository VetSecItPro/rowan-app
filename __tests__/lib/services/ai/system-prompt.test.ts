/**
 * Tests for system-prompt.ts
 * Covers buildSystemPrompt and buildMinimalSystemPrompt
 */

import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  buildMinimalSystemPrompt,
  type SpaceContext,
} from '@/lib/services/ai/system-prompt';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseContext: SpaceContext = {
  spaceId: 'space-abc',
  spaceName: 'The Johnsons',
  members: [
    { id: 'user-1', displayName: 'Alice', role: 'admin' },
    { id: 'user-2', displayName: 'Bob', role: 'member' },
  ],
  timezone: 'America/Chicago',
  userName: 'Alice',
  userId: 'user-1',
};

// ---------------------------------------------------------------------------
// buildSystemPrompt
// ---------------------------------------------------------------------------

describe('buildSystemPrompt', () => {
  it('includes the current user name and ID', () => {
    const prompt = buildSystemPrompt(baseContext);
    expect(prompt).toContain('Alice');
    expect(prompt).toContain('user-1');
  });

  it('includes the space name', () => {
    const prompt = buildSystemPrompt(baseContext);
    expect(prompt).toContain('The Johnsons');
  });

  it('lists all family members with their roles', () => {
    const prompt = buildSystemPrompt(baseContext);
    expect(prompt).toContain('Alice');
    expect(prompt).toContain('Bob');
    expect(prompt).toContain('admin');
    expect(prompt).toContain('member');
  });

  it('includes current date and time', () => {
    const prompt = buildSystemPrompt(baseContext);
    // date-fns formats the date as "Monday, February 22, 2026" or similar
    const currentYear = new Date().getFullYear().toString();
    expect(prompt).toContain(currentYear);
  });

  it('includes the timezone', () => {
    const prompt = buildSystemPrompt(baseContext);
    expect(prompt).toContain('America/Chicago');
  });

  it('includes security boundary prompt injection rules', () => {
    const prompt = buildSystemPrompt(baseContext);
    expect(prompt).toContain('SECURITY BOUNDARY');
    expect(prompt).toContain('ignore previous instructions');
  });

  it('includes recent tasks when provided', () => {
    const context: SpaceContext = {
      ...baseContext,
      recentTasks: [
        { title: 'Pick up kids', status: 'pending', due_date: '2026-02-23', assigned_to: null },
      ],
    };
    const prompt = buildSystemPrompt(context);
    expect(prompt).toContain('Pick up kids');
    expect(prompt).toContain('RECENT TASKS');
  });

  it('includes chores section when recentChores is provided', () => {
    const context: SpaceContext = {
      ...baseContext,
      recentChores: [
        { title: 'Vacuum living room', frequency: 'weekly', assigned_to: 'user-2' },
      ],
    };
    const prompt = buildSystemPrompt(context);
    expect(prompt).toContain('Vacuum living room');
    expect(prompt).toContain('ACTIVE CHORES');
  });

  it('includes shopping lists when provided', () => {
    const context: SpaceContext = {
      ...baseContext,
      activeShoppingLists: [
        { title: 'Weekly groceries', item_count: 12 },
      ],
    };
    const prompt = buildSystemPrompt(context);
    expect(prompt).toContain('Weekly groceries');
    expect(prompt).toContain('12 items');
    expect(prompt).toContain('SHOPPING LISTS');
  });

  it('includes upcoming events when provided', () => {
    const context: SpaceContext = {
      ...baseContext,
      upcomingEvents: [
        { title: 'Piano recital', start_time: '2026-02-25T18:00:00Z' },
      ],
    };
    const prompt = buildSystemPrompt(context);
    expect(prompt).toContain('Piano recital');
    expect(prompt).toContain('UPCOMING EVENTS');
  });

  it('includes household summary when provided', () => {
    const context: SpaceContext = {
      ...baseContext,
      summary: {
        taskCounts: { total: 10, pending: 4, overdue: 1, dueToday: 2 },
        budgetRemaining: 350.75,
        activeGoals: 3,
        choreStats: { total: 8, pending: 2 },
        shoppingLists: [],
        upcomingEvents: [],
      },
    };
    const prompt = buildSystemPrompt(context);
    expect(prompt).toContain('HOUSEHOLD SUMMARY');
    expect(prompt).toContain('4 pending');
    expect(prompt).toContain('1 overdue');
    expect(prompt).toContain('$350.75');
    expect(prompt).toContain('3 active');
  });

  it('omits budget line when budgetRemaining is null', () => {
    const context: SpaceContext = {
      ...baseContext,
      summary: {
        taskCounts: { total: 5, pending: 2, overdue: 0, dueToday: 1 },
        budgetRemaining: null,
        activeGoals: 1,
        choreStats: { total: 3, pending: 1 },
        shoppingLists: [],
        upcomingEvents: [],
      },
    };
    const prompt = buildSystemPrompt(context);
    expect(prompt).not.toContain('Budget remaining');
  });

  it('includes recent completed tasks from recentActivity', () => {
    const context: SpaceContext = {
      ...baseContext,
      recentActivity: {
        completedTasks: [
          { title: 'Fix the gate', completedAt: '2026-02-22T10:00:00Z' },
        ],
        newExpenses: [],
        upcomingEvents: [],
      },
    };
    const prompt = buildSystemPrompt(context);
    expect(prompt).toContain('Fix the gate');
    expect(prompt).toContain('LAST 24 HOURS');
  });

  it('includes expense summary from recentActivity', () => {
    const context: SpaceContext = {
      ...baseContext,
      recentActivity: {
        completedTasks: [],
        newExpenses: [
          { description: 'Groceries', amount: 85.5, category: 'food' },
          { description: 'Gas', amount: 45.0, category: 'transport' },
        ],
        upcomingEvents: [],
      },
    };
    const prompt = buildSystemPrompt(context);
    expect(prompt).toContain('$130.50');
    expect(prompt).toContain('2 expenses');
  });

  it('omits RECENT ACTIVITY block when nothing to report', () => {
    const context: SpaceContext = {
      ...baseContext,
      recentActivity: {
        completedTasks: [],
        newExpenses: [],
        upcomingEvents: [],
      },
    };
    const prompt = buildSystemPrompt(context);
    expect(prompt).not.toContain('LAST 24 HOURS');
  });

  it('does not expose member UUIDs as instructions to hide them', () => {
    const prompt = buildSystemPrompt(baseContext);
    // The prompt should instruct the AI not to reveal UUIDs to end users
    expect(prompt).toContain('never');
  });
});

// ---------------------------------------------------------------------------
// buildMinimalSystemPrompt
// ---------------------------------------------------------------------------

describe('buildMinimalSystemPrompt', () => {
  it('includes the user ID and timezone', () => {
    const prompt = buildMinimalSystemPrompt('user-42', 'Pacific/Auckland');
    expect(prompt).toContain('user-42');
    expect(prompt).toContain('Pacific/Auckland');
  });

  it('includes a note that space member details are unavailable', () => {
    const prompt = buildMinimalSystemPrompt('user-42', 'UTC');
    expect(prompt).toContain('Space member details are not available');
  });

  it('includes current date and time', () => {
    const prompt = buildMinimalSystemPrompt('user-42', 'UTC');
    const currentYear = new Date().getFullYear().toString();
    expect(prompt).toContain(currentYear);
  });

  it('includes the ROWAN_PERSONALITY security boundary rules', () => {
    const prompt = buildMinimalSystemPrompt('user-42', 'UTC');
    expect(prompt).toContain('SECURITY BOUNDARY');
  });

  it('is shorter than the full system prompt', () => {
    const full = buildSystemPrompt(baseContext);
    const minimal = buildMinimalSystemPrompt('user-1', 'UTC');
    expect(minimal.length).toBeLessThan(full.length);
  });
});
